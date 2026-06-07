# Phase S2A Decision Package

Date: 7 June 2026  
Phase: S2A — Baseline Reconstruction Planning  
Status: recommended for approval  
Mode: review and decision only

## Decision Summary

| Question | Answer |
|---|---|
| **A. Can Terrer be reconstructed today from available evidence?** | **Partially** |
| **B. Confidence level** | **Medium** |
| **C. Single biggest obstacle** | The authoritative evidence has not yet been converted into one dependency-ordered, reviewable baseline artifact and proven from zero in a disposable Supabase project. |
| **D. Next safest action** | Prepare a non-executable S2B exact-live baseline draft package, keeping structural definitions, functions/triggers, views, current security evidence, storage configuration, fixtures, and validation assertions separate. |

“Partially” means the available evidence is strong enough to draft the canonical physical schema with substantial confidence. It is not yet sufficient to claim a successful rebuild because no zero-to-working reconstruction has been performed, platform assumptions remain untested, and several operational writers are unknown.

## 1. Executive Summary

Phase S2A confirms that Terrer now has enough authoritative schema evidence to begin baseline reconstruction drafting.

The repository contains:

- Exact live catalog-derived definitions.
- Generated live database types.
- Current application reader and writer contracts.
- Dependency evidence.
- Storage bucket and policy evidence.
- Approved canonical and legacy boundaries.
- Validation and rollback criteria.

However, Terrer cannot yet be declared rebuild-safe. The evidence remains distributed across SQL evidence files, JSON catalogs, generated types, application code, migrations, and S1 documentation. It has not been assembled into a single ordered baseline or tested against an empty environment.

The recommended strategy is therefore:

1. Draft an exact-live canonical baseline.
2. Keep current risky security behavior in a separate evidence layer.
3. Keep target stabilization changes in a separate future delta.
4. Validate the exact-live baseline in a disposable project.
5. Continue to defer production and migration-ledger changes.

## 2. Recommended Reconstruction Strategy

### Use a two-layer reconstruction

#### Layer 1 — exact-live reconstruction

Reproduce:

- Approved canonical tables and sequence.
- Exact current constraints and indexes.
- Required views.
- Required functions and triggers.
- Current grants, RLS state, policies, and storage configuration as separately reviewable evidence.

Purpose:

- Prove that the current working schema can be recreated.
- Detect missing definitions and platform differences.
- Establish a reproducible reference point.

#### Layer 2 — stabilized target delta

Design separately after Layer 1 passes:

- Contract repairs.
- Authenticated/protected write paths.
- Least-privilege RLS.
- Storage ownership and file controls.
- Constraint improvements.
- Duplicate-trigger cleanup.

Purpose:

- Avoid confusing current-state fidelity with production-safe target design.

### Use full-fidelity canonical scope first

The first reconstruction should include:

- Core canonical tables.
- Candidate-search views.
- Pipeline reporting views.
- Jobs, market, and source-health views.
- Canonical functions and triggers.
- Canonical storage buckets.
- The audit snapshot.

It should exclude:

- Legacy `terrer_*`.
- Staging.
- Unapproved prototypes.
- `candidate_intent_events`.
- The unknown `resumes` bucket.

## 3. Exact Authoritative Source Hierarchy

Use this order when evidence conflicts:

### 1. Live schema evidence

Authority for current physical implementation:

- Columns and types.
- Defaults and nullability.
- Constraints and indexes.
- Views and dependencies.
- Functions and triggers.
- Grants, RLS state, and policies.
- Sequences.
- Storage bucket configuration and object policies.

### 2. Generated live types

Authority for current database API shape:

- Row, insert, and update types.
- View output types.
- RPC signatures.

### 3. Application contracts

Authority for active workflow compatibility:

- Fields read.
- Payloads written.
- Filters and ordering.
- RPC and storage expectations.

Application behavior does not override live physical truth when the application is already drifted.

### 4. Migration history

Authority for historical intent only:

- Previous naming.
- Original sequencing.
- Earlier policy and view intent.

Migrations must not override live evidence because the local and remote histories are divergent.

### 5. Approved S1 documentation

Authority for reconstruction scope and direction:

- Canonical inclusion.
- Legacy freeze.
- Provisional and excluded objects.
- Repair recommendations.
- Writer ownership.
- Validation, rollback, and stop/go requirements.

## 4. Exact Canonical Objects Proposed for Baseline

### Platform dependencies

- Supabase `auth` and `auth.users`.
- Supabase `storage` service internals.
- Standard API roles.
- Required UUID extension.

### Sequence

- `companies_id_seq`

### Tables

| Layer | Objects |
|---|---|
| Identity | `profiles` |
| Relationship Intelligence | `companies`, `bd_contacts`, `bd_notes` |
| Demand and Requirements | `job_sources`, `jobs`, `jobs_intake`, `job_requirements` |
| Candidate Intelligence | `candidates`, `source_profiles`, `skills`, `candidate_skills`, `candidate_scores`, `candidate_capabilities` |
| Matching and Execution | `ai_assessments`, `submissions`, `activity_log` |
| Marketplace | `web_candidate_intakes`, `web_job_interest` |
| AI Operating Layer | `autonomous_recruiter_runs`, `autonomous_recruiter_memory` |

### Canonical views

- `vw_candidate_search`
- `vw_candidate_search_clean`

### Full-fidelity pipeline views

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

### Full-fidelity demand and source views

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

### Functions

- `is_current_user_admin()`
- `create_submission_with_activity(...)`
- `sync_submission_next_action_from_activity()`
- `sync_submission_stage_from_activity()`
- `update_submission_stage_timestamp()`
- `update_updated_at_column()`

Conditional:

- `rls_auto_enable()`

### Triggers

- Candidate updated-at.
- Job updated-at.
- Submission stage timestamp.
- Submission updated-at.
- Activity next-action synchronization.
- Activity stage synchronization.
- One target company updated-at trigger after resolving the live duplicate.

Conditional:

- `ensure_rls` event trigger.

### Storage

- `candidate-resumes`
- `bd-photo-intake`
- Their Terrer-specific `storage.objects` policies

### Full-fidelity preserve-only object

- `company_identity_merge_v1_snapshot`

## 5. Objects Intentionally Excluded

### Legacy-frozen

- `terrer_companies`
- `terrer_company_contacts`
- `terrer_jobs`
- `terrer_candidates`
- `terrer_skills`
- `terrer_pipeline`
- `terrer_jobs_view`
- Legacy updated-at function and triggers

### Staging

- `staging_bullhorn_companies`
- `staging_bullhorn_contacts`

### Prototype or dormant

- `applications`
- `job_candidate_matches`
- `match_interactions`
- `outreach_log`
- `employer_job_intake`
- `employer_intake_actions`
- `target_companies`
- `v_match_shortlist`
- `v_outreach_due`

### Planned but absent live

- `candidate_intent_events`

### Unknown storage

- `resumes`

### Platform-owned internals

- Supabase-managed storage tables, functions, and triggers

## 6. Biggest Blockers

1. No dependency-ordered baseline draft has been assembled or tested.
2. No disposable-project rebuild has been performed.
3. Profile bootstrap behavior is undocumented.
4. Duplicate company updated-at triggers require an exact-live versus target-baseline decision.
5. Automatic RLS enablement has not been approved as a baseline invariant.
6. Several external/service writers remain unidentified.
7. Candidate skill, score, and capability ownership/cardinality remain unclear.
8. The migration ledger is divergent and cannot be used as a rebuild authority.

## 7. Biggest Risks

| Risk | Rating |
|---|---|
| Accidentally encoding live defects as target design | High |
| Missing a hidden external dependency | High |
| Candidate-search view mismatch | High |
| Trigger behavior differing after reconstruction | High |
| Platform-version differences in auth/storage behavior | Medium |
| Reintroducing insecure anon policies as an endorsed target | Critical |
| Accidentally targeting production during future validation | Critical |
| Expanding scope into legacy, staging, or prototypes | Medium |
| Contaminating migration history before proof | High |

## 8. Assumptions That Could Be Wrong

1. The catalog-derived DDL is sufficient to reproduce every meaningful live behavior.
2. No external consumer depends on excluded prototype or legacy objects.
3. Full-fidelity reporting views are still valid and worth reproducing.
4. `candidate_capabilities` is required only because candidate search depends on it.
5. `evidence_signals` can be excluded without breaking hidden enrichment processes.
6. The audit snapshot is useful in a disposable full-fidelity rebuild.
7. The `resumes` bucket has no active consumer.
8. Supabase platform-managed auth/storage behavior will be compatible across environments.
9. The application reader/writer search found all active repository consumers.
10. A fixture-created profile is sufficient for initial disposable validation.

## 9. Evidence Still Missing

### Operational evidence

- Runtime or access logs identifying external writers.
- Ownership confirmation for ingestion, scoring, capabilities, evidence, web interest, autonomous recruiter, and activity events.
- Evidence that excluded objects have no external consumer.

### Rebuild evidence

- A compiled dependency-ordered baseline artifact.
- A successful empty-project reconstruction log.
- Generated-type comparison from the reconstructed project.
- Object-signature and schema-diff results.
- Function and trigger behavior results.
- View output comparisons.

### Platform evidence

- Disposable-project Supabase/Postgres/storage versions.
- Auth-user/profile bootstrap behavior.
- Storage path and signed-access behavior.
- Event-trigger support and behavior.

### Security evidence

- An approved target role matrix.
- Positive and negative policy tests.
- Proof that internal workflows function without unsafe anonymous permissions.

## 10. Recommended S2B Scope

S2B should prepare non-executable, unapplied draft artifacts only.

### Include

1. Exact-live structural definition draft for canonical tables and sequence.
2. Exact-live view definitions in dependency order.
3. Exact-live function and trigger definitions.
4. Current grants, RLS state, policies, and storage definitions in a separate evidence layer.
5. Synthetic fixture specifications.
6. Validation assertion specifications.
7. Object checksum and dependency verification.
8. Disposable-environment approval request template.

### Keep separate

- Structural definitions.
- Functions and triggers.
- Views.
- Current security evidence.
- Proposed stabilized security.
- Storage configuration.
- Fixtures.
- Validation assertions.

### Exclude

- Repository migrations.
- Executable production scripts.
- SQL execution.
- Project linking.
- Migration-ledger repair.
- Application changes.
- Legacy, staging, prototypes, `candidate_intent_events`, and `resumes`.

## Final Recommendation

Approve S2A with the following conclusion:

- Terrer is **partially reconstructable today**.
- Confidence is **medium**.
- The evidence is sufficient to draft a high-quality exact-live baseline.
- The evidence is not yet sufficient to claim rebuild success.
- The next safest action is an unapplied S2B draft package followed by static review and a separate request for disposable-project execution authority.

