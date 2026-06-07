# Audit C: Terrer Database / Schema Map

Audit date: 6 June 2026

## Scope and Evidence

This audit uses:

- Application queries and writes under `src/`.
- Supabase migrations under `supabase/migrations/`.
- Supabase Edge Functions under `supabase/functions/`.
- Seed, rollback, import, and administration scripts.
- Existing Audit A and Audit B workflow findings.

The repository is not a complete authoritative schema snapshot. Several objects used by the app exist in the linked Supabase project but are not created by the migrations in this repository. Some migrations also describe older schemas that conflict with current queries.

Schema confidence labels:

| Label | Meaning |
|---|---|
| Migration-backed | Object and core fields are created in this repository. |
| Externally existing / inferred | App and seed files use the object, but its creation migration is absent here. |
| Legacy / drifted | Object exists in migrations, but current code or later schema assumptions conflict with it. |
| Missing | Referenced by a migration/view or required by the operating model, but no reliable object definition exists here. |

## Terrer Master Operating Model

| # | Operating layer | Current database support |
|---|---|---|
| 1 | Demand Intelligence | Moderate: `jobs`, `job_sources`, company source fields, scraped job provenance. |
| 2 | Relationship Intelligence | Moderate/strong: `companies`, `bd_contacts`, `bd_notes`; no account ownership or opportunity entity. |
| 3 | Requirement Capture | Moderate: `jobs_intake`, `jobs`, `job_requirements`; schema drift and incomplete structured capture. |
| 4 | Candidate Intelligence | Strong foundation: `candidates`, scores, sources, skills, resume storage; fragmented writes and missing authoritative migrations. |
| 5 | Matching Intelligence | Moderate: requirements, skills, assessments, intent events; current AI assessment is mock/deterministic. |
| 6 | Recruitment Execution | Moderate/strong: `submissions` supports the visible pipeline, but overloaded as submission, workflow, outcome, and task state. |
| 7 | Placement | Weak: `hired` is only a submission stage. No placement object. |
| 8 | Revenue | Absent. |
| 9 | Feedback Learning | Early: intent events and autonomous memory exist, but outcome/loss feedback is not structured. |
| 10 | AI Operating Layer | Moderate prototype: parser functions, assessments, autonomous runs, and memory; limited orchestration and provenance. |

## Executive Findings

1. **The repository is not rebuild-safe.** Core objects including `candidates`, `candidate_scores`, `source_profiles`, `skills`, `jobs_intake`, `profiles`, `web_job_interest`, `web_candidate_intakes`, and `vw_candidate_search_clean` lack creation migrations here.
2. **Skill schema has material drift.** The migration creates `candidate_skills(skill, proficiency)` and `job_requirements(requirement, required)`, while current reads expect `candidate_skills(skill_id, proficiency_score) -> skills(skill_name)` and `job_requirements(skill_name, requirement_type)`. Candidate intake still writes the old columns.
3. **Legacy pipeline views are unsafe as source-of-truth documentation.** They reference fields absent from the local `submissions` and `jobs` creation migrations and depend on an undefined `activity_log`.
4. **RLS is too permissive for production.** Anonymous users can broadly read/write/delete jobs, submissions, assessments, skills, intent events, and some relationship data.
5. **`submissions` is overloaded.** It currently represents candidate-job membership, recruiter shortlist, BD approval, client submission, interview, offer, outcome, notes, and next action.
6. **No canonical commercial chain exists.** There are no opportunity, client-submission event, interview, offer, placement, fee, invoice, or revenue objects.
7. **Storage is operational but not migration-managed.** Bucket creation and object policies are absent from the repository.
8. **Edge Functions do not enforce application roles internally.** They rely on platform invocation configuration and use permissive CORS.

---

## Active Tables and Views

### 1. `companies`

| Field | Audit |
|---|---|
| Object type | Table; migration-backed, with note that it pre-existed remotely |
| Operating layer supported | 1 Demand Intelligence; 2 Relationship Intelligence |
| Pages/workflows using it | Opportunities; BD Relationships; Tasks & Follow-ups; BD Photo Intake; BD relationship import |
| Key fields inferred | `id`, `company_name`, `company_slug`, `website_url`, `linkedin_url`, `career_url`, `ats_family`, `source_confidence`, `source_status`, `source_notes`, `last_enriched_at`, `last_checked_at`, `hq_country`, `primary_city`, `company_status`, `source_type`, `notes`, timestamps |
| Read/write usage | Broad reads; authenticated insert/update; manual source-intelligence updates; photo-intake company creation |
| Workflow reality | Real persisted relationship and account-intelligence workflow |
| Gaps or risks | No canonical normalized domain; no unique company constraint; no owner; no parent/group model in canonical table; jobs link by company name rather than `company_id`; free-text status; anon read policy; source readiness does not trigger enrichment |
| Recommendation | **Keep and improve.** Make this the canonical employer/account entity; add normalized domain/name keys, ownership, lifecycle status, and explicit links from jobs/opportunities. |

### 2. `bd_contacts`

| Field | Audit |
|---|---|
| Object type | Table; migration-backed |
| Operating layer supported | 2 Relationship Intelligence; partial 6 Recruitment Execution |
| Pages/workflows using it | BD Relationships; Opportunities; Tasks & Follow-ups; BD Photo Intake; imports |
| Key fields inferred | Identity/contact fields; `company_id`; `relationship_status`; `contact_type`; `source`; `notes`; `next_action`; `next_action_date`; `last_contacted_at`; legacy/source-photo metadata; extraction status/confidence/raw JSON; timestamps |
| Read/write usage | Read, insert, update; duplicate lookup by email/phone/name; follow-up state and notes updates |
| Workflow reality | Real persisted BD workflow |
| Gaps or risks | Contact status and action fields are free text; no owner; no separate activity/task history; notes mix legacy/import and current work; two overlapping unique email indexes use different expressions; anonymous update policy permits broad mutation |
| Recommendation | **Keep and improve.** Move tasks and activities out to dedicated tables; standardize statuses; add ownership and contact-channel fields; reconcile duplicate email indexes. |

### 3. `bd_notes`

| Field | Audit |
|---|---|
| Object type | Table; migration-backed |
| Operating layer supported | 2 Relationship Intelligence; 9 Feedback Learning |
| Pages/workflows using it | BD Relationships account notes |
| Key fields inferred | `id`, `company_id`, optional `contact_id`, `note_body`, `note_type`, `created_by`, timestamps |
| Read/write usage | Authenticated read and insert; owner-only update policy exists, although UI currently only creates/reads |
| Workflow reality | Real persisted account-note workflow |
| Gaps or risks | No delete policy/UI; no structured activity outcome; no visibility model; ownership depends on `profiles`; notes do not create tasks or opportunity changes |
| Recommendation | **Keep and improve.** Retain as human notes, but do not use it as the activity log. Add visibility and link optional opportunity/activity IDs later. |

### 4. `jobs`

| Field | Audit |
|---|---|
| Object type | Table; migration-backed but remote schema is richer than creation migration |
| Operating layer supported | 1 Demand Intelligence; 3 Requirement Capture; 6 Recruitment Execution |
| Pages/workflows using it | Dashboard; Jobs; Active Jobs; Hiring Intelligence; Job Intake; Top Matches; Pipeline; BD Relationship intelligence; Opportunities; Interested Candidates |
| Key fields inferred | `id`, `job_title`, `company_name`, `location`, `source`, `status`, `operational_status`, `job_source_id`, `normalized_job_title`, `role_family`, `seniority`, timestamps; seed also expects `job_description_text`, `responsibilities`, `qualifications`, and legacy views expect `company_id` |
| Read/write usage | Read broadly; insert from Job Intake; update operational status; classification script updates normalized fields |
| Workflow reality | Real canonical job and demand-intelligence record |
| Gaps or risks | Company relationship is name-based in current app; no owner/client contact/opportunity link; `status` versus `operational_status` is weakly governed; no constraints for operational status; creation is not transactional with `jobs_intake`; anon insert/update policies |
| Recommendation | **Keep and improve.** Treat as canonical role/demand record; add `company_id`, `opportunity_id`, owner, priority/SLA, and controlled statuses. |

### 5. `jobs_intake`

| Field | Audit |
|---|---|
| Object type | Table; externally existing / inferred |
| Operating layer supported | 3 Requirement Capture; partial 1 Demand Intelligence |
| Pages/workflows using it | Job Intake save; recruiter dashboard active-workload definition |
| Key fields inferred | `job_id`, `job_title`, `company_name`, `location`, `work_mode`, `seniority`, `skills`, `raw_input`, `created_by`, `status`, `others_notes`, `created_at` |
| Read/write usage | Insert after `jobs`; read active intake rows for dashboard ownership/workload |
| Workflow reality | Real persisted raw-intake companion record |
| Gaps or risks | No creation migration; unknown keys/FKs/RLS; two-step save can orphan `jobs`; `created_by` stores role/string rather than user ID; structured parser outputs such as responsibilities and requirements are not fully preserved |
| Recommendation | **Keep and improve.** Add authoritative migration and FK to `jobs`; use a transactional RPC; store parser payload/version/confidence and authenticated creator. |

### 6. `submissions`

| Field | Audit |
|---|---|
| Object type | Table; migration-backed but with evidence of a richer pre-existing schema |
| Operating layer supported | 5 Matching Intelligence; 6 Recruitment Execution; weak 7 Placement |
| Pages/workflows using it | Dashboard; Jobs; Active Jobs; Candidates shortlisting; Top Matches; Pipeline; BD Queue; Candidate Profile; Tasks |
| Key fields inferred | Core: `id`, `job_id`, `candidate_id`, `submission_stage`, `next_action_date`, `stage_updated_at`, `created_at`; output: summary/strengths/concerns/full text/generated timestamp; `notes`; legacy views expect `company_id`, `match_score`, `shortlist_rank`, `submitted_to_client_at`, `owner_name`, `decision_reason`, `outcome`, `updated_at` |
| Read/write usage | Read, upsert, stage update, note update, bulk reset, delete |
| Workflow reality | Real persisted pipeline workflow |
| Gaps or risks | No FKs from text IDs in local migration; one row carries too many lifecycle concepts; current stage overwrites history; “submitted_to_client” does not prove communication; `hired` is not a placement; anon CRUD including delete; stage vocabulary differs across migrations/views/app (`replied/responded`, `placed/hired`, `hold/on_hold`) |
| Recommendation | **Keep, narrow, and improve.** Preserve as candidate-job pipeline membership/current state, then add stage history, client submission, interview, offer, placement, and task objects. |

### 7. `ai_assessments`

| Field | Audit |
|---|---|
| Object type | Table; migration-backed |
| Operating layer supported | 5 Matching Intelligence; 10 AI Operating Layer; partial 9 Feedback Learning |
| Pages/workflows using it | Top Matches; Dashboard opportunity signals; BD Queue |
| Key fields inferred | Candidate/job unique pair; layer 1 score; AI score; ranking adjustment; recommendation; confidence; strengths/concerns/reasoning; verification notes; missing information; submission ready; model/version; assessed/timestamps |
| Read/write usage | Read by job and globally for summaries; insert/update assessment |
| Workflow reality | Persisted assessment workflow, but generated by deterministic mock logic |
| Gaps or risks | One mutable row loses review versions; no prompt/input snapshot; no reviewer/override; write failures are weakly surfaced; model is stored as `mock_terrer_ai_review`; anon write policies |
| Recommendation | **Keep and improve.** Add immutable assessment versions, provenance, reviewer decision, calibration outcome, and restricted writes. |

### 8. `candidates`

| Field | Audit |
|---|---|
| Object type | Table; externally existing / inferred, with additive migrations |
| Operating layer supported | 4 Candidate Intelligence; partial 5 Matching Intelligence |
| Pages/workflows using it | Candidates; Candidate Profile; Admin Resume Import; Interested Candidates; all candidate lookup views |
| Key fields inferred | Identity/contact; role/location; LinkedIn/GitHub/resume fields; source and status; notes; structured current/target role, seniority, experience, skills, salary, location preference, notice, job priorities, career confidence; consent and representation fields; profile capture/completeness; timestamps; legacy views expect scoring/contactability fields |
| Read/write usage | Read, insert, update, duplicate lookup by email/phone |
| Workflow reality | Real canonical candidate profile |
| Gaps or risks | No creation migration; multiple intake paths populate different subsets; `key_skills` duplicates normalized skill relations; no robust unique identity strategy; consent nullable; notes carry structured fallback data; admin import bypasses scores/sources/skill relations |
| Recommendation | **Keep and improve.** Establish authoritative migration and canonical field ownership; add identity/merge strategy; make consent and source provenance explicit. |

### 9. `candidate_scores`

| Field | Audit |
|---|---|
| Object type | Table; externally existing / inferred |
| Operating layer supported | 4 Candidate Intelligence; 5 Matching Intelligence |
| Pages/workflows using it | Candidate creation; feeds `vw_candidate_search_clean` |
| Key fields inferred | `candidate_id`, names, city, primary role, repository/follower signals, `capabilities`, `score`, `score_reason`, `scored_at` |
| Read/write usage | Insert/delete by manual candidate intake; read indirectly through search view |
| Workflow reality | Real persisted search/ranking support, but incomplete across intake channels |
| Gaps or risks | No creation migration; score meaning is global and not job-specific; admin resume import does not populate it; duplicated candidate identity fields; stale-score handling absent |
| Recommendation | **Audit further and improve.** Clarify whether it is source score, quality score, or search index. Consider merging identity projection into a materialized/search view while keeping versioned scoring events. |

### 10. `source_profiles`

| Field | Audit |
|---|---|
| Object type | Table; externally existing / inferred |
| Operating layer supported | 4 Candidate Intelligence; 9 Feedback Learning |
| Pages/workflows using it | Candidate creation; Candidate Profile; candidate search view |
| Key fields inferred | `profile_id`, `candidate_id`, `source_name`, `source_profile_url`, `source_handle`, `source_user_id`, `scraped_at` |
| Read/write usage | Insert/delete during candidate intake; read for candidate sources and resume-path fallback |
| Workflow reality | Real persisted multi-source provenance |
| Gaps or risks | No creation migration/FK definition; resume storage reference is overloaded as a source URL; no source snapshot/version/status; admin import does not consistently create rows |
| Recommendation | **Keep and improve.** Make it the canonical candidate-source linkage with source type, capture method, verification, raw snapshot reference, and uniqueness rules. |

### 11. `candidate_skills`

| Field | Audit |
|---|---|
| Object type | Table; migration-backed but materially drifted |
| Operating layer supported | 4 Candidate Intelligence; 5 Matching Intelligence |
| Pages/workflows using it | Candidate creation; Top Matches skill overlap |
| Key fields inferred | Migration/client write expects `id`, `candidate_id`, `skill`, `proficiency`; current read expects `candidate_id`, `skill_id`, `proficiency_score`, relation to `skills(skill_name)` |
| Read/write usage | Candidate intake inserts old-format rows; matching reads new normalized format |
| Workflow reality | Partial and potentially broken depending on live schema generation |
| Gaps or risks | Direct code/schema incompatibility; no unique candidate-skill constraint; no FK in old migration; free-text and normalized approaches coexist |
| Recommendation | **Audit immediately, then migrate.** Choose normalized `skills` + `skill_id` design, update every writer, backfill, and deprecate free-text columns only after validation. |

### 12. `skills`

| Field | Audit |
|---|---|
| Object type | Table; externally existing / inferred through PostgREST relationship |
| Operating layer supported | 4 Candidate Intelligence; 5 Matching Intelligence; 3 Requirement Capture |
| Pages/workflows using it | Top Matches through `candidate_skills -> skills` |
| Key fields inferred | At minimum `skill_name`; likely a skill primary key referenced by `candidate_skills.skill_id` |
| Read/write usage | Read indirectly; no app writer |
| Workflow reality | Partial normalized taxonomy |
| Gaps or risks | No migration; unknown key/name uniqueness; no aliases/canonicalization; not used by current candidate intake writer |
| Recommendation | **Keep and improve after audit.** Define canonical taxonomy, aliases, category, active status, and migration-backed relationships. |

### 13. `job_requirements`

| Field | Audit |
|---|---|
| Object type | Table; migration-backed but materially drifted |
| Operating layer supported | 3 Requirement Capture; 5 Matching Intelligence |
| Pages/workflows using it | Top Matches |
| Key fields inferred | Old migration: `id`, `job_id`, `requirement`, `required`; current code/seed: `job_requirement_id`, `job_id`, `skill_name`, `requirement_type`, `min_years`, `weight`, `notes`, `created_at` |
| Read/write usage | Read for skill matching; seed writes richer schema; Job Intake does not populate it |
| Workflow reality | Partial matching support, mainly seeded/manual |
| Gaps or risks | Schema conflict; no active creation path from Job Intake; requirements parser output is discarded into notes/arrays; no relation to canonical `skills` |
| Recommendation | **Audit immediately and improve.** Adopt richer schema, link to `skills` where appropriate, preserve non-skill requirements separately, and populate transactionally from Job Intake. |

### 14. `job_sources`

| Field | Audit |
|---|---|
| Object type | Table; migration-backed |
| Operating layer supported | 1 Demand Intelligence; 10 AI Operating Layer |
| Pages/workflows using it | Job Intake source resolution; Top Matches trust policy/source display |
| Key fields inferred | Company/source names and URL; type; ATS; tier; trust score; country/market; extraction method; status; check/success timestamps; notes; timestamps |
| Read/write usage | Read-only from app; seeded by migration/demo |
| Workflow reality | Real persisted provenance/trust registry |
| Gaps or risks | `source_url` unique may not suit source families; manual source resolution depends on exact `source_name`; no app management workflow; no automated check updater |
| Recommendation | **Keep and improve.** Make it the canonical source registry and connect source health/extraction runs. Restrict trust changes to admin/automation. |

### 15. `web_job_interest`

| Field | Audit |
|---|---|
| Object type | Table; externally existing / inferred, with additive migrations |
| Operating layer supported | 4 Candidate Intelligence; 6 Recruitment Execution; 2 Relationship Intelligence for representation |
| Pages/workflows using it | Interested Candidates triage; web marketplace interest/representation flow |
| Key fields inferred | `id`, `candidate_id`, `job_id`, job/company snapshot, `interest_status`, creation time; representation request/consent/status/notes; recruiter review/decision fields |
| Read/write usage | App reads and updates `interest_status`; external web likely inserts |
| Workflow reality | Real persisted inbound-intent workflow, but disconnected from submissions |
| Gaps or risks | No creation migration; app ignores most representation/recruiter-review fields; `shortlisted` status does not create a submission; globally readable policy without role restriction |
| Recommendation | **Keep and improve.** Add authoritative schema, ownership and status constraints, then transactional conversion into candidate/submission workflow. |

### 16. `web_candidate_intakes`

| Field | Audit |
|---|---|
| Object type | Table; externally existing / inferred |
| Operating layer supported | 4 Candidate Intelligence; 3 Requirement Capture for candidate preferences |
| Pages/workflows using it | Library-level web candidate intake; likely web shell integration rather than current internal page |
| Key fields inferred | Name/contact; LinkedIn; preferred role/location; resume path/name; source page/job/company; contact/store consent; `intake_status`; ID |
| Read/write usage | Insert; selected ID returned |
| Workflow reality | Partial persisted inbound candidate intake |
| Gaps or risks | No migration; not connected to canonical `candidates`; no internal review page in this app; possible duplicate intake records |
| Recommendation | **Keep temporarily and audit further.** Define conversion workflow into `candidates` and decide whether to retain as immutable intake/event record. |

### 17. `profiles`

| Field | Audit |
|---|---|
| Object type | Table; externally existing / inferred, linked to Supabase Auth |
| Operating layer supported | Cross-cutting access control; 10 AI Operating Layer governance |
| Pages/workflows using it | Login/access gate; role navigation; BD note RLS; admin scripts |
| Key fields inferred | `id` matching `auth.users.id`, `email`, `full_name`, `role`, `is_active` |
| Read/write usage | App reads; provisioning/admin scripts write |
| Workflow reality | Real persisted user authorization profile |
| Gaps or risks | No creation migration; role values enforced in app but not evidenced by DB constraint; many older tables ignore profile ownership; demo mode bypasses strict access |
| Recommendation | **Keep and improve.** Add authoritative migration, role constraint, audit fields, and use profile/user ownership across operational entities. |

### 18. `candidate_intent_events`

| Field | Audit |
|---|---|
| Object type | Table; migration-backed |
| Operating layer supported | 5 Matching Intelligence; 9 Feedback Learning |
| Pages/workflows using it | Top Matches view and shortlist intent tracking |
| Key fields inferred | `id`, `candidate_id`, `job_id`, `action_type`, `created_at` |
| Read/write usage | App inserts `matches_viewed` and `interest_clicked`; no current app read |
| Workflow reality | Real event capture, but not yet used for learning |
| Gaps or risks | Anonymous insert/read; no actor/session/source metadata; viewing every ranked candidate emits one event per mount; event semantics mix candidate and recruiter intent |
| Recommendation | **Keep and improve.** Add actor type/ID, page/session/source, metadata, deduplication, and downstream analytics/model use. |

### 19. `autonomous_recruiter_runs`

| Field | Audit |
|---|---|
| Object type | Table; migration-backed |
| Operating layer supported | 10 AI Operating Layer; 5 Matching Intelligence; 9 Feedback Learning |
| Pages/workflows using it | Autonomous Recruiter dashboard |
| Key fields inferred | Mission/job context; run mode/status; candidate and strategy counts; best/weak strategies; quality/priority/recommendations; report paths; app JSON summary; confidence/signals/risks; iteration fields; timestamps |
| Read/write usage | App reads; external agent or authenticated process inserts |
| Workflow reality | Persisted AI telemetry, read-only in app |
| Gaps or risks | Not linked by FK to `jobs`; candidate recommendations live in JSON; no trigger/orchestration record; anonymous demo read; unvalidated status/mode/confidence fields |
| Recommendation | **Keep and improve.** Link runs to jobs/users, normalize run candidates and strategies when operational, and restrict demo policies. |

### 20. `autonomous_recruiter_memory`

| Field | Audit |
|---|---|
| Object type | Table; migration-backed |
| Operating layer supported | 9 Feedback Learning; 10 AI Operating Layer |
| Pages/workflows using it | Autonomous Recruiter memory panels |
| Key fields inferred | Memory type; role/job/skills/location; successful/failed strategy; recommended query/next move; confidence/signals/risks; candidate count; success flag; source run ID; notes/payload |
| Read/write usage | App reads; external/authenticated process inserts |
| Workflow reality | Persisted prototype learning memory |
| Gaps or risks | `source_run_id` lacks evidenced FK; no dedupe/version/expiry; free-text role and skills; no outcome linkage to placements or losses; inserts are broadly allowed to authenticated users |
| Recommendation | **Keep as experimental and improve.** Add provenance, confidence calibration, lifecycle/expiry, and links to actual outcomes before treating as learned truth. |

### 21. `vw_candidate_search_clean`

| Field | Audit |
|---|---|
| Object type | View; externally existing / inferred |
| Operating layer supported | 4 Candidate Intelligence; 5 Matching Intelligence |
| Pages/workflows using it | Candidates; Top Matches; Pipeline; Dashboard; BD Queue |
| Key fields inferred | Candidate ID/name/location/role; source name/handle/profile URL; score/reason; top skills; capabilities |
| Read/write usage | Read-only |
| Workflow reality | Critical real read model used throughout recruiter workflows |
| Gaps or risks | No view definition in repo; likely depends on candidate, score, source, and skill objects with current schema drift; rebuild and performance characteristics are unknown |
| Recommendation | **Keep but audit immediately.** Add migration definition, ownership comments, tests, and indexes on underlying tables. |

---

## Storage Buckets

### 22. `candidate-resumes`

| Field | Audit |
|---|---|
| Object type | Supabase Storage bucket; externally configured |
| Operating layer supported | 4 Candidate Intelligence; partial 6 Recruitment Execution |
| Pages/workflows using it | Candidates intake; Admin Resume Import; Candidate Profile; web candidate intake |
| Key path conventions | `internal-candidate-intake/...`, `admin-resume-import/...` or equivalent page-generated paths, `web-intakes/...`; candidate fields may store `storage:candidate-resumes/{path}` |
| Read/write usage | Upload, signed URL/public URL resolution, cleanup on web-intake insert failure |
| Workflow reality | Real persisted resume storage |
| Gaps or risks | No bucket creation or storage policy migration; mixed public/signed URL assumptions; inconsistent path ownership; internal candidate upload does not clean orphan files on DB failure; no retention, malware scan, file hash, or document metadata table |
| Recommendation | **Keep and improve.** Add bucket/policy migrations, private-by-default access, document metadata table, ownership, hash/deduplication, retention, and cleanup jobs. |

### 23. `bd-photo-intake`

| Field | Audit |
|---|---|
| Object type | Supabase Storage bucket; externally configured |
| Operating layer supported | 2 Relationship Intelligence; 10 AI Operating Layer |
| Pages/workflows using it | BD Photo Intake |
| Key path conventions | `user_{userId}/{timestamp}_{filename}` or `anon/...` |
| Read/write usage | Upload and public URL generation |
| Workflow reality | Real persisted photo-intake support |
| Gaps or risks | No bucket/policy migration; code requests public URLs for potentially sensitive CRM screenshots; anon path exists; no deletion/retention; raw Gemini response may also be stored in contact JSON |
| Recommendation | **Keep with urgent security improvement.** Make private, require authenticated ownership, use signed URLs, add retention/deletion, and minimize stored raw extraction payloads. |

---

## Edge Functions

### 24. `job-intake-parser`

| Field | Audit |
|---|---|
| Object type | Supabase Edge Function |
| Operating layer supported | 3 Requirement Capture; 4 Candidate Intelligence; 10 AI Operating Layer |
| Pages/workflows using it | Job Intake; Candidates resume refinement; Admin Resume Import |
| Inputs/outputs | Modes: job, candidate, candidate admin resume; calls Gemini; returns structured JSON, confidence, warnings, and failure diagnostics |
| Read/write usage | No direct database writes; external Gemini API call |
| Workflow reality | Real AI-assisted parser with client-side fallback |
| Gaps or risks | One function serves three domains; permissive CORS; no explicit role/auth checks in function code; no rate limiting, audit record, prompt/version persistence, PII redaction, or cost telemetry; parsed responsibilities/requirements are not fully persisted |
| Recommendation | **Keep and improve.** Split or strongly version modes, enforce auth/rate limits, persist invocation metadata, and connect outputs transactionally to canonical tables. |

### 25. `bd-photo-vision-extract`

| Field | Audit |
|---|---|
| Object type | Supabase Edge Function |
| Operating layer supported | 2 Relationship Intelligence; 10 AI Operating Layer |
| Pages/workflows using it | BD Photo Intake |
| Inputs/outputs | Base64 image to Gemini Vision; returns contact/company fields, confidence, raw provider response |
| Read/write usage | No direct database writes; external Gemini API call |
| Workflow reality | Real extraction service feeding human-reviewed persistence |
| Gaps or risks | Permissive CORS; no explicit role/auth checks; raw provider payload returned to browser and may be stored; “most prominent record” behavior can silently omit additional contacts; no OCR evidence model or document retention controls |
| Recommendation | **Keep as reviewed intake only and improve.** Enforce auth, minimize raw payload, add extraction version/evidence, support multi-record detection, and prohibit direct browser Gemini-key fallback in production. |

---

## Legacy and Latent Views

The migration `20260416100404_add_ready_for_bd_review_stage.sql` recreates the following views. The current app does not query them, but they are part of the repository's Supabase schema history.

| Object | Type | Layer | Intended use | Current risk | Recommendation |
|---|---|---|---|---|---|
| `vw_submissions_enriched` | View | 5, 6 | Join submissions, jobs, candidates | References submission/job/candidate columns absent from local creation migrations | Audit further; rebuild from authoritative schema |
| `recruiter_active_submissions` | View | 6 | Active recruiter queue | Stage vocabulary differs from app | Merge concept into a supported work-queue view |
| `vw_company_pipeline_summary` | View | 2, 6 | Company-stage counts | Requires `jobs.company_id`, not created locally | Improve after adding canonical company FK |
| `vw_candidate_pipeline_summary` | View | 4, 6 | Candidate-stage counts | Not used; depends on external candidate schema | Keep only if analytics consumes it |
| `vw_activity_log_enriched` | View | 6, 9 | Activity timeline with context | Depends on undefined `activity_log` | Deprecate until activity table is deliberately introduced |
| `vw_pipeline_summary` | View | 6 | Counts by stage | Simple and valid if submissions exists | Keep or recreate as stable analytics view |
| `vw_outcomes_summary` | View | 7, 9 | Terminal outcome counts | Outcome vocabulary incomplete; no reasons | Improve after outcome/placement model |
| `vw_live_work_queue` | View | 6 | Urgency queue | Depends on extra submission fields; app reimplements logic | Merge with one canonical work-queue query/view |
| `vw_followup_queue` | View | 6 | Activity-based follow-up queue | Depends on missing `activity_log` and older stages | Deprecate/rebuild after task/activity model |
| `vw_job_shortlist` | View | 5, 6 | Job shortlist read model | Uses stages not aligned with current UI | Audit and align before reuse |
| `vw_recruiter_dashboard` | View | 6 | Recruiter dashboard read model | Depends on missing activity and richer columns | Rebuild or deprecate; current dashboard uses direct queries |

### Missing Dependency: `activity_log`

| Field | Audit |
|---|---|
| Object type | Referenced table, but no creation migration or current app query |
| Operating layer supported | 6 Recruitment Execution; 9 Feedback Learning |
| Intended fields inferred | Submission/entity identifiers, activity type/channel/direction, subject/message summary, occurrence/next-action timestamps, creator, timestamps |
| Current state | Missing or externally existing; unused by current app |
| Recommendation | **Do not revive blindly.** Design the tasks/activities model intentionally, then replace or migrate these legacy views. |

---

## Staging Tables

### 26. `staging_bullhorn_companies`

| Field | Audit |
|---|---|
| Object type | Table; migration-backed staging object |
| Operating layer supported | 2 Relationship Intelligence; 10 AI Operating Layer |
| Pages/workflows using it | No app page; external migration/import process |
| Key fields inferred | Source batch/image; legacy ID; company details; extraction/reviewer/classification confidence; duplicate group; raw row; import status |
| Read/write usage | External staging writes; no app usage |
| Workflow reality | Review-first migration support |
| Gaps or risks | No RLS policies shown; no canonical merge audit fields; no reviewer UI |
| Recommendation | **Keep as temporary staging.** Add restricted access, batch lifecycle, merge target IDs, and purge policy. |

### 27. `staging_bullhorn_contacts`

| Field | Audit |
|---|---|
| Object type | Table; migration-backed staging object |
| Operating layer supported | 2 Relationship Intelligence; 10 AI Operating Layer |
| Pages/workflows using it | No app page; external migration/import process |
| Key fields inferred | Source/batch/image; legacy contact ID; contact/company fields; evidence; extraction/reviewer/classification fields; duplicate group; raw row; import status |
| Read/write usage | External staging writes; no app usage |
| Workflow reality | Review-first migration support |
| Gaps or risks | No RLS policies shown; no canonical merge foreign keys/history; uniqueness only by batch/image may collapse multi-contact screenshots |
| Recommendation | **Keep as temporary staging and audit further.** Add restricted policies, record-level source identity, merge outcomes, and retention. |

---

## Critical Schema Drift

### Skill and Requirement Drift

| Area | Migration schema | Current app/seed schema | Risk |
|---|---|---|---|
| Candidate skills | `candidate_id`, `skill`, `proficiency` | Reads `skill_id`, `proficiency_score`, `skills(skill_name)` | Matching reads and candidate writes cannot both be correct against one schema without compatibility columns/views. |
| Job requirements | `id`, `job_id`, `requirement`, `required` | Reads/writes `job_requirement_id`, `skill_name`, `requirement_type`, `min_years`, `weight`, `notes` | Fresh migration environment will not support current Top Matches or demo seed. |
| Skills | Not created | Required by current relationship select | Fresh environments cannot rebuild matching schema. |

Required action: inspect the linked database, export the authoritative schema, write reconciliation migrations, update all writers, and add integration tests.

### Pipeline View Drift

Legacy views expect:

- `submissions.company_id`, `match_score`, `shortlist_rank`, `submitted_to_client_at`, `owner_name`, `decision_reason`, `outcome`, `updated_at`.
- `jobs.company_id`.
- Candidate scoring/contactability fields.
- `activity_log`.

These are not reliably created by the migrations in this repository. The view migration can only succeed if the remote database already has the richer legacy schema.

Recommendation: do not use these views as canonical until the linked schema is dumped and reconciled.

### Policy Drift

Several migrations explicitly enable anonymous CRUD to support demo mode:

- `jobs`: anon read/insert/update.
- `submissions`: anon read/insert/update/delete.
- `ai_assessments`: anon read/insert/update.
- `candidate_skills` and `job_requirements`: anon read/insert/update.
- `candidate_intent_events`: anon read/insert.
- `companies`: anon read.
- `bd_contacts`: anon read/update.
- `autonomous_recruiter_runs`: anon read.
- `web_job_interest`: globally readable policy.

This is incompatible with a production internal recruitment system holding candidate and client data.

Recommendation: move production to strict auth, add role/ownership policies, remove anonymous writes, and separate demo data into a non-production project or schema.

---

## Missing Database Structures

### A. Opportunities / Deals

| Field | Proposed structure |
|---|---|
| Missing object | `opportunities` |
| Layers | 1 Demand Intelligence; 2 Relationship Intelligence; 6 Recruitment Execution; 8 Revenue |
| Required links | `company_id`, primary `contact_id`, optional source job/signal, created/owned by profile |
| Core fields | Opportunity type, stage, qualification status, estimated roles, value, probability, priority, next action, opened/closed timestamps, win/loss status |
| Why needed | Current Opportunities page is derived and cannot track conversion, ownership, or revenue pipeline. |

### B. Tasks / Activities

| Field | Proposed structure |
|---|---|
| Missing objects | `tasks`, `activities` or a clearly separated task/event pair |
| Layers | 2 Relationship Intelligence; 6 Recruitment Execution; 9 Feedback Learning |
| Required links | Company, contact, opportunity, job, candidate, submission, assigned profile |
| Core fields | Type, channel, direction, due/start/completed timestamps, status, outcome, notes, created by, metadata |
| Why needed | `bd_contacts.next_action*` and `submissions.notes/next_action_date` overwrite history and cannot support accountability. |

### C. Client Submissions

| Field | Proposed structure |
|---|---|
| Missing object | `client_submissions` |
| Layers | 6 Recruitment Execution; 9 Feedback Learning |
| Required links | Candidate, job, pipeline submission, client company/contact, sender profile |
| Core fields | Sent timestamp/channel, content snapshot, resume/document version, status, acknowledged timestamp, client feedback, external reference |
| Why needed | Current `submitted_to_client` stage does not prove a client communication occurred. |

### D. Interviews

| Field | Proposed structure |
|---|---|
| Missing object | `interviews` |
| Layers | 6 Recruitment Execution; 9 Feedback Learning |
| Required links | Client submission, candidate, job, participants |
| Core fields | Round, type, scheduled time/timezone, location/link, status, interviewer feedback, candidate feedback, outcome |
| Why needed | Current interview is only a stage and cannot schedule or learn from interview outcomes. |

### E. Offers

| Field | Proposed structure |
|---|---|
| Missing object | `offers` |
| Layers | 6 Recruitment Execution; 7 Placement; 8 Revenue |
| Required links | Candidate, job, client submission, opportunity |
| Core fields | Compensation/currency, benefits, start date, issued/expiry timestamps, status, acceptance/rejection/withdrawal reason |
| Why needed | Current offer is only a stage with no commercial or candidate-decision data. |

### F. Placements

| Field | Proposed structure |
|---|---|
| Missing object | `placements` |
| Layers | 7 Placement; 8 Revenue; 9 Feedback Learning |
| Required links | Accepted offer, candidate, job, company, opportunity, recruiter/BD owners |
| Core fields | Placement date, start date, employment type, guarantee period, status, ownership splits, placement notes |
| Why needed | `submissions.submission_stage = hired` is not enough for placement operations. |

### G. Revenue / Fees

| Field | Proposed structure |
|---|---|
| Missing objects | `fee_agreements`, `placement_fees`, optionally `invoices` and `payments` |
| Layers | 8 Revenue |
| Required links | Company/opportunity/job/placement |
| Core fields | Fee model/rate/fixed amount, currency, calculated fee, invoice status/date, payment status/date, rebate/guarantee exposure |
| Why needed | Terrer currently has no persisted revenue model despite being a placement business platform. |

### H. Feedback / Loss Reasons

| Field | Proposed structure |
|---|---|
| Missing objects | `feedback_events`, controlled `loss_reasons` taxonomy |
| Layers | 9 Feedback Learning; 5 Matching Intelligence; 10 AI Operating Layer |
| Required links | Opportunity, job, candidate, assessment, client submission, interview, offer, placement |
| Core fields | Source, stage, reason code, free-text detail, positive/negative signal, actor, timestamp, model-consumable metadata |
| Why needed | Rejection and loss are currently stage values without structured learning signals. |

### I. Stage History / Audit Logs

| Field | Proposed structure |
|---|---|
| Missing objects | `submission_stage_history`, broader `audit_events` |
| Layers | 6 Recruitment Execution; 9 Feedback Learning; governance |
| Required links | Submission/entity ID, previous/new state, actor |
| Core fields | Event type, before/after JSON or typed columns, reason, source, occurred timestamp, request/correlation ID |
| Why needed | Current updates overwrite state and destructive admin actions have no durable trace. |

---

## Recommended Object Disposition

| Disposition | Objects |
|---|---|
| Keep and improve | `companies`, `bd_contacts`, `bd_notes`, `jobs`, `jobs_intake`, `submissions`, `ai_assessments`, `candidates`, `source_profiles`, `job_sources`, `web_job_interest`, `profiles`, `candidate_intent_events`, both storage buckets, both Edge Functions |
| Audit immediately | `candidate_skills`, `skills`, `job_requirements`, `candidate_scores`, `vw_candidate_search_clean`, legacy pipeline views, storage policies |
| Keep as experimental | `autonomous_recruiter_runs`, `autonomous_recruiter_memory` |
| Keep as temporary staging | `staging_bullhorn_companies`, `staging_bullhorn_contacts`, `web_candidate_intakes` until conversion policy is decided |
| Merge/rebuild | Competing recruiter queue/dashboard views; task/follow-up logic currently spread across contacts, submissions, and legacy views |
| Deprecate unless rebuilt | Views depending on undefined `activity_log` or obsolete stage vocabulary |
| Add | Opportunities, tasks, activities, client submissions, interviews, offers, placements, fee/revenue objects, feedback/loss reasons, stage history, audit events |

## Recommended Implementation Order

1. Export and version the authoritative linked Supabase schema.
2. Reconcile `candidate_skills`, `skills`, and `job_requirements`.
3. Add missing creation migrations for all active external objects and buckets.
4. Lock down RLS and remove anonymous production writes.
5. Add `company_id`, ownership, and opportunity linkage to jobs.
6. Introduce opportunity, task/activity, and stage-history objects.
7. Separate client submission, interview, offer, and placement records from `submissions`.
8. Add fees/revenue and structured feedback/loss reasons.
9. Rebuild supported views from the reconciled schema and remove obsolete views.
10. Add database integration tests for every core workflow transition.
