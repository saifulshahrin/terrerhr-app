import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const wrapper = fileURLToPath(
  new URL('../scripts/applyUnifiedOpportunityStagingPilot.mjs', import.meta.url)
);
const stagingRef = 'nulpvbirlhauukccunqg';
const pilotSql = readFileSync(
  new URL('../supabase/pilot/20260801_unified_opportunity_staging_pilot.sql', import.meta.url),
  'utf8'
);

function run(args, env = {}) {
  return spawnSync(process.execPath, [wrapper, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

test('fails closed when project reference is missing', () => {
  const result = run(['--check-only']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--project-ref is required/);
});

test('fails closed for a different or production project reference', () => {
  const result = run(['--project-ref', 'tlufttnmwtjbuhjcrqmp', '--check-only']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /not the approved staging project/);
});

test('accepts exactly the approved staging project reference', () => {
  const result = run(['--project-ref', stagingRef, '--check-only']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, new RegExp(`guard passed.*${stagingRef}`, 'i'));
});

test('cannot pair the staging reference with a different database host', () => {
  const result = run(
    ['--project-ref', stagingRef],
    { TERRER_STAGING_DATABASE_URL: 'postgresql://postgres:secret@db.other.supabase.co/postgres' }
  );
  assert.equal(result.status, 2);
  assert.match(result.stderr, /database host must be exactly/);
});

test('SQL rechecks the supplied reference before the first insert', () => {
  const guardPosition = pilotSql.indexOf("current_setting('terrer.target_project_ref'");
  const insertPosition = pilotSql.indexOf('insert into public.external_opportunities');
  assert.ok(guardPosition >= 0);
  assert.ok(insertPosition > guardPosition);
  assert.match(pilotSql, /is distinct from 'nulpvbirlhauukccunqg'/);
});
