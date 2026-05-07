/*
  # Add nullable job_source_id to jobs

  Backward-compatible linkage from jobs to the canonical job_sources registry.
  This migration is additive only and does not change existing jobs.source behavior.
*/

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS job_source_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'jobs_job_source_id_fkey'
      AND conrelid = 'public.jobs'::regclass
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_job_source_id_fkey
      FOREIGN KEY (job_source_id)
      REFERENCES public.job_sources(id)
      ON DELETE SET NULL;
  END IF;
END $$;
