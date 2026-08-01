import assert from 'node:assert/strict';
import test from 'node:test';
import { loadUnifiedOpportunities } from '../src/lib/unifiedOpportunityQuery.ts';

const canonical = {
  id: 'canonical-id',
  job_title: 'Canonical role',
  company_name: 'Terrer client',
  location: 'Kuala Lumpur',
  job_description_text: 'Canonical summary',
  external_job_url: null,
  posted_date: null,
  created_at: '2026-07-30T00:00:00Z',
  updated_at: '2026-07-31T00:00:00Z',
  role_family: 'software',
};

const external = {
  id: 'external-id',
  job_title: 'External role',
  company_name: 'Employer',
  location: 'Petaling Jaya',
  opportunity_summary: null,
  source_url: 'https://example.com/job/1',
  posted_at: null,
  discovered_at: '2026-07-31T00:00:00Z',
  last_verified_at: '2026-08-01T00:00:00Z',
  role_family: 'data',
};

function source(canonicalRows = [canonical], externalRows = [external]) {
  return {
    async listCanonical() { return canonicalRows; },
    async listExternal() { return externalRows; },
    async listCanonicalMatches() {
      return [{ opportunityId: 'canonical-id', score: 91, reasons: ['Strong Fit'] }];
    },
    async listExternalMatches() {
      return [{ opportunityId: 'external-id', score: 88, reasons: ['Role alignment'] }];
    },
  };
}

test('returns a consistent shape while preserving both origins', async () => {
  const results = await loadUnifiedOpportunities(source(), { candidateId: 'candidate-id' });
  assert.equal(results.length, 2);
  assert.deepEqual(new Set(results.map((item) => item.origin)), new Set(['canonical_terrer', 'external']));
  assert.deepEqual(Object.keys(results[0]).sort(), Object.keys(results[1]).sort());
  assert.equal(results.find((item) => item.origin === 'canonical_terrer').matchScore, 91);
  assert.equal(results.find((item) => item.origin === 'external').matchScore, 88);
});

test('keeps canonical and external action capabilities isolated', async () => {
  const results = await loadUnifiedOpportunities(source());
  const canonicalResult = results.find((item) => item.origin === 'canonical_terrer');
  const externalResult = results.find((item) => item.origin === 'external');
  assert.equal(canonicalResult.actions.interest.kind, 'canonical_interest');
  assert.equal(canonicalResult.actions.review.available, false);
  assert.equal(externalResult.actions.interest.available, false);
  assert.equal(externalResult.actions.review.kind, 'external_review');
});

test('returns an empty array for an empty repository', async () => {
  assert.deepEqual(await loadUnifiedOpportunities(source([], [])), []);
});
