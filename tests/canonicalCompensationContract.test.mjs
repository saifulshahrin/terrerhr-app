import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { canonicalOpportunityToDto, externalOpportunityToDto } from '../src/lib/opportunityDto.ts';

const canonical = {
  id: 'canonical-id',
  job_title: 'Part-Time Marketing & Growth Coordinator',
  company_name: 'TerrerHR',
  location: 'Remote — Malaysia',
  job_description_text: 'Authoritative role description',
  compensation_text: 'RM1,000 per month',
  external_job_url: null,
  posted_date: null,
  created_at: '2026-08-02T00:00:00Z',
  updated_at: '2026-08-02T00:00:00Z',
  role_family: 'marketing',
};

const external = {
  id: 'external-id',
  job_title: 'External role',
  company_name: 'Employer',
  location: 'Malaysia',
  opportunity_summary: null,
  source_url: 'https://example.com/job',
  posted_at: null,
  discovered_at: '2026-08-01T00:00:00Z',
  last_verified_at: '2026-08-02T00:00:00Z',
  role_family: null,
};

test('canonical DTO preserves authoritative compensation text exactly', () => {
  const result = canonicalOpportunityToDto(canonical);
  assert.equal(result.salaryText, 'RM1,000 per month');
  assert.equal(result.title, canonical.job_title);
  assert.equal(result.company, canonical.company_name);
  assert.equal(result.summary, canonical.job_description_text);
});

test('canonical DTO preserves undisclosed compensation as null', () => {
  assert.equal(canonicalOpportunityToDto({ ...canonical, compensation_text: null }).salaryText, null);
});

test('canonical DTO does not trim or infer authoritative compensation', () => {
  assert.equal(
    canonicalOpportunityToDto({ ...canonical, compensation_text: '  RM1,000 per month  ' }).salaryText,
    '  RM1,000 per month  ',
  );
  assert.throws(
    () => canonicalOpportunityToDto({ ...canonical, compensation_text: 1000 }),
    /must be a string or null/,
  );
});

test('external opportunity mapping remains compatible with null salary text', () => {
  const result = externalOpportunityToDto(external);
  assert.equal(result.salaryText, null);
  assert.equal(result.actions.source.available, true);
  assert.equal(result.actions.review.available, true);
});

test('forward migration adds one nullable text field without access changes or estimates', () => {
  const migration = readFileSync(
    new URL('../supabase/migrations/20260802074653_add_canonical_compensation_text.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /alter table public\.jobs[\s\S]*add column if not exists compensation_text text;/i);
  assert.match(migration, /comment on column public\.jobs\.compensation_text/i);
  assert.match(migration, /employer- or Terrer-supplied candidate-facing compensation text/i);
  assert.match(migration, /nullable when compensation is not disclosed/i);
  assert.match(migration, /must not contain generated or inferred market estimates/i);
  assert.doesNotMatch(migration, /\bdefault\b/i);
  assert.doesNotMatch(migration, /\bgrant\b|\bpolicy\b|estimated market range|salary_min|salary_max/i);
});
