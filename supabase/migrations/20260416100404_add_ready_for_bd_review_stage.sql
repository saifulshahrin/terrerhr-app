/*
  # Add ready_for_bd_review Submission Stage

  ## Summary
  Introduces a new submission stage `ready_for_bd_review` into the workflow.
  This stage sits between `shortlisted` and `submitted_to_client`, representing
  candidates that a recruiter has prepared and forwarded for BD (Business Development)
  review before final client submission.

  ## Changes
  - Alters the `submission_stage` column to accept the new `ready_for_bd_review` value.
  - No existing data is modified.
  - No RLS policy changes required.

  ## Workflow Impact
  Recruiter:  shortlisted -> ready_for_bd_review  (previously was -> submitted_to_client)
  BD:         ready_for_bd_review -> submitted_to_client  (new BD approval action)
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'submission_stage'
  ) THEN
    ALTER TABLE submissions
      ALTER COLUMN submission_stage TYPE text;
  END IF;
END $$;
