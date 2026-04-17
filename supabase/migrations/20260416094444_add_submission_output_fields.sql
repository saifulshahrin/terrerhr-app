/*
  # Add Submission Output Fields

  ## Summary
  Extends the submissions table with structured, client-ready submission output fields generated at the time of "Submit to Client" action.

  ## New Columns on `submissions`
  - `submission_summary` (text): Short paragraph summarising the recruiter's recommendation for this candidate-job pairing.
  - `submission_strengths` (text[]): Ordered list of top candidate strengths relevant to this role.
  - `submission_concerns` (text[]): List of key gaps or risks the client should be aware of.
  - `submission_full_text` (text): Full formatted, client-ready submission document combining all fields.
  - `submission_generated_at` (timestamptz): Timestamp of when the submission output was last generated.

  ## Notes
  - All columns are nullable — they are only populated when a recruiter clicks "Submit to Client".
  - No existing data is modified; this is a purely additive migration.
  - No changes to RLS policies are required as these columns inherit from the existing submissions table policies.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'submission_summary'
  ) THEN
    ALTER TABLE submissions ADD COLUMN submission_summary text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'submission_strengths'
  ) THEN
    ALTER TABLE submissions ADD COLUMN submission_strengths text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'submission_concerns'
  ) THEN
    ALTER TABLE submissions ADD COLUMN submission_concerns text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'submission_full_text'
  ) THEN
    ALTER TABLE submissions ADD COLUMN submission_full_text text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'submission_generated_at'
  ) THEN
    ALTER TABLE submissions ADD COLUMN submission_generated_at timestamptz;
  END IF;
END $$;
