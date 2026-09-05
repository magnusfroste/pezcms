DROP TRIGGER IF EXISTS _mig_runner_apply_trg ON public._mig_runner;
DROP TABLE IF EXISTS public._mig_runner;
DROP FUNCTION IF EXISTS public._mig_runner_apply();