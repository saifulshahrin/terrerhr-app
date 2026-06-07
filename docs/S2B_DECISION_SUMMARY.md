# Phase S2B Decision Summary

## 1. What S2A and S2B Completed

Phase S2A converted the approved Phase S1 schema boundary into an implementation-grade reconstruction plan. It established the authoritative source hierarchy, canonical rebuild scope, dependency order, exclusions, validation gates, and disposable-project preparation requirements.

Phase S2B then produced an exact-live draft package and reconstruction gap report. Together, these documents:

- Classified each tracked reconstruction item as `READY`, `PARTIAL`, or `BLOCKED`.
- Defined the dependency-ordered table, view, function, trigger, auth/profile, and storage scope.
- Separated exact-live reconstruction evidence from future stabilized target design.
- Identified unresolved writers, platform dependencies, and behavioral validation gaps.
- Defined the evidence that must be collected through an isolated disposable-project rebuild.

No SQL, migrations, schema changes, production access, or application changes were performed.

## 2. Current Rebuild Readiness

**Current status: Partially reconstructable**

**Confidence: Medium**

Terrer has enough evidence to prepare and review an exact-live reconstruction draft. Most physical database objects have authoritative definitions or strong evidence. However, the system has not yet been proven through a clean zero-to-working rebuild, and several operational dependencies remain uncertain.

The present classification covers **70 tracked reconstruction items**:

- **READY: 53**
- **PARTIAL: 16**
- **BLOCKED: 1**

Platform-managed Supabase internals and individual policies are not counted separately. They remain required validation concerns.

## 3. READY Objects — 53

These objects have sufficient evidence to enter a controlled exact-live reconstruction draft, subject to disposable-project validation.

### Sequences, Tables, and Preserve-Only Tables — 14

- `companies_id_seq`
- `companies`
- `job_sources`
- `candidates`
- `bd_contacts`
- `jobs`
- `source_profiles`
- `bd_notes`
- `jobs_intake`
- `job_requirements`
- `ai_assessments`
- `submissions`
- `activity_log`
- `company_identity_merge_v1_snapshot`

### Views — 27

- `vw_candidate_search`
- `vw_candidate_search_clean`
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

### Database Functions — 6

- `update_updated_at_column()`
- `update_submission_stage_timestamp()`
- `sync_submission_next_action_from_activity()`
- `sync_submission_stage_from_activity()`
- `is_current_user_admin()`
- `create_submission_with_activity(...)`

### Triggers — 6

- `set_updated_at_candidates`
- `set_updated_at_jobs`
- `set_submission_stage_updated_at`
- `set_updated_at_submissions`
- `trg_sync_submission_next_action_from_activity`
- `trg_sync_submission_stage_from_activity`

## 4. PARTIAL Objects — 16

These objects have usable evidence but need contract, dependency, ownership, portability, or behavior validation before they can be considered rebuild-safe.

### Tables — 10

- `profiles` — auth lifecycle and bootstrap behavior remain unresolved.
- `skills` — writer ownership and derived-data behavior are not fully evidenced.
- `autonomous_recruiter_runs` — external/server writer contract is incomplete.
- `web_candidate_intakes` — anon/auth write and operational ownership require validation.
- `web_job_interest` — public intake behavior and policy dependencies require validation.
- `candidate_scores` — scoring writer, refresh behavior, and contract authority remain uncertain.
- `candidate_capabilities` — derivation and writer ownership require confirmation.
- `autonomous_recruiter_memory` — lifecycle and service-role ownership require confirmation.
- `candidate_skills` — relationship population and canonical write path remain ambiguous.
- `evidence_signals` — production role and writer contract remain insufficiently evidenced.

### Function and Triggers — 4

- `rls_auto_enable()` — platform portability and baseline necessity are uncertain.
- `set_updated_at` on `companies` — overlaps another company update trigger.
- `set_updated_at_companies` — duplicate/overlapping company trigger behavior needs review.
- `ensure_rls` — depends on `rls_auto_enable()` and may be environment-specific.

### Storage Buckets — 2

- `candidate-resumes` — bucket configuration, path rules, and access behavior need validation.
- `bd-photo-intake` — bucket configuration, path rules, and access behavior need validation.

## 5. BLOCKED Item — 1

- **Synthetic profile bootstrap** — S2C cannot fully validate authenticated workflows until an approved, non-production mechanism exists to create corresponding `profiles` rows for disposable auth users.

This is a required validation dependency rather than a database object.

## 6. Main Evidence Gaps

The principal gaps are:

- No successful dependency-ordered rebuild has been performed in a clean disposable project.
- No generated-type or schema-signature comparison exists for a reconstructed environment.
- The synthetic auth-user and `profiles` bootstrap procedure is not approved.
- External writers remain uncertain for ingestion, scoring, skills, autonomous recruiter data, public interest flows, and activity data.
- Target Supabase, PostgreSQL, Auth, and Storage version compatibility has not been proven.
- Storage upload paths, signed access, object ownership, and policy behavior need synthetic validation.
- Functions, triggers, views, grants, and RLS policies have not been behaviorally tested together.
- Some reporting views and excluded objects may have consumers outside the inspected repository.

## 7. S2C Go/No-Go Decision

**Proceed to S2C disposable-project execution now: No**

**Proceed with S2C preparation and approval packaging: Yes**

S2C execution should begin only after:

1. An approved synthetic profile-bootstrap method is defined.
2. The disposable Supabase platform/version and isolation controls are selected.
3. Duplicate company triggers and conditional `rls_auto_enable()` handling are explicitly documented.
4. Synthetic fixtures and expected validation results are defined.
5. Explicit authority is granted to create and modify the disposable project and execute the approved reconstruction artifacts.

## 8. Recommended S2C Scope

Once explicitly approved, S2C should:

- Use a new isolated disposable Supabase project with no production credentials or data.
- Reconstruct the canonical tables, preserve-only audit snapshot, 27 views, six required functions, and six required triggers.
- Test duplicate company triggers only as exact-live evidence; keep cleanup decisions separate.
- Treat `rls_auto_enable()` and `ensure_rls` as conditional until portability is proven.
- Recreate `candidate-resumes` and `bd-photo-intake` using synthetic files only.
- Reconstruct current security behavior as an evidence layer, not as automatic approval of the future target security model.
- Use non-PII synthetic fixtures covering authenticated, anonymous, service-role, relationship, trigger, function, view, and storage behavior.
- Compare generated types, object signatures, grants, policies, constraints, indexes, and expected application contracts.
- Exclude frozen legacy `terrer_*` tables, staging/prototype objects, `candidate_intent_events`, and the unused `resumes` bucket unless new evidence changes their classification.
- Produce a pass/fail validation report and an explicit list of changes needed before any baseline migration design.

## 9. Actions Still Requiring Explicit Approval

The following remain forbidden without explicit approval:

- Executing SQL against any Supabase project.
- Creating or applying migration files.
- Creating, linking, configuring, or modifying a disposable Supabase project.
- Changing database schema, tables, views, functions, triggers, grants, or sequences.
- Changing RLS policies, authentication behavior, or profile bootstrap behavior.
- Creating or changing storage buckets, storage policies, or object access rules.
- Changing environment variables, credentials, API keys, or project links.
- Accessing, copying, or loading production row data or PII.
- Changing the migration ledger.
- Modifying application code.
- Deploying Edge Functions or any application component.
- Touching the production Supabase project.

## Decision

Terrer should move next to a tightly scoped **S2C disposable-project validation package**, but not to execution until the five entry gates above are approved. The immediate safest action is to define the synthetic test fixtures, profile-bootstrap approach, environment controls, and exact pass/fail matrix needed for that approval.
