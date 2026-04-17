/*
  # Add anon access policies to submissions table

  1. Changes
    - Add SELECT policy for anon role so unauthenticated users can read submissions
    - Add INSERT policy for anon role so unauthenticated users can insert submissions
    - Add UPDATE policy for anon role so unauthenticated users can update submissions

  2. Reason
    - The app currently runs without authentication (anon key only)
    - Without these policies all writes silently fail under RLS, breaking button behavior
*/

CREATE POLICY "Anon users can read submissions"
  ON submissions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert submissions"
  ON submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update submissions"
  ON submissions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
