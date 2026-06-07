# Terrer Schema Object Classification Register

Classification date: 7 June 2026  
Source: live catalog capture, code search, row counts, and database dependencies  
Mode: classification only; no deprecation or migration action performed

## Classification Labels

| Label | Meaning |
|---|---|
| Canonical | Current business/source-of-truth object required by active Terrer workflows |
| Canonical read model | Active view/function used as a stable read or transaction contract |
| Reporting | Derived output with potential operational/reporting value |
| Staging | Import/temporary processing object |
| Prototype | Experimental model with limited or no current application consumer |
| Legacy | Superseded or parallel implementation; retain until consumer/data review |
| Dormant future | Potential future canonical model with no active app workflow |
| Audit snapshot | Historical evidence retained for traceability |
| Unknown | Ownership or consumer cannot be established from current repository |

## Tables

| Object | Rows | Classification | Current consumer/writer | Database dependencies | Disposition |
|---|---:|---|---|---|---|
| `profiles` | 1 | Canonical | `AuthContext`; admin recovery script reads it | FK to `auth.users`; used by `is_current_user_admin` and enriched views | Preserve |
| `companies` | 113 | Canonical | BD Relationships, Opportunities, BD Tasks, BD Photo Intake, importer | Referenced by contacts/submissions and company pipeline views | Preserve |
| `bd_contacts` | 204 | Canonical | BD pages and service-role importer | FK to companies; app follow-up state | Preserve |
| `bd_notes` | 0 | Canonical | BD Relationships | FK to company/contact/profile | Preserve; empty but active |
| `job_sources` | 11 | Canonical | Jobs source resolution, Top Matches, demo seed | FK target from jobs; source-health views | Preserve |
| `jobs` | 2,236 | Canonical | Jobs, Job Intake, dashboards, matching, intelligence | Source FK; referenced by submissions and many views | Preserve |
| `jobs_intake` | 19 | Canonical | Job Intake and dashboard workload | No enforced FK; app links to `jobs.id` | Preserve |
| `job_requirements` | 6 | Canonical | Top Matches reads; demo seed writes | No FK; matching input | Preserve and repair contract |
| `candidates` | 189 | Canonical | Candidates, import, profile, matching, interest | Referenced by submissions/skills/sources/views | Preserve |
| `source_profiles` | 583 | Canonical | Candidate creation/profile/search | Feeds candidate search view | Preserve |
| `skills` | 53 | Canonical | Candidate matching through relation | Referenced by candidate skills/search view | Preserve |
| `candidate_skills` | 2,709 | Canonical | Matching reads; current manual writer is incompatible | FKs to candidates and skills; search view | Preserve and repair writer |
| `candidate_scores` | 182 | Canonical pending model review | Candidate creation and search view | Feeds candidate search view | Preserve until replacement decision |
| `ai_assessments` | 9 | Canonical | Top Matches Terrer AI Review; dashboard/BD Queue reads | Candidate/job assessment state | Preserve |
| `submissions` | 11 | Canonical | Store, Top Matches, Pipeline, BD Queue, Tasks | FKs to jobs/candidates/companies; activity triggers/views | Preserve |
| `activity_log` | 2 | Canonical support | No direct app writer found; DB function/trigger workflow | Triggers update submissions; multiple views | Preserve; consumer gap |
| `web_candidate_intakes` | 0 | Canonical marketplace intake | Library writer exists; no caller found in current internal app | Candidate resume bucket | Preserve; verify web repository |
| `web_job_interest` | 37 | Canonical marketplace state | Interested Candidates updates; external creator unknown | Candidate/job logical links only | Preserve |
| `autonomous_recruiter_runs` | 8 | Canonical AI operations | App reads; demo seed writes; production writer external/unknown | Referenced by memory | Preserve |
| `autonomous_recruiter_memory` | 3 | Canonical AI operations | App reads; writer external/unknown | Source run ID logical link | Preserve |
| `staging_bullhorn_companies` | 106 | Staging | Migration/import tooling; no app consumer | Feeds manual/import promotion process | Retain as staging |
| `staging_bullhorn_contacts` | 232 | Staging | Migration/import tooling; no app consumer | Linked staging company IDs | Retain as staging |
| `company_identity_merge_v1_snapshot` | 22 | Audit snapshot | No app consumer | Records source/destination company merge IDs | Retain read-only |
| `applications` | 0 | Dormant future | No current repository consumer | Candidate/job FKs | Classify before application workflow work |
| `employer_job_intake` | 2 | Prototype/dormant future | No current internal app consumer | Referenced by employer intake actions | Preserve pending web-owner review |
| `employer_intake_actions` | 0 | Prototype/dormant future | No current consumer | FK/logical link to employer intake | Preserve pending decision |
| `job_candidate_matches` | 3 | Prototype/dormant future | No app consumer; `v_match_shortlist` reads it | Candidate/job matching relation | Preserve; compare with derived Top Matches |
| `match_interactions` | 6 | Prototype feedback | No current repository consumer | Logical candidate/job event fields | Preserve pending feedback model |
| `outreach_log` | 1 | Prototype execution | No app consumer; `v_outreach_due` reads it | Candidate/job/company logical references | Preserve pending activity model |
| `target_companies` | 51 | Prototype/BD planning | No current app consumer | Updated-at trigger only | Preserve pending BD model review |
| `candidate_capabilities` | 1,620 | Derived/prototype | No direct app query; candidate search view reads it | Candidate search dependency | Preserve while search view remains |
| `evidence_signals` | 1,164 | Derived/prototype | No current app consumer | Profile/evidence signal store | Preserve pending AI evidence review |
| `terrer_companies` | 2 | Legacy parallel domain | No current app consumer; `terrer_jobs_view` reads it | Parent for `terrer_jobs`/contacts | Do not merge/drop yet |
| `terrer_candidates` | 3 | Legacy parallel domain | No current app consumer | Parallel pipeline FK target | Do not merge/drop yet |
| `terrer_jobs` | 18 | Legacy parallel domain | No current app consumer; `terrer_jobs_view` reads it | Parallel company FK | Do not merge/drop yet |
| `terrer_pipeline` | 1 | Legacy parallel domain | No current app consumer | Parallel candidate/job workflow | Do not merge/drop yet |
| `terrer_company_contacts` | 0 | Legacy parallel domain | No current app consumer | Parallel company contact model | Deprecation candidate |
| `terrer_skills` | 0 | Legacy parallel domain | No current app consumer | No captured active dependency | Deprecation candidate |

## Views

| Object | Classification | Direct dependencies | Current repository consumer | Disposition |
|---|---|---|---|---|
| `vw_candidate_search_clean` | Canonical read model | `vw_candidate_search` | Candidate lists and ID lookups | Preserve exact contract |
| `vw_candidate_search` | Canonical support read model | candidates, scores, sources, skills, capabilities | Indirect through clean view | Preserve |
| `recruiter_active_submissions` | Reporting/legacy | candidates, jobs, submissions | None found | Consumer review |
| `vw_submissions_enriched` | Reporting | candidates, jobs, submissions | Indirect legacy view dependency | Preserve until reporting review |
| `vw_activity_log_enriched` | Reporting | activity, candidates, jobs, submissions | None found | Consumer review |
| `vw_candidate_pipeline_summary` | Reporting | candidates, submissions | None found | Consumer review |
| `vw_company_pipeline_summary` | Reporting | jobs, submissions | None found | Consumer review |
| `vw_pipeline_summary` | Reporting | submissions | None found | Consumer review |
| `vw_outcomes_summary` | Reporting | submissions | None found | Rebuild after outcome model |
| `vw_live_work_queue` | Reporting/legacy operational | submissions | None found | Verify security and usefulness |
| `vw_followup_queue` | Reporting/legacy operational | activity, candidates, jobs, submissions | None found | Compare with BD Tasks |
| `vw_job_shortlist` | Reporting | `vw_submissions_enriched` | None found | Consumer review |
| `vw_recruiter_dashboard` | Reporting | activity and enriched submissions | None found | Consumer review |
| `jobs_latest` | Reporting | jobs | No current app query | Preserve for intelligence review |
| `jobs_latest_practical` | Reporting | jobs | No current app query | Preserve |
| `jobs_reporting` | Reporting | latest practical jobs | No current app query | Preserve |
| `hiring_leaderboard_malaysia` | Reporting | latest practical jobs | No current app query | Preserve |
| `terrer_hiring_now` | Reporting | latest practical jobs | No current app query | Preserve |
| `vw_jobs_tier1_malaysia` | Reporting | jobs, job sources | No direct current app query | Preserve |
| `vw_market_signals` | Reporting | jobs | No direct query; app computes similar signals | Consumer review |
| `vw_market_signals_active` | Reporting | jobs | None found | Consumer review |
| `vw_market_signals_realtime` | Reporting | jobs | None found | Consumer review |
| `vw_market_signals_recent` | Reporting | jobs | None found | Consumer review |
| `vw_tier1_source_health` | Reporting | jobs, job sources | None found | Preserve for source operations |
| `vw_tier1_source_health_v2` | Reporting | source health | None found | Preserve |
| `vw_tier1_source_diagnostics` | Reporting | source health v2 | None found | Preserve |
| `vw_tier1_source_health_summary` | Reporting | source health v2 | None found | Preserve |
| `v_match_shortlist` | Prototype read model | job candidate matches | None found | Retain with prototype table |
| `v_outreach_due` | Prototype read model | outreach log | None found | Retain with prototype table |
| `terrer_jobs_view` | Legacy parallel read model | `terrer_companies`, `terrer_jobs` | None found | Deprecation candidate |

## Database Functions and Triggers

| Object | Classification | Consumer/effect | Disposition |
|---|---|---|---|
| `is_current_user_admin()` | Canonical authorization | Profiles RLS | Preserve |
| `create_submission_with_activity(...)` | Canonical candidate transaction, currently unused | Writes submissions and activity | Preserve; review before adoption |
| `sync_submission_next_action_from_activity()` | Canonical support | Triggered by activity insert | Preserve |
| `sync_submission_stage_from_activity()` | Canonical support | Triggered by activity insert | Preserve |
| `update_submission_stage_timestamp()` | Canonical support | Submission update trigger | Preserve |
| `update_updated_at_column()` | Canonical support | Candidate/job/company/submission triggers | Preserve |
| `set_updated_at()` | Legacy support | Parallel `terrer_*` triggers | Retain with legacy domain |
| `rls_auto_enable()` | Platform/security support | Intended event-trigger helper | Audit event-trigger registration |

The live event trigger `ensure_rls` is enabled and calls `rls_auto_enable()` after table-creation DDL.

## Storage Buckets

| Bucket | Classification | App consumer | Rows/files exported | Disposition |
|---|---|---|---|---|
| `candidate-resumes` | Canonical | Candidate intake/profile/admin import/web intake | None | Preserve and secure |
| `bd-photo-intake` | Canonical sensitive intake | BD Photo Intake | None | Preserve and secure |
| `resumes` | Legacy/unknown | No current repository consumer | None | Audit before merge/deprecation |

## Edge Functions

| Function | Classification | Current consumer | Disposition |
|---|---|---|---|
| `job-intake-parser` | Canonical | Job Intake and candidate/admin parsing helpers | Preserve |
| `bd-photo-vision-extract` | Canonical sensitive processing | BD Photo Intake | Preserve |
| `parse-job-intake` | Legacy | No current repository caller | Retirement candidate after logs/caller review |
| `quick-processor` / `layer2-assess` | Prototype/security concern | No current repository caller | Immediate ownership and auth review |

## Live-Only or Duplicate Consumer/Dependency Map

| Object | Type | Rows | App/code consumer | Database consumer | Classification confidence |
|---|---|---:|---|---|---|
| `activity_log` | Table | 2 | No direct app writer/query found | Two triggers update submissions; four reporting views | High canonical support |
| `applications` | Table | 0 | None | None captured | Medium dormant future |
| `candidate_capabilities` | Table | 1,620 | None direct | `vw_candidate_search` | High derived support |
| `candidate_scores` | Table | 182 | Candidate writer | Candidate search view | High canonical |
| `candidates` | Table | 189 | Multiple active pages | Many FKs/views | High canonical |
| `employer_job_intake` | Table | 2 | None in internal app | Employer actions | Medium prototype |
| `employer_intake_actions` | Table | 0 | None | Employer intake | Medium prototype |
| `evidence_signals` | Table | 1,164 | None | No captured public view dependency | Medium prototype |
| `job_candidate_matches` | Table | 3 | None | `v_match_shortlist` | High prototype |
| `jobs_intake` | Table | 19 | Active Job Intake/dashboard | None enforced | High canonical |
| `match_interactions` | Table | 6 | None | None captured | Medium prototype |
| `outreach_log` | Table | 1 | None | `v_outreach_due` | High prototype |
| `profiles` | Table | 1 | AuthContext | Admin helper/policies | High canonical |
| `skills` | Table | 53 | Indirect active read | Candidate skills/search view | High canonical |
| `source_profiles` | Table | 583 | Active writer/profile read | Candidate search view | High canonical |
| `target_companies` | Table | 51 | None | Trigger only | Medium prototype |
| `terrer_*` family | Six tables | 24 combined | None | Parallel view/FKs/triggers | High legacy parallel |
| `web_candidate_intakes` | Table | 0 | Writer library, no internal caller | None | Medium canonical marketplace |
| `web_job_interest` | Table | 37 | Active internal review/update | None enforced | High canonical |
| `vw_candidate_search*` | Views | N/A | Active candidate reads | Candidate domain tables | High canonical read model |
| Market/source views | Views | N/A | No direct current query | Jobs/job sources | High reporting |
| Legacy pipeline views | Views | N/A | No current direct query | Submission/activity domain | Medium reporting/legacy |
| `resumes` | Bucket | N/A | None found | Storage policy only | Medium legacy/unknown |
| Legacy Edge Functions | Functions | N/A | None found | Deployment only | Medium legacy/prototype |

## Decisions Required Before Migration Design

1. Confirm canonical status of `candidate_scores` and `candidate_capabilities`.
2. Confirm whether `activity_log` becomes the canonical activity model.
3. Confirm whether employer intake objects belong to the web product.
4. Confirm whether persisted `job_candidate_matches` will replace or complement derived matching.
5. Identify owners for autonomous-run writers.
6. Identify the creator of `web_job_interest` rows.
7. Confirm whether any external consumer uses legacy pipeline or market views.
8. Confirm that all `terrer_*` objects are prototype/legacy before deprecation planning.
9. Audit Storage logs/contents before classifying `resumes`.
10. Identify caller/owner for `quick-processor` before changing deployment.
