# Phase S1.2 Baseline Object Manifest

Date: 7 June 2026  
Purpose: define the contents and dependency order of a disposable-project baseline  
Mode: manifest only; no SQL or migration created

## Inclusion Labels

- **Yes — core:** required for approved canonical workflows.
- **Yes — support:** required by a core object, read model, or live behavior.
- **Yes — full fidelity:** include to reproduce current live reporting/compatibility, but not a core product contract.
- **Conditional:** include only after ownership or baseline-scope decision.
- **No — legacy frozen:** preserve evidence but exclude from canonical baseline.
- **No — staging:** manage separately from canonical baseline.

## Tables

| Object | Classification | Baseline inclusion | Dependency notes |
|---|---|---|---|
| `profiles` | Canonical | Yes — core | Requires `auth.users` |
| `companies` | Canonical | Yes — core | Requires sequence |
| `bd_contacts` | Canonical | Yes — core | After companies |
| `bd_notes` | Canonical | Yes — core | After companies, contacts, auth |
| `job_sources` | Canonical | Yes — core | Before jobs |
| `jobs` | Canonical | Yes — core | After job sources |
| `jobs_intake` | Canonical | Yes — core | After jobs contract, though live FK absent |
| `job_requirements` | Canonical | Yes — core | After jobs |
| `candidates` | Canonical | Yes — core | Root candidate table |
| `source_profiles` | Canonical | Yes — core | After candidates |
| `skills` | Canonical | Yes — core | Before candidate skills |
| `candidate_skills` | Canonical | Yes — core | After candidates and skills |
| `candidate_scores` | Canonical projection | Yes — core | After candidates |
| `candidate_capabilities` | Provisional support | Yes — support | Required by candidate search |
| `ai_assessments` | Canonical | Yes — core | After jobs and candidates |
| `submissions` | Canonical | Yes — core | After jobs, candidates, companies |
| `activity_log` | Canonical support | Yes — core | After submissions |
| `web_candidate_intakes` | Canonical intake | Yes — core | Storage contract is logical |
| `web_job_interest` | Canonical marketplace | Yes — core | Logical candidate/job links |
| `autonomous_recruiter_runs` | Canonical AI operations | Yes — core | Independent |
| `autonomous_recruiter_memory` | Canonical AI operations | Yes — core | Logical run dependency |
| `evidence_signals` | Preserve-only provisional | Conditional | After source profiles; producer unknown |
| `applications` | Dormant future | Conditional | After jobs/candidates |
| `job_candidate_matches` | Prototype | Conditional | Prototype shortlist view |
| `match_interactions` | Prototype | Conditional | Ownership unknown |
| `outreach_log` | Prototype | Conditional | Prototype due view |
| `employer_job_intake` | Prototype | Conditional | External product decision |
| `employer_intake_actions` | Prototype | Conditional | After employer intake |
| `target_companies` | Prototype BD planning | Conditional | No active app consumer |
| `company_identity_merge_v1_snapshot` | Audit snapshot | Yes — full fidelity | Preserve audit/rollback evidence |
| `staging_bullhorn_companies` | Staging | No — staging | Separate import/staging package |
| `staging_bullhorn_contacts` | Staging | No — staging | Separate import/staging package |
| `terrer_companies` | Legacy frozen | No — legacy frozen | Archive/compatibility scope only |
| `terrer_company_contacts` | Legacy frozen | No — legacy frozen | Archive/compatibility scope only |
| `terrer_jobs` | Legacy frozen | No — legacy frozen | Archive/compatibility scope only |
| `terrer_candidates` | Legacy frozen | No — legacy frozen | Archive/compatibility scope only |
| `terrer_skills` | Legacy frozen | No — legacy frozen | Archive/compatibility scope only |
| `terrer_pipeline` | Legacy frozen | No — legacy frozen | Archive/compatibility scope only |

## Sequences

| Object | Classification | Baseline inclusion | Dependency |
|---|---|---|---|
| `companies_id_seq` | Canonical support | Yes — support | Owns/defaults `companies.id` |

## Views

| Object | Classification | Baseline inclusion | Direct dependencies |
|---|---|---|---|
| `vw_candidate_search` | Canonical read model | Yes — core | Candidate domain tables |
| `vw_candidate_search_clean` | Canonical read model | Yes — core | `vw_candidate_search` |
| `recruiter_active_submissions` | Reporting/operational | Yes — full fidelity | jobs, candidates, submissions |
| `vw_submissions_enriched` | Reporting/operational | Yes — full fidelity | jobs, candidates, submissions |
| `vw_company_pipeline_summary` | Reporting | Yes — full fidelity | jobs, submissions |
| `vw_candidate_pipeline_summary` | Reporting | Yes — full fidelity | candidates, submissions |
| `vw_activity_log_enriched` | Reporting | Yes — full fidelity | activity, candidates, jobs, submissions |
| `vw_pipeline_summary` | Reporting | Yes — full fidelity | submissions |
| `vw_outcomes_summary` | Reporting | Yes — full fidelity | submissions |
| `vw_live_work_queue` | Reporting/operational | Yes — full fidelity | submissions |
| `vw_followup_queue` | Reporting/operational | Yes — full fidelity | activity, candidates, jobs, submissions |
| `vw_job_shortlist` | Reporting | Yes — full fidelity | `vw_submissions_enriched` |
| `vw_recruiter_dashboard` | Reporting | Yes — full fidelity | activity, `vw_submissions_enriched` |
| `jobs_latest` | Reporting | Yes — full fidelity | jobs |
| `jobs_latest_practical` | Reporting | Yes — full fidelity | jobs |
| `jobs_reporting` | Reporting | Yes — full fidelity | `jobs_latest_practical` |
| `hiring_leaderboard_malaysia` | Reporting | Yes — full fidelity | `jobs_latest_practical` |
| `terrer_hiring_now` | Reporting despite name | Yes — full fidelity | `jobs_latest_practical`; not legacy-table dependent |
| `vw_jobs_tier1_malaysia` | Reporting | Yes — full fidelity | jobs, job sources |
| `vw_market_signals` | Reporting | Yes — full fidelity | jobs |
| `vw_market_signals_active` | Reporting | Yes — full fidelity | jobs |
| `vw_market_signals_realtime` | Reporting | Yes — full fidelity | jobs |
| `vw_market_signals_recent` | Reporting | Yes — full fidelity | jobs |
| `vw_tier1_source_health` | Reporting | Yes — full fidelity | jobs, job sources |
| `vw_tier1_source_health_v2` | Reporting | Yes — full fidelity | `vw_tier1_source_health` |
| `vw_tier1_source_diagnostics` | Reporting | Yes — full fidelity | `vw_tier1_source_health_v2` |
| `vw_tier1_source_health_summary` | Reporting | Yes — full fidelity | `vw_tier1_source_health_v2` |
| `v_match_shortlist` | Prototype read model | Conditional | `job_candidate_matches` |
| `v_outreach_due` | Prototype read model | Conditional | `outreach_log` |
| `terrer_jobs_view` | Legacy frozen | No — legacy frozen | Legacy companies/jobs |

## Public Functions

| Object | Classification | Baseline inclusion | Dependencies |
|---|---|---|---|
| `is_current_user_admin()` | Canonical authorization | Yes — core | profiles, auth |
| `create_submission_with_activity(...)` | Canonical transaction support | Yes — support | submissions, activity log |
| `sync_submission_next_action_from_activity()` | Canonical trigger support | Yes — support | submissions |
| `sync_submission_stage_from_activity()` | Canonical trigger support | Yes — support | submissions |
| `update_submission_stage_timestamp()` | Canonical trigger support | Yes — support | submissions |
| `update_updated_at_column()` | Canonical trigger support | Yes — support | Canonical timestamped tables |
| `rls_auto_enable()` | Platform/security support | Conditional | Event trigger governance decision |
| `set_updated_at()` | Legacy trigger support | No — legacy frozen | Legacy tables only |

## Triggers

| Object | Classification | Baseline inclusion | Dependency |
|---|---|---|---|
| `set_updated_at_candidates` | Canonical support | Yes — support | candidates, update helper |
| `set_updated_at_jobs` | Canonical support | Yes — support | jobs, update helper |
| `set_submission_stage_updated_at` | Canonical support | Yes — support | submissions, stage helper |
| `set_updated_at_submissions` | Canonical support | Yes — support | submissions, update helper |
| `trg_sync_submission_next_action_from_activity` | Canonical support | Yes — support | activity, sync helper |
| `trg_sync_submission_stage_from_activity` | Canonical support | Yes — support | activity, sync helper |
| `set_updated_at` on companies | Duplicate canonical support | Conditional | Select one company trigger |
| `set_updated_at_companies` | Duplicate canonical support | Conditional | Select one company trigger |
| `ensure_rls` event trigger | Platform/security support | Conditional | `rls_auto_enable()` |
| `trg_update_target_companies_updated_at` | Prototype support | Conditional | target companies |
| `trg_terrer_*_updated_at` family | Legacy support | No — legacy frozen | Legacy tables |

## Storage Buckets and Policies

| Object | Classification | Baseline inclusion | Notes |
|---|---|---|---|
| `candidate-resumes` bucket | Canonical storage | Yes — core | Private; current policy shape reproduced only for forensic baseline, then security delta designed |
| Candidate-resume object policies | Canonical support/current-risk | Yes — support | Two authenticated read policies, anon insert, authenticated insert |
| `bd-photo-intake` bucket | Canonical sensitive storage | Yes — core | Private |
| BD photo object policies | Canonical support/current-risk | Yes — support | Authenticated bucket-wide select/insert/update/delete |
| `resumes` bucket | Preserve-only legacy/unknown | Conditional | No current repository consumer |
| `resumes` anon insert policy | Preserve-only/current-risk | Conditional | Include only with bucket |

Supabase-managed `storage` schema tables, functions, and triggers are platform dependencies and should be supplied by the target Supabase platform, not recreated as Terrer-owned DDL.

## Dependency Order

1. Supabase platform schemas and extensions: `auth`, `storage`, `pgcrypto` where required.
2. Canonical sequence: `companies_id_seq`.
3. Root tables: profiles, companies, job sources, candidates, skills, autonomous runs, web intake roots.
4. First-level tables: contacts, jobs, source profiles, scores, capabilities, autonomous memory.
5. Relationship tables: notes, intake, requirements, candidate skills, evidence signals.
6. Execution tables: assessments, submissions.
7. Activity table.
8. Public helper and trigger functions.
9. Canonical triggers.
10. Candidate search views.
11. Pipeline reporting views in dependency order.
12. Jobs and source-health views in dependency order.
13. Grants and RLS policies after all referenced helper functions exist.
14. Storage bucket rows.
15. `storage.objects` policies.
16. Optional prototype/full-fidelity objects.
17. Legacy package only if a separate compatibility rebuild is approved.

## Baseline Scope Recommendation

Prepare two manifests from this document:

- **Core canonical baseline:** all “Yes — core” and “Yes — support” objects.
- **Full-fidelity disposable baseline:** core plus “Yes — full fidelity” objects and approved conditional evidence/prototype objects.

Do not mix the legacy `terrer_*` package into the canonical baseline.

