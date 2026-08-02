import type { CandidateOpportunity, ExternalOpportunityRow } from './opportunityDto.ts';
import { buildTrustedExternalMatchEvidence, type CandidateMatchProfile } from './externalOpportunityMatchEvidence.ts';
import { loadUnifiedOpportunities, type UnifiedOpportunityDataSource } from './unifiedOpportunityQuery.ts';

export type VerifiedAuthUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
};

export type ResolvedCandidate = CandidateMatchProfile & {
  candidateId: string;
};

export type CandidateResolution =
  | { status: 'ok'; candidate: ResolvedCandidate }
  | { status: 'missing' }
  | { status: 'ambiguous' };

export type SafeExternalReview = {
  id: string;
  externalOpportunityId: string;
  status: string;
  matchScore: number;
  matchReasons: string[];
  requestedAt: string;
  updatedAt: string;
};

export type ReviewableExternalOpportunity = ExternalOpportunityRow & {
  seniority: string | null;
  skills: string[];
};

export interface UnifiedOpportunityApiGateway extends UnifiedOpportunityDataSource {
  authenticate(accessToken: string): Promise<VerifiedAuthUser | null>;
  resolveCandidate(user: VerifiedAuthUser, accessToken: string): Promise<CandidateResolution>;
  findReviewableExternalOpportunity(id: string): Promise<ReviewableExternalOpportunity | null>;
  requestExternalReview(input: {
    candidateId: string;
    externalOpportunityId: string;
    matchScore: number;
    matchReasons: string[];
  }): Promise<SafeExternalReview>;
}

export type UnifiedOpportunityApiDependencies = {
  gateway: UnifiedOpportunityApiGateway;
  allowedOrigins: ReadonlySet<string>;
  log?: (event: { requestId: string; operation: string; outcome: string; opportunityId?: string }) => void;
};

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const EXTERNAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,199}$/;

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(origin: string, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders(origin), 'Cache-Control': 'no-store' },
  });
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] ?? null;
}

function candidateSafeOpportunity(opportunity: CandidateOpportunity): CandidateOpportunity {
  return {
    id: opportunity.id,
    sourceId: opportunity.sourceId,
    origin: opportunity.origin,
    title: opportunity.title,
    company: opportunity.company,
    location: opportunity.location,
    summary: opportunity.summary,
    salaryText: opportunity.salaryText,
    sourceUrl: opportunity.sourceUrl,
    publishedAt: opportunity.publishedAt,
    discoveredAt: opportunity.discoveredAt,
    lastVerifiedAt: opportunity.lastVerifiedAt,
    roleCluster: opportunity.roleCluster,
    matchScore: opportunity.matchScore,
    matchReasons: opportunity.matchReasons.slice(0, 3),
    actions: opportunity.actions,
  };
}

async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > 4096) return null;
  const raw = await request.text();
  if (!raw || raw.length > 4096) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export function createUnifiedOpportunityApiHandler(dependencies: UnifiedOpportunityApiDependencies) {
  return async function handle(request: Request): Promise<Response> {
    const requestId = crypto.randomUUID();
    const origin = request.headers.get('origin')?.trim() ?? '';
    if (!origin || !dependencies.allowedOrigins.has(origin)) {
      dependencies.log?.({ requestId, operation: 'origin_check', outcome: 'rejected' });
      return new Response(JSON.stringify({ error: 'Origin not allowed.' }), {
        status: 403,
        headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' },
      });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'GET' && request.method !== 'POST') {
      return json(origin, 405, { error: 'Method not allowed.' });
    }

    const token = bearerToken(request);
    if (!token) return json(origin, 401, { error: 'A valid authenticated session is required.' });

    let user: VerifiedAuthUser | null;
    try {
      user = await dependencies.gateway.authenticate(token);
    } catch {
      user = null;
    }
    if (!user) return json(origin, 401, { error: 'The authenticated session is invalid or expired.' });
    if (!user.emailConfirmed || !user.email) {
      return json(origin, 403, { error: 'A verified email is required before accessing candidate opportunities.' });
    }

    let resolution: CandidateResolution;
    try {
      resolution = await dependencies.gateway.resolveCandidate(user, token);
    } catch {
      return json(origin, 500, { error: 'Candidate identity could not be resolved safely.' });
    }
    if (resolution.status === 'missing') {
      return json(origin, 403, { error: 'No candidate profile is linked to this verified account.', code: 'candidate_onboarding_required' });
    }
    if (resolution.status === 'ambiguous') {
      return json(origin, 409, { error: 'More than one candidate profile is linked to this account. Contact Terrer support.' });
    }
    const candidate = resolution.candidate;

    if (request.method === 'GET') {
      try {
        const opportunities = await loadUnifiedOpportunities(dependencies.gateway, {
          candidateId: candidate.candidateId,
        });
        dependencies.log?.({ requestId, operation: 'catalogue', outcome: 'success' });
        return json(origin, 200, { opportunities: opportunities.map(candidateSafeOpportunity) });
      } catch {
        dependencies.log?.({ requestId, operation: 'catalogue', outcome: 'failed' });
        return json(origin, 500, { error: 'The opportunity catalogue is temporarily unavailable.' });
      }
    }

    const body = await readJsonObject(request);
    if (!body) return json(origin, 400, { error: 'A valid JSON request body is required.' });
    if ('candidateId' in body || 'candidate_id' in body) {
      return json(origin, 400, { error: 'candidate_id is resolved from the authenticated session and must not be supplied.' });
    }
    const allowedKeys = new Set(['externalOpportunityId']);
    if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
      return json(origin, 400, { error: 'The request contains unsupported fields.' });
    }
    const externalOpportunityId = typeof body.externalOpportunityId === 'string'
      ? body.externalOpportunityId.trim()
      : '';
    if (!EXTERNAL_ID_PATTERN.test(externalOpportunityId)) {
      return json(origin, 400, { error: 'A valid external opportunity ID is required.' });
    }

    try {
      const opportunity = await dependencies.gateway.findReviewableExternalOpportunity(externalOpportunityId);
      if (!opportunity) {
        return json(origin, 404, { error: 'The external opportunity is not currently available for review.' });
      }
      const evidence = buildTrustedExternalMatchEvidence(candidate, {
        jobTitle: opportunity.job_title,
        location: opportunity.location,
        roleFamily: opportunity.role_family,
        seniority: opportunity.seniority,
        skills: opportunity.skills,
      });
      const review = await dependencies.gateway.requestExternalReview({
        candidateId: candidate.candidateId,
        externalOpportunityId,
        matchScore: evidence.score,
        matchReasons: evidence.reasons,
      });
      dependencies.log?.({ requestId, operation: 'external_review', outcome: 'success', opportunityId: externalOpportunityId });
      return json(origin, 200, {
        review,
        message: 'Terrer has recorded your request for review.',
        applicationStatus: 'not_an_application',
        employerSubmissionStatus: 'not_submitted',
      });
    } catch {
      dependencies.log?.({ requestId, operation: 'external_review', outcome: 'failed', opportunityId: externalOpportunityId });
      return json(origin, 500, { error: 'Terrer could not record the review request right now.' });
    }
  };
}
