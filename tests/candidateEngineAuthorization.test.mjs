import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const files = {
  helper: "supabase/migrations/20260723134205_restore_active_staff_authorization_effects.sql",
  applications: "supabase/migrations/20260723134205_restore_active_staff_authorization_effects.sql",
  submissions: "supabase/migrations/20260723135237_repair_submissions_active_staff_authorization.sql",
  activity: "supabase/migrations/20260723140703_repair_activity_log_active_staff_authorization.sql",
  anonymousPrivileges: "supabase/migrations/20260803070251_revoke_candidate_engine_anonymous_table_privileges.sql",
};
const sql = Object.fromEntries(
  await Promise.all(Object.entries(files).map(async ([key, path]) => [key, await readFile(path, "utf8")])),
);

test("active-staff helper is private, security-definer, and search-path pinned", () => {
  assert.match(sql.helper, /private\.is_current_user_active_staff\(\)/);
  assert.match(sql.helper, /security definer/i);
  assert.match(sql.helper, /set search_path (?:=|to) ['"]?pg_catalog['"]?/i);
});

test("helper authorization includes only active admin, recruiter, and BD staff", () => {
  assert.match(sql.helper, /p\.is_active = true/i);
  for (const role of ["admin", "recruiter", "bd"]) assert.ok(sql.helper.includes(`'${role}'::text`));
});

test("helper denies inactive and non-staff authenticated users", () => {
  assert.match(sql.helper, /p\.is_active = true/i);
  assert.match(sql.helper, /p\.role in \('admin'::text, 'recruiter'::text, 'bd'::text\)/i);
  assert.doesNotMatch(sql.helper, /p\.role in \([^)]*'candidate'/i);
});

test("helper execution is revoked broadly then granted to authenticated", () => {
  assert.match(sql.helper, /revoke all on function private\.is_current_user_active_staff\(\) from public, anon, authenticated, service_role/i);
  assert.match(sql.helper, /grant execute on function private\.is_current_user_active_staff\(\) to authenticated/i);
});

for (const [surface, source] of [["applications", "applications"], ["submissions", "submissions"], ["activity_log", "activity"]]) {
  test(`${surface} has staff SELECT, INSERT, and UPDATE policies`, () => {
    for (const action of ["select", "insert", "update"]) {
      assert.ok(sql[source].includes(`${surface}_${action}_staff`));
    }
    assert.match(sql[source], /private\.is_current_user_active_staff\(\)/);
  });

  test(`${surface} does not create a staff DELETE policy`, () => {
    assert.doesNotMatch(sql[source], new RegExp(`create\\s+policy\\s+[\"']?${surface}_delete_staff`, "i"));
  });
}

test("forward repair revokes every direct anon and PUBLIC table privilege only from Candidate Engine tables", () => {
  for (const table of ["applications", "submissions"]) {
    assert.match(
      sql.anonymousPrivileges,
      new RegExp(`revoke all privileges on table public\\.${table} from anon, public`, "i"),
    );
  }
  assert.doesNotMatch(sql.anonymousPrivileges, /drop\s+policy|create\s+policy|alter\s+policy/i);
});

test("forward repair proves grants, RLS, active-staff policies, and DELETE denial remain safe", () => {
  assert.match(sql.anonymousPrivileges, /aclexplode/i);
  assert.match(sql.anonymousPrivileges, /privilege\.grantee in \(0, to_regrole\('anon'\)::oid\)/i);
  for (const privilege of ["SELECT", "INSERT", "UPDATE"]) {
    assert.match(
      sql.anonymousPrivileges,
      new RegExp(`has_table_privilege\\('authenticated',[\\s\\S]*'${privilege}'\\)`, "i"),
    );
  }
  assert.match(sql.anonymousPrivileges, /relation\.relrowsecurity/i);
  assert.match(sql.anonymousPrivileges, /private\.is_current_user_active_staff/i);
  assert.match(sql.anonymousPrivileges, /cmd in \('DELETE', 'ALL'\)/i);
});
