# Phase S1.2 Canonical Contracts

Date: 7 June 2026  
Status: implementation-grade documentation draft  
Mode: read-only; no migration or database action

## Contract Rules

- The live schema capture is the factual source for current shape.
- The approved S1 boundary determines what must survive a rebuild.
- A repair recommendation is not approval to change production.
- Current policy posture is documented as evidence, not endorsed.
- Unknown writers must be identified before constraints, grants, or RLS change.

## Identity and Authorization

### `profiles`

| Contract item | Current contract |
|---|---|
| Purpose | Internal app identity, role, and activation state |
| Owner layer | AI operating layer / platform authorization |
| Primary key | `id uuid`, also FK to `auth.users(id)` with cascade delete |
| Important columns | `id`, `email`, `full_name`, `role`, `is_active`, timestamps |
| Nullability risks | `email` and `full_name` are nullable; auth identity can exist without useful display/contact data |
| Constraints | PK; auth-user FK; role check: `admin`, `recruiter`, `bd` |
| Indexes | Primary-key index |
| Dependencies | `auth.users`; `is_current_user_admin`; profile and note policies |
| Known readers | `AuthContext`; admin recovery/provisioning scripts; RLS helper |
| Known writers | Provisioning source unknown; own/admin update allowed; no app insert writer found |
| Contract drift | No authoritative creation migration or bootstrap contract |
| S1 repair recommendation | Define profile creation/bootstrap, role ownership, active-state defaults, and failure behavior before auth/RLS work |

## Relationship Intelligence

### `companies`

| Contract item | Current contract |
|---|---|
| Purpose | Canonical employer/account identity and source intelligence |
| Owner layer | Relationship Intelligence |
| Primary key | `id bigint`, backed by `companies_id_seq` |
| Important columns | `company_name`, slug/URLs, location, status, source fields, career/ATS intelligence |
| Nullability risks | Only `id` and `created_at` are required; even `company_name` is nullable |
| Constraints | PK; `source_status` vocabulary check |
| Indexes | PK; no captured canonical unique company-identity key |
| Relationships | Parent of `bd_contacts`, `bd_notes`, and optional `submissions.company_id`; jobs carry an unenforced `company_id` |
| Known readers | BD Relationships, Opportunities, BD Tasks, BD Photo Intake, company intelligence |
| Known writers | BD Relationships, BD Photo Intake, service-role importer, demo/rollback SQL |
| Contract drift | Creation history is partial; identity uniqueness is undefined; duplicate updated-at triggers exist |
| S1 repair recommendation | Preserve IDs; define required name/identity rule; retain one updated-at trigger; defer dedup/merge redesign |

### `bd_contacts`

| Contract item | Current contract |
|---|---|
| Purpose | Employer stakeholder identity, contactability, relationship state, and follow-up |
| Owner layer | Relationship Intelligence |
| Primary key | `id uuid` |
| Important columns | `company_id`, names, email/phones, title/department, relationship status, notes, next action/date, last contact |
| Nullability risks | Only `id` and `full_name` are required; company, channels, status, and timestamps may be null |
| Constraints | PK; company FK with `ON DELETE SET NULL` |
| Indexes | Company, email, relationship status; partial/unique email index captured |
| Relationships | Optional company; parent of optional `bd_notes.contact_id` |
| Known readers | BD Relationships, Opportunities, BD Tasks, BD Photo Intake |
| Known writers | Three BD pages; service-role importer; seed SQL |
| Contract drift | Duplicate email-index history; anon read/update exists; app behavior spans demo and strict auth |
| S1 repair recommendation | Define contact identity/dedup rule and authenticated write contract before removing anon mutation |

### `bd_notes`

| Contract item | Current contract |
|---|---|
| Purpose | Human account/contact notes |
| Owner layer | Relationship Intelligence |
| Primary key | `id uuid` |
| Important columns | `company_id`, `contact_id`, `note_body`, `note_type`, `created_by`, timestamps |
| Nullability risks | `created_by` and `contact_id` may be null; creator attribution can be lost |
| Constraints | PK; company cascade FK; contact set-null FK; creator set-null FK to auth user |
| Indexes | Company/created date, contact, creator |
| Relationships | Company required; contact and auth creator optional |
| Known readers/writers | BD Relationships reads and inserts |
| Contract drift | Table has zero rows; migration exists but app demo mode cannot satisfy authenticated insert policy |
| S1 repair recommendation | Preserve; require strict identity for future writes and define whether creator may remain nullable |

## Demand and Requirement Capture

### `job_sources`

| Contract item | Current contract |
|---|---|
| Purpose | Registry and health metadata for external demand sources |
| Owner layer | Demand Intelligence |
| Primary key | `id uuid` |
| Important columns | Company/source identity, URL/type/tier, trust, status, ATS, market, extraction and health metrics |
| Nullability risks | Operational health fields are optional and may be stale |
| Constraints | PK; tier check; trust score 0–100 |
| Indexes | Unique source URL; source/tier/status; company name |
| Relationships | Parent of `jobs.job_source_id`; source-health views |
| Known readers | Jobs source resolution, Top Matches, reporting views |
| Known writers | Seed SQL; production source-health writer unknown |
| Contract drift | Seed is mixed with schema history; external owner not identified |
| S1 repair recommendation | Preserve IDs and unique URL; identify ingestion owner and separate seed/reference data |

### `jobs`

| Contract item | Current contract |
|---|---|
| Purpose | Canonical role/demand record for operational jobs and market intelligence |
| Owner layer | Demand Intelligence / Requirement Capture |
| Primary key | `id uuid` |
| Important columns | `job_id`, title/company/location, source URLs, dates, operational status, freshness/market flags, source FK, normalized role fields, job description |
| Nullability risks | Only `id` and `operational_status` are required; title, company, source, and dates can be null |
| Constraints | PK; nullable unique `job_id`; source FK with set-null |
| Indexes | PK and unique `job_id`; no captured index for common operational filters |
| Relationships | Source FK; parent of requirements by convention, intake by convention, assessments/submissions by FK, many views |
| Known readers | Jobs, Job Intake, dashboards, Top Matches, Interested Candidates, intelligence views |
| Known writers | Job Intake, Jobs status editor, AI classification script, external ingestion unknown |
| Contract drift | Base migration materially differs from live; `company_id` and intake/requirements links are unenforced |
| S1 repair recommendation | Approve `id` as relational key; define `job_id`; separate lifecycle semantics without splitting table during S1 |

### `jobs_intake`

| Contract item | Current contract |
|---|---|
| Purpose | Raw and parsed companion record for messy job intake |
| Owner layer | Requirement Capture |
| Primary key | `job_id uuid` |
| Important columns | Parsed role/company/location/work mode/seniority/skills, raw input, creator, status, notes |
| Nullability risks | Every field except `job_id` is nullable; provenance and raw input may be absent |
| Constraints/indexes | PK only |
| Relationships | Intended one-to-one with `jobs.id`, but no FK |
| Known readers | Dashboard workload; Job Intake |
| Known writers | Job Intake browser flow after job insert |
| Contract drift | No creation migration; two-step non-transactional save; anon dependency |
| S1 repair recommendation | Specify FK and atomic transaction/RPC design, but preserve current IDs and payload until writer migration is approved |

### `job_requirements`

| Contract item | Current contract |
|---|---|
| Purpose | Structured, weighted matching requirements for a job |
| Owner layer | Requirement Capture / Matching Intelligence |
| Primary key | `job_requirement_id uuid` |
| Important columns | `job_id`, `skill_name`, `requirement_type`, `min_years`, `weight`, notes |
| Nullability risks | Type, years, weight, notes, and timestamp are nullable |
| Constraints | PK; type check `must_have` or `good_to_have`; no job FK |
| Indexes | Job ID index |
| Relationships | Logical job relation; read with candidate skills for matching |
| Known readers | `skillMatch`, Top Matches |
| Known writers | Seed SQL; future parser/ingestion writer unknown |
| Contract drift | Migration and seed use incompatible fields/vocabulary, including `nice_to_have` |
| S1 repair recommendation | Approve live field contract and vocabulary; add job integrity only after orphan validation |

## Candidate Intelligence

### `candidates`

| Contract item | Current contract |
|---|---|
| Purpose | Canonical candidate identity, recruiter profile, consent, representation, and preferences |
| Owner layer | Candidate Intelligence |
| Primary key | `candidate_id uuid` |
| Important columns | Names/contact links, location/role, status/source, resume, target preferences, compensation, consent, representation |
| Nullability risks | Every business field is nullable; records can exist without name, contact, source, or consent state |
| Constraints/indexes | PK only |
| Relationships | Parent of sources, skills, scores, capabilities, assessments, submissions, applications |
| Known readers | Candidate pages, profile, matching, submissions, interest review |
| Known writers | Manual candidate intake, Admin Resume Import, seed SQL |
| Contract drift | No base creation migration; RLS disabled; broad grants; identity/dedup contract is not enforced |
| S1 repair recommendation | Preserve IDs; define minimum viable candidate and channel-specific consent requirements before constraints/RLS |

### `source_profiles`

| Contract item | Current contract |
|---|---|
| Purpose | Candidate source provenance and external identity |
| Owner layer | Candidate Intelligence |
| Primary key | `profile_id uuid` |
| Important columns | `candidate_id`, source name/URL/handle/user ID, scraped timestamp |
| Nullability risks | Candidate FK and all source fields are nullable |
| Constraints | PK; candidate FK without delete action |
| Indexes | PK only captured |
| Relationships | Candidate; parent of `evidence_signals`; candidate search view |
| Known readers/writers | Candidate profile/search; manual intake inserts and compensating deletes |
| Contract drift | No creation migration; RLS disabled; provenance uniqueness undefined |
| S1 repair recommendation | Define required candidate/source fields and source identity uniqueness after duplicate analysis |

### `skills`

| Contract item | Current contract |
|---|---|
| Purpose | Normalized skill taxonomy |
| Owner layer | Candidate Intelligence / Matching Intelligence |
| Primary key | `skill_id bigint` |
| Important columns | `skill_id`, `skill_name` |
| Nullability risks | `skill_name` is nullable |
| Constraints/indexes | PK only; no generated default or name uniqueness |
| Relationships | Parent of `candidate_skills`; candidate search view |
| Known readers | Matching and candidate search |
| Known writers | Unknown taxonomy/source process |
| Contract drift | Current browser writer cannot safely create missing skills |
| S1 repair recommendation | Define controlled taxonomy owner, generated ID strategy, normalized unique name/alias model |

### `candidate_skills`

| Contract item | Current contract |
|---|---|
| Purpose | Normalized candidate-to-skill evidence and proficiency relation |
| Owner layer | Candidate Intelligence / Matching Intelligence |
| Primary key | None |
| Important columns | `candidate_id`, `skill_id`, `source_profile_id`, `evidence_id`, `proficiency_score` |
| Nullability risks | Every column is nullable, allowing empty and unlinked rows |
| Constraints | Candidate and skill FKs only |
| Indexes | Candidate ID index; no unique relation index |
| Relationships | Candidate, skill; optional logical source/evidence provenance |
| Known readers | Matching and candidate search view |
| Known writers | Manual candidate intake attempts incompatible insert; normalized production writer unknown |
| Contract drift | App payload and migration shape differ from live; failures can be silent |
| S1 repair recommendation | Highest-priority contract repair: require candidate/skill, identify producer, select provenance-aware uniqueness, validate duplicates before constraint |

### `candidate_scores`

| Contract item | Current contract |
|---|---|
| Purpose | Current candidate score/search projection |
| Owner layer | Matching Intelligence |
| Primary key | None captured |
| Important columns | Candidate identity/display fields, repository metrics, capabilities, score, reason, scored timestamp |
| Nullability risks | Every column is nullable; multiple or orphan score rows are possible |
| Constraints | Candidate FK only |
| Indexes | No dedicated index captured |
| Relationships | Candidate; candidate search view |
| Known readers/writers | Candidate search; manual intake inserts; scoring writer unknown |
| Contract drift | No creation migration; model ownership and cardinality undefined |
| S1 repair recommendation | Preserve as current projection; decide one-current-row versus history and add validated key/index later |

### `candidate_capabilities`

| Contract item | Current contract |
|---|---|
| Purpose | Derived candidate capability labels consumed by search |
| Owner layer | Candidate Intelligence / Matching Intelligence |
| Primary key | None captured |
| Important columns | `candidate_id`, `capability`, `created_at` |
| Nullability risks | All columns nullable |
| Constraints | Candidate FK only |
| Indexes | None captured |
| Relationships | Candidate; `vw_candidate_search` |
| Known readers | Indirect candidate-search reader |
| Known writers | Unknown |
| Contract drift | No migration or producer contract |
| S1 repair recommendation | Include provisionally in disposable baseline to preserve search; identify regeneration process before production baseline adoption |

### `evidence_signals` — preserve-only provisional

| Contract item | Current contract |
|---|---|
| Purpose | Persisted source-profile evidence signals |
| Owner layer | Candidate Intelligence / Feedback Learning |
| Primary key | `evidence_id uuid` |
| Important columns | `profile_id`, signal name/value/time |
| Nullability risks | All business fields nullable |
| Constraints | PK; source-profile FK |
| Indexes | PK only captured |
| Relationships | Source profile; candidate skills may hold logical `evidence_id` without FK |
| Known readers/writers | No active repository consumer or producer confirmed |
| Contract drift | Real data exists but ownership and dependency are incomplete |
| S1 repair recommendation | Preserve outside core app contract; include only if full candidate evidence reproduction is required |

## Matching and Recruitment Execution

### `ai_assessments`

| Contract item | Current contract |
|---|---|
| Purpose | Persisted Terrer AI Review for a candidate/job pair |
| Owner layer | Matching Intelligence |
| Primary key | `id uuid` |
| Important columns | Job/candidate IDs, rule/AI scores, recommendation/confidence, strengths/concerns, reasoning, model provenance |
| Nullability risks | All assessment content except IDs is nullable |
| Constraints | PK; job/candidate FKs cascade; unique job/candidate pair |
| Indexes | PK and unique pair |
| Relationships | Jobs and candidates |
| Known readers/writers | Top Matches, dashboard; Top Matches upsert/update |
| Contract drift | Migration evolution differs from final nullable live shape; anon policies remain |
| S1 repair recommendation | Preserve pair uniqueness; define assessment versioning and authenticated writer before security repair |

### `submissions`

| Contract item | Current contract |
|---|---|
| Purpose | Canonical candidate-job pipeline membership and current execution state |
| Owner layer | Recruitment Execution |
| Primary key | `id uuid` |
| Important columns | Job/candidate/company, score/rank, stage/timestamps, owner, decisions/outcome, notes, next action, generated submission output |
| Nullability risks | Only `id` is required; even job, candidate, and stage may be null |
| Constraints | PK; job/candidate cascade FKs; company set-null FK; stage and next-action checks |
| Indexes | Unique job/candidate index; PK |
| Relationships | Jobs, candidates, companies; parent of activities and many pipeline views |
| Known readers | Pipeline, Candidates, Top Matches, Jobs, BD Tasks, dashboards |
| Known writers | StoreContext and submission library; `create_submission_with_activity`; activity triggers |
| Contract drift | Twelve broad/duplicate policies; migration history is incremental and incomplete; table overloads multiple future entities |
| S1 repair recommendation | Preserve exact current workflow; require job/candidate in future after null audit; remove policy duplication only with auth/write-path plan |

### `activity_log`

| Contract item | Current contract |
|---|---|
| Purpose | Operational activity event that can drive submission stage and next action |
| Owner layer | Recruitment Execution / Feedback Learning |
| Primary key | `id uuid` |
| Important columns | Submission/entity identity, type/channel/direction, summary, occurrence and next action, creator |
| Nullability risks | Only `id` is required; trigger can run on weakly attributed events |
| Constraints | PK; optional submission cascade FK; activity type vocabulary check |
| Indexes | PK only captured |
| Relationships | Submission; enriched pipeline views |
| Known writers | `create_submission_with_activity`; external activity writer unknown |
| Contract drift | Anon insert can indirectly mutate submissions; no direct app writer found |
| S1 repair recommendation | Retain temporary canonical role; require authenticated/protected writer and stronger submission/entity validation |

## Marketplace and AI Operations

### `web_candidate_intakes`

| Contract item | Current contract |
|---|---|
| Purpose | Public pre-canonical candidate intake with consent and resume reference |
| Owner layer | Candidate Intelligence / marketplace intake |
| Primary key | `id uuid` |
| Important columns | Email/contact/profile, desired role/location, resume metadata, source context, consent flags, status |
| Nullability risks | Only `id` and `email` required; consent booleans are nullable |
| Constraints/indexes | PK only |
| Relationships | Logical resume object and optional source job; no FKs |
| Known writers | `submitWebCandidateIntake`; external web shell expected |
| Contract drift | Base migration absent; live row count zero; public insert must remain narrow |
| S1 repair recommendation | Preserve intake boundary; require explicit consent defaults and server-side validation in future |

### `web_job_interest`

| Contract item | Current contract |
|---|---|
| Purpose | Candidate interest, representation request, and recruiter review state |
| Owner layer | Marketplace / Recruitment Execution |
| Primary key | `id uuid` |
| Important columns | Candidate/job IDs, denormalized labels, interest/status, next action, representation consent/review fields |
| Nullability risks | Candidate/job IDs are required but not FKs; most state fields nullable and overlapping |
| Constraints/indexes | PK only |
| Relationships | Logical candidate/job links |
| Known readers/writers | Interested Candidates reads/updates; external public creator unknown |
| Contract drift | Public read/update and insert policies; only extension migrations exist |
| S1 repair recommendation | Define creator and state vocabulary, add validated FKs only after external compatibility review |

### `autonomous_recruiter_runs`

| Contract item | Current contract |
|---|---|
| Purpose | Persisted autonomous sourcing run, strategy, confidence, and artifact metadata |
| Owner layer | AI Operating Layer |
| Primary key | `id uuid` |
| Important columns | Run/mode/job criteria, metrics, strategy outcomes, recommendations, artifact paths, confidence and iteration data |
| Nullability risks | Only ID and created timestamp are required |
| Constraints/indexes | PK; indexes on created time, job title, mode, run status |
| Known readers/writers | Autonomous Recruiter page reads; external runner unknown; seed SQL |
| Contract drift | Production writer unidentified; anonymous demo select exists |
| S1 repair recommendation | Preserve; identify runner role and split internal artifacts from any future public demo projection |

### `autonomous_recruiter_memory`

| Contract item | Current contract |
|---|---|
| Purpose | Persisted learning memory derived from sourcing runs |
| Owner layer | AI Operating Layer / Feedback Learning |
| Primary key | `id uuid` |
| Important columns | Memory type, role/job context, successful/failed strategy, recommendation, confidence, signals, source run, payload |
| Nullability risks | Only ID and created timestamp are required; `source_run_id` is not constrained |
| Constraints/indexes | PK; indexes on date, role family, confidence |
| Known readers/writers | Autonomous Recruiter page reads; external runner writes unknown |
| Contract drift | No source-run FK; producer and retention/version rules undefined |
| S1 repair recommendation | Preserve; define producer, source-run relationship, retention, and memory versioning |

## Canonical Views

| View | Purpose and owner | Dependencies | Readers | Drift and S1 recommendation |
|---|---|---|---|---|
| `vw_candidate_search` | Candidate search aggregation; Candidate/Matching Intelligence | candidates, scores, sources, skills, candidate skills, capabilities | Indirect through clean view | No migration-backed definition; include exact live SQL and secure base tables |
| `vw_candidate_search_clean` | Latest-row clean candidate contract; Candidate Intelligence | `vw_candidate_search` | Candidates and pipeline lookups | `security_invoker=true`; preserve output exactly before any view redesign |
| Pipeline view family | Operational/reporting projections | submissions, activity, candidates, jobs | No current direct app consumer confirmed for most | Include in full-fidelity baseline; classify active use before future cleanup |
| Jobs/source view family | Demand reporting and source health | jobs, job sources, other views | No direct current app consumer confirmed | Include in full-fidelity baseline to reproduce live reporting; later designate core versus reporting |

Pipeline family: `recruiter_active_submissions`, `vw_submissions_enriched`, `vw_company_pipeline_summary`, `vw_candidate_pipeline_summary`, `vw_activity_log_enriched`, `vw_pipeline_summary`, `vw_outcomes_summary`, `vw_live_work_queue`, `vw_followup_queue`, `vw_job_shortlist`, `vw_recruiter_dashboard`.

Jobs/source family: `jobs_latest`, `jobs_latest_practical`, `jobs_reporting`, `hiring_leaderboard_malaysia`, `terrer_hiring_now`, `vw_jobs_tier1_malaysia`, `vw_market_signals`, `vw_market_signals_active`, `vw_market_signals_realtime`, `vw_market_signals_recent`, `vw_tier1_source_health`, `vw_tier1_source_health_v2`, `vw_tier1_source_diagnostics`, `vw_tier1_source_health_summary`.

## Canonical Functions and Triggers

| Object | Purpose | Dependencies/readers | Drift/risk | S1 repair recommendation |
|---|---|---|---|---|
| `is_current_user_admin()` | Stable security-definer admin check | `profiles`, profile policies | Broad execute grants; no migration | Preserve exact semantics; review grants and secure search path in security phase |
| `create_submission_with_activity(...)` | Atomic submission plus initial activity | submissions, activity log | Invoker security and broad execute grants | Preserve for baseline; decide whether it becomes protected canonical write path |
| `sync_submission_next_action_from_activity()` | Update next action after activity insert | activity trigger, submissions | Any permitted activity insert invokes mutation | Keep paired with trigger; restrict writers later |
| `sync_submission_stage_from_activity()` | Map activity types to stages | activity trigger, submissions | Stage vocabulary is embedded in function | Contract-test every mapping before changes |
| `update_submission_stage_timestamp()` | Stamp stage changes | submissions trigger | Depends on mutable stage vocabulary | Preserve |
| `update_updated_at_column()` | Canonical timestamp helper | jobs, candidates, companies, submissions, target companies | Companies has duplicate triggers | Include once; remove duplicate company trigger only after approval |
| `rls_auto_enable()` + `ensure_rls` event trigger | Automatically enable RLS on new public tables | DDL event system | Can create policy-less inaccessible tables; not migration-backed | Include only after governance decision; document expected baseline behavior explicitly |

Canonical table triggers:

- `set_updated_at_candidates`
- `set_updated_at_jobs`
- `set_submission_stage_updated_at`
- `set_updated_at_submissions`
- `trg_sync_submission_next_action_from_activity`
- `trg_sync_submission_stage_from_activity`
- one approved company updated-at trigger; live currently has `set_updated_at` and `set_updated_at_companies`

## Storage Dependencies

| Bucket | Purpose | Current contract | Readers/writers | Drift and S1 recommendation |
|---|---|---|---|---|
| `candidate-resumes` | Candidate resume intake and internal access | Private; no size/MIME limit; anon/auth insert; authenticated bucket-wide read | Candidates, Admin Resume Import, web intake, Candidate Profile | Canonical; include in baseline but design path ownership, file limits, signed access, and cleanup permissions |
| `bd-photo-intake` | Sensitive BD screenshot/photo processing | Private; no size/MIME limit; authenticated bucket-wide CRUD | BD Photo Intake | Canonical; include and replace misleading “own” policies with real owner/path checks later |
| `resumes` | Legacy/unknown resume intake | Private; anon insert only | No repository consumer found | Preserve-only; include only in full-fidelity baseline pending ownership decision |

Storage policy dependencies are policies on `storage.objects`, not standalone bucket ACLs. Exact current policy expressions are in `docs/schema-evidence/live_rls_policies.sql`.

## Contract Approval Gates Before Draft Migration Work

1. Confirm minimum required fields for candidates, companies, jobs, submissions, and activities.
2. Confirm candidate-skill uniqueness and taxonomy ownership.
3. Confirm job identity and intake/requirement FK strategy.
4. Identify all external writers.
5. Confirm whether full-fidelity reporting views are required in the first disposable baseline.
6. Decide whether `rls_auto_enable` is platform policy or live-only drift.
7. Define future authenticated and public-intake role boundaries.

