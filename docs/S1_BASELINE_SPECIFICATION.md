# Phase S1.3 Baseline Specification

Date: 7 June 2026  
Status: documentation specification  
Execution authority: none; no SQL, migration, or Supabase changes

## Purpose

This document defines the object set, dependency order, validation gates, and success criteria for rebuilding Terrer in a clean disposable Supabase project.

The baseline must:

- Reproduce active Terrer workflows without relying on undocumented live state.
- Preserve approved canonical identifiers and contracts.
- Keep legacy `terrer_*` objects outside the canonical model.
- Separate exact current-state reproduction from future stabilization repairs.
- Use synthetic, non-PII validation data.
- Remain unapplied until disposable-project work receives explicit approval.

## Baseline Variants

### Core canonical baseline

The minimum rebuild required for active application workflows:

- Approved canonical tables.
- Required sequence.
- Canonical read views.
- Required helper and transaction functions.
- Required triggers.
- Current grants and policies as a separately reviewable layer.
- Canonical storage buckets and object-policy definitions.

### Full-fidelity disposable baseline

The core baseline plus:

- Current pipeline reporting views.
- Current jobs, market, and source-health views.
- Audit snapshot objects.
- Explicitly approved provisional evidence or prototype objects.

The first disposable-project exercise should target full fidelity. A smaller core baseline can then be derived from proven dependencies rather than assumptions.

## 1. Exact Objects Required for a Clean Terrer Rebuild

### Platform prerequisites

These should be provided by the target Supabase platform, not recreated as Terrer-owned objects:

- `auth` schema and `auth.users`.
- `storage` schema, tables, functions, and managed triggers.
- Standard Supabase API roles.
- `pgcrypto` or equivalent UUID support where required by defaults.

### Terrer-owned sequence

- `public.companies_id_seq`

### Core canonical tables

#### Identity and authorization

- `public.profiles`

#### Relationship intelligence

- `public.companies`
- `public.bd_contacts`
- `public.bd_notes`

#### Demand and requirement capture

- `public.job_sources`
- `public.jobs`
- `public.jobs_intake`
- `public.job_requirements`

#### Candidate intelligence

- `public.candidates`
- `public.source_profiles`
- `public.skills`
- `public.candidate_skills`
- `public.candidate_scores`
- `public.candidate_capabilities`

#### Matching and recruitment execution

- `public.ai_assessments`
- `public.submissions`
- `public.activity_log`

#### Marketplace and intake

- `public.web_candidate_intakes`
- `public.web_job_interest`

#### AI operating layer

- `public.autonomous_recruiter_runs`
- `public.autonomous_recruiter_memory`

### Provisional and preserve-only tables

These are not part of the minimum app contract but may be required for full-fidelity reconstruction:

- `public.evidence_signals`
- `public.company_identity_merge_v1_snapshot`

Conditional prototype objects:

- `public.applications`
- `public.job_candidate_matches`
- `public.match_interactions`
- `public.outreach_log`
- `public.employer_job_intake`
- `public.employer_intake_actions`
- `public.target_companies`

Staging objects must be packaged separately:

- `public.staging_bullhorn_companies`
- `public.staging_bullhorn_contacts`

## 2. Dependency Order

### Stage 0 — platform readiness

1. Confirm disposable environment identity.
2. Confirm `auth` and `storage` schemas exist.
3. Confirm required extensions and API roles exist.
4. Confirm no link or command targets production.

### Stage 1 — independent roots

1. `companies_id_seq`
2. `profiles`
3. `companies`
4. `job_sources`
5. `candidates`
6. `skills`
7. `autonomous_recruiter_runs`
8. `web_candidate_intakes`
9. `web_job_interest`

### Stage 2 — first-level dependencies

1. `bd_contacts` after `companies`.
2. `jobs` after `job_sources`.
3. `source_profiles` after `candidates`.
4. `candidate_scores` after `candidates`.
5. `candidate_capabilities` after `candidates`.
6. `autonomous_recruiter_memory` after runs if a source-run FK is later approved; live contract currently has no FK.

### Stage 3 — relationship and requirement tables

1. `bd_notes` after companies, contacts, and auth.
2. `jobs_intake` after jobs.
3. `job_requirements` after jobs.
4. `candidate_skills` after candidates and skills.
5. `evidence_signals` after source profiles when included.

### Stage 4 — matching and execution tables

1. `ai_assessments` after jobs and candidates.
2. `submissions` after jobs, candidates, and companies.
3. `activity_log` after submissions.

### Stage 5 — public helper functions

1. `update_updated_at_column()`
2. `update_submission_stage_timestamp()`
3. `sync_submission_next_action_from_activity()`
4. `sync_submission_stage_from_activity()`
5. `is_current_user_admin()`
6. `create_submission_with_activity(...)`
7. `rls_auto_enable()` only if the platform-governance decision approves it.

### Stage 6 — triggers

1. Candidate updated-at trigger.
2. Job updated-at trigger.
3. One company updated-at trigger.
4. Submission stage timestamp trigger.
5. Submission updated-at trigger.
6. Activity next-action synchronization trigger.
7. Activity stage synchronization trigger.
8. `ensure_rls` event trigger only if approved with `rls_auto_enable()`.

The live database has two company updated-at triggers. The baseline must not silently select one until the duplicate-trigger decision is recorded.

### Stage 7 — canonical views

1. `vw_candidate_search`
2. `vw_candidate_search_clean`

### Stage 8 — pipeline views

1. `recruiter_active_submissions`
2. `vw_submissions_enriched`
3. `vw_company_pipeline_summary`
4. `vw_candidate_pipeline_summary`
5. `vw_activity_log_enriched`
6. `vw_pipeline_summary`
7. `vw_outcomes_summary`
8. `vw_live_work_queue`
9. `vw_followup_queue`
10. `vw_job_shortlist`
11. `vw_recruiter_dashboard`

### Stage 9 — demand and source views

1. `jobs_latest`
2. `jobs_latest_practical`
3. `jobs_reporting`
4. `hiring_leaderboard_malaysia`
5. `terrer_hiring_now`
6. `vw_jobs_tier1_malaysia`
7. `vw_market_signals`
8. `vw_market_signals_active`
9. `vw_market_signals_realtime`
10. `vw_market_signals_recent`
11. `vw_tier1_source_health`
12. `vw_tier1_source_health_v2`
13. `vw_tier1_source_diagnostics`
14. `vw_tier1_source_health_summary`

Despite its name, `terrer_hiring_now` depends on canonical jobs views and is not part of the frozen legacy-table domain.

### Stage 10 — security layer

After all referenced functions and objects exist:

1. Relation grants.
2. Function execute grants.
3. RLS enablement state.
4. Table policies.
5. Storage bucket rows.
6. `storage.objects` policies.

The security layer must be separately diffable from structural DDL because the exact current policies include known risks.

### Stage 11 — synthetic fixtures and validation

Load only synthetic identities, jobs, candidates, relationships, pipeline records, and files required for validation.

## 3. Canonical Inclusion List

### Required in every disposable rebuild

- All core canonical tables listed above.
- `companies_id_seq`.
- `vw_candidate_search`.
- `vw_candidate_search_clean`.
- Six canonical public functions excluding conditional `rls_auto_enable()`.
- Canonical table triggers.
- Candidate resume and BD photo buckets.
- Security definitions required to exercise intended role behavior.

### Required for full-fidelity disposable rebuild

- Pipeline view family.
- Demand/market/source view family.
- `company_identity_merge_v1_snapshot`.
- Exact current grants and policies in an isolated evidence-reproduction layer.

### Conditional inclusion

- `evidence_signals`, pending producer confirmation.
- Prototype tables and their views, when their behavior is specifically under test.
- `rls_auto_enable()` and `ensure_rls`, pending platform-governance decision.
- `resumes` bucket, pending consumer identification.

## 4. Excluded Legacy Objects

The canonical baseline must exclude:

- `terrer_companies`
- `terrer_company_contacts`
- `terrer_jobs`
- `terrer_candidates`
- `terrer_skills`
- `terrer_pipeline`
- `terrer_jobs_view`
- `set_updated_at()` when it is used only by legacy triggers
- all `trg_terrer_*_updated_at` triggers

These objects remain preserved in schema evidence and Git history.

If a separate compatibility rebuild is later required, the legacy domain should be one isolated package rather than interleaved with canonical DDL.

## 5. Required Views, Functions, and Triggers

### Required canonical views

| View | Required reason |
|---|---|
| `vw_candidate_search` | Aggregates candidate sources, scores, skills, and capabilities |
| `vw_candidate_search_clean` | Stable current candidate read contract used by the app |

### Full-fidelity view groups

| Group | Required reason |
|---|---|
| Pipeline views | Preserve current reporting and operational projections |
| Jobs/source views | Preserve demand intelligence and source-health reporting |

### Required functions

| Function | Required reason |
|---|---|
| `is_current_user_admin()` | Authorization policies depend on it |
| `create_submission_with_activity(...)` | Current atomic transaction contract must be preserved for evaluation |
| `sync_submission_next_action_from_activity()` | Activity side effect |
| `sync_submission_stage_from_activity()` | Activity-to-stage mapping |
| `update_submission_stage_timestamp()` | Pipeline stage audit timestamp |
| `update_updated_at_column()` | Canonical timestamp maintenance |

### Conditional platform function

- `rls_auto_enable()` with the `ensure_rls` event trigger.

It should be included only if the team approves automatic RLS enablement as a rebuild invariant. Automatic enablement without policies can make newly created tables inaccessible, so baseline ordering and tests must account for it.

### Required table triggers

- `set_updated_at_candidates`
- `set_updated_at_jobs`
- one approved company updated-at trigger
- `set_submission_stage_updated_at`
- `set_updated_at_submissions`
- `trg_sync_submission_next_action_from_activity`
- `trg_sync_submission_stage_from_activity`

## 6. Storage Dependencies

### `candidate-resumes`

Required for:

- Manual candidate intake.
- Admin resume import.
- Web candidate intake.
- Candidate profile resume access.

Baseline requirements:

- Private bucket.
- Current upload/read policy behavior available for exact-live testing.
- A separate proposed security policy set for owner/path-scoped testing.
- Synthetic files only.

### `bd-photo-intake`

Required for:

- Authenticated BD photo/screenshot intake.
- Vision extraction workflow input.

Baseline requirements:

- Private bucket.
- Authenticated upload/read/update/delete behavior reproducible.
- Synthetic images only.
- Future owner/path and retention rules tested separately.

### `resumes`

Classification: preserve-only, unknown.

Do not include in the core baseline. Include conditionally in a full-fidelity environment only if a consumer is identified or exact storage reproduction is required.

### Storage ownership boundary

Terrer owns:

- Bucket configuration decisions.
- Terrer-specific `storage.objects` policies.
- Application path conventions.

Supabase owns:

- Storage service tables.
- Storage internal functions.
- Storage managed triggers.

The baseline must not attempt to recreate Supabase-managed storage internals.

## 7. Validation Checkpoints

### Checkpoint A — static specification

GO only if:

- Every canonical object appears in the manifest.
- Every dependency has an earlier creation stage.
- Legacy objects are absent from canonical scope.
- No credentials or production data appear in artifacts.

### Checkpoint B — structural rebuild

GO only if:

- Baseline applies from zero in the disposable project.
- All selected objects compile.
- Generated types include all canonical tables/views/functions.
- Schema signatures match approved contracts.
- No unexplained object is created.

### Checkpoint C — relationship integrity

GO only if:

- Primary and foreign keys behave as expected.
- Unique/check constraints pass positive and negative tests.
- Candidate/job/submission relationships produce no orphans under synthetic workflows.
- Known live missing constraints remain explicitly documented rather than silently added.

### Checkpoint D — function and trigger behavior

GO only if:

- Admin helper returns expected results for synthetic roles.
- Submission transaction creates both submission and initial activity.
- Activity events map to the expected stage.
- Terminal stages clear next action.
- Stage changes update timestamps.
- Updated-at triggers fire once with deterministic results.

### Checkpoint E — view behavior

GO only if:

- Candidate search returns one stable row per candidate through the clean view.
- Pipeline views compile and return expected synthetic results.
- Jobs/source views compile in dependency order.
- View security behavior is understood and tested.

### Checkpoint F — role and policy behavior

GO only if:

- Public intake operations are narrowly permitted.
- Candidate PII is inaccessible to unauthorized roles.
- Internal recruiter actions work for authenticated fixtures.
- Service writers can perform their approved operations.
- Anon cannot mutate internal pipeline or BD records in the proposed stabilized policy set.

Exact-live risky policies may be tested in an isolated reproduction layer but must not be mistaken for the target security contract.

### Checkpoint G — storage behavior

GO only if:

- Approved uploads succeed.
- Disallowed file types/sizes fail under proposed policy.
- Cross-user/path reads and mutations fail.
- Internal authenticated reads work.
- Cleanup and rollback do not delete unrelated objects.

### Checkpoint H — application compatibility

GO only if:

- Application build passes.
- Candidate, Jobs, Job Intake, Top Matches, Pipeline, BD, interest review, resume, photo, and autonomous-run workflows pass against synthetic data.
- No runtime query references a missing object or field.

## 8. Rebuild Success Criteria

A disposable rebuild is successful only when:

1. It starts from an empty supported Supabase environment.
2. It requires no manual object creation.
3. It creates every selected baseline object exactly once.
4. It excludes frozen legacy and staging objects unless a separate package is selected.
5. Generated types match approved canonical contracts.
6. Synthetic workflow tests pass.
7. Function and trigger side effects match documented behavior.
8. Candidate and pipeline views return deterministic results.
9. Storage workflows pass without public file exposure.
10. Security negative tests pass for the proposed stabilized role model.
11. Re-running validation produces no unexplained schema drift.
12. The rebuild process contains no credentials or production PII.
13. A teardown leaves production and the linked project untouched.

## 9. Known Blockers

### Writer ownership

Unknown production owners remain for:

- Job ingestion and source-health metrics.
- Skill taxonomy.
- Normalized candidate skills.
- Candidate scores and capabilities.
- Evidence signals.
- Web job-interest creation.
- Autonomous recruiter runs and memory.
- Direct activity-log events.
- The `resumes` bucket.

### Contract decisions

Unresolved decisions include:

- Candidate-skill uniqueness.
- Skill ID/default and name uniqueness.
- Minimum required candidate, company, job, submission, and activity fields.
- `jobs.job_id` semantics.
- FK strategy for job intake and requirements.
- Candidate score cardinality/history.
- Activity log's long-term canonical status.
- Duplicate company updated-at trigger.
- `rls_auto_enable` governance.

### Security sequencing

Current demo behavior depends on anonymous access. A stabilized policy set cannot be validated meaningfully until the future authenticated or protected server write paths are specified.

### Migration history

The local/remote ledger remains divergent. Baseline preparation must not attempt production ledger repair.

### Baseline scope

The team must choose:

- Core-only structural proof.
- Full-fidelity live reproduction.
- Full-fidelity reproduction followed by a stabilized delta.

Recommended: full-fidelity reproduction followed by a separately reviewed stabilized delta.

## 10. Recommended Path to Disposable-Project Validation

### Step 1 — approve this specification

Confirm:

- Core object list.
- Full-fidelity object list.
- Conditional objects.
- Excluded legacy/staging packages.
- Duplicate-trigger and automatic-RLS decisions.

### Step 2 — create baseline draft artifacts

Under separate authority:

- Draft structural baseline.
- Draft security layer separately.
- Draft storage configuration separately.
- Draft synthetic fixtures and assertions.
- Do not apply anything yet.

### Step 3 — static peer review

Review:

- Object coverage.
- Dependency order.
- Contract fidelity.
- Security intent.
- Credential and PII safety.
- Rollback/teardown plan.

### Step 4 — obtain explicit disposable-environment approval

Approval must cover:

- Creating or selecting the isolated environment.
- Applying draft baseline SQL there.
- Loading synthetic fixtures.
- Running validation queries.

It must explicitly exclude the linked production project.

### Step 5 — execute full-fidelity reproduction

In the approved disposable environment:

1. Apply platform prerequisites.
2. Apply structural objects.
3. Apply functions and triggers.
4. Apply views.
5. Apply exact-live security evidence layer.
6. Create buckets and policies.
7. Run structural and behavioral validation.

### Step 6 — apply proposed stabilization delta

Only after exact-live reproduction passes:

- Apply proposed contract repairs.
- Apply proposed role/RLS/storage model.
- Re-run all positive and negative tests.
- Compare exact-live and stabilized behavior.

### Step 7 — publish results

Produce:

- Rebuild log without credentials.
- Object/signature comparison.
- Validation results.
- Failed and deferred tests.
- Schema/security diff.
- Updated blockers.
- Recommendation on readiness for production migration design.

## Stop Boundary

This specification does not authorize:

- Creating a disposable project.
- Executing SQL.
- Creating or applying migrations.
- Linking or modifying Supabase projects.
- Changing schema, policies, auth, storage, environment, or application code.

