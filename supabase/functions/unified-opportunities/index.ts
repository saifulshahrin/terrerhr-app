import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import {
  createUnifiedOpportunityApiHandler,
  type CandidateResolution,
  type SafeExternalReview,
  type UnifiedOpportunityApiGateway,
  type VerifiedAuthUser,
} from '../../../src/lib/unifiedOpportunityAuthApi.ts';
import type {
  CanonicalOpportunityRow,
  ExternalOpportunityRow,
  TrustedMatch,
} from '../../../src/lib/opportunityDto.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const allowedOrigins = new Set(
  (Deno.env.get('TERRER_WEB_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error('Required Supabase function environment is not configured.');
}
if (!allowedOrigins.size) {
  throw new Error('TERRER_WEB_ALLOWED_ORIGINS must contain at least one exact web origin.');
}

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const CANONICAL_SELECT =
  'id, job_title, company_name, location, job_description_text, compensation_text, external_job_url, posted_date, created_at, updated_at, role_family';
const EXTERNAL_SELECT =
  'id, job_title, company_name, location, opportunity_summary, source_url, posted_at, discovered_at, last_verified_at, role_family, seniority, skills';

function throwIfError(error: { message?: string } | null): void {
  if (error) throw new Error('Supabase operation failed.');
}

function mapReview(row: Record<string, unknown>): SafeExternalReview {
  return {
    id: String(row.id),
    externalOpportunityId: String(row.external_opportunity_id),
    status: String(row.review_status),
    matchScore: Number(row.match_score),
    matchReasons: Array.isArray(row.match_reasons) ? row.match_reasons.map(String).slice(0, 3) : [],
    requestedAt: String(row.requested_at),
    updatedAt: String(row.updated_at),
  };
}

const gateway: UnifiedOpportunityApiGateway = {
  async authenticate(accessToken): Promise<VerifiedAuthUser | null> {
    const { data, error } = await serviceClient.auth.getUser(accessToken);
    if (error || !data.user?.id || !data.user.email) return null;
    return {
      id: data.user.id,
      email: data.user.email,
      emailConfirmed: Boolean(data.user.email_confirmed_at),
    };
  },

  async resolveCandidate(user, accessToken): Promise<CandidateResolution> {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data, error } = await userClient
      .from('candidates')
      .select('candidate_id,email,current_role,target_role,key_skills,city,location_preference,years_experience,primary_role')
      .limit(2);
    throwIfError(error);
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const ownedRows = rows.filter(
      (row) => String(row.email ?? '').trim().toLowerCase() === user.email.trim().toLowerCase(),
    );
    if (!ownedRows.length) return { status: 'missing' };
    if (ownedRows.length !== 1) return { status: 'ambiguous' };
    const row = ownedRows[0];
    return {
      status: 'ok',
      candidate: {
        candidateId: String(row.candidate_id),
        currentRole: row.current_role ? String(row.current_role) : row.primary_role ? String(row.primary_role) : null,
        targetRole: row.target_role ? String(row.target_role) : null,
        skills: Array.isArray(row.key_skills) ? row.key_skills.map(String) : [],
        location: row.location_preference ? String(row.location_preference) : row.city ? String(row.city) : null,
        roleFamily: null,
        yearsExperience: row.years_experience == null ? null : Number(row.years_experience),
      },
    };
  },

  async listCanonical(): Promise<CanonicalOpportunityRow[]> {
    const publications = await serviceClient
      .from('candidate_web_jobs')
      .select('job_id')
      .eq('status', 'published');
    throwIfError(publications.error);
    const ids = (publications.data ?? []).map((row) => String(row.job_id));
    if (!ids.length) return [];
    const result = await serviceClient.from('jobs').select(CANONICAL_SELECT).in('id', ids);
    throwIfError(result.error);
    return (result.data ?? []) as CanonicalOpportunityRow[];
  },

  async listExternal(): Promise<ExternalOpportunityRow[]> {
    const freshnessCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const result = await serviceClient
      .from('external_opportunities')
      .select(EXTERNAL_SELECT)
      .eq('publication_status', 'published')
      .eq('verification_status', 'verified_active')
      .is('retired_at', null)
      .gte('last_verified_at', freshnessCutoff);
    throwIfError(result.error);
    return (result.data ?? []) as ExternalOpportunityRow[];
  },

  async listCanonicalMatches(candidateId): Promise<TrustedMatch[]> {
    const result = await serviceClient
      .from('ai_assessments')
      .select('job_id,ai_score,overall_recommendation')
      .eq('candidate_id', candidateId);
    throwIfError(result.error);
    return (result.data ?? []).map((row) => ({
      opportunityId: String(row.job_id),
      score: Number(row.ai_score),
      reasons: row.overall_recommendation ? [String(row.overall_recommendation)] : [],
    }));
  },

  async listExternalMatches(candidateId): Promise<TrustedMatch[]> {
    const result = await serviceClient
      .from('external_opportunity_reviews')
      .select('external_opportunity_id,match_score,match_reasons')
      .eq('candidate_id', candidateId);
    throwIfError(result.error);
    return (result.data ?? []).map((row) => ({
      opportunityId: String(row.external_opportunity_id),
      score: Number(row.match_score),
      reasons: Array.isArray(row.match_reasons) ? row.match_reasons.map(String).slice(0, 3) : [],
    }));
  },

  async findReviewableExternalOpportunity(id) {
    const freshnessCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const result = await serviceClient
      .from('external_opportunities')
      .select(EXTERNAL_SELECT)
      .eq('id', id)
      .eq('publication_status', 'published')
      .eq('verification_status', 'verified_active')
      .is('retired_at', null)
      .gte('last_verified_at', freshnessCutoff)
      .maybeSingle();
    throwIfError(result.error);
    return result.data as Awaited<ReturnType<UnifiedOpportunityApiGateway['findReviewableExternalOpportunity']>>;
  },

  async requestExternalReview(input): Promise<SafeExternalReview> {
    const result = await serviceClient.rpc('create_external_opportunity_review_trusted', {
      p_candidate_id: input.candidateId,
      p_external_opportunity_id: input.externalOpportunityId,
      p_match_score: input.matchScore,
      p_match_reasons: input.matchReasons,
    });
    throwIfError(result.error);
    if (!result.data || typeof result.data !== 'object') throw new Error('Review response unavailable.');
    return mapReview(result.data as Record<string, unknown>);
  },
};

const handler = createUnifiedOpportunityApiHandler({
  gateway,
  allowedOrigins,
  log(event) {
    console.info('[unified-opportunities]', event);
  },
});

Deno.serve(handler);
