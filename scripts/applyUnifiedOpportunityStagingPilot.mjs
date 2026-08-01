import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const APPROVED_PROJECT_REF = 'nulpvbirlhauukccunqg';
const APPROVED_DATABASE_HOST = `db.${APPROVED_PROJECT_REF}.supabase.co`;
const PILOT_SQL_PATH = fileURLToPath(
  new URL('../supabase/pilot/20260801_unified_opportunity_staging_pilot.sql', import.meta.url)
);

function readOption(name) {
  const positions = process.argv
    .map((value, index) => (value === name ? index : -1))
    .filter((index) => index >= 0);

  if (positions.length !== 1) return null;
  const value = process.argv[positions[0] + 1];
  return value && !value.startsWith('--') ? value : null;
}

function fail(message) {
  console.error(`Pilot guard failed: ${message}`);
  process.exit(2);
}

const projectRef = readOption('--project-ref');
const checkOnly = process.argv.includes('--check-only');

if (!projectRef) {
  fail('--project-ref is required');
}

if (projectRef !== APPROVED_PROJECT_REF) {
  fail(`project ${projectRef} is not the approved staging project`);
}

if (checkOnly) {
  console.log(`Pilot guard passed for staging project ${APPROVED_PROJECT_REF}`);
  process.exit(0);
}

const databaseUrl = process.env.TERRER_STAGING_DATABASE_URL;
if (!databaseUrl) {
  fail('TERRER_STAGING_DATABASE_URL is required');
}

let parsedDatabaseUrl;
try {
  parsedDatabaseUrl = new URL(databaseUrl);
} catch {
  fail('TERRER_STAGING_DATABASE_URL is not a valid URL');
}

if (
  parsedDatabaseUrl.protocol !== 'postgresql:' ||
  parsedDatabaseUrl.hostname !== APPROVED_DATABASE_HOST
) {
  fail(`database host must be exactly ${APPROVED_DATABASE_HOST}`);
}

const result = spawnSync(
  'psql',
  [
    '--set',
    'ON_ERROR_STOP=1',
    '--set',
    `target_project_ref=${projectRef}`,
    '--file',
    PILOT_SQL_PATH,
    databaseUrl,
  ],
  { stdio: 'inherit' }
);

if (result.error) {
  fail(`could not start psql: ${result.error.message}`);
}

process.exit(result.status ?? 1);
