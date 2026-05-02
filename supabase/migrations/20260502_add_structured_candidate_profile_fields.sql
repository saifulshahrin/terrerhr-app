/*
  # Add structured candidate profile fields

  Moves important candidate capture data out of notes into nullable structured
  columns while keeping notes for backward compatibility.

  This migration is additive only:
  - no existing columns removed
  - no strict constraints added
  - existing inserts remain compatible
*/

ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "current_role" text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "years_experience" numeric;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "key_skills" text[];
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "salary_expectation_currency" text DEFAULT 'MYR';
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "profile_capture_mode" text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "profile_completeness_status" text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "candidate_consent_given" boolean;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "candidate_consent_at" timestamptz;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "candidate_consent_text" text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "candidate_consent_version" text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "representation_status" text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "target_role" text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "target_seniority" text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "job_priorities" text[];
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "salary_expectation_min" numeric;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "salary_expectation_max" numeric;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "location_preference" text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "notice_period" text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "career_confidence" text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS "representation_opt_in" boolean;
