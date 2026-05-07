/*
  # Seed initial job_sources registry rows

  Idempotent seed for the canonical source registry.
  This migration only inserts or updates registry rows and does not modify app code
  or existing tables.
*/

INSERT INTO public.job_sources (
  company_name,
  source_name,
  source_url,
  source_type,
  ats_family,
  tier,
  trust_score,
  country,
  market,
  extraction_method,
  status,
  notes,
  created_at,
  updated_at
)
VALUES
  (
    'Terrer Internal',
    'manual_intake',
    'internal://manual-intake',
    'manual',
    'internal',
    'tier_1',
    100,
    'Malaysia',
    'MY',
    'manual',
    'active',
    'Internal intake source used by Terrer operations.',
    now(),
    now()
  ),
  (
    'Workday Registry',
    'workday',
    'https://www.myworkdayjobs.com',
    'workday',
    'Workday',
    'tier_1',
    90,
    'Malaysia',
    'MY',
    'workday',
    'active',
    'Canonical Workday source family.',
    now(),
    now()
  ),
  (
    'Oracle Registry',
    'oracle',
    'https://www.oracle.com/careers/',
    'oracle',
    'Oracle',
    'tier_1',
    85,
    'Malaysia',
    'MY',
    'oracle',
    'active',
    'Canonical Oracle source family.',
    now(),
    now()
  )
ON CONFLICT (source_url) DO UPDATE
SET
  company_name = EXCLUDED.company_name,
  source_name = EXCLUDED.source_name,
  source_type = EXCLUDED.source_type,
  ats_family = EXCLUDED.ats_family,
  tier = EXCLUDED.tier,
  trust_score = EXCLUDED.trust_score,
  country = EXCLUDED.country,
  market = EXCLUDED.market,
  extraction_method = EXCLUDED.extraction_method,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = now();
