/*
  # Create submissions table

  1. New Tables
    - `submissions`
      - `id` (uuid, primary key)
      - `job_id` (text, not null) — references a job posting identifier
      - `candidate_id` (text, not null) — references a candidate identifier
      - `submission_stage` (text, not null, default 'new') — current pipeline stage
      - `next_action_date` (date, nullable) — when the next follow-up is due
      - `stage_updated_at` (timestamptz) — when stage last changed
      - `created_at` (timestamptz) — row creation time
      - UNIQUE constraint on (job_id, candidate_id) to prevent duplicates

  2. Security
    - Enable RLS on `submissions` table
    - Add policy for authenticated users to read all submissions
    - Add policy for authenticated users to insert their own submissions
    - Add policy for authenticated users to update submissions

  3. Notes
    - The unique constraint on (job_id, candidate_id) enforces no duplicate submissions
    - Using ON CONFLICT (job_id, candidate_id) DO UPDATE enables safe upserts
*/

CREATE TABLE IF NOT EXISTS submissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           text NOT NULL DEFAULT '',
  candidate_id     text NOT NULL,
  submission_stage text NOT NULL DEFAULT 'new',
  next_action_date date,
  stage_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT submissions_job_candidate_unique UNIQUE (job_id, candidate_id)
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read submissions"
  ON submissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert submissions"
  ON submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update submissions"
  ON submissions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
