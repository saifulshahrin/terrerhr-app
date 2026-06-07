# Phase S2C Disposable Project Preparation Package

## 1. Objective

Prepare Terrer for an isolated disposable-project validation of the exact-live schema reconstruction package without creating the project, executing SQL, applying migrations, modifying schema, changing RLS/auth/storage behavior, or touching production.

S2C is intended to prove whether Terrer can be rebuilt from authoritative schema evidence in a clean Supabase environment using only synthetic non-PII data. This package defines the prerequisites, setup requirements, validation sequence, success criteria, failure handling, cleanup expectations, and approval gates needed before execution can begin.

## 2. Why S2C Execution Is Not Yet Approved

S2B.5 confirmed that Terrer still has **16 PARTIAL** items and **1 BLOCKED** dependency. The blocker is the missing synthetic `profiles` bootstrap path required to validate authenticated workflows, `is_current_user_admin()`, and profile-dependent policies.

Execution is not approved because the following remain unresolved:

- No approved method exists to create disposable auth users and matching `profiles` rows.
- Disposable Supabase, PostgreSQL, Auth, and Storage settings have not been selected or recorded.
- Synthetic fixtures and expected results are not yet fully defined.
- Storage path, signed-access, ownership, and policy assertions are not yet specified.
- Duplicate company triggers and conditional `rls_auto_enable()` / `ensure_rls` handling need explicit execution rules.
- No human approval has been granted to create a disposable project, link it, execute SQL, or configure storage/auth.

## 3. Required Prerequisites Before Execution

Before S2C execution starts, the following must be approved and documented:

1. **Disposable project target**
   - Project name convention.
   - Region.
   - Organization/workspace.
   - Confirmation that it is isolated from production.

2. **Auth/profile bootstrap plan**
   - Synthetic admin user fixture.
   - Synthetic non-admin user fixture.
   - Synthetic inactive or missing-profile test case, if needed.
   - Approved method for creating corresponding `profiles` rows.
   - Teardown expectations.

3. **Synthetic fixture pack**
   - Companies.
   - BD contacts and notes.
   - Jobs and job intake.
   - Candidates.
   - Skills and candidate skills.
   - Candidate scores and capabilities.
   - Submissions and activity log.
   - Web/public intake rows.
   - Autonomous recruiter run/memory rows.
   - Synthetic storage files.

4. **Validation assertions**
   - Expected table row counts.
   - Expected FK behavior.
   - Expected trigger side effects.
   - Expected function outputs.
   - Expected view output rows.
   - Expected RLS allow/deny behavior.
   - Expected storage upload/read/update/delete behavior.

5. **Explicit execution authority**
   - Permission to create or use a disposable project.
   - Permission to link tooling to the disposable project only.
   - Permission to execute approved reconstruction SQL against the disposable project only.
   - Permission to configure disposable storage/auth only.

## 4. Disposable Project Setup Requirements

The disposable project must be treated as a temporary validation sandbox:

- No production data.
- No production credentials.
- No production project ref.
- No production storage objects.
- No application deployment.
- No migration ledger changes to production.
- Clear naming that identifies it as disposable.
- Clear teardown owner and target teardown date.
- Separate environment file or local-only execution context, if needed, with values never committed.
- Synthetic-only fixtures.

Recommended naming pattern:

- `terrer-s2c-disposable-YYYYMMDD`

Required isolation controls:

- Confirm project ref before any command.
- Confirm target URL before any command.
- Confirm branch/worktree status before any generated artifact is considered.
- Keep all execution notes and evidence under `docs/schema-evidence/` or a future approved evidence directory.

## 5. Required Supabase Settings to Record

Record these settings before execution and include them in the S2C evidence package:

- Supabase project ref, redacted if necessary.
- Supabase project name.
- Region.
- PostgreSQL version.
- Supabase platform/API version if visible.
- Auth provider settings relevant to email/password fixture users.
- JWT expiry setting.
- Site URL and redirect URL configuration, without secrets.
- Storage file size limits if visible.
- Storage MIME restrictions if visible.
- Installed extensions.
- Default schemas exposed through API.
- API roles and grants visible from metadata or schema dump.
- Whether event triggers are supported.
- Whether `storage` schema policies behave the same as live evidence.
- Whether generated types can be produced successfully.

Do not record secrets, API keys, passwords, tokens, or production row contents.

## 6. Required Environment Variables Without Exposing Values

If execution is later approved, the following variable names may be needed in a local-only, uncommitted context:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

Rules:

- Values must never be committed.
- Values must not be pasted into documentation.
- Production values must not be reused for the disposable project.
- Service-role values may only be used for explicitly approved disposable validation steps.
- Any `.env`, `.env.local`, `.env.txt`, or local credential file remains excluded from staging and commits.

## 7. Required Baseline Input Artifacts

The following documents and evidence should be treated as S2C inputs:

- `docs/S1_CANONICAL_CONTRACTS.md`
- `docs/S1_BASELINE_OBJECT_MANIFEST.md`
- `docs/S1_WRITER_OWNERSHIP_MAP.md`
- `docs/S1_VALIDATION_AND_ROLLBACK_PLAN.md`
- `docs/S1_BASELINE_SPECIFICATION.md`
- `docs/S2A_BASELINE_RECONSTRUCTION_PLAN.md`
- `docs/S2A_DECISION_PACKAGE.md`
- `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md`
- `docs/S2B_RECONSTRUCTION_GAP_REPORT.md`
- `docs/S2B_DECISION_SUMMARY.md`
- `docs/S2B5_RECONSTRUCTION_READINESS_AUDIT.md`
- Existing live schema evidence under `docs/schema-evidence/`
- Supabase generated types, if present in the repository.
- Supabase migrations, used as historical reference only.

S2C should rely on live schema evidence and S1/S2 contract decisions over older drifted migrations.

## 8. Proposed Validation Sequence

Execution is not authorized yet. If later approved, the validation sequence should be:

1. Confirm target is the disposable project.
2. Record project settings and platform versions.
3. Confirm no production credentials or project refs are active.
4. Prepare approved exact-live reconstruction artifact.
5. Apply baseline objects in dependency order.
6. Recreate required grants, policies, functions, triggers, and views.
7. Configure approved storage buckets and policies.
8. Create synthetic auth users and matching `profiles` rows.
9. Load synthetic non-PII fixtures.
10. Validate table row counts.
11. Validate constraints, indexes, sequences, and FKs.
12. Validate function behavior.
13. Validate trigger side effects.
14. Validate view outputs.
15. Validate RLS allow/deny behavior by role.
16. Validate storage upload/read/update/delete/signed access behavior.
17. Generate Supabase types and compare against expected contracts.
18. Run app build and any approved smoke checks against disposable configuration only.
19. Record pass/fail evidence.
20. Produce S2C validation report and teardown recommendation.

## 9. Expected Success Criteria

S2C should be considered successful only if:

- All canonical tables, views, functions, triggers, indexes, constraints, grants, and policies reconstruct without unresolved dependency errors.
- Storage buckets and storage policies reproduce expected synthetic behavior.
- Synthetic auth/profile bootstrap works for admin and non-admin cases.
- `is_current_user_admin()` behaves as expected.
- `create_submission_with_activity(...)` creates the expected submission and activity records.
- Submission and activity triggers produce expected side effects.
- Candidate search views return expected synthetic rows.
- Candidate-derived objects can be populated or their gaps are explicitly confirmed.
- Public intake objects can be tested with expected anon/auth behavior.
- Generated types match the expected canonical contract or differences are documented.
- No production data, credentials, or project configuration is used.
- All failures are classified and assigned next actions.

## 10. Failure Classification Guide

| Failure class | Meaning | Example | Response |
|---|---|---|---|
| `BLOCKER` | Prevents continuation of validation | Auth/profile bootstrap cannot be created | Stop and document before further execution |
| `CRITICAL_DRIFT` | Rebuild differs from required live contract | Function signature or required FK cannot be reproduced | Stop affected workflow validation |
| `SECURITY_DRIFT` | RLS, grants, or storage policies behave differently | Anon can write where expected deny exists | Stop security-sensitive validation |
| `PLATFORM_DRIFT` | Disposable Supabase behavior differs from live evidence | Event trigger unsupported or storage policy differs | Document and decide compatibility path |
| `CONTRACT_GAP` | Object rebuilds but app contract is ambiguous | Candidate score cardinality unresolved | Continue only if isolated and documented |
| `FIXTURE_GAP` | Synthetic data is insufficient | View returns no rows due to missing fixture | Improve fixture, rerun targeted check if approved |
| `NON_BLOCKING_WARNING` | Does not stop validation but affects future cleanup | Duplicate update triggers both fire harmlessly | Record for stabilization plan |

## 11. Rollback / Cleanup Plan for Disposable Project

Because the project is disposable, rollback is primarily teardown:

1. Stop all validation commands.
2. Preserve approved evidence artifacts only.
3. Confirm no production project was targeted.
4. Remove synthetic storage objects.
5. Remove synthetic auth users, if teardown is manual and approved.
6. Delete or archive the disposable project, if explicitly approved.
7. Remove local disposable credentials from the local machine.
8. Confirm no environment files were committed.
9. Record final teardown status in the S2C report.

If teardown is not immediately approved, mark the project as inactive and document the owner, project ref, and cleanup deadline without exposing secrets.

## 12. Human Approval Gates

Approval is required before each of these gates:

1. Creating or selecting a disposable Supabase project.
2. Linking local tooling to any Supabase project.
3. Executing SQL against the disposable project.
4. Creating auth users.
5. Creating or modifying `profiles` rows.
6. Creating or changing storage buckets or storage policies.
7. Loading synthetic fixtures.
8. Running app checks against disposable environment variables.
9. Deleting or tearing down the disposable project.
10. Producing migration drafts from validation results.

## 13. What Codex May Do Autonomously Later

Without further approval, Codex may continue to:

- Inspect repository files.
- Inspect documentation.
- Inspect existing schema evidence.
- Prepare Markdown plans and decision packages.
- Draft fixture specifications without executable SQL.
- Draft validation matrices.
- Draft approval checklists.
- Draft rollback and teardown plans.
- Run local documentation-only checks.
- Run build/lint only if requested or already allowed by the task.

## 14. What Remains Forbidden Without Explicit Approval

Codex must not do any of the following without explicit approval:

- Execute SQL.
- Create or apply migrations.
- Create a disposable Supabase project.
- Link local tooling to a Supabase project.
- Modify schema, tables, views, functions, triggers, grants, indexes, or sequences.
- Modify RLS policies.
- Modify auth settings or auth users.
- Modify storage buckets, storage policies, or storage objects.
- Modify environment variables or credential files.
- Use production credentials.
- Access, export, copy, or load production row data or PII.
- Modify application code.
- Deploy Edge Functions or application components.
- Touch production.

## 15. Recommended Next Decision

The next decision should be:

**Approve S2C fixture and profile-bootstrap specification drafting: Yes / No**

Recommended answer: **Yes**.

This next step remains documentation-only. It should define the synthetic users, `profiles` rows, non-PII table fixtures, storage files, role-policy expectations, and pass/fail assertions required for S2C execution approval.

S2C execution itself should remain deferred until the fixture/bootstrap package is reviewed and explicitly approved.
