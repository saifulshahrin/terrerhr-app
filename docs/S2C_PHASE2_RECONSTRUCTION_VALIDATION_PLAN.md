# Phase S2C.2 Reconstruction Validation Plan

## Document Status

- Mode: documentation only.
- Proposed target: disposable Supabase project `terrer-schema-s2c-bootstrap`.
- Proposed project ref: `epigstfenpqbslgeyrtn`.
- Phase 1 status: successful.
- Auth/Profile Bootstrap blocker: resolved.
- Production status: excluded and untouched.
- Execution status: not authorized by this document.

## Objective

Define exactly how S2C Phase 2 would validate reconstruction of Terrer's approved exact-live canonical database objects in the existing disposable Supabase project.

Phase 2 is intended to prove that the canonical physical schema can be reconstructed in dependency order, compared with authoritative evidence, and exercised with synthetic non-PII fixtures. It is validation of rebuild feasibility, not production migration design or authorization.

No SQL, schema change, table, function, trigger, view, policy, storage object, migration, fixture, or project modification is created by this plan.

## 1. Scope of Reconstruction Validation

Phase 2 would validate:

- The identity and isolation of the approved disposable project.
- Preservation and structural verification of the Phase 1 Auth/Profile bootstrap.
- Supabase-managed platform prerequisites required by Terrer-owned objects.
- The canonical sequence and remaining canonical tables.
- Approved preserve-only full-fidelity evidence objects.
- Constraints, defaults, indexes, ownership, and sequence relationships.
- Canonical public functions.
- Canonical table triggers.
- Candidate, pipeline, jobs, market, and source-health views.
- Relation, sequence, and function grants.
- RLS enablement state and exact-live table policies as an evidence layer.
- Canonical storage bucket configuration and `storage.objects` policies.
- Synthetic non-PII fixture loading.
- Structural and behavioral assertions.
- Generated Supabase types and contract comparison, if separately approved.
- Evidence packaging, failure classification, and cleanup/hold recommendation.

Phase 2 must use authoritative sources in this order:

1. Live schema evidence under `docs/schema-evidence/`.
2. `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md`.
3. `docs/S1_CANONICAL_CONTRACTS.md`.
4. `docs/S1_BASELINE_OBJECT_MANIFEST.md`.
5. `docs/S1_WRITER_OWNERSHIP_MAP.md`.
6. `docs/S2C_VALIDATION_ASSERTION_MATRIX.md`.
7. `docs/S2C_FIXTURE_MATRIX.md`.
8. Repository migrations as historical evidence only where they do not conflict with live evidence.

## 2. Objects To Be Reconstructed

### Platform Prerequisites To Verify, Not Recreate

- Supabase-managed `auth` schema and `auth.users`.
- Supabase-managed `storage` schema and service objects.
- Standard Supabase API roles.
- Required UUID capability or extension.
- Existing Phase 1 Auth users.
- Existing `public.profiles` table and two validated profile rows.

These are prerequisites or existing Phase 1 artifacts. Phase 2 must verify them before reconstruction and must not replace or reset them without separate approval.

### Sequence

- `companies_id_seq`

### Canonical Tables

- `companies`
- `job_sources`
- `candidates`
- `skills`
- `autonomous_recruiter_runs`
- `web_candidate_intakes`
- `web_job_interest`
- `bd_contacts`
- `jobs`
- `source_profiles`
- `candidate_scores`
- `candidate_capabilities`
- `autonomous_recruiter_memory`
- `bd_notes`
- `jobs_intake`
- `job_requirements`
- `candidate_skills`
- `ai_assessments`
- `submissions`
- `activity_log`

### Existing Identity Table To Verify

- `profiles`

The exact-live structure, constraints, grants, RLS state, and policies of `profiles` remain Phase 2 validation targets. The table is not to be dropped or recreated merely to repeat Phase 1.

### Conditional Evidence Table

- `evidence_signals`

This table may be reconstructed only if a human checkpoint explicitly approves candidate-evidence reproduction in Phase 2.

### Preserve-Only Full-Fidelity Table

- `company_identity_merge_v1_snapshot`

This table may be included as audit/full-fidelity evidence after the canonical operational tables are stable. It is not a core workflow dependency.

### Public Functions

- `update_updated_at_column()`
- `update_submission_stage_timestamp()`
- `sync_submission_next_action_from_activity()`
- `sync_submission_stage_from_activity()`
- `is_current_user_admin()`
- `create_submission_with_activity(...)`

### Conditional Function

- `rls_auto_enable()`

This function may be reconstructed only if event-trigger portability and inclusion are explicitly approved.

### Table Triggers

- `set_updated_at_candidates`
- `set_updated_at_jobs`
- `set_submission_stage_updated_at`
- `set_updated_at_submissions`
- `trg_sync_submission_next_action_from_activity`
- `trg_sync_submission_stage_from_activity`

### Conditional Company Triggers

- `set_updated_at` on `companies`
- `set_updated_at_companies`

Both exist in exact-live evidence. Reconstructing both is permitted only as an explicitly approved exact-live behavior test. Phase 2 must not silently select a target-state trigger.

### Conditional Event Trigger

- `ensure_rls`

This depends on `rls_auto_enable()` and may be reconstructed only after a specific human approval checkpoint.

### Candidate Views

- `vw_candidate_search`
- `vw_candidate_search_clean`

### Pipeline Views

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

### Jobs, Market, and Source Views

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

### Security Objects

- Relation and sequence grants.
- Function grants.
- RLS enablement state.
- Exact-live public-table policies.

Current security behavior is reconstructed as evidence for validation. Exact-live reproduction does not approve unsafe behavior as the future production target.

### Storage Objects

- `candidate-resumes` bucket.
- Candidate-resume `storage.objects` policies.
- `bd-photo-intake` bucket.
- BD photo `storage.objects` policies.

Supabase-managed storage tables, functions, and triggers are platform-owned and must not be recreated.

## 3. Objects Intentionally Excluded

### Production and Delivery Artifacts

- Production projects, credentials, data, users, buckets, and configuration.
- Repository baseline migrations.
- Migration ledger changes.
- Application code changes.
- Edge Function deployments.
- WordPress changes.
- Production deployment or cutover planning.
- Real candidate, recruiter, employee, client, company, contact, job, or resume data.

### Legacy Frozen Objects

- `terrer_companies`
- `terrer_company_contacts`
- `terrer_jobs`
- `terrer_candidates`
- `terrer_skills`
- `terrer_pipeline`
- `terrer_jobs_view`
- `set_updated_at()`
- `trg_terrer_*_updated_at` trigger family

### Staging Objects

- `staging_bullhorn_companies`
- `staging_bullhorn_contacts`

### Prototype or Dormant Objects

- `applications`
- `job_candidate_matches`
- `match_interactions`
- `outreach_log`
- `employer_job_intake`
- `employer_intake_actions`
- `target_companies`
- `v_match_shortlist`
- `v_outreach_due`
- `trg_update_target_companies_updated_at`
- `candidate_intent_events`

### Conditional Storage Excluded By Default

- `resumes` bucket.
- `resumes` anonymous insert policy.

These objects require a separate compatibility, prototype, staging, or preserve-only decision. They must not enter Phase 2 by implication.

## 4. Exact Reconstruction Order

The following is the required category order. A category must pass its structural checks before the next dependent category begins.

| Order | Object category | Rationale | Dependency | Expected validation |
|---:|---|---|---|---|
| 1 | Target and platform verification | Prevents reconstruction against an unknown or production-like target. | Approved project name/ref and current human authorization. | Project ref is `epigstfenpqbslgeyrtn`; target is disposable; no production credentials or data are present. |
| 2 | Phase 1 Auth/Profile preservation | Protects the successful bootstrap and confirms identity dependencies remain valid. | Existing disposable Auth users and `profiles` rows. | Both UUID links, roles, active states, and production isolation still pass. |
| 3 | Supabase platform prerequisites | Confirms platform-owned schemas, roles, extensions, and storage internals exist before Terrer objects reference them. | Disposable Supabase platform. | Required schemas, roles, UUID capability, PostgreSQL version, and relevant platform settings are recorded. |
| 4 | Canonical sequence | `companies.id` depends on the sequence and its ownership/default relationship. | Platform prerequisites. | `companies_id_seq` definition, ownership, privileges, and expected next-value behavior match evidence. |
| 5 | Root canonical tables | Establishes parent entities with no Terrer-table dependency or only platform dependency. | Platform prerequisites and sequence. | Existing `profiles` is compared; `companies`, `job_sources`, `candidates`, `skills`, `autonomous_recruiter_runs`, `web_candidate_intakes`, and `web_job_interest` match columns, defaults, nullability, constraints, and indexes. |
| 6 | First-level dependent tables | Adds objects that reference root tables or platform identity. | Root tables and Auth/Profile state. | `bd_contacts`, `jobs`, `source_profiles`, `candidate_scores`, `candidate_capabilities`, and `autonomous_recruiter_memory` reconstruct with valid references and catalog definitions. |
| 7 | Relationship and requirement tables | Establishes operational joins and requirement capture after all parent tables exist. | Root and first-level tables. | `bd_notes`, `jobs_intake`, `job_requirements`, and `candidate_skills` reconstruct; FKs, checks, indexes, and known missing logical constraints are documented. |
| 8 | Conditional evidence table | Keeps unresolved evidence production outside the core path unless explicitly approved. | Candidates/source profiles and human approval. | If approved, `evidence_signals` matches exact-live structure and its unresolved writer lifecycle is recorded; otherwise it is marked deferred. |
| 9 | Execution tables | Establishes matching and recruiter execution entities after jobs, candidates, and companies exist. | Candidate, job, company, and relationship layers. | `ai_assessments`, `submissions`, and `activity_log` reconstruct with expected FKs, checks, uniqueness, indexes, and defaults. |
| 10 | Preserve-only audit table | Adds full-fidelity audit evidence without blocking operational reconstruction. | Stable canonical table layer and explicit inclusion confirmation. | `company_identity_merge_v1_snapshot` matches evidence or is explicitly deferred without affecting core pass status. |
| 11 | Constraints, indexes, defaults, and ownership reconciliation | Ensures table creation did not omit physical contract details before behavior is added. | All approved tables and sequence. | Catalog comparison shows expected columns, types, defaults, nullability, PKs, FKs, checks, unique constraints, indexes, and ownership. |
| 12 | Canonical public functions | Functions must exist before dependent triggers, policies, grants, or RPC tests. | Required tables and Auth/Profile state. | Six canonical functions match signature, body, volatility/security settings, search path, and return contract. |
| 13 | Conditional RLS automation function | Isolates the unresolved event-trigger governance decision from core reconstruction. | Table layer and explicit human approval. | `rls_auto_enable()` is reconstructed and inspected only if approved; otherwise recorded as deferred. |
| 14 | Canonical table triggers | Trigger functions and target tables now exist, allowing exact trigger attachment. | Functions and tables. | Candidate, job, submission, and activity triggers exist once each and bind to the expected function/timing/event. |
| 15 | Conditional company triggers | Duplicate exact-live behavior must be observed without converting it into an accidental target-state decision. | `companies`, update helper, and explicit approval. | Approved trigger count is exact; timestamp behavior and duplicate firing are documented; no canonical cleanup decision is made. |
| 16 | Conditional event trigger | Event-trigger creation can affect later DDL and therefore must occur only after normal object creation and a separate checkpoint. | `rls_auto_enable()`, platform support, and explicit approval. | If approved, `ensure_rls` creation/behavior is recorded; if unsupported or deferred, core reconstruction may continue with manual RLS validation. |
| 17 | Candidate views | Candidate read models depend on candidate-domain tables and should be validated before broader app views. | Candidate, source, skill, score, and capability tables. | `vw_candidate_search` then `vw_candidate_search_clean` create successfully and expose expected columns/types. |
| 18 | Pipeline base views | Builds direct read models over submissions, jobs, candidates, companies, and activity. | Execution tables and parent tables. | Base pipeline views create and return expected synthetic rows. |
| 19 | Pipeline dependent views | Views that depend on enriched/base views must follow them. | Pipeline base views. | `vw_job_shortlist` and `vw_recruiter_dashboard` resolve dependencies and return expected outputs. |
| 20 | Jobs and market base views | Establishes direct demand and market read models over jobs and sources. | `jobs` and `job_sources`. | Base jobs, market, Malaysia, and source-health views create with expected columns and filters. |
| 21 | Jobs and source-health dependent views | Reporting chains must follow their base views. | `jobs_latest_practical`, `vw_tier1_source_health`, and `vw_tier1_source_health_v2`. | Reporting, leaderboard, hiring-now, diagnostics, and summary views resolve and return expected synthetic outputs. |
| 22 | Relation, sequence, and function grants | Privileges should be applied only after all referenced objects exist. | Tables, sequence, functions, and views. | Catalog grants match exact-live evidence for intended roles; unexpected privilege expansion is classified. |
| 23 | RLS enablement and table policies | Policies may reference Auth/Profile helpers and must follow function creation. | Tables, `is_current_user_admin()`, roles, and grants. | Expected policies exist; admin/recruiter/anonymous allow-deny behavior is recorded; unsafe exact-live behavior is evidence, not target approval. |
| 24 | Storage buckets | Bucket rows depend on Supabase-managed storage services but not Terrer table reconstruction. | Verified storage platform and explicit approval. | `candidate-resumes` and `bd-photo-intake` match expected private/configuration state. |
| 25 | Storage object policies | Policies require buckets, roles, and Auth sessions. | Buckets, Auth users, and storage platform. | Expected policy definitions and synthetic role behavior are recorded, including any broad or unsafe access. |
| 26 | Synthetic business fixtures | Fixtures should load only after structure, functions, triggers, policies, and buckets are stable. | All approved reconstruction layers. | Deterministic fixture counts and relationships pass without PII or production identifiers. |
| 27 | Behavioral validation | Proves reconstructed functions, triggers, views, RLS, and storage behavior rather than presence alone. | Synthetic fixtures and approved sessions. | RPC side effects, timestamp behavior, role checks, view outputs, policy decisions, and storage operations match expected assertions or are classified. |
| 28 | Generated types and contract comparison | Confirms the reconstructed schema presents the expected application-facing type contract. | Completed schema and separately approved type generation. | Types generate successfully; critical drift is absent or explicitly documented. |
| 29 | Evidence reconciliation and final report | Produces the decision record required before migration design can be considered. | All validation results. | Every object is PASS, FAIL, DEFERRED, or NOT APPLICABLE; evidence contains no secrets or PII; GO/NO-GO is explicit. |
| 30 | Cleanup or controlled hold | Prevents unmanaged disposable resources after validation. | Human teardown decision. | Project and fixtures are either deleted by approval or assigned an owner, inactive state, and cleanup deadline. |

### Exact Table Order Within Categories

1. Verify existing `profiles`.
2. Reconstruct `companies`.
3. Reconstruct `job_sources`.
4. Reconstruct `candidates`.
5. Reconstruct `skills`.
6. Reconstruct `autonomous_recruiter_runs`.
7. Reconstruct `web_candidate_intakes`.
8. Reconstruct `web_job_interest`.
9. Reconstruct `bd_contacts`.
10. Reconstruct `jobs`.
11. Reconstruct `source_profiles`.
12. Reconstruct `candidate_scores`.
13. Reconstruct `candidate_capabilities`.
14. Reconstruct `autonomous_recruiter_memory`.
15. Reconstruct `bd_notes`.
16. Reconstruct `jobs_intake`.
17. Reconstruct `job_requirements`.
18. Reconstruct `candidate_skills`.
19. Reconstruct conditional `evidence_signals`, if approved.
20. Reconstruct `ai_assessments`.
21. Reconstruct `submissions`.
22. Reconstruct `activity_log`.
23. Reconstruct `company_identity_merge_v1_snapshot`, if full-fidelity inclusion is confirmed.

### Exact Function Order

1. `update_updated_at_column()`
2. `update_submission_stage_timestamp()`
3. `sync_submission_next_action_from_activity()`
4. `sync_submission_stage_from_activity()`
5. `is_current_user_admin()`
6. `create_submission_with_activity(...)`
7. Conditional `rls_auto_enable()`

### Exact Trigger Order

1. `set_updated_at_candidates`
2. `set_updated_at_jobs`
3. `set_submission_stage_updated_at`
4. `set_updated_at_submissions`
5. `trg_sync_submission_next_action_from_activity`
6. `trg_sync_submission_stage_from_activity`
7. Conditional `set_updated_at` on `companies`
8. Conditional `set_updated_at_companies`
9. Conditional `ensure_rls`

### Exact View Order

1. `vw_candidate_search`
2. `vw_candidate_search_clean`
3. `recruiter_active_submissions`
4. `vw_submissions_enriched`
5. `vw_company_pipeline_summary`
6. `vw_candidate_pipeline_summary`
7. `vw_activity_log_enriched`
8. `vw_pipeline_summary`
9. `vw_outcomes_summary`
10. `vw_live_work_queue`
11. `vw_followup_queue`
12. `vw_job_shortlist`
13. `vw_recruiter_dashboard`
14. `jobs_latest`
15. `jobs_latest_practical`
16. `jobs_reporting`
17. `hiring_leaderboard_malaysia`
18. `terrer_hiring_now`
19. `vw_jobs_tier1_malaysia`
20. `vw_market_signals`
21. `vw_market_signals_active`
22. `vw_market_signals_realtime`
23. `vw_market_signals_recent`
24. `vw_tier1_source_health`
25. `vw_tier1_source_health_v2`
26. `vw_tier1_source_diagnostics`
27. `vw_tier1_source_health_summary`

## 5. Validation Sequence

1. Confirm current human approval and Phase 2 scope.
2. Confirm the exact disposable project name and ref.
3. Confirm production denylist and isolation controls.
4. Record region, organization/workspace, PostgreSQL version, platform settings, extensions, and teardown owner.
5. Revalidate Phase 1 Auth/Profile assertions.
6. Capture pre-reconstruction object inventory.
7. Reconstruct approved objects in the Exact Reconstruction Order.
8. Compare each category against live evidence before continuing.
9. Load the approved minimum synthetic fixture set.
10. Validate row counts and relationships.
11. Validate canonical functions.
12. Validate trigger side effects and trigger counts.
13. Validate candidate, pipeline, jobs, market, and source-health views.
14. Validate grants and role-specific RLS behavior.
15. Validate storage bucket and object-policy behavior.
16. Generate and compare types only if separately approved.
17. Classify every difference as `PASS`, `FAIL`, `DEFERRED`, or `NOT APPLICABLE`.
18. Produce the Phase 2 validation report.
19. Obtain the human cleanup/hold decision.

Validation must stop at the affected category when a blocker or critical security failure occurs. Independent, already validated categories may remain recorded, but dependent reconstruction must not continue.

## 6. Success Criteria

Phase 2 succeeds only if:

- The disposable project identity and isolation boundary are confirmed.
- Phase 1 Auth/Profile state remains valid.
- No production credential, identifier, data, Auth user, or storage object is used.
- Every approved canonical object reconstructs in dependency order.
- Physical definitions match authoritative evidence or differences are classified.
- Required constraints, indexes, defaults, sequence ownership, grants, and RLS state are present.
- Canonical functions and triggers create successfully.
- Trigger count and side effects match expected evidence.
- All 27 approved views create in dependency order and return expected synthetic outputs.
- Required RLS role assertions pass or exact-live security risks are clearly isolated and classified.
- Approved storage buckets and policies can be reconstructed and tested without production data.
- Minimum synthetic fixtures load and relate correctly.
- Generated types align with expected contracts, if type generation is approved.
- Conditional objects are either explicitly approved and tested or clearly marked deferred.
- No unclassified blocker or critical failure remains.
- Evidence contains no secrets or PII.
- A cleanup or controlled-hold decision is recorded.

Success means disposable exact-live reconstruction feasibility is proven. It does not mean production migration, target-state security, or deployment is approved.

## 7. Failure Criteria

Phase 2 fails or must pause if:

- The target project name/ref cannot be verified.
- Any production-like project, credential, data, Auth user, or storage object is detected.
- Phase 1 Auth/Profile linkage, roles, or active state no longer pass.
- A required parent object fails and blocks dependent objects.
- A required canonical table, function, trigger, or view cannot be reconstructed.
- Catalog definitions show unexplained critical drift.
- Required FKs, checks, uniqueness, or indexes are missing or invalid.
- `is_current_user_admin()` returns an incorrect result.
- `create_submission_with_activity(...)` produces incorrect or incomplete side effects.
- Submission/activity triggers produce incorrect stage or next-action behavior.
- RLS or storage behavior grants dangerous access beyond the expected evidence and cannot be isolated.
- Synthetic fixtures require production data or PII.
- Evidence contains secrets, credentials, tokens, session data, or PII.
- A conditional object is executed without its required human approval.
- Cleanup ownership and project disposition cannot be established.

Non-blocking operational ambiguities may be marked `DEFERRED` only when they do not invalidate physical reconstruction or security-sensitive validation.

## 8. Rollback Procedure

Rollback applies only to the disposable project and requires explicit human approval for destructive actions.

1. Stop at the first blocker or critical failure.
2. Confirm again that the affected target is `epigstfenpqbslgeyrtn`.
3. Preserve non-secret evidence of the failure.
4. Do not attempt unapproved corrective DDL.
5. Remove synthetic storage objects, if approved.
6. Remove synthetic business fixtures in reverse dependency order, if approved.
7. Remove Phase 2 storage policies and buckets, if approved.
8. Remove Phase 2 views in reverse dependency order, if approved.
9. Remove Phase 2 RLS policies, grants, triggers, and functions, if approved.
10. Remove Phase 2 tables in reverse dependency order, preserving Phase 1 `profiles` and Auth users unless their removal is separately approved.
11. Remove `companies_id_seq`, if approved and no dependent object remains.
12. Remove local disposable environment values and unlink tooling, if applicable and approved.
13. Confirm no repository secret or environment file was committed.
14. Delete or archive the disposable project only with explicit approval.
15. Record the final cleanup or controlled-hold state.

If teardown is not approved, the project must be marked inactive with a named owner and cleanup deadline.

## 9. Evidence Collection Requirements

### Required Environment Evidence

- Written Phase 2 approval reference.
- Git branch and pre-execution status.
- Disposable project name and ref.
- Region and organization/workspace.
- PostgreSQL and visible Supabase platform versions.
- Relevant extensions, schemas, roles, Auth settings, and Storage settings.
- Production isolation confirmation.
- Teardown owner and cleanup target date.

### Required Reconstruction Evidence

- Pre- and post-reconstruction object inventory.
- Object-by-object status.
- Catalog evidence for columns, types, defaults, nullability, constraints, indexes, ownership, grants, RLS state, and policies.
- Function signatures and configuration comparison.
- Trigger name, table, timing, event, and function comparison.
- View dependency and output-column comparison.
- Storage bucket configuration and policy comparison.
- Conditional-object approval or deferral record.

### Required Behavioral Evidence

- Auth/Profile UUID, role, and active-state revalidation.
- Synthetic fixture identifiers and expected counts without PII.
- Function result summaries.
- Trigger before/after summaries.
- View result summaries.
- Admin, recruiter, anonymous, and approved negative-control allow/deny results.
- Storage operation summaries using synthetic files.
- Generated-type comparison summary, if approved.

### Evidence Safety Rules

Evidence must not contain:

- Passwords.
- API keys.
- Service-role keys.
- Anon keys.
- Access or refresh tokens.
- Session cookies.
- Connection strings.
- Production project secrets.
- Real PII or production row data.

Raw identifiers should be recorded only when required for proof and should be redacted in any externally shared report.

## 10. Human Approval Checkpoints

| Checkpoint | Required decision | Stop condition |
|---:|---|---|
| 1 | Approve Phase 2 execution against project `epigstfenpqbslgeyrtn` only. | No execution if approval is absent, broad, stale, or ambiguous. |
| 2 | Confirm project metadata, production isolation, teardown owner, and cleanup expectation. | Stop if target identity or ownership is incomplete. |
| 3 | Approve the exact core/full-fidelity object manifest. | Stop before reconstruction if scope is not frozen. |
| 4 | Approve the execution mechanism for disposable-only DDL without creating repository migrations. | Stop before any SQL or schema action. |
| 5 | Approve handling of the existing Phase 1 `profiles` table and users. | Stop if preservation versus reset is unclear. |
| 6 | Decide whether `evidence_signals` is included or deferred. | Default to deferred without explicit approval. |
| 7 | Decide whether `company_identity_merge_v1_snapshot` is included for full fidelity. | Default to deferred without confirmation. |
| 8 | Decide whether both duplicate company triggers may be reproduced for exact-live testing. | Default to no company trigger creation until decided. |
| 9 | Decide whether `rls_auto_enable()` and `ensure_rls` may be tested. | Default to deferred; do not create event-trigger automation. |
| 10 | Approve exact-live grants and RLS policy reconstruction as evidence, including known risky behavior. | Stop before policy application if security scope is unclear. |
| 11 | Approve storage bucket/policy creation and synthetic storage operations. | Stop before any storage modification. |
| 12 | Approve synthetic business fixture loading and any optional negative controls. | Stop before fixture writes. |
| 13 | Approve type generation and any app smoke check as separate optional activities. | Default to omitted. |
| 14 | Review failures before any corrective reconstruction attempt. | No repair DDL without renewed approval. |
| 15 | Approve cleanup, project deletion, or controlled hold. | Do not delete resources without approval; do not leave them unmanaged. |
| 16 | Review the Phase 2 report before authorizing baseline migration design. | Phase 2 success alone does not authorize migration creation. |

## Dependency Summary

The critical path is:

`target verification` -> `Phase 1 preservation` -> `platform prerequisites` -> `sequence` -> `root tables` -> `dependent tables` -> `execution tables` -> `functions` -> `triggers` -> `views` -> `grants/RLS` -> `storage` -> `fixtures` -> `behavioral validation` -> `evidence/report` -> `cleanup/hold`

No dependent category should be reconstructed before its required parent category passes.

## Estimated Duration

| Activity | Estimate |
|---|---:|
| Approval, target verification, and platform capture | 30-60 minutes |
| Phase 1 preservation and pre-inventory | 30-45 minutes |
| Sequence, tables, constraints, and indexes | 2-3 hours |
| Functions and triggers | 1-2 hours |
| Views | 1-2 hours |
| Grants, RLS, and policy validation | 1.5-3 hours |
| Storage reconstruction and validation | 1-2 hours |
| Synthetic fixtures and behavioral assertions | 2-4 hours |
| Type comparison, if approved | 30-60 minutes |
| Evidence packaging and final report | 1-2 hours |
| Cleanup or hold documentation | 30-60 minutes |

Estimated clean-run duration: **1.5 to 2 working days**.

Estimated duration with platform drift, conditional-object failures, or policy/storage issues: **3 to 5 working days**.

## Estimated Risk

**Overall estimated risk: Medium-High within the disposable project; Critical if target isolation fails.**

Primary risks:

- Accidental use of a production target or credential.
- Loss of the successful Phase 1 bootstrap state.
- Exact-live RLS or storage behavior exposing unsafe access.
- Duplicate company trigger side effects.
- Event-trigger portability or broad automatic RLS behavior.
- Ambiguous writer contracts for candidate-derived and autonomous-recruiter tables.
- Treating disposable reconstruction success as production approval.

The risk is acceptable only with the human checkpoints, project-ref verification, conditional-object defaults, synthetic-data controls, and rollback boundary defined in this plan.

## Recommendation

**Recommendation: CONDITIONAL GO for S2C Phase 2 Reconstruction Validation in the disposable project only.**

Conditions before execution:

1. Explicit written approval naming project `terrer-schema-s2c-bootstrap` and ref `epigstfenpqbslgeyrtn`.
2. Confirmed region, organization/workspace, teardown owner, and cleanup expectation.
3. Frozen Phase 2 object manifest.
4. Explicit decisions for `evidence_signals`, the audit snapshot, duplicate company triggers, `rls_auto_enable()`, and `ensure_rls`.
5. Explicit approval for disposable-only DDL, policies, storage work, fixtures, and evidence collection.
6. Confirmed preservation plan for the successful Phase 1 Auth/Profile state.
7. No production credentials, data, users, storage objects, or project references in the execution context.

**NO-GO remains in effect for production, repository migration creation, application changes, deployment, and any object outside the approved Phase 2 manifest.**

## Documentation Change Boundary

Creation of this plan is documentation only:

- No SQL was executed.
- No disposable-project object was created, modified, or deleted.
- No table, function, trigger, view, policy, bucket, fixture, or migration was created.
- No schema or application code was modified.
- No production resource was accessed or changed.
