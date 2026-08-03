import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20260803144648_add_public_external_opportunity_catalogue.sql', import.meta.url), 'utf8');

test('anonymous catalogue exposes a fixed safe field allowlist', () => {
  assert.match(migration, /returns table \([\s\S]*job_title text[\s\S]*salary_text text[\s\S]*\)/);
  for (const privateField of ['suppression_reason', 'suppressed_at', 'retired_at timestamptz', 'created_at', 'updated_at', 'source_reference_id']) {
    assert.doesNotMatch(migration.slice(0, migration.indexOf('language sql')), new RegExp(privateField));
  }
});

test('anonymous catalogue is strictly active, published and freshness-valid', () => {
  assert.match(migration, /publication_status = 'published'/);
  assert.match(migration, /verification_status = 'verified_active'/);
  assert.match(migration, /retired_at is null/);
  assert.match(migration, /last_verified_at >= now\(\) - interval '30 days'/);
});

test('execution is narrow without direct anonymous table grants', () => {
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /revoke all on function public\.list_public_external_opportunities_v1\(\) from public/);
  assert.match(migration, /grant execute on function public\.list_public_external_opportunities_v1\(\) to anon, authenticated/);
  assert.doesNotMatch(migration, /grant\s+select[\s\S]+external_opportunities[\s\S]+anon/i);
});
