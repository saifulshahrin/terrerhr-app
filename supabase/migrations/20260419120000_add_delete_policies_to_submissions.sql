/*
  # Add delete policies to submissions table

  1. Changes
    - Add DELETE policy for authenticated role on submissions
    - Add DELETE policy for anon role on submissions

  2. Reason
    - The app currently supports reset/update flows but delete actions fail under RLS
    - Admin cleanup features rely on delete for individual and bulk submission cleanup
*/

CREATE POLICY "Authenticated users can delete submissions"
  ON submissions
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anon users can delete submissions"
  ON submissions
  FOR DELETE
  TO anon
  USING (true);
