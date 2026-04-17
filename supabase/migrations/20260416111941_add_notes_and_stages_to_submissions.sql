/*
  # Add notes column and extend submission stages

  1. Changes
    - Add `notes` column to `submissions` table for recruiter-to-BD handoff notes
    - The column is nullable text, meaning it's optional per submission

  2. Notes
    - No data is dropped or modified
    - Existing rows will have notes = NULL by default
    - Stage values like 'rejected' and 'hold' are supported as free-text in the existing text column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'notes'
  ) THEN
    ALTER TABLE submissions ADD COLUMN notes text;
  END IF;
END $$;
