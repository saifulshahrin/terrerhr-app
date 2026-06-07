# Phase S2A Baseline Reconstruction Plan

Date: 7 June 2026  
Phase: S2A — Baseline Reconstruction Planning  
Status: planning only  
Execution authority: none

## 1. Objective and Scope

The S2 objective is to prove that Terrer can be rebuilt safely from authoritative, version-controlled schema definitions without touching production.

S2A prepares the implementation plan for that proof. It does not create executable SQL, migrations, a disposable project, or any database change.

S2A must define:

- Which objects are reconstructed.
- Which source wins when evidence conflicts.
- How exact-live reconstruction is separated from stabilization improvements.
- The required dependency order.
- The draft artifact set expected from S2B.
- Validation and stop/go gates for a future disposable-project run.

The intended S2 workflow is:

1. Reconstruct the approved live canonical contract.
2. Validate it in an isolated disposable project.
3. Apply proposed stabilization changes only as a separate, reviewable delta.
4. Keep production and its migration ledger untouched.

## 2. S1 Inputs Used

### Decision and classification

- `docs/S1_DECISION_PACKAGE.md`
- `docs/S1_CANONICAL_TABLE_REVIEW.md`
- `docs/S1_LEGACY_TABLE_FREEZE_PLAN.md`
- `docs/S1_SCHEMA_CONTRACT_REVIEW.md`
- `docs/S1_MIGRATION_LEDGER_REVIEW.md`

### Implementation contracts

- `docs/S1_CANONICAL_CONTRACTS.md`
- `docs/S1_BASELINE_OBJECT_MANIFEST.md`
- `docs/S1_WRITER_OWNERSHIP_MAP.md`
- `docs/S1_VALIDATION_AND_ROLLBACK_PLAN.md`
- `docs/S1_BASELINE_SPECIFICATION.md`

### Completion and authority

- `docs/S1_COMPLETION_REPORT.md`
- Approved S1 decisions:
  - Canonical boundary approved.
  - `terrer_*` freeze approved.
  - Disposable-project baseline preparation approved.
  - Production migration execution deferred.

### Authoritative evidence

- `docs/SCHEMA_AUTHORITATIVE_CAPTURE.md`
- `docs/schema-evidence/live_schema_catalog_ddl.sql`
- `docs/schema-evidence/live_public_types.ts`
- Catalog JSON for columns, constraints, indexes, relations, routines, triggers, dependencies, policies, grants, sequences, storage, and row counts.
- `docs/schema-evidence/migration_ledger.txt`
- `docs/schema-evidence/SHA256SUMS.txt`

### Repository implementation evidence

- `src/` Supabase readers and writers.
- `scripts/` service-role and operational writers.
- `supabase/functions/` Edge Function contracts.
- `supabase/migrations/` historical intent and drift.

## 3. Authoritative Source Hierarchy

When definitions conflict, S2B should use the following hierarchy.

### 1. Live schema evidence

Highest authority for current physical state:

- Exact columns, types, defaults, nullability, constraints, indexes, views, functions, triggers, grants, and policies.
- Storage bucket configuration and object policies.
- Current relation and rewrite dependencies.

Use live evidence to answer: **What exists and currently executes?**

Limitations:

- Live state may contain security defects, duplicate triggers, prototypes, and undocumented drift.
- Exact-live does not automatically mean target-state.

### 2. Generated live types

Authority for the database API shape visible to typed consumers:

- Table row/insert/update shapes.
- View row shapes.
- RPC signatures exposed in generated types.

Use types to detect:

- Missing or differently typed columns.
- Nullable versus required API fields.
- View output drift.

Limitations:

- Generated types do not fully describe constraints, indexes, triggers, grants, policies, or storage.

### 3. Application contracts

Authority for active product behavior:

- Fields selected by readers.
- Payloads used by writers.
- Required filters, ordering, and RPC behavior.
- Storage bucket and object-path expectations.

Use application contracts to answer: **What must continue working?**

Limitations:

- Some app writers are already incompatible with live state.
- Demo-mode anon behavior is not an approved target security model.

### 4. Migration history

Authority for historical intent only:

- Original naming and sequencing.
- Previously intended policies, checks, and views.
- Objects or fields that may have been applied outside the current ledger.

Use migrations to explain drift, not to override authoritative live definitions.

Limitations:

- The ledger is divergent.
- Several core objects lack creation migrations.
- Some migrations conflict with current app behavior.

### 5. S1 documentation

Authority for approved classification, scope, and future direction:

- Canonical versus legacy decisions.
- Baseline inclusion.
- Writer ownership and blockers.
- Repair recommendations.
- Validation, rollback, and stop/go criteria.

Use S1 decisions to answer: **What should be reconstructed, preserved, excluded, or deferred?**

## 4. Canonical Rebuild Object List

### Platform-provided prerequisites

- Supabase `auth` schema and `auth.users`.
- Supabase `storage` schema and service internals.
- Standard Supabase API roles.
- UUID-support extension required by captured defaults.

These are dependencies, not Terrer-owned reconstruction objects.

### Terrer-owned sequence

- `public.companies_id_seq`

### Core tables

| Domain | Tables |
|---|---|
| Identity | `profiles` |
| Relationship Intelligence | `companies`, `bd_contacts`, `bd_notes` |
| Demand and Requirements | `job_sources`, `jobs`, `jobs_intake`, `job_requirements` |
| Candidate Intelligence | `candidates`, `source_profiles`, `skills`, `candidate_skills`, `candidate_scores`, `candidate_capabilities` |
| Matching and Execution | `ai_assessments`, `submissions`, `activity_log` |
| Marketplace | `web_candidate_intakes`, `web_job_interest` |
| AI Operating Layer | `autonomous_recruiter_runs`, `autonomous_recruiter_memory` |

### Core read and transaction contracts

- `vw_candidate_search`
- `vw_candidate_search_clean`
- `is_current_user_admin()`
- `create_submission_with_activity(...)`
- canonical trigger helper functions
- canonical table triggers

### Core storage

- `candidate-resumes`
- `bd-photo-intake`
- Terrer-owned `storage.objects` policies for these buckets

### Full-fidelity reporting objects

Pipeline views:

- `recruiter_active_submissions`
- `vw_submissions_enriched`
- `vw_company_pipeline_summary`
- `vw_candidate_pipeline_summary`
- `vw_activity_log_enriched`
- `vw_pipeline_summary`
- `vw_outcomes_summary`
- `vw_live_work_queue`
- `vw_followup_queue`
- `vw_job_shortlist`
- `vw_recruiter_dashboard`

Demand and source views:

- `jobs_latest`
- `jobs_latest_practical`
- `jobs_reporting`
- `hiring_leaderboard_malaysia`
- `terrer_hiring_now`
- `vw_jobs_tier1_malaysia`
- `vw_market_signals`
- `vw_market_signals_active`
- `vw_market_signals_realtime`
- `vw_market_signals_recent`
- `vw_tier1_source_health`
- `vw_tier1_source_health_v2`
- `vw_tier1_source_diagnostics`
- `vw_tier1_source_health_summary`

### Conditional preserve-only objects

- `evidence_signals`
- `company_identity_merge_v1_snapshot`
- `resumes` bucket and its policy

These require an explicit full-fidelity scope decision.

## 5. Dependency Order

### Reconstruction layer A — environment assertions

1. Prove the target is disposable and not linked to production.
2. Confirm platform version and required extensions.
3. Confirm `auth`, `storage`, and API roles exist.
4. Record the empty-project object inventory.

### Layer B — sequences and root tables

1. `companies_id_seq`
2. `profiles`
3. `companies`
4. `job_sources`
5. `candidates`
6. `skills`
7. `autonomous_recruiter_runs`
8. `web_candidate_intakes`
9. `web_job_interest`

### Layer C — first-level dependent tables

1. `bd_contacts`
2. `jobs`
3. `source_profiles`
4. `candidate_scores`
5. `candidate_capabilities`
6. `autonomous_recruiter_memory`

### Layer D — relationship tables

1. `bd_notes`
2. `jobs_intake`
3. `job_requirements`
4. `candidate_skills`
5. `evidence_signals`, if selected

### Layer E — matching and execution

1. `ai_assessments`
2. `submissions`
3. `activity_log`

### Layer F — functions

1. `update_updated_at_column()`
2. `update_submission_stage_timestamp()`
3. `sync_submission_next_action_from_activity()`
4. `sync_submission_stage_from_activity()`
5. `is_current_user_admin()`
6. `create_submission_with_activity(...)`
7. Conditional `rls_auto_enable()`

### Layer G — triggers

1. Candidate updated-at.
2. Job updated-at.
3. One company updated-at trigger after resolving the live duplicate.
4. Submission stage timestamp.
5. Submission updated-at.
6. Activity next-action synchronization.
7. Activity stage synchronization.
8. Conditional `ensure_rls` event trigger.

### Layer H — views

1. Candidate search base view.
2. Candidate search clean view.
3. Pipeline base/enriched views.
4. Pipeline dependent dashboards and queues.
5. Jobs base reporting views.
6. Jobs dependent market/source-health views.

### Layer I — security and storage

1. Relation and sequence grants.
2. Function grants.
3. RLS enablement state.
4. Table policies.
5. Bucket configuration.
6. `storage.objects` policies.

### Layer J — synthetic fixtures and validation

Synthetic users, profiles, companies, contacts, jobs, candidates, skills, matches, submissions, activities, intakes, AI records, and files.

## 6. Objects Excluded From Baseline

### Legacy-frozen domain

- `terrer_companies`
- `terrer_company_contacts`
- `terrer_jobs`
- `terrer_candidates`
- `terrer_skills`
- `terrer_pipeline`
- `terrer_jobs_view`
- `set_updated_at()` when used only by legacy triggers
- all legacy `trg_terrer_*_updated_at` triggers

### Staging package

- `staging_bullhorn_companies`
- `staging_bullhorn_contacts`

Staging should be tested separately from the canonical product rebuild.

### Prototype objects excluded by default

- `applications`
- `job_candidate_matches`
- `match_interactions`
- `outreach_log`
- `employer_job_intake`
- `employer_intake_actions`
- `target_companies`
- `v_match_shortlist`
- `v_outreach_due`

These may be added to a secondary full-fidelity package only after an owner and test purpose are named.

### Planned but absent live

- `candidate_intent_events`

Do not reconstruct it merely because a local migration exists.

### Platform-managed storage internals

Do not reconstruct Supabase-owned storage tables, functions, or managed triggers as Terrer DDL.

## 7. Required Table Definitions to Reconstruct

S2B must draft exact-live table definition artifacts containing:

- Schema and table name.
- Column order.
- Data type.
- Default expression.
- Nullability.
- Identity/generated behavior.
- Primary key.
- Unique constraints.
- Check constraints.
- Foreign keys and delete behavior.
- Indexes.
- Sequence ownership/default.
- Table owner and grants.
- RLS enablement and forced state.
- Policies in a separate security artifact.

### Critical table-definition checks

| Object | Reconstruction concern |
|---|---|
| `profiles` | Auth FK, role check, bootstrap absence |
| `companies` | Sequence/default and nullable company identity |
| `bd_contacts` | Email uniqueness/index history |
| `jobs` | `id` versus `job_id`, source FK, current intelligence fields |
| `jobs_intake` | No live FK despite intended job relationship |
| `job_requirements` | Live identifier and `good_to_have` vocabulary |
| `candidates` | Large nullable profile contract and no base migration |
| `skills` | Explicit ID and nullable/non-unique name |
| `candidate_skills` | No PK/unique and all fields nullable |
| `candidate_scores` | No PK and undefined cardinality |
| `candidate_capabilities` | No PK and unknown producer |
| `submissions` | Nullable relationships, stage checks, unique pair |
| `activity_log` | Trigger-driving nullable event fields |
| Marketplace tables | Logical rather than enforced job/candidate relations |
| Autonomous tables | Unknown writers and weak run-memory linkage |

S2B must reproduce live structure first. Proposed repaired definitions belong in a separate stabilization-delta specification, not the exact-live baseline.

## 8. Required Views, Functions, and Triggers

### Views

For every selected view, draft:

- Exact live SQL.
- Security options.
- Output columns and types.
- Direct dependencies.
- Downstream dependent views.
- Known application consumer.
- Validation fixture and expected result.

Highest priority:

- `vw_candidate_search`
- `vw_candidate_search_clean`
- submission and activity views
- jobs and source-health dependency chains

### Functions

For each function, draft:

- Exact signature.
- Return type.
- Language and volatility.
- Security invoker/definer mode.
- Search path configuration.
- Owner and execute grants.
- Table dependencies and side effects.
- Positive and negative tests.

Required:

- `is_current_user_admin()`
- `create_submission_with_activity(...)`
- `sync_submission_next_action_from_activity()`
- `sync_submission_stage_from_activity()`
- `update_submission_stage_timestamp()`
- `update_updated_at_column()`

Conditional:

- `rls_auto_enable()`

### Triggers

For each trigger, draft:

- Timing and event.
- Target table.
- Row/statement scope.
- Function.
- Expected mutation.
- Ordering interaction with other triggers.

The duplicate company updated-at triggers are a blocker for a finalized exact object list. S2B should represent the live duplicate only in an explicit exact-live artifact and flag the target baseline decision separately.

## 9. Storage, Auth, and Profile Bootstrap Considerations

### Storage

The reconstruction plan must separate:

- Bucket creation/configuration.
- Terrer-specific `storage.objects` policies.
- Application path conventions.
- Proposed stabilized owner/path/MIME/size controls.

Current canonical buckets:

- `candidate-resumes`
- `bd-photo-intake`

Conditional bucket:

- `resumes`

Only synthetic files may be used in disposable validation.

### Auth

The disposable project must provide:

- Synthetic auth users for admin, recruiter, BD, and unauthorized cases.
- Deterministic user IDs that can be referenced by fixtures.
- No production identities or credentials.

Exact-live policy reproduction and proposed stabilized policy tests must be isolated from each other.

### Profile bootstrap

There is no authoritative repository-backed profile creation mechanism.

Before disposable validation:

1. Define how a synthetic auth user receives a profile row.
2. Decide whether bootstrap is fixture-only or a future platform function/trigger.
3. Test missing-profile behavior.
4. Test inactive-profile behavior.
5. Test admin helper behavior.

S2A does not approve a production bootstrap mechanism.

## 10. Unknowns and Blockers

### Blocking scope decisions

1. Full-fidelity versus core-only first reconstruction.
2. Inclusion of `evidence_signals`.
3. Inclusion of audit snapshot.
4. Inclusion of the `resumes` bucket.
5. Inclusion of `rls_auto_enable()` and `ensure_rls`.
6. Exact-live representation of duplicate company triggers.

Recommended scope: full-fidelity canonical/reporting reconstruction, including the audit snapshot, excluding prototypes, staging, legacy, and `resumes`.

### Unknown writers

- External jobs and source-health ingestion.
- Skill taxonomy.
- Normalized candidate skills.
- Candidate scores/capabilities/evidence.
- Web job-interest creation.
- Autonomous recruiter run/memory production.
- Direct activity events.
- `resumes` bucket.

These do not block exact-live structural drafting, but they block target security and constraint approval.

### Contract blockers

- Candidate-skill uniqueness.
- Skill-name normalization and ID generation.
- Job identity semantics.
- Missing job/intake/requirement/company FKs.
- Candidate score cardinality.
- Minimum required fields.
- Profile bootstrap.
- Activity model ownership.

### Ledger blocker

The migration ledger is not an authoritative reconstruction source and must not be repaired during S2A/S2B drafting.

## 11. Validation Checklist

### Static artifact validation

- Every included object has one definition source.
- Every excluded object is absent.
- Dependencies are ordered.
- Exact-live and target-state artifacts are not mixed.
- No credentials or PII are present.
- All artifacts are deterministic and reviewable.

### Structural validation

- Empty-project application succeeds.
- Expected object counts match the selected manifest.
- Generated types match the authoritative contract.
- Constraints, indexes, defaults, sequences, grants, and policies match selected scope.
- No unexplained schema diff remains.

### Behavioral validation

- Profile/admin helper behavior.
- Company/contact/note workflow.
- Job/intake/requirement workflow.
- Candidate/source/skill/score/capability workflow.
- Candidate search views.
- AI assessment uniqueness.
- Submission/activity transaction and trigger behavior.
- Marketplace intake and interest behavior.
- Autonomous run/memory behavior.

### Security validation

- Unauthorized candidate PII access denied in target security layer.
- Internal writes require approved authenticated/service identity.
- Public intake is narrow.
- Pipeline mutation is not publicly available.
- Function execute grants match intended callers.
- Storage cross-path and cross-user access is denied.

### Application validation

- Build.
- Targeted lint/type checks.
- Runtime smoke tests for all priority screens.
- No missing relation, column, function, or bucket errors.

## 12. Disposable-Project Preparation Steps

These are planning steps only and require future approval before execution.

1. Select local Supabase or a new isolated hosted project.
2. Record identifiers proving it is not production.
3. Define teardown and cost controls.
4. Select full-fidelity baseline scope.
5. Prepare draft artifact directories:
   - structural definitions
   - functions and triggers
   - views
   - grants and policies
   - storage configuration
   - synthetic fixtures
   - validation assertions
6. Generate an object checksum/manifest.
7. Conduct static review.
8. Obtain approval to create/use the environment and execute drafts.
9. Apply exact-live baseline.
10. Run structural and behavioral tests.
11. Capture results.
12. Only then prepare and test a stabilization delta.
13. Tear down or retain the disposable environment according to the approved plan.

## 13. Stop/Go Criteria

### GO for S2B draft artifacts

- S1 decisions remain approved.
- Source hierarchy is accepted.
- Recommended baseline scope is accepted.
- Drafts remain non-executable/unapplied artifacts.

### GO for disposable environment approval request

- S2B artifact package is complete.
- Static review passes.
- No secrets or PII are present.
- Environment isolation and teardown plan are documented.
- Exact-live and stabilized layers are clearly separated.

### GO for future execution

Requires explicit approval and:

- Target identity proves non-production.
- Backup is unnecessary for empty disposable state, but teardown/recreation is proven.
- Validation fixtures and expected results are reviewed.
- No command can target the linked production project.

### STOP if

- Any step requires production credentials.
- A command targets the linked project.
- An object definition cannot be traced to authoritative evidence.
- A legacy/staging/prototype object enters the baseline without approval.
- Exact-live and proposed repair definitions are combined.
- PII or production row content appears in fixtures or logs.
- The migration ledger is used to override live evidence.

## 14. Risks

| Risk | Rating | Mitigation |
|---|---|---|
| Encoding live defects as target design | High | Keep exact-live and stabilization delta separate |
| Missing hidden external dependency | High | Writer ownership audit and full-fidelity view reconstruction |
| Wrong dependency order | Medium | Generate and review dependency graph from captured catalogs |
| Platform-version differences | Medium | Record disposable Supabase versions and compare platform-managed objects |
| Candidate search mismatch | High | Type, view-output, and synthetic-result comparison |
| Trigger side-effect mismatch | High | Explicit positive/negative behavior tests |
| Security tests mistaken for production readiness | Critical | Separate current-risk evidence layer from proposed target layer |
| Accidental production targeting | Critical | Environment assertions, explicit approval, no linked-project commands |
| Ledger contamination | High | No ledger repair or migration application during reconstruction planning |
| Scope expansion into prototypes/legacy | Medium | Manifest allowlist and exclusion checks |

## 15. Recommended S2B Next Action

Create a non-executable baseline draft package under a documentation/draft-artifact directory.

S2B should produce:

1. An exact-live structural definition draft for approved canonical objects.
2. Exact-live function, trigger, and view definition drafts.
3. A separate current grants/RLS/storage evidence draft.
4. A proposed stabilized-security specification, clearly non-executable and separate.
5. Synthetic fixture specifications without PII.
6. Validation assertion specifications.
7. An object checksum and dependency manifest.
8. A disposable-environment approval request template.

S2B must not:

- Create repository migrations.
- Execute SQL.
- Link or modify Supabase projects.
- Change application code.
- Repair the production migration ledger.

The recommended first reconstruction scope is:

- Full canonical tables.
- Candidate-search views.
- Full pipeline and demand reporting views.
- Canonical functions and triggers.
- `candidate-resumes` and `bd-photo-intake`.
- Audit snapshot.
- Exclude legacy, staging, prototypes, `candidate_intent_events`, and `resumes`.

