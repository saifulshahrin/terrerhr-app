import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyDestination,
  classifySource,
  hostnameOf,
  isAggregator,
  markDuplicates,
  normalizeUrl,
  parseEnv,
} from '../scripts/jooble-suitability-pilot.ts';

test('loads a quoted non-empty key without exposing it', () => {
  assert.equal(parseEnv('JOOBLE_API_KEY="secret-value"\n', 'JOOBLE_API_KEY')?.length, 12);
  assert.equal(parseEnv('JOOBLE_API_KEY=\n', 'JOOBLE_API_KEY'), null);
});

test('rejects known aggregator names and hosts', () => {
  assert.equal(isAggregator('JobStreet Malaysia'), true);
  assert.equal(classifySource('Employer Careers', 'https://linkedin.com/jobs/1'), 'known aggregator');
});

test('recognises ATS destinations conservatively', () => {
  assert.equal(classifyDestination('company.myworkdayjobs.com'), 'official ATS');
  assert.equal(classifySource('Company Careers', 'https://company.myworkdayjobs.com/job/1'), 'likely official ATS');
  assert.equal(classifySource('Unclear Feed', 'https://example.com/job/1'), 'unknown or intermediary');
});

test('normalizes tracking parameters and host casing', () => {
  assert.equal(hostnameOf('https://WWW.Example.com/a'), 'example.com');
  assert.equal(normalizeUrl('https://WWW.Example.com/job/?utm_source=x&id=1#top'), 'https://example.com/job?id=1');
});

test('deduplicates by ID, URL and company-title-location', () => {
  const base = {
    query: 'Data Analyst', id: '1', title: 'Data Analyst', company: 'Acme',
    location: 'Malaysia', salary: null, source: 'Acme Careers',
    link: 'https://acme.example/jobs/1', snippet: null, employmentType: null,
    updated: null, sourceClass: 'likely direct employer', complete: true,
    accepted: true, duplicate: false, duplicateReasons: [],
    malaysiaRelevance: 'clearly Malaysian', redirect: null,
  };
  const records = [structuredClone(base), structuredClone(base)];
  markDuplicates(records);
  assert.equal(records[0].duplicate, false);
  assert.equal(records[1].duplicate, true);
  assert.deepEqual(records[1].duplicateReasons.sort(), ['Jooble ID', 'company + title + location', 'normalized final URL'].sort());
  markDuplicates(records);
  assert.equal(records[0].duplicate, false);
  assert.equal(records[1].duplicate, true);
});
