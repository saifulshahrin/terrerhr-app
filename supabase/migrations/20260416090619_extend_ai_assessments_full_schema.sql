/*
  # Extend ai_assessments to full Terrer AI schema

  ## Summary
  Adds all required columns to the existing ai_assessments table and renames
  review_summary to reasoning_summary. Old columns that conflict are dropped
  safely via rename, and new columns are added with safe defaults.

  ## Changes to ai_assessments
  - Rename `review_summary` → `reasoning_summary`
  - Rename `recommendation` → `overall_recommendation`
  - Add `layer1_score` (numeric, default 0)
  - Add `ai_score` (numeric, default 0)
  - Add `ranking_adjustment` (integer, default 0)
  - Add `confidence` (text, default '')
  - Add `verification_notes` (text[], default '{}')
  - Add `missing_information` (text[], default '{}')
  - Add `submission_ready` (boolean, default false)
  - Add `model_used` (text, default '')
  - Add `model_version` (text, default '')
  - Add `assessed_at` (timestamptz, default now())

  ## Notes
  - Uses DO blocks with IF NOT EXISTS / IF EXISTS checks to be idempotent
  - No data loss — existing rows keep their values, new columns get defaults
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_assessments' AND column_name = 'review_summary'
  ) THEN
    ALTER TABLE ai_assessments RENAME COLUMN review_summary TO reasoning_summary;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_assessments' AND column_name = 'recommendation'
  ) THEN
    ALTER TABLE ai_assessments RENAME COLUMN recommendation TO overall_recommendation;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_assessments' AND column_name = 'layer1_score'
  ) THEN
    ALTER TABLE ai_assessments ADD COLUMN layer1_score numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_assessments' AND column_name = 'ai_score'
  ) THEN
    ALTER TABLE ai_assessments ADD COLUMN ai_score numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_assessments' AND column_name = 'ranking_adjustment'
  ) THEN
    ALTER TABLE ai_assessments ADD COLUMN ranking_adjustment integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_assessments' AND column_name = 'confidence'
  ) THEN
    ALTER TABLE ai_assessments ADD COLUMN confidence text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_assessments' AND column_name = 'verification_notes'
  ) THEN
    ALTER TABLE ai_assessments ADD COLUMN verification_notes text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_assessments' AND column_name = 'missing_information'
  ) THEN
    ALTER TABLE ai_assessments ADD COLUMN missing_information text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_assessments' AND column_name = 'submission_ready'
  ) THEN
    ALTER TABLE ai_assessments ADD COLUMN submission_ready boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_assessments' AND column_name = 'model_used'
  ) THEN
    ALTER TABLE ai_assessments ADD COLUMN model_used text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_assessments' AND column_name = 'model_version'
  ) THEN
    ALTER TABLE ai_assessments ADD COLUMN model_version text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_assessments' AND column_name = 'assessed_at'
  ) THEN
    ALTER TABLE ai_assessments ADD COLUMN assessed_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;
