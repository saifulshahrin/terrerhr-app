import { supabase } from './supabase';

export interface JobSourceRow {
  id: string;
  company_name: string;
  source_name: string;
  source_url: string;
  source_type: string;
  ats_family: string | null;
  tier: string;
  trust_score: number;
  country: string | null;
  market: string | null;
  extraction_method: string | null;
  status: string;
  last_checked_at: string | null;
  last_success_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResolveJobSourceInput {
  source_name?: string | null;
  source_type?: string | null;
  source_url?: string | null;
}

export async function resolveJobSource(
  input: ResolveJobSourceInput
): Promise<JobSourceRow | null> {
  const sourceName = input.source_name?.trim();
  if (!sourceName) return null;

  const { data, error } = await supabase
    .from('job_sources')
    .select(
      'id, company_name, source_name, source_url, source_type, ats_family, tier, trust_score, country, market, extraction_method, status, last_checked_at, last_success_at, notes, created_at, updated_at'
    )
    .eq('source_name', sourceName)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as JobSourceRow | null) ?? null;
}
