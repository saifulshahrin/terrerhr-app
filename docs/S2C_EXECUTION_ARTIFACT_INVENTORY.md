# Phase S2C Execution Artifact Inventory

## Purpose

This inventory lists every tracked object or dependency involved in S2C reconstruction validation. It identifies the source of truth, evidence source, confidence, reconstruction readiness, and notes needed before disposable-project execution.

This is documentation only. It does not create SQL, migrations, a disposable project, or execute any Supabase action.

## Source-of-Truth Hierarchy

| Priority | Source | Use |
|---:|---|---|
| 1 | Live schema evidence under `docs/schema-evidence/` | Exact-live DDL, grants, policies, functions, triggers, storage evidence. |
| 2 | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | Dependency order, readiness classification, object inventory. |
| 3 | `docs/S1_CANONICAL_CONTRACTS.md` | Canonical purpose, relationships, contract drift, repair recommendations. |
| 4 | `docs/S1_BASELINE_OBJECT_MANIFEST.md` | Canonical/provisional/preserve-only/legacy classification. |
| 5 | `docs/S1_WRITER_OWNERSHIP_MAP.md` | Writer ownership and RLS sensitivity. |
| 6 | Supabase generated types, if present | App-facing type contract comparison. |
| 7 | Repository migrations | Historical reference only; not authoritative where drift is known. |

## Most Important Answer

**Is there any object required for reconstruction that does not have a clear source of truth?**

**Answer: No for physical exact-live reconstruction; yes for some behavioral validation dependencies.**

All tracked reconstruction objects have a clear source of truth for their physical exact-live definition, primarily live schema evidence and the S2B exact-live draft package. However, several objects have incomplete behavioral evidence or unresolved ownership decisions. The clearest gaps are:

- Synthetic auth/profile bootstrap.
- `profiles` lifecycle and provisioning behavior.
- `candidate_skills`, `skills`, `candidate_scores`, and `candidate_capabilities` writer ownership.
- `candidate-resumes` and `bd-photo-intake` runtime storage behavior.
- Conditional `rls_auto_enable()` and `ensure_rls` target inclusion.
- Duplicate company updated-at trigger target design.

These gaps do not eliminate the physical source of truth, but they must be tested or explicitly classified during S2C.

## Inventory

### Sequence, Tables, and Preserve-Only Tables

| Object name | Object type | Source of truth | Evidence source | Confidence | Reconstruction readiness | Notes |
|---|---|---|---|---|---|---|
| `companies_id_seq` | sequence | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Exact sequence and ownership evidence captured. |
| `profiles` | table | Live schema evidence plus Supabase Auth dependency | `docs/S1_CANONICAL_CONTRACTS.md`; `docs/S2C_FIXTURE_AND_BOOTSTRAP_SPECIFICATION.md` | medium | PARTIAL | Physical table known; auth/profile bootstrap remains unresolved until disposable validation. |
| `companies` | table | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Columns, sequence, check, grants, policies, and triggers captured. |
| `job_sources` | table | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Complete physical contract and indexes captured. |
| `candidates` | table | Live schema evidence | `docs/S1_CANONICAL_CONTRACTS.md`; `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Physical definition clear; target security posture remains separate. |
| `skills` | table | Live schema evidence | `docs/S2B5_RECONSTRUCTION_READINESS_AUDIT.md` | medium | PARTIAL | Table shape known; taxonomy writer and ID governance unresolved. |
| `autonomous_recruiter_runs` | table | Live schema evidence | `docs/S2B5_RECONSTRUCTION_READINESS_AUDIT.md` | medium | PARTIAL | Schema/indexes/policies captured; production writer unknown. |
| `web_candidate_intakes` | table | Live schema evidence | `docs/S2B5_RECONSTRUCTION_READINESS_AUDIT.md` | medium | PARTIAL | Schema/policies captured; external caller and promotion flow unverified. |
| `web_job_interest` | table | Live schema evidence | `docs/S2B5_RECONSTRUCTION_READINESS_AUDIT.md` | medium | PARTIAL | Schema/policies captured; public creator and review lifecycle unresolved. |
| `bd_contacts` | table | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | FK, indexes, grants, and policies captured. |
| `jobs` | table | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Exact live table and source FK captured despite migration drift. |
| `source_profiles` | table | Live schema evidence | `docs/S1_CANONICAL_CONTRACTS.md`; `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Exact table/FK captured; sourcing writer remains operational gap. |
| `candidate_scores` | table | Live schema evidence | `docs/S2B5_RECONSTRUCTION_READINESS_AUDIT.md` | medium | PARTIAL | Columns/FK known; no PK/index and scoring lifecycle unknown. |
| `candidate_capabilities` | table | Live schema evidence | `docs/S2B5_RECONSTRUCTION_READINESS_AUDIT.md` | medium | PARTIAL | Table/FK known; producer and uniqueness unknown. |
| `autonomous_recruiter_memory` | table | Live schema evidence | `docs/S2B5_RECONSTRUCTION_READINESS_AUDIT.md` | medium | PARTIAL | Schema/indexes captured; source-run relation and writer unverified. |
| `bd_notes` | table | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Auth/company/contact relationships and indexes captured. |
| `jobs_intake` | table | Live schema evidence | `docs/S1_CANONICAL_CONTRACTS.md`; `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Exact table captured; transactional behavior remains validation concern. |
| `job_requirements` | table | Live schema evidence | `docs/S1_CANONICAL_CONTRACTS.md`; `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Exact shape/check/index captured; job relation not enforced. |
| `candidate_skills` | table | Live schema evidence | `docs/S2B5_RECONSTRUCTION_READINESS_AUDIT.md` | medium | PARTIAL | Exact shape/FKs/index known; no key, nullable fields, writer mismatch. |
| `evidence_signals` | table | Live schema evidence | `docs/S2B5_RECONSTRUCTION_READINESS_AUDIT.md` | medium | PARTIAL | Include only if candidate evidence reproduction is approved. |
| `ai_assessments` | table | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | FKs, unique pair, fields, and policies captured. |
| `submissions` | table | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | FKs, checks, indexes, policies, and dependencies captured. |
| `activity_log` | table | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Schema/check/FK and trigger behavior captured. |
| `company_identity_merge_v1_snapshot` | preserve-only table | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Include in full-fidelity draft as audit evidence. |

### Views

| Object name | Object type | Source of truth | Evidence source | Confidence | Reconstruction readiness | Notes |
|---|---|---|---|---|---|---|
| `vw_candidate_search` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Candidate read model base view. |
| `vw_candidate_search_clean` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Depends on `vw_candidate_search`. |
| `recruiter_active_submissions` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Pipeline view over candidates, jobs, submissions. |
| `vw_submissions_enriched` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Submission enrichment view. |
| `vw_company_pipeline_summary` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Company-level pipeline summary. |
| `vw_candidate_pipeline_summary` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Candidate-level pipeline summary. |
| `vw_activity_log_enriched` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Activity enrichment view. |
| `vw_pipeline_summary` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Submission pipeline aggregate. |
| `vw_outcomes_summary` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Outcomes aggregate. |
| `vw_live_work_queue` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Execution work queue. |
| `vw_followup_queue` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Follow-up queue. |
| `vw_job_shortlist` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Depends on enriched submissions. |
| `vw_recruiter_dashboard` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Dashboard read model. |
| `jobs_latest` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Demand base view. |
| `jobs_latest_practical` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Practical demand base view. |
| `jobs_reporting` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Reporting view over latest practical jobs. |
| `hiring_leaderboard_malaysia` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Malaysia-first hiring leaderboard. |
| `terrer_hiring_now` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Hiring-now market view. |
| `vw_jobs_tier1_malaysia` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Tier-1 Malaysia jobs view. |
| `vw_market_signals` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Market signals view. |
| `vw_market_signals_active` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Active market signals. |
| `vw_market_signals_realtime` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Realtime market signals. |
| `vw_market_signals_recent` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Recent market signals. |
| `vw_tier1_source_health` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Tier-1 source health base view. |
| `vw_tier1_source_health_v2` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Depends on `vw_tier1_source_health`. |
| `vw_tier1_source_diagnostics` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Depends on source-health v2. |
| `vw_tier1_source_health_summary` | view | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Depends on source-health v2. |

### Functions

| Object name | Object type | Source of truth | Evidence source | Confidence | Reconstruction readiness | Notes |
|---|---|---|---|---|---|---|
| `update_updated_at_column()` | function | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Exact body and trigger dependencies captured. |
| `update_submission_stage_timestamp()` | function | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Exact body captured. |
| `sync_submission_next_action_from_activity()` | function | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Exact body and target mutation captured. |
| `sync_submission_stage_from_activity()` | function | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Exact stage mapping captured. |
| `is_current_user_admin()` | function | Live schema evidence plus auth/profile fixtures | `docs/S1_CANONICAL_CONTRACTS.md`; `docs/S2C_FIXTURE_AND_BOOTSTRAP_SPECIFICATION.md` | high | READY | Physical function captured; behavior requires auth/profile bootstrap validation. |
| `create_submission_with_activity(...)` | function | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Exact signature, body, and side effects captured. |
| `rls_auto_enable()` | function | Live schema evidence | `docs/S2B5_RECONSTRUCTION_READINESS_AUDIT.md` | medium | PARTIAL | Exact body captured; baseline inclusion and portability unapproved. |

### Triggers

| Object name | Object type | Source of truth | Evidence source | Confidence | Reconstruction readiness | Notes |
|---|---|---|---|---|---|---|
| `set_updated_at_candidates` | trigger | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Exact definition captured. |
| `set_updated_at_jobs` | trigger | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Exact definition captured. |
| `set_updated_at` on `companies` | trigger | Live schema evidence | `docs/S2B5_RECONSTRUCTION_READINESS_AUDIT.md` | medium | PARTIAL | Duplicate company update trigger; exact-live test acceptable. |
| `set_updated_at_companies` | trigger | Live schema evidence | `docs/S2B5_RECONSTRUCTION_READINESS_AUDIT.md` | medium | PARTIAL | Duplicate company update trigger; target selection deferred. |
| `set_submission_stage_updated_at` | trigger | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Exact definition captured. |
| `set_updated_at_submissions` | trigger | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Exact definition captured. |
| `trg_sync_submission_next_action_from_activity` | trigger | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Exact definition captured. |
| `trg_sync_submission_stage_from_activity` | trigger | Live schema evidence | `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md` | high | READY | Exact definition captured. |
| `ensure_rls` | event trigger | Live schema evidence | `docs/S2B5_RECONSTRUCTION_READINESS_AUDIT.md` | medium | PARTIAL | Depends on `rls_auto_enable()`; inclusion remains conditional. |

### Storage Dependencies

| Object name | Object type | Source of truth | Evidence source | Confidence | Reconstruction readiness | Notes |
|---|---|---|---|---|---|---|
| `candidate-resumes` | storage bucket/dependency | Live storage evidence | `docs/S1_CANONICAL_CONTRACTS.md`; `docs/S2B5_RECONSTRUCTION_READINESS_AUDIT.md` | medium | PARTIAL | Bucket/policy evidence captured; runtime path and signed access untested. |
| `bd-photo-intake` | storage bucket/dependency | Live storage evidence | `docs/S1_CANONICAL_CONTRACTS.md`; `docs/S2B5_RECONSTRUCTION_READINESS_AUDIT.md` | medium | PARTIAL | Bucket/policy evidence captured; ownership and broad CRUD behavior untested. |

### Auth Dependency

| Object name | Object type | Source of truth | Evidence source | Confidence | Reconstruction readiness | Notes |
|---|---|---|---|---|---|---|
| Synthetic profile bootstrap | auth dependency | `docs/S2C_FIXTURE_AND_BOOTSTRAP_SPECIFICATION.md` plus real disposable Supabase Auth | `docs/S2C_GO_NO_GO_DECISION_PACKAGE.md`; `docs/S2C_EXECUTION_READINESS_PACKAGE.md` | low | BLOCKED | Required for validation; cannot be proven until disposable Auth users and matching profiles are approved and created. |

## Confidence Summary

| Confidence | Total |
|---|---:|
| high | 53 |
| medium | 16 |
| low | 1 |

## Readiness Summary

| Readiness | Total |
|---|---:|
| READY | 53 |
| PARTIAL | 16 |
| BLOCKED | 1 |

## Final Summary

S2C has a clear artifact source for all required physical reconstruction objects. The only low-confidence item is the synthetic profile bootstrap dependency, because it requires real disposable Supabase Auth behavior and cannot be fully proven from static repository evidence.

The recommended next step remains explicit human approval before any execution: create/select the disposable project, configure isolated credentials, create the two disposable Auth users, create matching `profiles` rows, and run validation only against that disposable target.
