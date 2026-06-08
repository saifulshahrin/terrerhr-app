# Phase S2C Execution Readiness Package

## 1. Exact Scope of S2C Execution

S2C execution is the isolated disposable-project validation of Terrer’s exact-live canonical schema reconstruction package.

The purpose is to prove whether Terrer can be rebuilt in a clean Supabase project using authoritative schema evidence and synthetic non-PII fixtures, without touching production.

S2C execution scope is limited to:

- One isolated disposable Supabase project.
- Exact-live canonical database objects identified during S1/S2.
- Current grants, policies, functions, triggers, indexes, constraints, sequences, and views needed for validation.
- Storage dependencies for `candidate-resumes` and `bd-photo-intake`.
- Two minimum disposable Supabase Auth users.
- Matching `public.profiles` rows for admin and non-admin validation.
- Synthetic non-PII business fixtures.
- Validation evidence collection.
- Disposable cleanup/teardown planning.

S2C is validation, not production migration design.

## 2. What Will Be Created

If S2C execution is explicitly approved, the following may be created in the disposable project only:

- Disposable Supabase project.
- Local-only disposable environment configuration.
- Canonical public schema objects.
- Required views.
- Required database functions.
- Required triggers.
- Required indexes, constraints, sequences, grants, and policies.
- Required storage buckets and object policies.
- Two minimum disposable auth users:
  - `s2c_admin`
  - `s2c_recruiter` or equivalent non-admin user.
- Matching `public.profiles` rows for both auth users.
- Optional negative-control auth/profile fixtures, if approved.
- Synthetic companies, jobs, candidates, submissions, activities, web intake rows, AI run/memory rows, and storage files.
- Validation evidence artifacts.
- S2C validation report.

## 3. What Will NOT Be Created

S2C execution must not create:

- Production schema changes.
- Production database rows.
- Production auth users.
- Production storage buckets or objects.
- Production environment variables.
- Production migrations.
- Baseline migrations for the repository.
- Migration ledger changes.
- Application code changes.
- Edge Function deployments.
- Real candidate, client, company, BD, resume, or job PII.
- Long-lived credentials committed to Git.
- New feature work.

## 4. Disposable Project Requirements

The disposable project must meet these requirements before any execution:

- Clearly named as disposable, recommended pattern: `terrer-s2c-disposable-YYYYMMDD`.
- Isolated from production.
- Uses no production credentials.
- Uses no production project ref.
- Uses no production storage objects.
- Uses synthetic data only.
- Has region, platform, PostgreSQL, Auth, and Storage settings recorded.
- Has an assigned teardown owner.
- Has a planned teardown date.
- Has target project ref confirmed before every execution command.
- Has evidence recorded without secrets.

Required settings to record:

- Project name.
- Project ref, redacted in public documentation if needed.
- Region.
- PostgreSQL version.
- Supabase platform/API version if visible.
- Auth settings relevant to fixture users.
- Storage settings and file limits if visible.
- Installed extensions.
- Exposed schemas.
- API roles/grants where visible.
- Event trigger support.
- Generated-type capability.

## 5. Bootstrap Requirements

Minimum required bootstrap state:

1. One real disposable Supabase Auth admin user.
2. One real disposable Supabase Auth non-admin user.
3. One `public.profiles` row for the admin user.
4. One `public.profiles` row for the non-admin user.
5. `profiles.id = auth.users.id` for both users.
6. Admin profile role is `admin`.
7. Non-admin profile role is `recruiter` or `bd`.
8. Both positive-control profiles have `is_active = true`.
9. Synthetic business fixtures reference those users where ownership or policies require it.
10. Optional negative-control user/profile state is defined before use.

Without this bootstrap, S2C cannot validate:

- `profiles` FK behavior.
- `is_current_user_admin()`.
- Admin/non-admin policy behavior.
- Authenticated workflow behavior.
- Profile-dependent RLS behavior.
- Authenticated storage behavior.

## 6. Actions That Will Be Performed During S2C Execution

If and only if explicit execution approval is granted, actions should be performed in this exact order:

1. Confirm current Git branch and clean working tree.
2. Confirm human approval for disposable-project execution.
3. Confirm the target is a disposable Supabase project, not production.
4. Record disposable project name, project ref, region, and platform settings.
5. Confirm no production credentials, URLs, project refs, or storage objects are active.
6. Prepare local-only disposable environment context without committing values.
7. Record Supabase Auth, Storage, PostgreSQL, extension, role, and schema settings.
8. Reconstruct required canonical schema objects in dependency order.
9. Reconstruct required functions.
10. Reconstruct required triggers.
11. Reconstruct required views.
12. Reconstruct required grants, policies, constraints, indexes, and sequences.
13. Configure approved disposable storage buckets and storage object policies.
14. Create or confirm the two required disposable Auth users.
15. Create or confirm matching `public.profiles` rows.
16. Validate `profiles.id` matches `auth.users.id`.
17. Validate admin and non-admin profile roles.
18. Validate active-state assumptions.
19. Load approved synthetic non-PII business fixtures.
20. Upload approved synthetic storage files.
21. Validate table row counts.
22. Validate constraints, FKs, indexes, and sequences.
23. Validate `is_current_user_admin()` for admin and non-admin users.
24. Validate `create_submission_with_activity(...)`.
25. Validate submission and activity trigger side effects.
26. Validate company updated-at trigger behavior.
27. Validate candidate search and pipeline views.
28. Validate public intake read/write behavior.
29. Validate candidate-derived rows for skills, scores, and capabilities.
30. Validate autonomous recruiter run and memory fixtures.
31. Validate RLS allow/deny behavior by role.
32. Validate storage upload/read/update/delete/signed-access behavior.
33. Generate Supabase types from the disposable project.
34. Compare generated types against expected canonical contracts.
35. Run approved build or smoke checks against disposable configuration only, if separately approved.
36. Classify every failure.
37. Record evidence artifacts without secrets or PII.
38. Produce an S2C validation report.
39. Recommend GO/NO-GO for baseline migration design.
40. Execute approved cleanup or document teardown hold.

## 7. Validation Sequence

Validation should proceed from platform and identity outward:

1. Target isolation validation.
2. Platform settings validation.
3. Schema object reconstruction validation.
4. Auth/profile bootstrap validation.
5. Synthetic fixture validation.
6. Function validation.
7. Trigger validation.
8. View validation.
9. RLS/policy validation.
10. Storage validation.
11. Generated type validation.
12. Optional app smoke validation.
13. Evidence and report validation.

## 8. Success Criteria

S2C succeeds only if:

- Disposable project isolation is confirmed.
- No production credentials or data are used.
- Canonical objects reconstruct in dependency order.
- Required functions, triggers, views, policies, grants, indexes, constraints, and sequences are present.
- Two disposable auth users and matching `profiles` rows are valid.
- `is_current_user_admin()` returns expected results for admin and non-admin users.
- Synthetic fixtures load successfully.
- Expected table row counts are achieved.
- Trigger side effects match expectations.
- Views return expected synthetic results.
- RLS/policy tests produce expected allow/deny behavior.
- Storage bucket and object policy behavior matches expected synthetic tests.
- Generated types align with canonical contracts or differences are documented.
- Every failure is classified.
- S2C report clearly states whether baseline migration design may begin.

## 9. Failure Criteria

S2C fails or must pause if:

- Target project identity is uncertain.
- Any production credential or production project ref is detected.
- Disposable project cannot be confirmed.
- Required Auth users cannot be created.
- Required `profiles` rows cannot link to `auth.users`.
- `is_current_user_admin()` returns incorrect results.
- Required canonical objects cannot be reconstructed.
- Critical functions or triggers cannot be created.
- RLS or storage policies behave dangerously outside expected evidence.
- Synthetic fixtures cannot support required validation assertions.
- Generated types cannot be produced or show critical contract drift.
- Any production data or PII appears in validation context.

## 10. Rollback / Cleanup Procedure

S2C rollback is disposable-project cleanup:

1. Stop execution immediately.
2. Confirm the affected target is disposable, not production.
3. Preserve approved evidence only.
4. Remove synthetic storage objects, if approved.
5. Remove synthetic auth users, if approved.
6. Remove local disposable environment values.
7. Delete or archive the disposable project, if approved.
8. Confirm no credential files were committed.
9. Confirm no production object was touched.
10. Record cleanup result in the S2C validation report.

If immediate teardown is not approved, the project must be marked inactive with an owner and cleanup deadline.

## 11. Human Approval Gates

Human approval is required before:

1. Creating or selecting a disposable Supabase project.
2. Linking local tooling to any Supabase project.
3. Creating local disposable environment configuration.
4. Executing SQL.
5. Creating or applying migrations.
6. Creating auth users.
7. Creating or modifying `profiles` rows.
8. Creating or changing storage buckets, storage policies, or storage objects.
9. Loading synthetic fixtures.
10. Using service-role credentials.
11. Running app build/smoke checks against disposable environment variables.
12. Deleting or tearing down the disposable project.
13. Creating baseline migration drafts from validation results.
14. Touching production in any way.

## 12. Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Accidental production target | Critical | Confirm project ref, URL, and credentials before every execution step. |
| Auth/profile bootstrap failure | High | Use minimum two-user bootstrap and validate before business fixtures. |
| RLS/storage behavior drift | High | Test as explicit evidence layer; do not treat current posture as future approval. |
| `candidate_skills` contract ambiguity | High | Use synthetic join assertions and classify results as contract evidence. |
| Unknown writer ownership | Medium | Validate structural behavior; defer production ownership decisions. |
| Duplicate company triggers | Medium | Test exact-live behavior; decide cleanup later. |
| Event trigger portability | Medium-high | Treat `rls_auto_enable()` / `ensure_rls` as conditional. |
| Fixture incompleteness | Medium | Use deterministic fixture matrix before execution. |
| Secrets exposure | Critical | Never commit env files or credential values. |
| Overinterpreting disposable success | Medium | S2C proves rebuild feasibility, not production safety by itself. |

## 13. Estimated Execution Duration

Estimated S2C execution duration after explicit approval:

| Activity | Estimate |
|---|---:|
| Disposable project confirmation and settings capture | 30-60 minutes |
| Schema reconstruction execution | 1-2 hours |
| Auth/profile bootstrap | 30-60 minutes |
| Synthetic fixture loading | 1-2 hours |
| Function, trigger, view, RLS, and storage validation | 2-4 hours |
| Type generation and comparison | 30-60 minutes |
| Evidence packaging and report | 1-2 hours |
| Cleanup/teardown | 30-60 minutes |

Expected total: **1 working day** for a clean run, or **2-3 working days** if platform drift, fixture gaps, or auth/storage issues appear.

## Execution Boundary

This package does not authorize execution.

Still forbidden without explicit approval:

- SQL creation or execution.
- Migration creation or application.
- Disposable project creation.
- Supabase project linking.
- Auth user creation.
- Profile row creation.
- Schema, RLS, auth, storage, environment, application, production, or deployment changes.

This document only defines the final readiness package required before those actions can be requested.
