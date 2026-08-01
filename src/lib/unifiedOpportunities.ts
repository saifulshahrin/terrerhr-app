import { supabase } from './supabase';
import {
  loadUnifiedOpportunities,
  type UnifiedOpportunityDataSource,
  type UnifiedOpportunityQueryOptions,
} from './unifiedOpportunityQuery.ts';
import type {
  CandidateOpportunity,
  CanonicalOpportunityRow,
  ExternalOpportunityRow,
  TrustedMatch,
} from './opportunityDto.ts';

const CANONICAL_SELECT =
  'id, job_title, company_name, location, job_description_text, external_job_url, posted_date, created_at, updated_at, role_family';
const EXTERNAL_SELECT =
  'id, job_title, company_name, location, opportunity_summary, source_url, posted_at, discovered_at, last_verified_at, role_family';

const supabaseOpportunitySource: UnifiedOpportunityDataSource = {
  async listCanonical() {
    const { data: publications, error: publicationError } = await supabase
      .from('candidate_web_jobs')
      .select('job_id')
      .eq('status', 'published');
    if (publicationError) throw publicationError;

    const jobIds = (publications ?? []).map((row) => row.job_id as string);
    if (jobIds.length === 0) return [];

    const { data, error } = await supabase
      .from('jobs')
      .select(CANONICAL_SELECT)
      .in('id', jobIds);
    if (error) throw error;
    return (data ?? []) as CanonicalOpportunityRow[];
  },

  async listExternal() {
    const freshnessCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('external_opportunities')
      .select(EXTERNAL_SELECT)
      .eq('publication_status', 'published')
      .eq('verification_status', 'verified_active')
      .is('retired_at', null)
      .gte('last_verified_at', freshnessCutoff);
    if (error) throw error;
    return (data ?? []) as ExternalOpportunityRow[];
  },

  async listCanonicalMatches(candidateId) {
    const { data, error } = await supabase
      .from('ai_assessments')
      .select('job_id, ai_score, overall_recommendation')
      .eq('candidate_id', candidateId);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      opportunityId: row.job_id as string,
      score: Number(row.ai_score),
      reasons: row.overall_recommendation ? [String(row.overall_recommendation)] : [],
    } satisfies TrustedMatch));
  },

  async listExternalMatches(candidateId) {
    const { data, error } = await supabase
      .from('external_opportunity_reviews')
      .select('external_opportunity_id, match_score, match_reasons')
      .eq('candidate_id', candidateId);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      opportunityId: row.external_opportunity_id as string,
      score: Number(row.match_score),
      reasons: (row.match_reasons ?? []) as string[],
    } satisfies TrustedMatch));
  },
};

export async function fetchUnifiedOpportunities(
  options: UnifiedOpportunityQueryOptions = {}
): Promise<CandidateOpportunity[]> {
  return loadUnifiedOpportunities(supabaseOpportunitySource, options);
}

export type { CandidateOpportunity, UnifiedOpportunityQueryOptions };
