# Phase S1 Decision Package

Date: 7 June 2026  
Status: recommended for approval  
Mode: documentation and planning only

## 1. Executive Summary

Terrer has a functioning live Supabase schema, but the repository cannot reliably rebuild it. The live database, application queries, writer payloads, and migration history describe different contracts.

Phase S1 should establish a controlled preservation boundary before attempting repairs:

1. Approve the active operational tables as canonical.
2. Freeze the duplicate `terrer_*` domain as legacy.
3. Document exact canonical contracts and unknown writers.
4. Prepare a consolidated baseline for a disposable project.
5. Prove rebuild safety outside production.
6. Defer all production migration, schema, RLS, auth, and storage execution until separately approved.

The highest immediate risks are candidate-data exposure, anonymous mutation of operational records, broken candidate-skill writes, job and requirement drift, missing creation migrations, and an ambiguous local/remote migration ledger.

Canonical approval is a preservation decision, not approval of the current security model or every current field design.

## 2. Final Recommended Canonical Table List

### Identity and authorization

- `profiles`

### Relationship intelligence

- `companies`
- `bd_contacts`
- `bd_notes`

### Demand and requirement capture

- `job_sources`
- `jobs`
- `jobs_intake`
- `job_requirements`

### Candidate intelligence

- `candidates`
- `source_profiles`
- `skills`
- `candidate_skills`
- `candidate_scores`
- `candidate_capabilities` — provisional derived support required by the current candidate-search view

### Matching and recruitment execution

- `ai_assessments`
- `submissions`
- `activity_log`

### Marketplace and intake

- `web_candidate_intakes`
- `web_job_interest`

### AI operating layer

- `autonomous_recruiter_runs`
- `autonomous_recruiter_memory`

### Preserve outside the core canonical boundary

The following should be retained but not promoted into the first core canonical baseline without an ownership decision:

- `evidence_signals`
- `applications`
- `job_candidate_matches`
- `match_interactions`
- `outreach_log`
- `employer_job_intake`
- `employer_intake_actions`
- `target_companies`
- `company_identity_merge_v1_snapshot`
- `staging_bullhorn_companies`
- `staging_bullhorn_contacts`

Canonical read and transaction contracts that must be preserved with these tables include:

- `vw_candidate_search`
- `vw_candidate_search_clean`
- `is_current_user_admin`
- `create_submission_with_activity`
- submission/activity synchronization triggers
- canonical updated-at triggers

## 3. Final Recommended Legacy/Frozen `terrer_*` List

Freeze these tables as one parallel legacy domain:

- `terrer_companies`
- `terrer_company_contacts`
- `terrer_jobs`
- `terrer_candidates`
- `terrer_skills`
- `terrer_pipeline`

Also freeze:

- `terrer_jobs_view`

Freeze means:

- No new application consumers.
- No new writers or imports.
- No feature or schema expansion.
- No merge into canonical tables during S1.
- No deletion or privilege changes without separate approval.
- Read-only forensic inspection remains allowed.

The six tables contain 24 rows in total. No current repository consumer was found; `terrer_jobs_view` is the only captured database read-model dependency.

## 4. Critical Schema Contract Problems

### Critical

1. `candidate_skills` browser writes do not match the live normalized schema and can fail without stopping the candidate workflow.
2. `candidate_skills` has no primary or unique constraint, allowing ambiguous duplicate relations.
3. `skills` requires explicit IDs and lacks an enforced unique skill-name contract.
4. `job_requirements` migrations conflict with the live identifier, field, and requirement-type contract.
5. `jobs` migrations do not reproduce the live table or its current intelligence fields.
6. Core objects including `profiles`, `candidates`, `jobs_intake`, candidate search views, functions, and storage definitions lack authoritative creation migrations.
7. Candidate PII tables have RLS disabled while broad role grants exist.
8. Current browser workflows depend on anonymous access in demo mode, making isolated RLS tightening unsafe.

### High

1. `jobs_intake.job_id` is not constrained to `jobs.id`.
2. `job_requirements.job_id` is not constrained to `jobs.id`.
3. `jobs.company_id` is not constrained to `companies.id`.
4. `submissions` has duplicate and broad anonymous CRUD policies.
5. `create_submission_with_activity` has broad execution grants.
6. Anonymous `activity_log` inserts can indirectly mutate submissions through triggers.
7. `profiles` has no rebuild-safe bootstrap contract.
8. Candidate search depends on RLS-disabled base tables.
9. Storage policies are bucket-wide rather than path- and owner-scoped.
10. Several external production writers remain unidentified.

## 5. Migration Ledger Problems

- The repository contains 34 migration files.
- Only 18 versions appear aligned between local and remote ledgers.
- Three versions appear remote-only.
- Sixteen versions appear local-only.
- Short date versions and full timestamp versions are mixed.
- Versions `20260507`, `20260508`, and `20260509` appear on both sides as unmatched, indicating ledger/version parsing divergence.
- Historical migrations are materially drifted from live table definitions.
- Structural migrations, policies, seed data, and staging objects are mixed together.
- `IF NOT EXISTS` patterns can hide incompatible existing definitions.
- Large view chains are dropped and recreated by historical migrations.
- Some local migrations describe objects that are absent live, including `candidate_intent_events`.
- Applying the current local migration set to production is unsafe.
- Replaying the current migration history from zero will not reproduce the live app contract.

Recommended ledger posture:

1. Preserve the current ledger and migration directory as historical evidence.
2. Do not rewrite or repair production history yet.
3. Prepare a consolidated baseline for an isolated project.
4. Validate a zero-to-working rebuild.
5. Design ledger reconciliation only after the baseline is proven.

## 6. Proposed Phase S1 Implementation Sequence

| Sequence | Action | Risk |
|---:|---|---|
| 1 | Approve canonical, provisional, staging, prototype, and legacy classifications | Low |
| 2 | Apply a documentary freeze to `terrer_*` objects | Low |
| 3 | Produce per-object canonical contract sheets and writer ownership map | Medium |
| 4 | Prepare a consolidated baseline draft from authoritative live evidence | Medium |
| 5 | Build and validate the baseline in a disposable Supabase project | Low to production; medium execution |
| 6 | Draft contract repairs for candidate skills, requirements, jobs, intake, profiles, submissions, and search views | Medium while unapplied |
| 7 | Design authenticated write paths and least-privilege RLS/storage policies | Critical if executed; medium while drafted |
| 8 | Prepare a migration-ledger reconciliation runbook | High |
| 9 | Seek explicit approval for staged production implementation | Critical |

Production changes should be small, reversible, and separately approved. Exact-live reproduction and stabilization improvements should not be combined into one unreviewable migration.

## 7. What Is Safe to Do Now

The following are safe under the current authority:

- Approve the canonical and legacy classifications.
- Maintain the documentary freeze on `terrer_*`.
- Inspect repository, schema evidence, migrations, types, and application consumers.
- Create canonical schema contract sheets.
- Create a baseline object manifest and dependency order.
- Draft SQL and migrations without applying them.
- Draft validation, rollback, and backup runbooks.
- Identify unknown external writers and owners.
- Prepare synthetic non-PII test fixtures.
- Plan a disposable-project rebuild.
- Run build, lint, static analysis, and read-only validation.
- Commit and review documentation or unapplied draft artifacts on the working branch.

## 8. What Must Wait for Explicit Approval

- Executing SQL against Supabase.
- Applying or repairing migrations.
- Changing the production migration ledger.
- Creating, altering, renaming, or dropping database objects.
- Adding or validating production constraints.
- Changing grants or RLS policies.
- Changing authentication or profile bootstrap behavior.
- Changing storage buckets or storage object policies.
- Modifying production data.
- Freezing legacy writes through database privileges.
- Changing environment variables.
- Deploying Edge Functions or application releases.
- Creating or operating a disposable Supabase project if it incurs external resource creation or applies draft SQL.

## 9. Risk Rating

### Overall current-state risk: Critical

Reasons:

- Sensitive candidate and operational data is insufficiently protected.
- Anonymous writes affect jobs, submissions, assessments, requirements, and candidate relations.
- Current migrations cannot rebuild the working database.
- Core write contracts are inconsistent.
- Hidden external writers may be affected by schema or security changes.

### Discovery and documentation risk: Low

The current S1 discovery work is read-only and documentation-only.

### Baseline drafting risk: Medium

The main risk is encoding an existing defect or omitting an undocumented dependency. Static review and object manifests reduce this risk.

### Disposable-project validation risk: Low to production

There is no production effect if the project is fully isolated and uses synthetic data.

### Production implementation risk: Critical

Auth, RLS, storage, migration-ledger, and contract repairs can break active workflows if not sequenced with application writers and rollback controls.

## 10. Exact Next Action Recommendation

Approve this decision package, then assign the next Codex task:

> Create Phase S1.2 canonical schema contract sheets and a baseline object manifest from the authoritative schema evidence. Draft only. Do not create migrations, execute SQL, or modify Supabase. For every approved canonical table, view, function, trigger, and storage dependency, document keys, columns, nullability, constraints, indexes, dependencies, writers, approved future roles, known drift, validation checks, and rollback requirements.

This is the safest next action because it converts the approved preservation boundary into an implementation-grade specification without introducing database risk.

## Decision Section

| Decision | Recommendation |
|---|---|
| **APPROVE canonical table boundary** | **Yes** |
| **APPROVE freeze of `terrer_*` tables** | **Yes** |
| **APPROVE disposable-project baseline preparation** | **Yes** |
| **DEFER production migration execution** | **Yes** |

## Source Documents

- `docs/S1_CANONICAL_TABLE_REVIEW.md`
- `docs/S1_LEGACY_TABLE_FREEZE_PLAN.md`
- `docs/S1_SCHEMA_CONTRACT_REVIEW.md`
- `docs/S1_MIGRATION_LEDGER_REVIEW.md`
- `docs/S1_EXECUTION_PLAN.md`

