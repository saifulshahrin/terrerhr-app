/*
  # Create jobs table

  1. New Tables
    - `jobs`
      - `id` (uuid, primary key, auto-generated)
      - `job_title` (text, required) — role title
      - `company_name` (text, required) — company name
      - `location` (text) — job location
      - `source` (text, default 'manual_intake') — origin of the job record
      - `status` (text, default 'Open') — Open | Closed | On Hold
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `jobs` table
    - Add SELECT, INSERT, UPDATE policies for both authenticated and anon roles
      (app currently runs without login using the anon key)
*/

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title text NOT NULL DEFAULT '',
  company_name text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'manual_intake',
  status text NOT NULL DEFAULT 'Open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can read jobs"
  ON jobs FOR SELECT TO anon USING (true);

CREATE POLICY "Anon users can insert jobs"
  ON jobs FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon users can update jobs"
  ON jobs FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read jobs"
  ON jobs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert jobs"
  ON jobs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update jobs"
  ON jobs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
