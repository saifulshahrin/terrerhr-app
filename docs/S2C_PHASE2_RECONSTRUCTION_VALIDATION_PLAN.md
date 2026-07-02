# Phase S2C.2 Reconstruction Validation Plan

## Document Status

- Mode: documentation only.
- Role: canonical S2C Phase 2 execution document.
- Proposed target: disposable Supabase project `terrer-schema-s2c-bootstrap`.
- Proposed project ref: `epigstfenpqbslgeyrtn`.
- Phase 1 status: successful.
- Auth/Profile Bootstrap blocker: resolved.
- Production status: excluded and untouched.
- Execution status: not authorized by this document.

## Objective

Define exactly how S2C Phase 2 would validate reconstruction of Terrer's approved exact-live canonical database objects in the existing disposable Supabase project.

Phase 2 is intended to prove that the canonical physical schema can be reconstructed in dependency order, compared with authoritative evidence, and exercised with synthetic non-PII fixtures. It is validation of rebuild feasibility, not production migration design or authorization.

This document supersedes the earlier Batch 1-first ordering. The revised strategy is dependency-first and separates pipeline verification from object reconstruction so execution failures are easier to classify.

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

## 4. Revised Execution Ladder

The original Batch 1 order:

- `companies_id_seq`
- `companies`
- `job_sources`

is now superseded. It bundled pipeline verification with multiple root objects and made the first failure harder to interpret.

### Why the strategy changed

The Batch 1 failure showed that the immediate question is not whether Terrer can reconstruct the full S2C Phase 2 object set. The immediate question is whether the disposable execution pipeline can persist the smallest reliable DDL units and prove them immediately. The revised strategy separates that proof into lower-dependency steps so each result is easier to trust and easier to debug.

### Phase 2-0: Execution pipeline verification

Prove the disposable execution path before attempting any broader reconstruction.

- Confirm target identity, isolation, and pre-state inventory.
- Revalidate the preserved Phase 1 `profiles` rows and Auth state.
- Reconstruct and validate `companies_id_seq` only.
- Confirm sequence ownership and no unintended side effects.

#### Phase 2-0 Execution Checklist

Use this checklist exactly, in order:

1. Confirm the disposable project ref is `epigstfenpqbslgeyrtn` and the project name is `terrer-schema-s2c-bootstrap`.
2. Confirm the linked target is the disposable project and not production by checking the active Supabase link metadata before any SQL runs.
3. Confirm the local repository context is the current branch `schema-s1-stabilization`.
4. Confirm the execution method is `supabase db query --linked` against the linked disposable project only.
5. Confirm no migration file, SQL file, or production connection string will be used for this phase.
6. Run a read-only pre-state query to confirm:
   - `public.profiles` exists and still has the preserved Phase 1 rows.
   - `public.companies_id_seq` does not yet exist.
   - `public.companies` does not yet exist.
   - `public.job_sources` does not yet exist.
7. Execute a single reviewed SQL statement batch that creates only `public.companies_id_seq`.
8. Run read-only validation queries for:
   - `to_regclass('public.companies_id_seq')`
   - sequence ownership
   - sequence next-value behavior
   - absence of any unintended new objects outside the sequence
   
   ```sql
   SELECT
     to_regclass('public.companies_id_seq') AS companies_id_seq,
     to_regclass('public.companies') AS companies,
     to_regclass('public.job_sources') AS job_sources;

   SELECT last_value, is_called
   FROM public.companies_id_seq;

   SELECT pg_get_userbyid(c.relowner) AS sequence_owner
   FROM pg_class c
   WHERE c.oid = 'public.companies_id_seq'::regclass;
   ```
9. Record the command output, validation output, and the exact object inventory before and after the run.
10. Stop immediately after validation. Do not continue to Phase 2-1 until the human approval gate is cleared.

Phase 2-0 success criteria:

- The disposable target was verified before SQL execution.
- Production remained unreachable from the approved execution method.
- `public.companies_id_seq` exists after the run.
- `public.profiles` remained present and unchanged.
- No unapproved object was created.
- Validation queries returned the expected sequence ownership and next-value results.
- Evidence was captured without secrets or production data.

Phase 2-0 failure criteria:

- The project ref or project name does not match the approved disposable target.
- The active link metadata points to production or an unapproved project.
- The execution method is anything other than `supabase db query --linked` for the linked disposable project.
- `public.companies_id_seq` is absent after the run.
- `public.profiles` changes unexpectedly.
- Any object outside the sequence is created, altered, or dropped.
- Any SQL error, permission error, or persistence mismatch occurs.

Phase 2-0 stop conditions:

- Stop immediately after pre-state capture if the target cannot be verified.
- Stop immediately after SQL submission if the command returns an error.
- Stop immediately after validation if the sequence or profile state does not match the expected result.
- Stop immediately before Phase 2-1 unless a human explicitly approves continuation.

Phase 2-0 rollback expectations:

- If the sequence creation fails, do not attempt repair SQL in the same run.
- If the wrong target is detected, stop and do not retry until the target is re-approved.
- If the sequence is created incorrectly, remove only the disposable-project change and preserve Phase 1 `profiles`.
- If any rollback requires a destructive action, obtain a separate approval before acting.

Phase 2-0 evidence to capture:

- Git branch and working-tree status.
- Disposable project name and ref.
- Active link metadata proving the target is disposable.
- Pre-state object inventory.
- SQL submission command used.
- Validation query output.
- Post-state object inventory.
- Any mismatch or error text.

### Phase 2-1: First independent canonical table

Use one independent table to prove a full table DDL cycle after the sequence smoke test.

- Reconstruct `job_sources`.
- Validate columns, defaults, nullability, constraints, indexes, and ownership.
- Treat success here as the first proof that a standalone canonical table can persist cleanly.

### Phase 2-2: Parent and root entities

Reconstruct the parent/root objects that anchor downstream relationships.

- Reconstruct `companies`.
- Reconstruct `skills`.
- Reconstruct `autonomous_recruiter_runs`.
- Validate each object before moving to any dependent layer.

#### Phase 2-2 Canonical Package: `public.companies`

This is a phased reconstruction adaptation, not a schema redesign.

- The canonical live schema uses an identity-backed `companies.id`.
- Phase 2-0 already created and validated `public.companies_id_seq`.
- Because the sequence already exists, reconstruction must preserve it instead of creating a second implicit identity sequence.
- The logical schema target remains canonical.
- The reconstruction method differs only because objects are being rebuilt in phases.
- The expected final catalog state should match the canonical live schema as closely as possible without replacing the validated sequence.

##### Preconditions

- `public.companies_id_seq` exists and has already been validated in Phase 2-0.
- `public.companies` does not yet exist.
- The disposable project ref is still `epigstfenpqbslgeyrtn`.
- No production link or production SQL path is active.

##### Exact Reconstruction Method

Use the pre-existing sequence explicitly in the column default, then attach ownership after the table exists:

```sql
CREATE TABLE "public"."companies" (
  "id" bigint NOT NULL DEFAULT nextval('public.companies_id_seq'::regclass),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "company_name" text COLLATE "pg_catalog"."default",
  "company_slug" text COLLATE "pg_catalog"."default",
  "website_url" text COLLATE "pg_catalog"."default",
  "linkedin_url" text COLLATE "pg_catalog"."default",
  "hq_country" text COLLATE "pg_catalog"."default",
  "primary_city" text COLLATE "pg_catalog"."default",
  "company_status" text COLLATE "pg_catalog"."default" DEFAULT 'active'::text,
  "source_type" text COLLATE "pg_catalog"."default",
  "notes" text COLLATE "pg_catalog"."default",
  "updated_at" timestamp with time zone DEFAULT now(),
  "career_url" text COLLATE "pg_catalog"."default",
  "ats_family" text COLLATE "pg_catalog"."default",
  "source_confidence" integer,
  "source_status" text COLLATE "pg_catalog"."default",
  "source_notes" text COLLATE "pg_catalog"."default",
  "last_enriched_at" timestamp with time zone,
  "last_checked_at" timestamp with time zone
);

ALTER TABLE "public"."companies" OWNER TO "postgres";
ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;
ALTER SEQUENCE "public"."companies_id_seq" OWNED BY "public"."companies"."id";

ALTER TABLE ONLY "public"."companies"
  ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."companies"
  ADD CONSTRAINT "companies_source_status_check"
  CHECK (
    "source_status" IS NULL OR
    ("source_status" = ANY (ARRAY['missing'::text, 'queued'::text, 'partial'::text, 'ready'::text, 'blocked'::text]))
  );
```

##### Canonical Live Evidence

- Table shape, owner, and RLS: `companies` live DDL.
- Sequence ownership: `companies_id_seq` owned by `companies.id`.
- Constraints: `companies_pkey`, `companies_source_status_check`.
- Policies: anon read, authenticated insert, authenticated read.
- Grants: full table grants for `anon`, `authenticated`, `postgres`, and `service_role`; sequence grants for `anon`, `authenticated`, `postgres`, and `service_role`.

##### Validation Queries

Pre-state existence only:

```sql
SELECT to_regclass('public.companies_id_seq') AS companies_id_seq;
SELECT to_regclass('public.companies') AS companies;
```

Post-state catalog validation:

```sql
SELECT to_regclass('public.companies') AS companies;

SELECT pg_get_serial_sequence('public.companies', 'id') AS companies_id_seq;

SELECT a.attname, pg_get_expr(d.adbin, d.adrelid) AS column_default
FROM pg_attrdef d
JOIN pg_attribute a
  ON a.attrelid = d.adrelid
 AND a.attnum = d.adnum
WHERE d.adrelid = 'public.companies'::regclass
  AND a.attname = 'id';

SELECT c.relname AS sequence_name, t.relname AS table_name, a.attname AS column_name
FROM pg_class c
JOIN pg_depend dep ON dep.objid = c.oid
JOIN pg_class t ON t.oid = dep.refobjid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = dep.refobjsubid
WHERE c.oid = 'public.companies_id_seq'::regclass;

SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.companies'::regclass
ORDER BY conname;

SELECT relrowsecurity
FROM pg_class
WHERE oid = 'public.companies'::regclass;

SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'companies'
ORDER BY policyname;
```

##### Behavior Validation

```sql
INSERT INTO public.companies (
  company_name,
  source_status
) VALUES (
  'S2C Phase 2-2 validation company',
  'ready'
)
RETURNING id, company_status, source_status;

INSERT INTO public.companies (
  company_name,
  source_status
) VALUES (
  'S2C Phase 2-2 invalid source_status',
  'not_allowed'
);
```

- The first insert must succeed and return a generated `id`.
- The second insert must fail with `companies_source_status_check`.

##### Expected Catalog State

- `public.companies` exists.
- `public.companies_id_seq` exists.
- `public.companies.id` uses `public.companies_id_seq` as its default value source.
- `public.companies_id_seq` is owned by `public.companies.id`.
- `companies_pkey` exists.
- `companies_source_status_check` exists.
- RLS is enabled.
- The live policies and grants match the evidence.

##### Success Criteria

- The table is created without creating a second sequence.
- The preserved sequence remains valid and attached.
- Catalog validation matches the live evidence as closely as the phased method allows.
- The valid insert succeeds.
- The invalid `source_status` insert is rejected.

##### Failure Criteria

- A second identity or sequence path is created for `id`.
- `companies_id_seq` is detached, renamed, or replaced.
- The default does not resolve to `companies_id_seq`.
- The ownership mapping does not point to `companies.id`.
- The primary key, check constraint, RLS, policies, or grants diverge from the live evidence.
- The valid insert fails or the invalid `source_status` insert succeeds.

##### Rollback Procedure

- Disposable project only.
- If the package fails before completion, stop immediately.
- If rollback is approved, drop only `public.companies` in the disposable project and preserve Phase 2-0 evidence unless a separate approval says otherwise.

##### Evidence to Capture

- Pre-state existence checks.
- SQL execution output.
- Post-state catalog checks.
- Policy and grant verification.
- Behavior validation success and failure output.
- Any exact error text.

##### Human Approval Gate

- Human approval is required before running the package against `epigstfenpqbslgeyrtn`.
- No SQL should run until the linked ref is verified and the pre-state existence checks pass.

### Phase 2-3: Candidate-domain root entities

Bring in the candidate-side root objects after the upstream roots are stable.

- Reconstruct `candidates`.
- Reconstruct `web_candidate_intakes`.
- Reconstruct `web_job_interest`.
- Preserve the distinction between candidate intake roots and later matching/execution tables.

### Phase 2-4: First dependent entities

Reconstruct the first dependency wave, then the deeper dependent wave, before any policy or trigger work.

- First dependent wave: `bd_contacts`, `jobs`, `source_profiles`, `candidate_scores`, `candidate_capabilities`, `autonomous_recruiter_memory`.
- Second dependent wave: `bd_notes`, `jobs_intake`, `job_requirements`, `candidate_skills`, `ai_assessments`, `submissions`, `activity_log`.
- If `evidence_signals` is approved, place it only after the candidate/source dependencies are stable.
- If `company_identity_merge_v1_snapshot` is approved, keep it as preserve-only evidence after the operational tables are stable.

### Phase 2-5: Functions, triggers, RLS, policies

Only after the table graph is stable, add the behavior and security layer.

- Reconstruct canonical public functions.
- Reconstruct canonical table triggers.
- Reconstruct the conditional company trigger pair only if explicitly approved as exact-live evidence.
- Reconstruct `rls_auto_enable()` and `ensure_rls` only if explicitly approved.
- Apply grants, RLS enablement, and table policies only after the function layer is stable.
- Reconstruct storage buckets and `storage.objects` policies only after the policy model is settled.

### Post-Phase Security and Validation Tail

- Synthetic fixtures.
- Behavioral validation.
- Generated type comparison, if separately approved.
- Evidence reconciliation and final report.
- Cleanup or controlled hold.

## 5. Validation Sequence

1. Confirm current human approval and Phase 2 scope.
2. Confirm the exact disposable project name and ref.
3. Confirm production denylist and isolation controls.
4. Record region, organization/workspace, PostgreSQL version, platform settings, extensions, and teardown owner.
5. Revalidate Phase 1 Auth/Profile assertions.
6. Capture pre-reconstruction object inventory.
7. Run Phase 2-0 pipeline verification using the checklist above and reconstruct `companies_id_seq` only.
8. Run Phase 2-1 and validate `job_sources`.
9. Run Phase 2-2 and validate parent/root entities.
10. Run Phase 2-3 and validate candidate-domain root entities.
11. Run Phase 2-4 and validate dependent entities in dependency order.
12. Run Phase 2-5 for functions, triggers, RLS, policies, and storage security.
13. Load the approved minimum synthetic fixture set only after the structural and security layers are stable.
14. Validate row counts and relationships.
15. Validate canonical functions.
16. Validate trigger side effects and trigger counts.
17. Validate candidate, pipeline, jobs, market, and source-health views.
18. Validate grants, RLS, and storage object behavior.
19. Generate and compare types only if separately approved.
20. Classify every difference as `PASS`, `FAIL`, `DEFERRED`, or `NOT APPLICABLE`.
21. Produce the Phase 2 validation report.
22. Obtain the human cleanup/hold decision.

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
