# Audit D: Authoritative Supabase Schema Audit

Audit date: 6 June 2026  
Linked project: `tlufttnmwtjbuhjcrqmp`  
Mode: read-only audit; no migrations applied, no database objects altered, no application code changed

## Executive Summary

The linked Supabase database is **not reproducible from the repository migrations**.

The repository contains 34 migration files, but the remote migration ledger and the local migration directory have materially diverged:

- 18 migration versions are aligned.
- Remote versions `20260507`, `20260508`, and `20260509` have no matching local migration version.
- Numerous local migrations dated from 7 May through 5 June are absent from the remote migration ledger.
- Some objects from those apparently unapplied local migrations nevertheless exist live, proving that the migration ledger, repository files, and actual schema are three different sources of truth.

The live database contains at least:

- 38 public tables.
- 30 public views.
- 2 public database functions.
- 3 storage buckets.
- 4 deployed Edge Functions.

The most serious findings are:

1. **Core canonical tables are live but have no authoritative creation migration:** `candidates`, `candidate_scores`, `source_profiles`, `skills`, `jobs_intake`, `profiles`, `web_job_interest`, and `web_candidate_intakes`.
2. **The repository migration for `candidate_skills` is incompatible with the live table.** The repo defines free-text `skill` and `proficiency`; live uses `skill_id`, `proficiency_score`, `source_profile_id`, and `evidence_id`.
3. **The current manual candidate writer still sends the obsolete `candidate_skills` shape.** Candidate creation can succeed while skill persistence silently fails.
4. **The repository migration for `job_requirements` is incompatible with live.** Repo fields are `id`, `requirement`, and `required`; live fields are `job_requirement_id`, `skill_name`, `requirement_type`, `min_years`, `weight`, and `notes`.
5. **`candidate_intent_events` is referenced by the app and defined locally, but does not exist in the live PostgREST schema.**
6. **Live `jobs` and `submissions` are substantially richer than their creation migrations.** A clean rebuild would not satisfy current app reads, writes, or legacy views.
7. **Anonymous users can retrieve real rows from sensitive operational tables**, including candidates, candidate scores, source profiles, BD contacts, submissions, assessments, jobs intake, and autonomous recruiter runs.
8. **Anonymous write/delete policies are migration-backed for several critical objects.** These were not mutation-tested because this audit was read-only.
9. **Both named storage buckets are private, but application code uses `getPublicUrl()`.** Stored paths may persist correctly while generated URLs remain unusable unless separate signed-URL logic or public access exists.
10. **The two requested Edge Functions are deployed with JWT verification enabled**, but both use permissive CORS and contain no application-role authorization check.

Overall rebuild-safety rating: **Critical**.

## Evidence and Limitations

Evidence used:

- All SQL files under `supabase/migrations/`.
- All Supabase reads, writes, storage calls, and function invocations under `src/`.
- Function source under `supabase/functions/`.
- `supabase migration list --linked`.
- Live TypeScript schema generation with `supabase gen types typescript --linked --schema public`.
- Live table statistics from `supabase inspect db table-stats --linked`.
- Live Edge Function metadata from `supabase functions list`.
- Read-only Storage API bucket inventory.
- Non-mutating anonymous PostgREST reads used only to establish whether a real row was visible.

Limitations:

- `supabase db dump` could not run because Docker Desktop is not installed.
- Exact live `pg_policy` expressions and storage object policies could not be dumped.
- Anonymous insert, update, and delete permissions were not tested because doing so would mutate production data.
- A successful zero-row REST response alone is not treated as proof of read access. “Anon-visible” below means a real row was returned.
- Live table/view/function existence and column shapes are authoritative as of 6 June 2026; policy details marked “repo-applied” remain inferred from the remote migration ledger plus repository SQL.

## Migration Ledger Drift

### Aligned local and remote versions

`20260416032328`, `20260416033118`, `20260416033907`, `20260416085424`, `20260416090619`, `20260416091656`, `20260416094444`, `20260416100404`, `20260416111941`, `20260419120000`, `20260422120000`, `20260422133000`, `20260426113000`, `20260427173000`, `20260502`, `20260503`, `20260506`, `20260602090000`.

### Remote-only versions

| Remote version | Repository match | Risk |
|---|---|---|
| `20260507` | No matching local version | High: unknown remote change |
| `20260508` | No matching local version | High: local file uses `20260508_add_job_source_id_to_jobs.sql`, but ledger matching is version-based and the CLI reports it as local-only |
| `20260509` | No matching local version | High: likely contains schema work not represented authoritatively in this checkout |

### Local-only versions

The CLI reports the following as local-only: `20260507113000`, `20260507`, `20260508`, `20260509090000`, `20260509`, `20260510101500`, `20260510104500`, `20260510121500`, `20260513140000`, `20260513160000`, `20260513173000`, `20260514110000`, `20260514143000`, `20260521090000`, `20260531093000`, and `20260605090000`.

This does **not** mean every corresponding object is absent live. For example, `bd_notes`, Bullhorn staging tables, and autonomous recruiter tables exist live despite their local migration versions not appearing remotely. This indicates manual SQL, differently versioned remote migrations, migration-history repair, or another repository history.

## Object Comparison Matrix

Legend:

- Repo: `Yes` = creation is migration-backed; `Partial` = only alterations/views/policies exist or the creation shape is obsolete; `No` = no creation migration.
- Live: verified through generated types, table statistics, Storage API, or function deployment metadata.
- Policy: `Anon-visible` means a real row was returned using the anonymous key.

### Priority Tables and Views

| Object | Type | Repo | App | Live | Drift status | Key fields expected by app | Key fields defined in migrations | RLS / policy evidence | Risk | Recommended action |
|---|---|---:|---:|---:|---|---|---|---|---|---|
| `candidates` | Table | Partial | Yes | Yes | Missing creation migration / field drift | `candidate_id`, identity/contact, role/location, source, resume, score/tier, consent, representation, structured preferences | Additive fields only; no base table | Real candidate row anon-visible | Critical | Baseline exact live shape, FKs, identity rules, and role-scoped policies |
| `candidate_scores` | Table | No | Yes | Yes | Missing migration | Candidate projection plus `capabilities`, `score`, `score_reason`, `scored_at` | None | Real row anon-visible | Critical | Define whether this is a search projection or versioned score entity; migration-back it |
| `source_profiles` | Table | No | Yes | Yes | Missing migration | `profile_id`, `candidate_id`, source identity/URL/handle, `scraped_at` | None | Real row anon-visible | Critical | Add canonical provenance migration, FKs, uniqueness, and restricted reads |
| `candidate_skills` | Table | Yes | Yes | Yes | Field drift / active write failure | Read: `candidate_id`, `skill_id`, `proficiency_score`, `skills(skill_name)`; manual write still sends `skill`, `proficiency` | `id`, `candidate_id`, `skill`, `proficiency`, `created_at` | Repo-applied anon select/insert/update; real row anon-visible | Critical | Adopt live normalized shape; update all writers; backfill and constrain before removing legacy assumptions |
| `skills` | Table | No | Indirectly | Yes | Missing migration | `skill_id`, `skill_name` | None | Real row anon-visible | High | Add taxonomy migration, unique canonical name/aliases, and controlled writes |
| `job_requirements` | Table | Yes | Yes | Yes | Field drift | `job_requirement_id`, `job_id`, `skill_name`, `requirement_type`, `min_years`, `weight`, `notes` | `id`, `job_id uuid`, `requirement`, `required`, `created_at` | Repo-applied anon select/insert/update; real row anon-visible | Critical | Rebuild migration around live shape; add FK to canonical job key and intake writer |
| `vw_candidate_search_clean` | View | No | Yes | Yes | Missing migration | Candidate identity, source, `score`, `score_reason`, `top_skills`, `capabilities` | None | Real row anon-visible through API | Critical | Capture exact view SQL and dependencies in baseline |
| `jobs` | Table | Yes | Yes | Yes | Field drift | Current app/live use `id`, `job_id`, `company_id`, source intelligence, descriptions, classification, `operational_status` | Base migration only has title, company, location, source, `status`, timestamps; later migrations add a subset | Repo-applied anon select/insert/update; real row anon-visible | Critical | Baseline full live table; reconcile `id` versus `job_id` and `status` versus `operational_status` |
| `jobs_intake` | Table | No | Yes | Yes | Missing migration | `job_id`, raw input, parsed role/company/location/work mode/seniority/skills, creator/status/notes | None | Real row anon-visible | Critical | Add authoritative table, FK, parser provenance, owner ID, and transactional save RPC |
| `submissions` | Table | Yes | Yes | Yes | Field drift | Current pipeline plus company, match/rank, owner, decision, outcome, notes, generated submission text | Base has only IDs, stage, next action, timestamps; later adds notes/output fields | Repo-applied anon CRUD including delete; real row anon-visible | Critical | Baseline live shape, restrict policies, then split history and downstream execution entities |
| `companies` | Table | Yes | Yes | Yes | Partial / ledger drift | Identity, URLs, ATS/source intelligence, status, notes, timestamps | Creation exists in a local-only migration; later source fields partly migration-backed | Real row anon-visible | High | Preserve live canonical shape; add normalized identity, ownership, and secure policies |
| `bd_contacts` | Table | Yes | Yes | Yes | Partial / field omission | Contact identity, company, relationship/task fields, plus photo-intake extraction metadata used by app | Local creation and alterations exist, but live generated type lacks photo-intake metadata columns expected by current code | Real row anon-visible; repo includes anon read and anon update | Critical | Verify current photo-intake writes against live; baseline exact columns; remove anonymous mutation |
| `bd_notes` | Table | Yes | Yes | Yes | Migration ledger drift | `id`, company/contact, body/type, creator, timestamps | Full local creation migration, but its version is not in remote ledger | Live table exists; zero rows prevented visibility determination | High | Capture live DDL/policies and repair history before future changes |
| `profiles` | Table | No | Yes | Yes | Missing migration | Auth-linked `id`, email/name, role, active flag, timestamps | None | One live row exists; anonymous probe returned no row | Critical | Add auth-linked migration, role constraints, trigger/bootstrap, and least-privilege policies |
| `web_job_interest` | Table | Partial | Yes | Yes | Missing creation migration | Candidate/job interest, representation request/review/decision fields, status/action timestamps | Only anon-select policy and additive representation columns | Real row anon-visible | Critical | Add base migration and ownership policies; avoid exposing candidate interest records anonymously |
| `web_candidate_intakes` | Table | No | Yes | Yes | Missing migration | Contact/profile intake, consent, resume path/name, source context, intake status | None | Live but empty; policy visibility unresolved | Critical | Add table and storage policies together; protect PII; define promotion into `candidates` |
| `candidate_intent_events` | Table | Yes | Yes | No | Migration not applied / missing live object | `candidate_id`, `job_id`, event type/source/metadata/timestamp | Full local creation migration with anon read/insert | PostgREST returned 404; absent from generated live types | High | Decide whether still required; apply only after baseline and policy redesign |
| `ai_assessments` | Table | Yes | Yes | Yes | Mostly aligned; policy risk | Candidate/job, scoring, recommendation, evidence arrays, model/version, timestamps | Base plus full extension migration | Repo-applied anon select/insert/update; real row anon-visible | Critical | Preserve shape, add immutable versions/provenance, restrict writes and sensitive reads |
| `autonomous_recruiter_runs` | Table | Yes | Yes | Yes | Ledger drift | Run status, strategy/iteration artifacts, confidence, signals, recommendations | Full local migrations, versions absent remotely | Real row anon-visible | High | Baseline live table; remove demo-wide anon read or expose a safe view |
| `autonomous_recruiter_memory` | Table | Yes | Yes | Yes | Ledger drift | Memory type/payload, strategy learning, confidence, source run | Full local migration, version absent remotely | Live rows exist; anonymous probe returned no row | Medium | Baseline live DDL; enforce authenticated/service-role access |
| `job_sources` | Table | Yes | Yes | Yes | Partial ledger drift | Source identity, trust/health, extraction and coverage metrics | Base migration plus seed; live includes additional operational fields | Exposed by app; repo grants anon select | Medium | Keep; baseline complete live shape and separate public-safe source fields |

### Legacy Pipeline Views and Functions

| Object | Type | Repo | App | Live | Drift status | Notes | Risk | Recommended action |
|---|---|---:|---:|---:|---|---|---|---|
| `vw_submissions_enriched` | View | Yes | No direct current query | Yes | Depends on richer live schema | Uses candidates, jobs, submissions, profiles | High | Keep only if dashboard/reporting contract is retained; capture exact SQL |
| `recruiter_active_submissions` | View | Yes | No | Yes | Live | Legacy active-stage filter | Medium | Audit consumers; deprecate if current pages query tables directly |
| `vw_company_pipeline_summary` | View | Yes | No | Yes | Live | Aggregates pipeline by company/stage | Medium | Keep for reporting only if stage vocabulary is standardized |
| `vw_candidate_pipeline_summary` | View | Yes | No | Yes | Live | Aggregates pipeline by candidate/stage | Medium | Keep or replace with governed reporting view |
| `vw_activity_log_enriched` | View | Yes | No | Yes | Repo dependency was initially undocumented | Depends on live `activity_log` | High | Baseline `activity_log` and exact view SQL together |
| `vw_pipeline_summary` | View | Yes | No | Yes | Live | Stage aggregation | Low | Keep as reporting convenience or deprecate with legacy pipeline |
| `vw_outcomes_summary` | View | Yes | No | Yes | Live | Outcome/stage aggregation | Medium | Rebuild after canonical outcome model exists |
| `vw_live_work_queue` | View | Yes | No | Yes | Live and writable-looking in generated types | Work queue projection | High | Confirm security-invoker and write behavior; prefer read-only view |
| `vw_followup_queue` | View | Yes | No | Yes | Live | Depends on activity/submission state | Medium | Retain only after task/activity model is clarified |
| `vw_job_shortlist` | View | Yes | No | Yes | Live | Candidate/job shortlist projection | Medium | Keep if it becomes the canonical shortlist read model |
| `vw_recruiter_dashboard` | View | Yes | No | Yes | Live | Composite operational dashboard | Medium | Audit performance/security; current dashboard mostly queries base tables |
| `create_submission_with_activity` | DB function | No | No | Yes | Missing migration | Likely creates submission and activity atomically | Critical | Capture function body, grants, and security mode; consider making it the governed write path |
| `is_current_user_admin` | DB function | No | No direct call | Yes | Missing migration | Authorization helper visible in generated types | Critical | Capture body and grants; include before any policy depending on it |

### Storage Buckets

| Object | Type | Repo | App | Live | Drift status | Live configuration | Risk | Recommended action |
|---|---|---:|---:|---:|---|---|---|---|
| `candidate-resumes` | Storage bucket | No | Yes | Yes | Missing migration/policies | Private; no file-size or MIME allowlist | Critical | Migration-back bucket and object policies; use signed URLs; restrict path ownership and MIME/size |
| `bd-photo-intake` | Storage bucket | No | Yes | Yes | Missing migration/policies / URL contract mismatch | Private; no file-size or MIME allowlist | Critical | Keep private, use signed URL or direct authenticated download, add retention and object policies |
| `resumes` | Storage bucket | No | No current app reference | Yes | Live-only / possibly obsolete | Private; no file-size or MIME allowlist | Medium | Audit contents and consumers; merge into `candidate-resumes` or deprecate |

### Edge Functions

| Object | Type | Repo | App | Live | Drift status | Auth/config | Risk | Recommended action |
|---|---|---:|---:|---:|---|---|---|---|
| `job-intake-parser` | Edge Function | Yes | Yes | Yes, v17 | Aligned deployment name | `verify_jwt: true`; permissive CORS; Gemini-backed parser | Medium | Keep; add role/rate/size checks, schema-versioned output, and deployment config in repo |
| `bd-photo-vision-extract` | Edge Function | Yes | Yes | Yes, v2 | Aligned deployment name | `verify_jwt: true`; permissive CORS; processes sensitive screenshots | High | Keep with stricter authorization, retention controls, redaction, request limits, and audit logs |
| `parse-job-intake` | Edge Function | No | No | Yes, v10 | Live-only legacy function | `verify_jwt: true` | Medium | Audit callers; deprecate if superseded by `job-intake-parser` |
| `quick-processor` / `layer2-assess` | Edge Function | No | No current app invocation | Yes, v5 | Live-only legacy/prototype | `verify_jwt: false` | Critical | Audit immediately; disable or require JWT unless an intentional public endpoint is documented |

### Policy Objects Defined in Repository

Exact live policy expressions were not dumped. The table below records repository policy objects and whether their migration version is shown as applied remotely.

| Relation | Repository policy objects | Remote-ledger evidence | Risk / action |
|---|---|---|---|
| `jobs` | Anon select, insert, update; authenticated select, insert, update | Applied | Critical: real rows are anon-visible; remove anonymous mutation and expose only a public-safe jobs view if required |
| `submissions` | Authenticated select/insert/update/delete; anon select/insert/update/delete | Applied | Critical: real pipeline rows are anon-visible and repo-applied policy set permits anonymous deletion |
| `ai_assessments` | Anon select, insert, update | Applied | Critical: assessment data is anon-visible and mutable under repo policy |
| `candidate_skills` | Anon select, insert, update | Applied | High: source evidence and inferred skills are anon-visible/mutable |
| `job_requirements` | Anon select, insert, update | Applied | High: job matching requirements are anon-visible/mutable |
| `web_job_interest` | “allow read all for now” anon select | Applied | Critical: real candidate interest rows are anon-visible |
| `candidate_intent_events` | Public read and public insert | Local-only; object absent live | High: redesign before applying |
| `job_sources` | Anon select; authenticated select | Applied base migration | Medium: restrict operational notes/health details or expose safe view |
| `companies` | Anon select; authenticated select/insert/update | Local policy migration not in ledger; real rows anon-visible | High: capture actual policies and expose only safe company fields publicly |
| `bd_contacts` | Anon select/update; authenticated select/update/insert | Local versions not in ledger; real rows anon-visible | Critical: contact PII is publicly retrievable; anonymous update must be removed |
| `autonomous_recruiter_runs` | Authenticated select/insert; anon demo select | Local versions not in ledger; real rows anon-visible | High: expose curated demo projection instead of internal run artifacts |
| `autonomous_recruiter_memory` | Authenticated select/insert | Local version not in ledger; no anonymous row observed | Medium: confirm live policies and restrict to service/recruiter roles |
| `bd_notes` | Authenticated read/insert; creator-only update | Local version not in ledger; table empty | Medium: capture actual live policies |

## Live-Only and Non-Authoritative Objects

The following public tables exist live but have no authoritative creation migration in this repository:

- `activity_log`
- `applications`
- `candidate_capabilities`
- `candidate_scores`
- `candidates`
- `company_identity_merge_v1_snapshot`
- `employer_intake_actions`
- `employer_job_intake`
- `evidence_signals`
- `job_candidate_matches`
- `jobs_intake`
- `match_interactions`
- `outreach_log`
- `profiles`
- `skills`
- `source_profiles`
- `target_companies`
- `terrer_candidates`
- `terrer_companies`
- `terrer_company_contacts`
- `terrer_jobs`
- `terrer_pipeline`
- `terrer_skills`
- `web_candidate_intakes`
- `web_job_interest`

Some may originate from another codebase or an earlier Terrer schema generation. They must not automatically be copied into a baseline without classification.

Live views lacking authoritative local creation SQL include:

- `hiring_leaderboard_malaysia`
- `jobs_latest`
- `jobs_latest_practical`
- `jobs_reporting`
- `terrer_hiring_now`
- `terrer_jobs_view`
- `v_match_shortlist`
- `v_outreach_due`
- `vw_candidate_search`
- `vw_candidate_search_clean`
- `vw_jobs_tier1_malaysia`
- `vw_market_signals`
- `vw_market_signals_active`
- `vw_market_signals_realtime`
- `vw_market_signals_recent`
- `vw_tier1_source_diagnostics`
- `vw_tier1_source_health`
- `vw_tier1_source_health_summary`
- `vw_tier1_source_health_v2`

## Migration-Backed but Unused by the Current App

| Object | Current state | Recommendation |
|---|---|---|
| Legacy pipeline views | Live, but current pages query base tables directly | Audit analytics/automation consumers; retain only governed reporting views |
| `staging_bullhorn_companies` | Live and migration-backed; not queried under `src/` | Keep as import staging, document retention and promotion process |
| `staging_bullhorn_contacts` | Live and migration-backed; not queried under `src/` | Keep as import staging, document retention and promotion process |
| `candidate_intent_events` | Local migration and app reference, absent live | Do not apply blindly; decide whether it remains part of the product model |
| Several autonomous-run alterations | Local migration versions absent from remote ledger, although fields exist live | Consolidate into baseline rather than trying to replay uncertain history |

## App Write Shape vs Read Shape

### `candidate_skills`: direct incompatibility

Manual candidate creation writes:

```text
candidate_id, skill, proficiency
```

Current matching reads:

```text
candidate_id, proficiency_score, skill_id -> skills(skill_name)
```

Live accepts only the normalized shape. The writer catches and logs the skill insert error, so the candidate can appear saved while its skills are missing from matching.

### Candidate creation: fragmented projections

`createCandidateFromIntake()` writes four objects:

1. `candidates`
2. `candidate_scores`
3. `source_profiles`
4. `candidate_skills`

It attempts compensating deletes if score/source insertion fails, but skill failure is deliberately non-fatal. Other candidate intake paths write only `candidates` or `web_candidate_intakes`. Therefore the read view `vw_candidate_search_clean` can receive inconsistent source, score, and skill coverage depending on intake channel.

### `jobs` and `jobs_intake`: non-transactional dual write

Job Intake writes a canonical `jobs` record and a companion `jobs_intake` record in separate operations. No migration-backed RPC or transaction guarantees that both persist. Dashboard workload depends on `jobs_intake`, while most job pages depend on `jobs`.

### `submissions`: current-state writes, historical reads implied

The app updates one mutable submission row through many workflow stages. Legacy views expose decision, outcome, submitted timestamp, and activity context, but there is no migration-backed stage-history entity. Historical reporting is therefore reconstructed from overwritten current state and sparse activity data.

### Storage URL shape

The app stores bucket-relative resume paths and photo paths, then sometimes calls `getPublicUrl()`. Both requested buckets are live and private. A syntactically generated public URL is not proof that the file is retrievable.

## Critical Rebuild-Safety Risks

1. A clean migration replay cannot create the candidate domain.
2. Replaying the old `candidate_skills` migration creates the wrong columns for current matching code.
3. Replaying the old `job_requirements` migration creates the wrong columns for current matching code.
4. A clean rebuild cannot create `jobs_intake`, so Job Intake persistence and dashboard workload break.
5. A clean rebuild cannot create `profiles`, so role-based authentication/bootstrap breaks.
6. A clean rebuild cannot create web intake/interest tables or resume/photo buckets.
7. Legacy views may fail during replay unless hidden base tables and richer columns are created first.
8. Remote-only migrations cannot be reviewed or reproduced from this checkout.
9. Local-only migration versions cannot safely be assumed unapplied because their objects/fields may already exist through other history.
10. Policy replay from the repository would recreate unsafe anonymous access even if current production policies were later tightened manually.

## Schema Drift Findings

### Critical field drift

- `candidate_skills`: obsolete free-text migration versus normalized live table.
- `job_requirements`: obsolete boolean/free-text migration versus weighted live requirements.
- `jobs`: base migration lacks most live demand-intelligence fields and uses a `status` field absent from generated live types.
- `submissions`: base migration lacks company, scoring, owner, decision, outcome, and client-submission fields.
- `bd_contacts`: current app photo-intake code expects extraction/source metadata not present in the generated live type.

### Missing creation migrations

- Candidate core: `candidates`, `candidate_scores`, `source_profiles`, `skills`.
- Requirement/workflow core: `jobs_intake`.
- Auth core: `profiles`.
- Marketplace intake: `web_job_interest`, `web_candidate_intakes`.
- Search/read model: `vw_candidate_search_clean`.
- Execution support: `activity_log`, `create_submission_with_activity`.
- Storage: all buckets and storage policies.

### Missing live object

- `candidate_intent_events` is called by `src/lib/candidateIntentEvents.ts` but is absent live.

### Duplicate/parallel domain generations

The live database includes both current canonical-looking objects and a parallel `terrer_*` family:

- `companies` and `terrer_companies`
- `candidates` and `terrer_candidates`
- `jobs` and `terrer_jobs`
- `skills` and `terrer_skills`
- `submissions`/views and `terrer_pipeline`

It also includes `applications`, `employer_job_intake`, and `job_candidate_matches`, which overlap future Terrer operating-model needs but are not used by the current app. These should be audited before introducing new tables with the same business meaning.

## RLS and Policy Drift Findings

### Confirmed anonymous row visibility

Real rows were retrievable with the anonymous project key from:

- `jobs`
- `submissions`
- `ai_assessments`
- `candidate_skills`
- `job_requirements`
- `companies`
- `bd_contacts`
- `web_job_interest`
- `autonomous_recruiter_runs`
- `candidates`
- `candidate_scores`
- `source_profiles`
- `skills`
- `jobs_intake`
- `vw_candidate_search_clean`

This exposes candidate PII/provenance, BD contact PII, internal workflow, assessment reasoning, raw intake, and autonomous operating artifacts.

### Visibility unresolved because tables were empty or RLS returned no rows

- `bd_notes`
- `web_candidate_intakes`
- `autonomous_recruiter_memory`

### Dangerous mutation policies in applied repository history

- Anonymous insert/update on `jobs`.
- Anonymous insert/update/delete on `submissions`.
- Anonymous insert/update on `ai_assessments`.
- Anonymous insert/update on `candidate_skills`.
- Anonymous insert/update on `job_requirements`.

These policies should be treated as active until an exact live policy dump proves otherwise.

### View security risk

Views exposed through PostgREST must be checked for:

- `security_invoker` behavior.
- Grants to `anon`.
- Whether underlying RLS is bypassed.
- PII columns projected unintentionally.

`vw_candidate_search_clean` currently returns real candidate rows anonymously.

## Objects Required in a Rebuild-Safe Baseline

### Must include

- Auth and authorization: `profiles`, `is_current_user_admin`, auth-profile creation behavior.
- Relationship: `companies`, `bd_contacts`, `bd_notes`.
- Demand and intake: `job_sources`, `jobs`, `jobs_intake`.
- Candidate: `candidates`, `candidate_scores` or its replacement, `source_profiles`, `skills`, `candidate_skills`.
- Matching: `job_requirements`, `ai_assessments`, `vw_candidate_search_clean`.
- Execution: `submissions`, `activity_log`, `create_submission_with_activity`, retained pipeline views.
- Marketplace: `web_job_interest`, `web_candidate_intakes`.
- AI operations: `autonomous_recruiter_runs`, `autonomous_recruiter_memory`.
- Storage: `candidate-resumes`, `bd-photo-intake`, bucket configuration, object policies.
- Function deployment/config documentation: `job-intake-parser`, `bd-photo-vision-extract`.

### Include only after classification

- `applications`
- `job_candidate_matches`
- `match_interactions`
- `outreach_log`
- `employer_job_intake`
- `employer_intake_actions`
- `candidate_capabilities`
- `evidence_signals`
- `target_companies`
- all `terrer_*` tables
- market/source-health views
- `resumes` bucket
- legacy deployed Edge Functions

### Deprecate or rebuild candidates

- Old free-text `candidate_skills` migration.
- Old `job_requirements` migration.
- Publicly writable base-table policies.
- `quick-processor` if no documented public use exists.
- `parse-job-intake` if fully superseded.
- Duplicate `resumes` bucket if no active consumer exists.
- Parallel `terrer_*` domain if it is an abandoned prototype.
- Legacy pipeline views that have no current consumer and preserve obsolete stage vocabulary.

## Recommended Stabilization Sequence

1. **Freeze schema changes briefly.** Do not add more ad hoc dashboard SQL while the baseline is assembled.
2. **Obtain an exact production schema-only dump.** Install/start Docker for Supabase CLI or use approved `pg_dump`; include public schema, functions, triggers, grants, policies, and storage metadata.
3. **Export and review exact policies.** Prioritize candidates, BD contacts, submissions, assessments, web interest, intake, and storage objects.
4. **Back up production before remediation.** Schema-only and data backups should be verified independently.
5. **Classify every live-only object.** Mark canonical, staging, reporting, prototype, or deprecated.
6. **Choose canonical identity keys.** Resolve `jobs.id` versus `jobs.job_id`, candidate IDs, company linkage, and normalized skill IDs.
7. **Repair active code/schema incompatibilities.** Fix candidate skill writes and verify BD photo-intake columns before broad migration work.
8. **Create a reviewed baseline migration set.** Use dependency ordering and idempotent data backfills only where necessary.
9. **Replace unsafe policies.** Authenticated recruiter/admin access for operational data; narrow public views and controlled public intake inserts.
10. **Test a clean rebuild in a disposable Supabase project.** Generate types, run the app, exercise all workflows, and compare object signatures to production.
11. **Reconcile migration history deliberately.** Only after the baseline rebuild passes should migration repair/squashing be considered.
12. **Add schema-drift CI.** Rebuild from migrations and compare generated database types on every schema change.

## Suggested Baseline Migration Plan

This is a plan only; no migration was created or applied.

### Phase 1: Foundations

1. Extensions and common helper functions.
2. `profiles` plus auth linkage and role helper.
3. Canonical enums/check constraints or reference tables.

### Phase 2: Core entities

1. `companies`
2. `bd_contacts`
3. `bd_notes`
4. `job_sources`
5. `jobs`
6. `jobs_intake`
7. `candidates`
8. `source_profiles`
9. `skills`
10. normalized `candidate_skills`
11. normalized `job_requirements`

### Phase 3: Matching and execution

1. `candidate_scores` or replacement scoring model.
2. `ai_assessments`.
3. `submissions`.
4. `activity_log`.
5. `create_submission_with_activity`.
6. Explicit stage-history table.
7. Retained read/reporting views.

### Phase 4: Marketplace and consent

1. `web_candidate_intakes`.
2. `web_job_interest`.
3. Consent/representation constraints and promotion workflow.
4. Candidate resume bucket and policies.

### Phase 5: AI and operations

1. `autonomous_recruiter_runs`.
2. `autonomous_recruiter_memory`.
3. Edge Function deployment/auth configuration.
4. BD photo bucket and policies.

### Phase 6: Security

1. Revoke broad base-table access from `anon`.
2. Add authenticated role policies using `profiles`.
3. Add narrowly scoped public intake policies.
4. Add public-safe views for jobs/company/demo content.
5. Verify every view uses intended invoker/security behavior.
6. Verify storage path ownership, file limits, MIME types, and retention.

### Phase 7: Data and compatibility

1. Backfill canonical company/job links.
2. Normalize candidate skill text into `skills`.
3. Backfill job requirements into the selected model.
4. Validate every candidate intake channel populates required projections.
5. Validate every job intake creates both canonical and intake records atomically.
6. Compare generated types and row counts between production and rebuild.

## Final Assessment

The live Supabase project currently carries substantial product value that is not durably represented in GitHub. The immediate danger is not merely “missing migrations”; it is that replaying the migrations that do exist would create several important objects in shapes that are incompatible with the current app.

The safest path is to treat the live database as the temporary forensic source of truth, capture it completely, classify its duplicate/prototype objects, then replace the current migration history with a reviewed rebuild-safe baseline and a strict least-privilege policy model.
