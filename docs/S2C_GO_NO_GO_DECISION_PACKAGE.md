# Phase S2C GO/NO-GO Decision Package

## 1. Executive Summary

S1, S2A, S2B, S2B.5, and the S2C Preparation Package have brought Terrer to a strong planning position for disposable-project validation. The approved canonical boundary is clear, legacy `terrer_*` objects are frozen, exact-live reconstruction evidence is organized, and the non-ready object set is known.

However, Terrer is not yet ready for blind S2C execution. The correct decision is:

**A. Should we execute S2C disposable-project validation now?**

**Decision: CONDITIONAL GO**

This means S2C execution may proceed only after the remaining entry conditions are explicitly approved. The schema evidence is mature enough to justify moving toward disposable validation, but execution must wait until the auth/profile bootstrap, fixture scope, disposable project target, and validation assertions are approved.

**B. Single biggest blocker:** synthetic auth/profile bootstrap.

**C. Safest next Codex task:** create a documentation-only `S2C_FIXTURE_AND_BOOTSTRAP_SPECIFICATION.md` that defines synthetic users, `profiles` rows, non-PII fixtures, storage files, expected assertions, and execution approval gates.

## 2. Current Readiness Status

The current reconstruction status remains:

| Status | Count | Meaning |
|---|---:|---|
| `READY` | 53 | Suitable for exact-live draft reconstruction and disposable validation. |
| `PARTIAL` | 16 | Physical evidence exists, but operational, writer, platform, or behavior proof is incomplete. |
| `BLOCKED` | 1 | A required auth/profile validation dependency has no approved mechanism yet. |

Readiness is strongest for core physical schema reconstruction: canonical tables, views, functions, triggers, grants, policies, and captured storage definitions. Readiness is weakest for auth bootstrap, candidate-derived data producers, public intake writers, storage behavior, and conditional security automation.

## 3. Review of the 16 PARTIAL Objects

| Object | Type | Main unresolved issue | Disposable validation posture |
|---|---|---|---|
| `profiles` | table | Auth lifecycle and profile row creation path unresolved. | Must be covered by approved bootstrap before execution. |
| `skills` | table | Taxonomy writer, ID generation, and dedupe rules unclear. | Acceptable if synthetic fixture defines controlled skills. |
| `autonomous_recruiter_runs` | table | Production writer and run lifecycle unknown. | Acceptable as synthetic AI operating fixture. |
| `web_candidate_intakes` | table | External caller and promotion path unverified. | Acceptable if anon/auth intake assertions are defined. |
| `web_job_interest` | table | Public writer, policy posture, and review lifecycle unresolved. | Acceptable if public write/read tests are defined. |
| `candidate_scores` | table | Producer, cardinality, and refresh lifecycle unknown. | Acceptable as explicit contract-gap validation target. |
| `candidate_capabilities` | table | Producer and uniqueness unknown. | Acceptable as explicit contract-gap validation target. |
| `autonomous_recruiter_memory` | table | Service writer, source-run relationship, and retention unknown. | Acceptable as synthetic AI memory fixture. |
| `candidate_skills` | table | No key, nullable relationships, writer mismatch/unknown producer. | High-risk; acceptable only with explicit synthetic join assertions. |
| `evidence_signals` | table | Active purpose and producer unclear. | Defer or include as preserve-only if approved. |
| `rls_auto_enable()` | function | Baseline inclusion and portability unresolved. | Test only as conditional exact-live behavior. |
| `set_updated_at` on `companies` | trigger | Duplicate company update trigger. | Acceptable as exact-live behavior test. |
| `set_updated_at_companies` | trigger | Duplicate company update trigger. | Acceptable as exact-live behavior test. |
| `ensure_rls` | trigger | Event trigger depends on conditional RLS automation. | Test only if explicitly approved for disposable validation. |
| `candidate-resumes` | storage dependency | Path, signed access, ownership, and policy behavior untested. | Acceptable with synthetic files and storage assertions. |
| `bd-photo-intake` | storage dependency | Ownership, retention, broad CRUD behavior, MIME/size ambiguity. | Acceptable with synthetic files and storage assertions. |

## 4. Review of the 1 BLOCKED Object

| Object/dependency | Type | Why blocked | Required resolution |
|---|---|---|---|
| Synthetic profile bootstrap | auth dependency | No approved method exists to create disposable auth users and matching `profiles` rows for admin/non-admin policy testing. | Approve a non-production bootstrap plan and fixture set before S2C execution. |

This blocker does not prevent documentation, fixture planning, or approval packaging. It does prevent responsible execution because authenticated workflow validation depends on `profiles`, profile policies, and `is_current_user_admin()`.

## 5. Issues Acceptable for Disposable Validation

The following issues can be carried into S2C as explicit validation targets:

- Unknown candidate-derived data producers, if synthetic rows are defined.
- `candidate_scores` cardinality ambiguity, if expected row scenarios are documented.
- `candidate_capabilities` producer ambiguity, if treated as contract-gap evidence.
- `autonomous_recruiter_runs` and `autonomous_recruiter_memory` lifecycle ambiguity, if synthetic AI operating rows are used.
- Public intake writer uncertainty, if anon/auth behavior tests are included.
- Storage path and access uncertainty, if synthetic files and expected CRUD/signed-access assertions are included.
- Duplicate company update triggers, if tested as exact-live behavior rather than approved target design.
- `rls_auto_enable()` and `ensure_rls`, if treated as conditional exact-live evidence rather than final security architecture.
- `evidence_signals`, if explicitly included as preserve-only or deferred from validation.

## 6. Issues That Must Be Resolved Before Disposable Validation

The following must be resolved before execution:

1. Approved synthetic auth/profile bootstrap plan.
2. Approved disposable Supabase project target and isolation controls.
3. Approved synthetic fixture scope.
4. Approved validation assertions and pass/fail matrix.
5. Approved handling for storage fixture files and policies.
6. Approved handling for duplicate company triggers.
7. Approved handling for `rls_auto_enable()` and `ensure_rls`.
8. Explicit approval to create/link/use the disposable project and execute SQL against it.

## 7. Exact Missing Evidence

The missing evidence is:

- Synthetic admin and non-admin auth user definitions.
- Matching synthetic `profiles` row shape and role expectations.
- Expected behavior when `profiles` is absent or inactive.
- Disposable project region, platform version, PostgreSQL version, Auth settings, and Storage settings.
- Expected synthetic fixture rows for all canonical domains.
- Expected row counts after fixture load.
- Expected function outputs for `is_current_user_admin()` and `create_submission_with_activity(...)`.
- Expected trigger side effects for submissions, activity, and company update timestamps.
- Expected candidate search outputs for `vw_candidate_search` and `vw_candidate_search_clean`.
- Expected storage paths, allowed MIME/size assumptions, signed access behavior, and role-policy results.
- Expected anon/auth/service-role allow/deny behavior for public intake and storage objects.
- Whether `evidence_signals` is included, preserve-only, or deferred.
- Whether conditional RLS automation is run in S2C or only documented as a live artifact.

## 8. Exact Evidence Collection Steps If Needed

Before execution, collect evidence through documentation and approved inspection only:

1. Draft synthetic auth/profile bootstrap specification.
2. Draft non-PII fixture matrix by table, view, function, trigger, and storage dependency.
3. Draft expected validation assertion matrix.
4. Map each PARTIAL object to a fixture and assertion.
5. Define disposable project settings to record before execution.
6. Define exact target confirmation checklist to avoid production access.
7. Define storage fixture paths and synthetic file names.
8. Define conditional handling for `rls_auto_enable()` and `ensure_rls`.
9. Define duplicate company trigger expected behavior.
10. Produce an approval checklist for execution authority.

These steps do not require SQL, migrations, disposable project creation, or production access.

## 9. Recommended GO / NO-GO Decision

**Recommended decision: CONDITIONAL GO**

Rationale:

- The physical reconstruction evidence is strong enough to justify preparing execution.
- The remaining gaps are exactly the kinds of issues disposable validation is meant to expose.
- The auth/profile bootstrap blocker must be resolved before execution starts.
- Execution without approved fixtures and assertions would create ambiguous results and unnecessary risk.

## 10. If GO: Proposed S2C Execution Scope

If the human decision is upgraded from `CONDITIONAL GO` to `GO`, S2C execution should be limited to:

- One isolated disposable Supabase project.
- No production data or credentials.
- Exact-live canonical tables, views, functions, triggers, grants, policies, constraints, indexes, and sequences.
- Storage buckets `candidate-resumes` and `bd-photo-intake` with synthetic files only.
- Synthetic auth users and matching `profiles` rows.
- Synthetic fixtures covering relationship intelligence, demand, requirements, candidates, matching, submissions, activity, web intake, AI run/memory, and storage.
- Generated type comparison.
- Build/smoke checks only against disposable configuration, if separately approved.
- Evidence report and cleanup/teardown recommendation.

Execution must not include production changes, baseline migration creation, migration ledger cleanup, application code changes, deployment, or real PII.

## 11. If NO-GO: Proposed Evidence Collection Scope

If the decision is `NO-GO`, the next scope should be documentation-only:

- Create `docs/S2C_FIXTURE_AND_BOOTSTRAP_SPECIFICATION.md`.
- Create a synthetic fixture matrix.
- Create an auth/profile bootstrap decision section.
- Create a storage policy validation matrix.
- Create a role/RLS assertion matrix.
- Create a disposable target confirmation checklist.
- Create an execution approval checklist.

This NO-GO path is also the recommended immediate next task under the current `CONDITIONAL GO`.

## 12. Human Approval Gates

Human approval is required before:

1. Creating or selecting a disposable Supabase project.
2. Linking local tooling to any Supabase project.
3. Executing SQL.
4. Creating or applying migrations.
5. Creating auth users.
6. Creating or modifying `profiles` rows.
7. Creating or changing storage buckets, policies, or objects.
8. Loading synthetic fixtures.
9. Using service-role credentials.
10. Running app checks against disposable environment variables.
11. Deleting or tearing down the disposable project.
12. Drafting migrations from validation results.
13. Touching production in any way.

## 13. What Remains Forbidden Without Explicit Approval

Codex must not:

- Create SQL.
- Create migrations.
- Create a disposable project.
- Execute SQL.
- Link to a Supabase project.
- Modify schema, RLS, auth, storage, environment, application code, production, or deployment.
- Modify tables, views, functions, triggers, grants, indexes, constraints, sequences, policies, or buckets.
- Use or expose secrets.
- Access, copy, export, or load production data or PII.
- Change the migration ledger.
- Deploy Edge Functions or application components.

## Final Decision

**S2C status: CONDITIONAL GO**

Terrer is ready to finish execution preparation, but not ready for execution itself. The safest next Codex task is to create the S2C fixture and bootstrap specification as documentation only. Once that package is reviewed and approved, the decision can be upgraded to GO for disposable-project validation execution.
