# Phase S2B Exact-Live Draft Package

Date: 7 June 2026  
Status: non-executable reconstruction draft  
Mode: documentation only

## Purpose

This package assembles the approved canonical Terrer objects into one dependency-ordered exact-live reconstruction specification.

It does not contain executable SQL or migrations. It classifies whether the available evidence is sufficient to draft and later test each object.

## Readiness Classification

| Status | Meaning |
|---|---|
| **READY** | Exact physical definition and dependencies are captured well enough to draft an exact-live reconstruction artifact. |
| **PARTIAL** | Physical evidence exists, but an operational, platform, ownership, or dependency ambiguity prevents high-confidence behavioral reconstruction. |
| **BLOCKED** | A required definition or dependency is missing enough that responsible reconstruction cannot yet proceed. |

Readiness applies to exact-live reconstruction, not production-safety approval.

## Executive Readiness

| Object class | READY | PARTIAL | BLOCKED |
|---|---:|---:|---:|
| Sequence and canonical tables | 13 | 9 | 0 |
| Canonical/full-fidelity views | 27 | 0 | 0 |
| Canonical functions | 6 | 1 | 0 |
| Canonical triggers/event trigger | 6 | 3 | 0 |
| Storage buckets | 0 | 2 | 0 |
| Auth/profile platform dependencies | 1 | 3 | 1 |

Terrer’s database structure is broadly ready for exact-live drafting. The main uncertainty is operational behavior around auth/profile bootstrap, unknown writers, storage platform behavior, and conditional security automation.

## 1. Exact Canonical Object Inventory

### Sequence and Tables

| Order | Object | Domain | Status | Evidence confidence | Rationale |
|---:|---|---|---|---|---|
| 1 | `companies_id_seq` | Relationship Intelligence | READY | High | Exact sequence and ownership evidence captured |
| 2 | `profiles` | Identity/Auth | PARTIAL | Medium | Exact table/FK/check/policies captured; profile bootstrap is unknown |
| 3 | `companies` | Relationship Intelligence | READY | High | Columns, sequence, check, grants, policies, and triggers captured |
| 4 | `job_sources` | Demand Intelligence | READY | High | Complete physical contract and indexes captured |
| 5 | `candidates` | Candidate Intelligence | READY | High physical / Low security | Exact table captured; unsafe RLS posture does not prevent exact-live drafting |
| 6 | `skills` | Candidate/Matching Intelligence | PARTIAL | Medium | Exact two-column table captured; ID generation and taxonomy writer unknown |
| 7 | `autonomous_recruiter_runs` | AI Operating Layer | PARTIAL | Medium | Exact schema/indexes/policies captured; production writer unknown |
| 8 | `web_candidate_intakes` | Marketplace Intake | PARTIAL | Medium | Exact schema/policies captured; external caller and promotion flow unverified |
| 9 | `web_job_interest` | Marketplace | PARTIAL | Medium | Exact schema/policies captured; external creator unknown |
| 10 | `bd_contacts` | Relationship Intelligence | READY | High | Exact FK, indexes, grants, and policies captured |
| 11 | `jobs` | Demand Intelligence | READY | High | Exact live table and source FK captured despite migration drift |
| 12 | `source_profiles` | Candidate Intelligence | READY | High physical / Medium operational | Exact table/FK captured; sourcing writer remains unknown |
| 13 | `candidate_scores` | Matching Intelligence | PARTIAL | Medium | Exact columns/FK captured; no PK/index and cardinality/producer unknown |
| 14 | `candidate_capabilities` | Candidate/Matching Intelligence | PARTIAL | Medium | Exact table/FK captured; no PK/index and producer unknown |
| 15 | `autonomous_recruiter_memory` | AI/Feedback Learning | PARTIAL | Medium | Exact schema/indexes captured; source-run relation and writer unverified |
| 16 | `bd_notes` | Relationship Intelligence | READY | High | Exact auth/company/contact relationships and indexes captured |
| 17 | `jobs_intake` | Requirement Capture | READY | High physical / Medium behavioral | Exact table captured; intended job FK and transactional behavior absent |
| 18 | `job_requirements` | Requirement/Matching | READY | High physical / Medium behavioral | Exact live shape/check/index captured; job relation unenforced |
| 19 | `candidate_skills` | Candidate/Matching Intelligence | PARTIAL | Medium | Exact live shape/FKs/index captured; no key, all nullable, current app writer incompatible |
| 20 | `ai_assessments` | Matching Intelligence | READY | High | Exact FKs, unique pair, fields, and policies captured |
| 21 | `submissions` | Recruitment Execution | READY | High | Exact FKs, checks, indexes, policies, and dependencies captured |
| 22 | `activity_log` | Recruitment Execution | READY | High | Exact schema/check/FK and trigger behavior captured |

### Preserve-Only Full-Fidelity Table

| Object | Status | Evidence confidence | Baseline treatment |
|---|---|---|---|
| `company_identity_merge_v1_snapshot` | READY | High | Include in full-fidelity draft as audit evidence |

### Conditional Evidence Table

| Object | Status | Evidence confidence | Baseline treatment |
|---|---|---|---|
| `evidence_signals` | PARTIAL | Medium | Exact table/FK captured; include only if candidate evidence reproduction is approved |

## 2. Dependency Order

### Layer A — Supabase platform prerequisites

1. Supabase-managed `auth` schema and `auth.users`.
2. Supabase-managed `storage` schema and service objects.
3. Standard API roles.
4. Required UUID extension.

### Layer B — sequence and root tables

1. `companies_id_seq`
2. `profiles`
3. `companies`
4. `job_sources`
5. `candidates`
6. `skills`
7. `autonomous_recruiter_runs`
8. `web_candidate_intakes`
9. `web_job_interest`

### Layer C — first-level dependencies

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
5. Conditional `evidence_signals`

### Layer E — execution tables

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

1. Candidate updated-at trigger.
2. Job updated-at trigger.
3. Company updated-at triggers.
4. Submission stage timestamp trigger.
5. Submission updated-at trigger.
6. Activity next-action trigger.
7. Activity stage trigger.
8. Conditional `ensure_rls` event trigger.

### Layer H — views

1. Candidate search views.
2. Pipeline base views.
3. Pipeline dependent views.
4. Jobs base views.
5. Jobs dependent reporting/source-health views.

### Layer I — grants, RLS, and storage

1. Relation/sequence grants.
2. Function grants.
3. RLS state.
4. Table policies.
5. Bucket configuration.
6. `storage.objects` policies.

## 3. Table Reconstruction Order

The exact order is:

1. `profiles`
2. `companies`
3. `job_sources`
4. `candidates`
5. `skills`
6. `autonomous_recruiter_runs`
7. `web_candidate_intakes`
8. `web_job_interest`
9. `bd_contacts`
10. `jobs`
11. `source_profiles`
12. `candidate_scores`
13. `candidate_capabilities`
14. `autonomous_recruiter_memory`
15. `bd_notes`
16. `jobs_intake`
17. `job_requirements`
18. `candidate_skills`
19. Conditional `evidence_signals`
20. `ai_assessments`
21. `submissions`
22. `activity_log`
23. `company_identity_merge_v1_snapshot` for full fidelity

The order reflects current dependencies, not proposed future FKs.

## 4. View Reconstruction Order

### Candidate read model

| Order | View | Status | Confidence | Dependencies |
|---:|---|---|---|---|
| 1 | `vw_candidate_search` | READY | High | Candidate domain tables |
| 2 | `vw_candidate_search_clean` | READY | High | `vw_candidate_search` |

### Pipeline views

| Order | View | Status | Confidence | Dependencies |
|---:|---|---|---|---|
| 1 | `recruiter_active_submissions` | READY | High | candidates, jobs, submissions |
| 2 | `vw_submissions_enriched` | READY | High | candidates, jobs, submissions |
| 3 | `vw_company_pipeline_summary` | READY | High | jobs, submissions |
| 4 | `vw_candidate_pipeline_summary` | READY | High | candidates, submissions |
| 5 | `vw_activity_log_enriched` | READY | High | activity, candidates, jobs, submissions |
| 6 | `vw_pipeline_summary` | READY | High | submissions |
| 7 | `vw_outcomes_summary` | READY | High | submissions |
| 8 | `vw_live_work_queue` | READY | High | submissions |
| 9 | `vw_followup_queue` | READY | High | activity, candidates, jobs, submissions |
| 10 | `vw_job_shortlist` | READY | High | `vw_submissions_enriched` |
| 11 | `vw_recruiter_dashboard` | READY | High | activity, `vw_submissions_enriched` |

### Demand and source views

| Order | View | Status | Confidence | Dependencies |
|---:|---|---|---|---|
| 1 | `jobs_latest` | READY | High | jobs |
| 2 | `jobs_latest_practical` | READY | High | jobs |
| 3 | `jobs_reporting` | READY | High | `jobs_latest_practical` |
| 4 | `hiring_leaderboard_malaysia` | READY | High | `jobs_latest_practical` |
| 5 | `terrer_hiring_now` | READY | High | `jobs_latest_practical` |
| 6 | `vw_jobs_tier1_malaysia` | READY | High | jobs, job sources |
| 7 | `vw_market_signals` | READY | High | jobs |
| 8 | `vw_market_signals_active` | READY | High | jobs |
| 9 | `vw_market_signals_realtime` | READY | High | jobs |
| 10 | `vw_market_signals_recent` | READY | High | jobs |
| 11 | `vw_tier1_source_health` | READY | High | jobs, job sources |
| 12 | `vw_tier1_source_health_v2` | READY | High | `vw_tier1_source_health` |
| 13 | `vw_tier1_source_diagnostics` | READY | High | `vw_tier1_source_health_v2` |
| 14 | `vw_tier1_source_health_summary` | READY | High | `vw_tier1_source_health_v2` |

All selected views have captured live definitions and catalog-derived dependencies.

## 5. Function Reconstruction Order

| Order | Function | Status | Confidence | Rationale |
|---:|---|---|---|---|
| 1 | `update_updated_at_column()` | READY | High | Exact body and trigger dependencies captured |
| 2 | `update_submission_stage_timestamp()` | READY | High | Exact body captured |
| 3 | `sync_submission_next_action_from_activity()` | READY | High | Exact body and target mutation captured |
| 4 | `sync_submission_stage_from_activity()` | READY | High | Exact stage mapping captured |
| 5 | `is_current_user_admin()` | READY | High physical / Medium platform | Exact security-definer body/search path/grants captured |
| 6 | `create_submission_with_activity(...)` | READY | High | Exact signature/body/side effects captured |
| 7 | `rls_auto_enable()` | PARTIAL | Medium | Exact body/event trigger captured; inclusion as baseline invariant is unapproved |

## 6. Trigger Reconstruction Order

| Order | Trigger | Status | Confidence | Rationale |
|---:|---|---|---|---|
| 1 | `set_updated_at_candidates` | READY | High | Exact definition captured |
| 2 | `set_updated_at_jobs` | READY | High | Exact definition captured |
| 3 | `set_updated_at` on companies | PARTIAL | High physical / Low target | Exact duplicate pair exists; target selection unresolved |
| 4 | `set_updated_at_companies` | PARTIAL | High physical / Low target | Exact duplicate pair exists; target selection unresolved |
| 5 | `set_submission_stage_updated_at` | READY | High | Exact definition captured |
| 6 | `set_updated_at_submissions` | READY | High | Exact definition captured |
| 7 | `trg_sync_submission_next_action_from_activity` | READY | High | Exact definition captured |
| 8 | `trg_sync_submission_stage_from_activity` | READY | High | Exact definition captured |
| 9 | `ensure_rls` event trigger | PARTIAL | Medium | Exact definition captured; baseline governance decision unresolved |

For exact-live reproduction, both company triggers can be represented. For the target canonical baseline, one must be selected later.

## 7. Storage Dependencies

| Bucket/policy group | Status | Confidence | Rationale |
|---|---|---|---|
| `candidate-resumes` bucket | PARTIAL | Medium | Exact bucket configuration and policies captured; platform creation/version and path behavior untested |
| Candidate-resume policies | PARTIAL | Medium | Exact expressions captured; duplicate reads and unsafe broad access are known |
| `bd-photo-intake` bucket | PARTIAL | Medium | Exact configuration captured; no MIME/size limit and platform behavior untested |
| BD photo policies | PARTIAL | Medium | Exact bucket-wide CRUD expressions captured; “own” behavior is not actually owner-scoped |

Supabase-managed storage internals are platform dependencies and are not Terrer reconstruction objects.

## 8. Auth and Profile Dependencies

| Dependency | Status | Confidence | Rationale |
|---|---|---|---|
| Supabase Auth platform | PARTIAL | Medium | Platform prerequisite is known, but target version/behavior is not yet selected or tested |
| `auth.users` FK support | READY | High | Exact FK dependency captured |
| Profile table structure | PARTIAL | Medium | Exact physical table is captured; bootstrap path is missing |
| Synthetic profile bootstrap | BLOCKED | Low | No approved mechanism yet exists for creating profile rows from disposable auth users |
| `is_current_user_admin()` behavior | PARTIAL | Medium | Exact function is captured; requires synthetic auth/profile setup for proof |

The bootstrap blocker does not prevent structural table drafting, but it blocks complete auth/policy behavior validation.

## 9. Required Validation Sequence

1. Verify disposable target identity and platform versions.
2. Verify empty-project inventory.
3. Reconstruct sequence and tables in dependency order.
4. Compare columns, defaults, nullability, constraints, and indexes.
5. Reconstruct functions.
6. Reconstruct triggers and verify exact trigger count.
7. Reconstruct candidate views and compare output types.
8. Reconstruct pipeline views.
9. Reconstruct demand/source views.
10. Apply current grants and RLS evidence layer.
11. Create canonical buckets and object policies.
12. Create synthetic auth users and profile fixtures.
13. Load synthetic business fixtures.
14. Test functions and trigger side effects.
15. Test view results.
16. Test role and policy behavior.
17. Test storage operations.
18. Generate types and compare with live generated types.
19. Run application build and workflow smoke tests.
20. Produce schema diff, validation results, and teardown evidence.

## 10. Unresolved Dependencies

### Structural or platform

- Disposable Supabase/Postgres/storage version.
- Profile bootstrap mechanism.
- Company duplicate-trigger target decision.
- `rls_auto_enable()` inclusion.
- Storage creation and policy behavior across platform versions.

### Operational writers

- External job/source ingestion.
- Skill taxonomy.
- Candidate skills, scores, capabilities, and evidence generation.
- Web job-interest creator.
- Autonomous recruiter writer.
- Direct activity writer.

### Contract decisions

- Candidate-skill uniqueness.
- Skill ID/name governance.
- Candidate score cardinality.
- Job identity semantics.
- Missing logical FKs.
- Minimum required business fields.

These block stabilized target design, but most do not block exact-live physical drafting.

## 11. Evidence Confidence Summary

### High confidence

- Table columns/types/defaults/nullability.
- Constraints and indexes.
- All selected view definitions and dependencies.
- Public function bodies.
- Table trigger definitions.
- Current grants and policies.
- Sequence definition.
- Bucket configuration and policy expressions.

### Medium confidence

- Complete external writer coverage.
- Platform portability of auth/storage/event triggers.
- Runtime behavior without disposable validation.
- Candidate derived-table generation.
- Current use of reporting views.

### Low confidence

- Profile bootstrap.
- `resumes` bucket ownership.
- Hidden external consumers of excluded objects.
- Target-state security behavior.

## 12. Draft Package Boundary

Included:

- Canonical sequence and tables.
- Candidate, pipeline, and demand views.
- Canonical functions and triggers.
- Current security evidence as a separate layer.
- Canonical storage dependencies.
- Audit snapshot.

Excluded:

- Legacy `terrer_*`.
- Staging.
- Prototype/dormant tables and views.
- `candidate_intent_events`.
- `resumes`.
- Migration-ledger repair.
- Any stabilization change.

## Conclusion

The exact-live physical draft is broadly **READY**.

The package remains **PARTIAL** as an operational rebuild because profile bootstrap, platform behavior, several writers, storage behavior, and two conditional security/trigger decisions are unresolved.
