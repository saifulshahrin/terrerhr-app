import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = new URL('../supabase/migrations/20260803140228_provision_authenticated_candidate_profile.sql', import.meta.url);
const sql = (await readFile(migrationPath, 'utf8')).toLowerCase();

test('provisioning derives identity and confirmation server-side', () => {
  assert.match(sql, /v_auth_user_id uuid := auth\.uid\(\)/);
  assert.match(sql, /from auth\.users u/);
  assert.match(sql, /email_confirmed_at is not null/);
  assert.doesNotMatch(sql, /provision_authenticated_candidate_v1\([^)]*(email|auth_user)/);
});

test('provisioning is serialized, idempotent, and rejects ambiguous email mappings', () => {
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /candidate_auth_mappings/);
  assert.match(sql, /if v_matches > 1/);
  assert.match(sql, /candidate email mapping is ambiguous/);
  assert.match(sql, /auth_user_id uuid primary key/);
  assert.match(sql, /candidate_id uuid not null unique/);
});

test('candidate table writes remain behind a narrow privileged boundary', () => {
  assert.match(sql, /security definer/g);
  assert.match(sql, /revoke all on function public\.provision_authenticated_candidate_v1\(\) from public, anon/);
  assert.match(sql, /grant execute on function public\.provision_authenticated_candidate_v1\(\) to authenticated/);
  assert.doesNotMatch(sql, /grant insert on (table )?public\.candidates to authenticated/);
});

test('onboarding accepts only the candidate-safe field allowlist', () => {
  assert.match(sql, /key not in \('fullname', 'currentrole', 'targetrole', 'city', 'locationpreference', 'yearsexperience', 'keyskills'\)/);
  assert.match(sql, /profile payload contains unsupported fields/);
  assert.match(sql, /where m\.auth_user_id = v_auth_user_id/);
});

test('provenance tables are private and immutable', () => {
  assert.match(sql, /create table if not exists private\.candidate_profile_audit/);
  assert.match(sql, /candidate_profile_audit_immutable/);
  assert.match(sql, /candidate provisioning provenance is immutable/);
  assert.match(sql, /revoke all on schema private from public, anon, authenticated/);
});
