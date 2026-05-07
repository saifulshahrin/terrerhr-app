/*
  # Create job_sources registry

  Canonical source registry for Terrer job intake and future source intelligence.
  This migration is additive only and does not modify any existing tables.
*/

CREATE TABLE IF NOT EXISTS public.job_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  source_name text NOT NULL,
  source_url text NOT NULL,
  source_type text NOT NULL DEFAULT 'unknown',
  ats_family text,
  tier text NOT NULL DEFAULT 'tier_3',
  trust_score integer NOT NULL DEFAULT 0,
  country text,
  market text,
  extraction_method text,
  status text NOT NULL DEFAULT 'active',
  last_checked_at timestamptz,
  last_success_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_sources_trust_score_check CHECK (trust_score >= 0 AND trust_score <= 100),
  CONSTRAINT job_sources_tier_check CHECK (tier IN ('tier_1', 'tier_2', 'tier_3'))
);

CREATE UNIQUE INDEX IF NOT EXISTS job_sources_source_url_uidx
  ON public.job_sources (source_url);

CREATE INDEX IF NOT EXISTS job_sources_source_type_tier_status_idx
  ON public.job_sources (source_type, tier, status);

CREATE INDEX IF NOT EXISTS job_sources_company_name_idx
  ON public.job_sources (company_name);

ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can read job_sources"
  ON public.job_sources
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can read job_sources"
  ON public.job_sources
  FOR SELECT
  TO authenticated
  USING (true);
