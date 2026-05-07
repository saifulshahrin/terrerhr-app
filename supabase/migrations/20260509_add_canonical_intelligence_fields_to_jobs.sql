/*
  # Add minimal canonical intelligence fields to jobs

  Backward-compatible job schema expansion for Phase 1B.
  This migration is additive only and does not change existing columns or behavior.
*/

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS normalized_job_title text;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS role_family text;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS seniority text;
