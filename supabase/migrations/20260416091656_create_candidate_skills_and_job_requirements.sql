/*
  # Create candidate_skills and job_requirements tables

  ## Summary
  Adds two structured lookup tables to enable skill-overlap matching
  between candidates and jobs in the Top Matches ranking engine.

  ## New Tables

  ### candidate_skills
  Stores individual skills for each candidate. One row per skill.
  - `id` (uuid, primary key)
  - `candidate_id` (text, references the candidate string id from mock data)
  - `skill` (text, the skill label e.g. "React", "Python")
  - `proficiency` (text, optional: 'beginner' | 'intermediate' | 'expert')
  - `created_at` (timestamptz)

  ### job_requirements
  Stores individual skill/requirement entries for each job.
  - `id` (uuid, primary key)
  - `job_id` (uuid, foreign key to jobs.id)
  - `requirement` (text, the skill or requirement label e.g. "React", "5+ years experience")
  - `required` (boolean, true = must-have, false = nice-to-have)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Anon users can SELECT and INSERT (consistent with other tables in this project)
  - Anon users can UPDATE (to allow re-populating requirements on job re-run)
*/

CREATE TABLE IF NOT EXISTS candidate_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id text NOT NULL DEFAULT '',
  skill text NOT NULL DEFAULT '',
  proficiency text NOT NULL DEFAULT 'intermediate',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read candidate_skills"
  ON candidate_skills FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert candidate_skills"
  ON candidate_skills FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update candidate_skills"
  ON candidate_skills FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS job_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  requirement text NOT NULL DEFAULT '',
  required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE job_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read job_requirements"
  ON job_requirements FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert job_requirements"
  ON job_requirements FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update job_requirements"
  ON job_requirements FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
