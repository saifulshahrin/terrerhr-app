/*
  # Create ai_assessments table

  ## Purpose
  Stores Terrer AI Review results generated per candidate + job pair.

  ## New Tables
  - `ai_assessments`
    - `id` (uuid, primary key)
    - `candidate_id` (text) — references the candidate identifier
    - `job_id` (text) — references the job identifier
    - `review_summary` (text) — recruiter-style summary paragraph
    - `strengths` (text[]) — array of positive fit points
    - `concerns` (text[]) — array of caution points
    - `recommendation` (text) — 'Strong Fit' | 'Potential Fit' | 'Weak Fit'
    - `created_at` (timestamptz) — when the first review was generated
    - `updated_at` (timestamptz) — when the review was last updated

  ## Constraints
  - Unique constraint on (candidate_id, job_id) to ensure one record per pair

  ## Security
  - RLS enabled
  - Anonymous read and write allowed (matching the pattern used by submissions table)
*/

CREATE TABLE IF NOT EXISTS ai_assessments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  text        NOT NULL DEFAULT '',
  job_id        text        NOT NULL DEFAULT '',
  review_summary text       NOT NULL DEFAULT '',
  strengths     text[]      NOT NULL DEFAULT '{}',
  concerns      text[]      NOT NULL DEFAULT '{}',
  recommendation text       NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_assessments_candidate_job_unique UNIQUE (candidate_id, job_id)
);

ALTER TABLE ai_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can read ai_assessments"
  ON ai_assessments
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert ai_assessments"
  ON ai_assessments
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update ai_assessments"
  ON ai_assessments
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
