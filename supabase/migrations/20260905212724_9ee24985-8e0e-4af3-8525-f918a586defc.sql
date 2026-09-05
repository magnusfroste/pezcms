TRUNCATE cron.job_run_details;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-cron-run-details') THEN
    PERFORM cron.schedule('purge-cron-run-details', '30 3 * * *', $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '3 days'$$);
  END IF;
END
$do$;