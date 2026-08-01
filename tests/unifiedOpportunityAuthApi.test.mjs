import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createUnifiedOpportunityApiHandler } from '../src/lib/unifiedOpportunityAuthApi.ts';

const allowedOrigin = 'https://terrer-web-staging.vercel.app';
const canonical = {
  id: 'canonical-id',
  job_title: 'Canonical role',
  company_name: 'Terrer client',
  location: 'Kuala Lumpur',
  job_description_text: 'Canonical summary',
  external_job_url: null,
  posted_date: '2026-07-31T00:00:00Z',
  created_at: '2026-07-30T00:00:00Z',
  updated_at: '2026-07-31T00:00:00Z',
  role_family: 'software',
};
const external = {
  id: 'pilot:software:employer:123',
  job_title: 'Software Engineer',
  company_name: 'Employer',
  location: 'Petaling Jaya, Malaysia',
  opportunity_summary: null,
  source_url: 'https://employer.example/jobs/123',
  posted_at: null,
  discovered_at: '2026-07-31T00:00:00Z',
  last_verified_at: '2026-08-01T00:00:00Z',
  role_family: 'software',
  seniority: 'mid',
  skills: ['TypeScript'],
};

function createGateway() {
  const reviews = new Map();
  const calls = { review: 0, canonicalWrites: 0, matchCandidateIds: [] };
  const candidates = {
    'token-a': {
      candidateId: 'candidate-a', currentRole: 'Software Engineer', targetRole: 'Software Engineer',
      skills: ['TypeScript'], location: 'Petaling Jaya', roleFamily: 'software', yearsExperience: 4,
    },
    'token-b': {
      candidateId: 'candidate-b', currentRole: 'Data Analyst', targetRole: 'Data Analyst',
      skills: ['SQL'], location: 'Kuala Lumpur', roleFamily: 'data', yearsExperience: 3,
    },
  };
  const gateway = {
    async authenticate(token) {
      if (!candidates[token]) return null;
      return { id: `user-${token}`, email: `${token}@example.com`, emailConfirmed: true };
    },
    async resolveCandidate(user, token) {
      if (token === 'token-missing') return { status: 'missing' };
      const candidate = candidates[token];
      return candidate ? { status: 'ok', candidate } : { status: 'missing' };
    },
    async listCanonical() { return [canonical]; },
    async listExternal() { return [external]; },
    async listCanonicalMatches(candidateId) {
      calls.matchCandidateIds.push(candidateId);
      return [{ opportunityId: canonical.id, score: 82, reasons: ['Trusted canonical assessment'] }];
    },
    async listExternalMatches(candidateId) {
      calls.matchCandidateIds.push(candidateId);
      const review = reviews.get(`${candidateId}:${external.id}`);
      return review ? [{ opportunityId: external.id, score: review.matchScore, reasons: review.matchReasons }] : [];
    },
    async findReviewableExternalOpportunity(id) { return id === external.id ? external : null; },
    async requestExternalReview(input) {
      calls.review += 1;
      const key = `${input.candidateId}:${input.externalOpportunityId}`;
      if (!reviews.has(key)) {
        reviews.set(key, {
          id: `review-${input.candidateId}`,
          externalOpportunityId: input.externalOpportunityId,
          status: 'requested',
          matchScore: input.matchScore,
          matchReasons: input.matchReasons,
          requestedAt: '2026-08-01T00:00:00Z',
          updatedAt: '2026-08-01T00:00:00Z',
        });
      }
      return reviews.get(key);
    },
  };
  return { gateway, reviews, calls };
}

function request(method, token, body, origin = allowedOrigin) {
  const headers = { Origin: origin };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return new Request('https://project.functions.supabase.co/unified-opportunities', {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function handlerFor(state = createGateway()) {
  return {
    ...state,
    handler: createUnifiedOpportunityApiHandler({
      gateway: state.gateway,
      allowedOrigins: new Set([allowedOrigin]),
    }),
  };
}

test('missing token returns 401', async () => {
  const { handler } = handlerFor();
  assert.equal((await handler(request('GET'))).status, 401);
});

test('invalid token returns 401', async () => {
  const { handler } = handlerFor();
  assert.equal((await handler(request('GET', 'invalid'))).status, 401);
});

test('authenticated user without candidate mapping receives safe onboarding response', async () => {
  const state = createGateway();
  state.gateway.authenticate = async () => ({ id: 'user-missing', email: 'missing@example.com', emailConfirmed: true });
  state.gateway.resolveCandidate = async () => ({ status: 'missing' });
  const { handler } = handlerFor(state);
  const response = await handler(request('GET', 'token-missing'));
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'candidate_onboarding_required');
});

test('unverified email is rejected before candidate lookup', async () => {
  const state = createGateway();
  state.gateway.authenticate = async () => ({ id: 'user-a', email: 'a@example.com', emailConfirmed: false });
  const { handler } = handlerFor(state);
  assert.equal((await handler(request('GET', 'token-a'))).status, 403);
});

test('ambiguous candidate mapping fails closed', async () => {
  const state = createGateway();
  state.gateway.resolveCandidate = async () => ({ status: 'ambiguous' });
  const { handler } = handlerFor(state);
  assert.equal((await handler(request('GET', 'token-a'))).status, 409);
});

test('browser-supplied candidate ID is rejected', async () => {
  const { handler } = handlerFor();
  const response = await handler(request('POST', 'token-a', {
    candidateId: 'candidate-b', externalOpportunityId: external.id,
  }));
  assert.equal(response.status, 400);
});

test('catalogue uses only the authenticated candidate match context and redacts sensitive fields', async () => {
  const { handler, calls } = handlerFor();
  const response = await handler(request('GET', 'token-a'));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(new Set(calls.matchCandidateIds), new Set(['candidate-a']));
  assert.deepEqual(new Set(payload.opportunities.map((item) => item.origin)), new Set(['canonical_terrer', 'external']));
  assert.equal(JSON.stringify(payload).includes('review_notes'), false);
  assert.equal(JSON.stringify(payload).includes('reviewed_by'), false);
  assert.equal(JSON.stringify(payload).includes('source_reference_id'), false);
});

test('first and repeated external review requests return one idempotent review', async () => {
  const { handler, reviews } = handlerFor();
  const first = await handler(request('POST', 'token-a', { externalOpportunityId: external.id }));
  const second = await handler(request('POST', 'token-a', { externalOpportunityId: external.id }));
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  const firstPayload = await first.json();
  const secondPayload = await second.json();
  assert.equal(firstPayload.review.id, secondPayload.review.id);
  assert.equal(reviews.size, 1);
  assert.equal(firstPayload.applicationStatus, 'not_an_application');
  assert.equal(firstPayload.employerSubmissionStatus, 'not_submitted');
});

test('different candidates cannot access each other review context', async () => {
  const { handler, reviews } = handlerFor();
  const first = await handler(request('POST', 'token-a', { externalOpportunityId: external.id }));
  const second = await handler(request('POST', 'token-b', { externalOpportunityId: external.id }));
  assert.notEqual((await first.json()).review.id, (await second.json()).review.id);
  assert.equal(reviews.size, 2);
});

test('review path has no canonical workflow write capability', async () => {
  const { handler, calls } = handlerFor();
  await handler(request('POST', 'token-a', { externalOpportunityId: external.id }));
  assert.equal(calls.review, 1);
  assert.equal(calls.canonicalWrites, 0);
});

test('disallowed origins are rejected without CORS approval', async () => {
  const { handler } = handlerFor();
  const response = await handler(request('GET', 'token-a', undefined, 'https://evil.example'));
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('approved staging origin passes OPTIONS preflight exactly', async () => {
  const { handler } = handlerFor();
  const response = await handler(request('OPTIONS'));
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), allowedOrigin);
  assert.equal(response.headers.get('vary'), 'Origin');
});

test('edge adapter preserves protected RPC and canonical isolation boundaries', () => {
  const edgeSource = readFileSync(new URL('../supabase/functions/unified-opportunities/index.ts', import.meta.url), 'utf8');
  const schemaSource = readFileSync(new URL('../supabase/migrations/20260731035000_unified_opportunity_surface_schema.sql', import.meta.url), 'utf8');
  assert.match(edgeSource, /create_external_opportunity_review_trusted/);
  assert.doesNotMatch(edgeSource, /web_job_interest|applications|submissions|representation/);
  assert.match(schemaSource, /grant execute[\s\S]*create_external_opportunity_review_trusted[\s\S]*to service_role/);
  assert.match(schemaSource, /revoke all[\s\S]*create_external_opportunity_review_trusted[\s\S]*from public, anon, authenticated/);
});
