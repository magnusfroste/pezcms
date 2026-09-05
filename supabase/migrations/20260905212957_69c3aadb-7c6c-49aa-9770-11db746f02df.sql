CREATE TABLE IF NOT EXISTS public._mig_runner (
  id bigserial PRIMARY KEY,
  filename text NOT NULL,
  sql_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  applied_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public._mig_runner ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public._mig_runner_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_version text := substring(NEW.filename from 1 for 14);
  v_name text := regexp_replace(substring(NEW.filename from 16), '\.sql$', '');
BEGIN
  IF EXISTS (SELECT 1 FROM public._mig_runner WHERE status = 'failed') THEN
    NEW.status := 'blocked';
    RETURN NEW;
  END IF;
  BEGIN
    EXECUTE NEW.sql_text;
    INSERT INTO supabase_migrations.schema_migrations(version, name)
    VALUES (v_version, v_name)
    ON CONFLICT (version) DO NOTHING;
    NEW.status := 'ok';
  EXCEPTION WHEN OTHERS THEN
    NEW.status := 'failed';
    NEW.error := SQLSTATE || ': ' || SQLERRM;
  END;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS _mig_runner_apply_trg ON public._mig_runner;

CREATE TRIGGER _mig_runner_apply_trg
BEFORE INSERT ON public._mig_runner
FOR EACH ROW EXECUTE FUNCTION public._mig_runner_apply();

GRANT SELECT, INSERT ON public._mig_runner TO sandbox_exec;
GRANT USAGE, SELECT ON SEQUENCE public._mig_runner_id_seq TO sandbox_exec;