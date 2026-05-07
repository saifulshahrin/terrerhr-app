/*
  # Add candidate match guidance fields

  Stores recruiter/candidate-guided preferences captured after the initial
  Talent Profile submission in the Terrer Web matched-jobs flow.
*/

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS target_role text,
  ADD COLUMN IF NOT EXISTS target_seniority text,
  ADD COLUMN IF NOT EXISTS job_priorities text[],
  ADD COLUMN IF NOT EXISTS salary_expectation_min numeric,
  ADD COLUMN IF NOT EXISTS salary_expectation_max numeric,
  ADD COLUMN IF NOT EXISTS location_preference text,
  ADD COLUMN IF NOT EXISTS notice_period text,
  ADD COLUMN IF NOT EXISTS career_confidence text,
  ADD COLUMN IF NOT EXISTS representation_opt_in boolean,
  ADD COLUMN IF NOT EXISTS counsellor_completed_at timestamptz;
