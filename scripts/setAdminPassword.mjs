import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const ADMIN_USER_ID = '612730ac-36fb-4b38-b741-867fba41d9eb';
const ADMIN_EMAIL = 'terrerhr@gmail.com';
const EXPECTED_PROJECT_REF = 'tlufttnmwtjbuhjcrqmp';

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep <= 0) continue;

    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function fail(message) {
  console.error(`[setAdminPassword] ${message}`);
  process.exit(1);
}

function getProjectRef(url) {
  try {
    const host = new URL(url).hostname;
    const first = host.split('.')[0] || '';
    return first || null;
  } catch {
    return null;
  }
}

const rootDir = process.cwd();
readEnvFile(path.join(rootDir, '.env.local'));
readEnvFile(path.join(rootDir, '.env'));

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const args = process.argv.slice(2);
const verifyMode = args.includes('--verify');
const newPassword = args.find((arg) => !arg.startsWith('--'));

if (!supabaseUrl) {
  fail('Missing SUPABASE_URL (or VITE_SUPABASE_URL) in local env.');
}

if (!serviceRoleKey) {
  fail('Missing SUPABASE_SERVICE_ROLE_KEY in local env.');
}

if (!newPassword) {
  fail('Usage: node scripts/setAdminPassword.mjs "<NEW_PASSWORD>" [--verify]');
}

if (newPassword.length < 8) {
  fail('Password must be at least 8 characters.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const projectRef = getProjectRef(supabaseUrl);
if (!projectRef) {
  fail('Unable to parse project ref from SUPABASE_URL.');
}

if (projectRef !== EXPECTED_PROJECT_REF) {
  fail(
    `Project ref mismatch. Expected ${EXPECTED_PROJECT_REF} but script is targeting ${projectRef}. ` +
      'Aborting to prevent updating the wrong project.'
  );
}

async function verifyPasswordLogin(password) {
  if (!anonKey) {
    fail('Missing SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY) for --verify.');
  }

  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await anonClient.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password,
  });

  if (error || !data.session || !data.user) {
    fail(`Verify login failed: ${error?.message ?? 'No session returned'}`);
  }

  console.log('[setAdminPassword] Verify login succeeded for terrerhr@gmail.com.');
}

async function run() {
  console.log('[setAdminPassword] Starting local admin password recovery...');
  console.log(`[setAdminPassword] Target project ref: ${projectRef}`);

  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,role,is_active')
    .eq('id', ADMIN_USER_ID)
    .maybeSingle();

  if (profileError) {
    fail(`Profile verification failed: ${profileError.message}`);
  }

  if (!profileRow) {
    fail('No matching public.profiles row found for admin user ID.');
  }

  if (profileRow.email !== ADMIN_EMAIL) {
    fail(`Profile email mismatch for admin user ID (expected ${ADMIN_EMAIL}).`);
  }

  if (profileRow.is_active !== true) {
    fail('Profile exists but is not active (is_active must be true).');
  }

  const { data: authUserResult, error: authUserError } = await supabase.auth.admin.getUserById(ADMIN_USER_ID);
  if (authUserError) {
    fail(`Auth user lookup failed: ${authUserError.message}`);
  }

  if (!authUserResult?.user) {
    fail('No auth user found for admin user ID.');
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(ADMIN_USER_ID, {
    password: newPassword,
  });

  if (updateError) {
    fail(`Password update failed: ${updateError.message}`);
  }

  console.log('[setAdminPassword] Password updated successfully for terrerhr@gmail.com.');

  if (verifyMode) {
    console.log('[setAdminPassword] Running --verify signInWithPassword check...');
    await verifyPasswordLogin(newPassword);
  }

  console.log('[setAdminPassword] Next step: clear stale browser auth storage and sign in again.');
}

run().catch((err) => {
  fail(err instanceof Error ? err.message : 'Unexpected error');
});
