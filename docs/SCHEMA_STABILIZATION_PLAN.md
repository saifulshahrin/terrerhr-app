# Terrer Schema Stabilization Plan

Plan date: 7 June 2026  
Primary source: `docs/AUDIT_D_AUTHORITATIVE_SCHEMA_AUDIT.md`  
Scope: planning only; no code, migration, or Supabase changes

## Objective

Make Terrer rebuild-safe and production-safe before new feature development.

The stabilization sprint should not redesign the product. It should first:

1. Capture the live database accurately.
2. Establish which objects are canonical.
3. Align repository schema definitions with current working contracts.
4. close critical data-exposure and anonymous-mutation risks.
5. Prove that a clean environment can be rebuilt without relying on undocumented live state.

## Operating Rules

- Treat the live Supabase project as the temporary forensic source of truth, not the permanent migration source.
- Do not replay the current migration history into production.
- Do not repair migration history until a clean rebuild has passed.
- Do not rename, drop, merge, or backfill production objects during the discovery phase.
- Preserve current working workflows while documenting their actual database contracts.
- Separate schema reproduction from product-model improvement.
- Prefer additive, reversible stabilization before destructive cleanup.
- Require a backup, rollback script, and validation query set for every production change.

## 1. Priority-Ranked Schema Issues

### P0 — Immediate blockers

| Rank | Issue | Why it is urgent | Stabilization outcome |
|---:|---|---|---|
| 1 | No exact authoritative live schema capture | Migrations, migration ledger, and live objects disagree; every later decision otherwise rests on incomplete evidence | Version-controlled, reviewed schema inventory including DDL, functions, triggers, grants, policies, views, and storage metadata |
| 2 | Sensitive operational data is anonymously visible | Candidate PII, BD contact PII, submissions, assessments, source profiles, job intake, and other internal records can return real rows to `anon` | Least-privilege access matrix and staged RLS remediation plan |
| 3 | Anonymous mutation policies may be active | Repository-applied history permits anonymous writes to jobs, submissions, assessments, candidate skills, and requirements, including submission deletion | Exact live policy confirmation followed by removal of unsafe anonymous mutation |
| 4 | `candidate_skills` app/write/live-schema contract is broken | Manual intake writes obsolete fields while matching reads normalized fields; failure is non-fatal and can silently reduce match quality | One normalized contract using `skill_id` and `proficiency_score`, with all writers identified |
| 5 | `job_requirements` migration conflicts with live schema | A rebuild would create columns incompatible with current matching reads | Authoritative requirement contract and migration-ready DDL specification |
| 6 | Core canonical objects lack creation migrations | Candidate, intake, auth, marketplace, view, function, and storage workflows cannot be rebuilt | Complete baseline object specification in dependency order |

### P1 — Rebuild and workflow integrity

| Rank | Issue | Why it matters | Stabilization outcome |
|---:|---|---|---|
| 7 | `jobs` migration is materially behind live | Rebuild loses demand-intelligence fields and may recreate obsolete `status` semantics | Canonical job key/status/field contract |
| 8 | `jobs_intake` has no migration and is written separately from `jobs` | Partial saves can create orphaned workflow records; dashboard depends on intake rows | Authoritative schema plus a future transactional persistence design |
| 9 | `submissions` migration is materially behind live | Rebuild breaks pipeline fields and reporting views; current row is overloaded | Exact current-state contract preserved, with later normalization explicitly deferred |
| 10 | `candidates` has no base migration | Candidate identity, consent, representation, and matching fields are not reproducible | Canonical candidate DDL specification and intake-channel field ownership map |
| 11 | `profiles` has no migration | Authentication roles and policy dependencies cannot be rebuilt safely | Auth-linked profile schema, bootstrap behavior, and role policy specification |
| 12 | `vw_candidate_search_clean` has no view definition | Candidate lists and matching depend on a non-reproducible read model | Exact view SQL, dependency list, and security behavior |
| 13 | Storage buckets are not migration-managed | File workflows depend on undocumented bucket and object policies | Rebuild-safe bucket definitions and path-access design |

### P2 — Classification and future cleanup

| Rank | Issue | Why it matters | Stabilization outcome |
|---:|---|---|---|
| 14 | Parallel `terrer_*` domain exists | It may duplicate canonical tables or contain abandoned prototype data | Evidence-based keep/archive/deprecate decision |
| 15 | Live-only workflow objects overlap future models | `applications`, matches, outreach, employer intake, and activity objects could be useful or conflicting | Classified object registry with owners and intended lifecycle |
| 16 | Legacy pipeline views may encode obsolete stages | They can preserve inconsistent workflow vocabulary and hidden dependencies | Consumer audit and retain/rebuild/deprecate decisions |
| 17 | Legacy Edge Functions remain deployed | One unauthenticated function may expose prototype behavior | Function ownership, caller, and retirement decision |
| 18 | `candidate_intent_events` exists in code/migrations but not live | Applying it blindly may introduce an ungoverned event model and public policies | Explicit keep/defer/remove decision after product use is confirmed |

## 2. Objects to Preserve as Canonical

“Canonical” means the object represents current working business data and must be preserved during stabilization. It does not mean its present shape is final.

### Auth and authorization

| Object | Canonical role | Preserve now | Improvement deferred until |
|---|---|---|---|
| `profiles` | App user identity, role, and activation state linked to Supabase Auth | Exact live rows, keys, defaults, and auth relationship | Exact trigger/policy capture is complete |
| `is_current_user_admin` | Policy/authorization helper | Function body, owner, grants, and security mode | All dependent policies are known |

### Relationship intelligence

| Object | Canonical role | Preserve now | Improvement deferred until |
|---|---|---|---|
| `companies` | Employer/account identity and source intelligence | Live IDs and all current app-used fields | Duplicate company analysis and job-link backfill are designed |
| `bd_contacts` | Employer contact and relationship state | Contact IDs, company links, PII, current follow-up fields | Activity/task model exists |
| `bd_notes` | Human account/contact notes | All notes and creator links | Visibility and activity integration are designed |

### Demand and requirement capture

| Object | Canonical role | Preserve now | Improvement deferred until |
|---|---|---|---|
| `job_sources` | Demand-source registry and health intelligence | Source IDs and operational metrics | Public-safe versus internal fields are separated |
| `jobs` | Canonical role/demand record | Both operational and market-intelligence fields | Job identity and status semantics are formally selected |
| `jobs_intake` | Raw/parsed intake companion record | Raw input, parsed values, creator/status, job link | Transactional creation and parser provenance are designed |
| `job_requirements` | Structured job matching requirements | Live weighted requirement shape | Skill taxonomy linkage and intake population are designed |

### Candidate intelligence

| Object | Canonical role | Preserve now | Improvement deferred until |
|---|---|---|---|
| `candidates` | Canonical candidate identity, profile, consent, and representation state | Existing IDs and all app-used fields | Identity merge and field ownership rules are agreed |
| `source_profiles` | Candidate source provenance | Source/candidate links and external identities | Snapshot/version model is designed |
| `skills` | Normalized skill taxonomy | Existing `skill_id` values and names | Alias/category governance is designed |
| `candidate_skills` | Candidate-to-skill evidence/score relation | Live normalized rows and foreign keys | Evidence confidence and uniqueness rules are agreed |
| `candidate_scores` | Current candidate search/ranking projection | Existing rows while view dependencies are preserved | Decision is made to retain, version, materialize, or replace it |
| `vw_candidate_search_clean` | Current candidate search/read contract | Exact SQL and output columns | Security-safe internal/public variants are designed |

### Matching and recruitment execution

| Object | Canonical role | Preserve now | Improvement deferred until |
|---|---|---|---|
| `ai_assessments` | Persisted Terrer AI Review result | Current rows, unique logic, model/provenance fields | Versioned assessment model is designed |
| `submissions` | Current candidate-job pipeline membership and state | All live fields and unique constraints | Stage history, client submission, interview, offer, and placement entities exist |
| `activity_log` | Current operational activity record used by views/function | Exact live shape and relationships | Dedicated task/activity operating model is selected |
| `create_submission_with_activity` | Atomic execution helper | Exact function definition and grants | Current app write paths are reviewed |

### Marketplace and file intake

| Object | Canonical role | Preserve now | Improvement deferred until |
|---|---|---|---|
| `web_candidate_intakes` | Pre-canonical candidate intake and consent record | Intake records, source context, resume paths | Promotion/dedup workflow is designed |
| `web_job_interest` | Candidate interest and representation-request state | Existing candidate/job links and review fields | Ownership and event history are designed |
| `candidate-resumes` | Canonical resume file bucket | Object paths and metadata | Signed URL/path convention is standardized |
| `bd-photo-intake` | Sensitive BD screenshot intake bucket | Existing object paths and metadata | Retention/redaction lifecycle is defined |

### AI operations

| Object | Canonical role | Preserve now | Improvement deferred until |
|---|---|---|---|
| `autonomous_recruiter_runs` | Recruiter-agent run record | Existing runs and artifacts | Public demo projection is separated |
| `autonomous_recruiter_memory` | Recruiter-agent learning memory | Existing memory and run links | Memory governance/versioning is designed |
| `job-intake-parser` | Current structured intake parser | Deployed contract and JWT requirement | Rate, role, size, and schema-version controls are designed |
| `bd-photo-vision-extract` | Current BD image extraction function | Deployed contract and JWT requirement | Privacy, retention, and authorization controls are designed |

## 3. Objects to Classify as Legacy, Prototype, Staging, or Reporting

No object in this section should be dropped during the stabilization sprint. Classification requires dependency checks, row counts, recent activity, and owner confirmation.

### Likely staging

| Object | Proposed class | Reason | Required evidence |
|---|---|---|---|
| `staging_bullhorn_companies` | Staging | Import-specific naming and workflow | Import scripts, last-write timestamp, promotion process |
| `staging_bullhorn_contacts` | Staging | Import-specific naming and workflow | Import scripts, last-write timestamp, promotion process |
| `company_identity_merge_v1_snapshot` | Audit/staging snapshot | Appears tied to a specific merge batch | Merge scripts, retention requirement, rollback dependency |

### Likely prototype or parallel-generation domain

| Object | Proposed class | Reason | Required evidence |
|---|---|---|---|
| `terrer_companies` | Prototype/legacy | Duplicates `companies` domain | Row comparison, foreign keys, callers |
| `terrer_candidates` | Prototype/legacy | Duplicates `candidates` domain | Row comparison, foreign keys, callers |
| `terrer_jobs` | Prototype/legacy | Duplicates `jobs` domain | Row comparison, foreign keys, callers |
| `terrer_skills` | Prototype/legacy | Duplicates `skills` domain | Taxonomy overlap and consumers |
| `terrer_pipeline` | Prototype/legacy | Overlaps `submissions` workflow | Stage mapping and consumers |
| `terrer_company_contacts` | Prototype/legacy | Overlaps `bd_contacts` | Contact overlap and consumers |
| `target_companies` | Prototype or BD planning | Not used by current app | Data owner, intended workflow, freshness |
| `candidate_capabilities` | Prototype/derived | Overlaps candidate skills/capabilities | View dependencies and generation process |
| `evidence_signals` | Prototype/AI evidence | Supports richer evidence model not used by current app | Source job, downstream consumers, data quality |

### Potential future canonical objects requiring product decision

| Object | Proposed class | Decision needed |
|---|---|---|
| `applications` | Dormant future workflow | Whether inbound applications remain separate from `web_candidate_intakes` and `submissions` |
| `job_candidate_matches` | Dormant future matching entity | Whether this becomes canonical persisted matching or remains derived |
| `match_interactions` | Prototype feedback event | Whether events support feedback learning and their retention rules |
| `outreach_log` | Dormant execution entity | Whether it becomes canonical activity history or is replaced |
| `employer_job_intake` | Separate employer-facing intake | Whether it is part of the active marketplace architecture |
| `employer_intake_actions` | Companion prototype | Whether employer intake review will be retained |
| `candidate_intent_events` | Planned but absent live | Whether there is a concrete consumer and governed event taxonomy |

### Reporting and legacy views

Classify each view as one of:

- **Retain:** active read contract with a named consumer.
- **Rebuild:** useful business output but unsafe, undocumented, or based on obsolete stages.
- **Deprecate:** no current consumer and no required reporting use.

Priority classification targets:

- `vw_submissions_enriched`
- `recruiter_active_submissions`
- `vw_company_pipeline_summary`
- `vw_candidate_pipeline_summary`
- `vw_activity_log_enriched`
- `vw_pipeline_summary`
- `vw_outcomes_summary`
- `vw_live_work_queue`
- `vw_followup_queue`
- `vw_job_shortlist`
- `vw_recruiter_dashboard`
- `vw_candidate_search`
- market/source-health views

### Deployed function classification

| Function | Proposed class | Immediate decision |
|---|---|---|
| `parse-job-intake` | Legacy | Confirm no caller before retirement planning |
| `quick-processor` / `layer2-assess` | Prototype and security risk | Identify owner/caller immediately because `verify_jwt` is false |

## 4. Critical Schema Drift to Fix First

The ordering below minimizes broken workflows and avoids premature redesign.

### 4.1 Capture exact live contracts

Before creating any migration:

- Export exact table DDL, constraints, indexes, sequences, triggers, functions, views, grants, and policies.
- Export storage bucket definitions and `storage.objects` policies.
- Record deployed Edge Function settings.
- Generate current database types and preserve them as audit evidence.
- Record row counts and relationship cardinalities for critical objects.

Exit gate: every P0/P1 object has an authoritative live definition and dependency list.

### 4.2 Normalize the `candidate_skills` contract

Target contract to preserve:

- `candidate_id`
- `skill_id`
- `proficiency_score`
- `source_profile_id`
- `evidence_id`
- Foreign key to `candidates(candidate_id)`
- Foreign key to `skills(skill_id)`

Planning decisions required:

- Whether a candidate may have multiple rows for the same skill from different evidence sources.
- Whether `proficiency_score` is nullable and its valid range.
- Whether evidence/source fields belong directly on the relation.
- Which intake process creates missing taxonomy entries.

Do not restore the old `skill`/`proficiency` columns merely to make one writer work. The normalized live/read contract should remain canonical.

### 4.3 Establish the `skills` taxonomy contract

Minimum baseline:

- Stable `skill_id`.
- Canonical `skill_name`.
- Case-insensitive uniqueness or a separate normalized key.

Defer aliases, categories, embeddings, and ontology hierarchy until the baseline is proven.

### 4.4 Rebuild the `job_requirements` specification

Target contract to preserve:

- `job_requirement_id`
- `job_id`
- `skill_name`
- `requirement_type`
- `min_years`
- `weight`
- `notes`
- `created_at`

Decide before implementation:

- Whether `job_id` references `jobs.id` or `jobs.job_id`.
- Whether requirements should reference `skills.skill_id` now or remain text during stabilization.
- Allowed `requirement_type` values.
- Valid weight range.

Do not combine skill taxonomy normalization with job-requirement redesign unless data mapping has been proven.

### 4.5 Define canonical job identity and state

Resolve:

- `jobs.id` versus `jobs.job_id`.
- `company_id` versus name-only company linkage.
- Market-intelligence state versus recruiter operational state.
- The obsolete/missing `status` field versus `operational_status`.

Safe stabilization preference:

- Preserve existing primary key and app-facing identifiers.
- Add explicit compatibility mapping if required.
- Do not mass-rekey production jobs during the baseline sprint.

### 4.6 Baseline `jobs_intake`

Capture and preserve the live shape first. The future target should include:

- Foreign key to the selected canonical job identifier.
- Raw input.
- Parsed output.
- Parser name/version/confidence.
- Authenticated creator.
- Intake status.
- Timestamps.

Transactional `jobs` plus `jobs_intake` creation is a follow-up implementation after the baseline exists.

### 4.7 Baseline `submissions` without splitting it yet

Preserve all current live fields and unique constraints. Standardize:

- Current stage vocabulary.
- Nullability.
- Job/candidate/company references.
- Owner representation.
- Timestamp semantics.

Do not create interviews, offers, placements, fees, or full stage history in the first baseline. Those are product-model changes, not rebuild-safety fixes.

### 4.8 Baseline `candidates`, `profiles`, and the search view

For `candidates`:

- Preserve every current app-used field.
- Identify which fields are PII.
- Preserve consent and representation fields.
- Record intake-channel ownership of each field.

For `profiles`:

- Preserve the Auth user ID relationship.
- Define valid roles and active-state behavior.
- Capture any user-creation trigger.

For `vw_candidate_search_clean`:

- Capture exact SQL.
- Record all base dependencies.
- Decide whether it is internal-only.
- Ensure a clean rebuild produces identical columns before improving its logic.

### 4.9 Baseline storage contracts

For each canonical bucket define:

- Private/public flag.
- Allowed MIME types.
- Maximum file size.
- Path convention.
- Upload role.
- Read role.
- Delete role.
- Signed URL duration.
- Retention expectation.

Do not make either bucket public to accommodate existing `getPublicUrl()` calls.

## 5. RLS and Security Risks to Fix First

### Security priority order

| Priority | Object group | Confirmed or suspected risk | Intended access |
|---:|---|---|---|
| 1 | `bd_contacts`, `candidates`, `source_profiles`, `candidate_scores`, `vw_candidate_search_clean` | Real PII/provenance anonymously visible | Authenticated recruiter/admin only; separate deliberately public candidate content if ever needed |
| 2 | `submissions`, `ai_assessments`, `jobs_intake` | Internal workflow and reasoning anonymously visible; anonymous mutation policies may exist | Authenticated recruiter/admin; service role for automation |
| 3 | `web_job_interest` | Candidate interest and representation records anonymously visible | Candidate owner or authenticated staff; controlled public insert only if required |
| 4 | `candidate_skills`, `job_requirements` | Matching data anonymously visible and potentially mutable | Authenticated staff/service role; public access normally unnecessary |
| 5 | `jobs`, `companies`, `job_sources` | Base tables expose internal fields and may allow anonymous mutation | Public-safe read views; authenticated base-table writes |
| 6 | `autonomous_recruiter_runs` | Internal artifacts visible through demo policy | Authenticated staff; separate curated demo view |
| 7 | Storage buckets | Policies are undocumented; app URL contract conflicts with private buckets | Private objects, scoped upload/read/delete, signed URLs |
| 8 | `quick-processor` | Deployed with JWT verification disabled | Disable, protect, or document intentional public contract |

### Required policy design

Create an access matrix before writing SQL:

| Role | Base-table read | Base-table write | Public intake | Storage | Admin operations |
|---|---|---|---|---|---|
| `anon` | Only explicit public-safe views | None | Narrow insert-only endpoints/tables where required | Narrow upload only if required; no listing | None |
| `authenticated` candidate | Own candidate/intake/interest records only, if candidate auth is active | Own permitted fields only | Own intake/interest | Own paths through policies/signed URLs | None |
| `authenticated` recruiter | Operational tables needed for assigned work | Controlled insert/update | Review and promotion | Recruiter-authorized paths | No policy administration |
| `authenticated` admin | Full application data as needed | Full governed application writes | Full review | Governed access | User/role administration |
| `service_role` | Automation-only backend access | Automation-only writes | Processing/promotion | Processing access | Never exposed to clients |

### Security implementation constraints

- Do not revoke anonymous reads until current unauthenticated app flows are mapped.
- Replace direct public base-table reads with narrowly projected views.
- Remove anonymous delete first where it is confirmed, especially `submissions`.
- Prefer authenticated role checks backed by `profiles`.
- Verify view security mode and grants explicitly.
- Never expose service-role keys in browser code.
- Treat storage object policies as part of the same release as bucket URL changes.
- Verify Edge Function JWT configuration and add application-role checks for sensitive functions.

## 6. Recommended Migration Baseline Strategy

### Recommended approach: new baseline plus archived legacy history

Do not attempt to make the current migration chain authoritative by adding dozens of corrective migrations on top of uncertain history.

Preferred strategy:

1. Capture the exact live schema and policies.
2. Classify canonical and non-canonical objects.
3. Build a clean baseline migration set in a separate working branch and disposable project.
4. Preserve old migrations in an archive/reference location rather than deleting historical evidence.
5. Prove the baseline recreates the selected canonical schema.
6. Add compatibility/data migrations required for a new environment.
7. Separately design a production remediation migration set.
8. Reconcile or repair the remote migration ledger only after both paths are validated.

### Why two migration paths are required

**Rebuild path**

- Creates a new Terrer environment from zero.
- Contains full canonical DDL, functions, views, buckets, policies, and seed/reference data.
- Must not depend on existing undocumented objects.

**Production remediation path**

- Changes the existing linked project safely.
- Uses additive/alter operations and policy replacement.
- Must preserve IDs and data.
- Requires explicit prechecks and rollback.

The rebuild baseline must not be applied directly to the existing production database.

### Proposed baseline file boundaries

Exact filenames should be chosen during the migration-authoring task.

1. Extensions and helper functions.
2. Auth profiles and authorization helpers.
3. Relationship entities.
4. Jobs, sources, and intake.
5. Candidates, sources, skills, and scores.
6. Matching and assessments.
7. Submissions and activity.
8. Marketplace intake and interest.
9. AI operating tables.
10. Canonical views and database functions.
11. Storage buckets and object policies.
12. Grants and RLS policies.
13. Reference/seed data.

Avoid a single giant migration that cannot be reviewed or rolled back conceptually.

## 7. Safe Execution Phases

### Phase 0 — Change freeze and ownership

Actions:

- Pause non-essential schema changes.
- Name one schema owner and one production approval owner.
- Record all systems that write to Supabase: app, web, scripts, imports, Edge Functions, external automation.

Exit criteria:

- No unknown active writer remains.
- Emergency production changes have a documented exception path.

### Phase 1 — Forensic capture

Actions:

- Produce schema-only and policy/grant dumps.
- Export storage metadata and policies.
- Export Edge Function deployment metadata.
- Capture migration ledger.
- Capture row counts and critical integrity checks.

Exit criteria:

- Evidence is versioned and independently reviewable.
- No P0 object remains definition-unknown.

### Phase 2 — Canonical classification

Actions:

- Approve the canonical object list.
- Classify every live-only object.
- Identify consumers for every retained view/function.
- Resolve key decisions for jobs, candidates, skills, and requirements.

Exit criteria:

- Every live object has a disposition: canonical, staging, reporting, prototype, deprecated, or unknown-with-owner.

### Phase 3 — Contract specification

Actions:

- Write migration-ready specifications without applying SQL.
- Define columns, constraints, indexes, FKs, defaults, and dependency order.
- Define role/access matrix.
- Define storage path and access contracts.

Exit criteria:

- `candidate_skills`, `skills`, `job_requirements`, `jobs`, `jobs_intake`, `submissions`, `candidates`, `profiles`, and `vw_candidate_search_clean` have approved contracts.

### Phase 4 — Disposable rebuild

Actions:

- Author baseline migrations.
- Apply only to a disposable Supabase project.
- Generate types.
- Compare object signatures against the canonical specification.
- Run representative workflow tests.

Exit criteria:

- Clean rebuild succeeds repeatedly.
- Critical app reads/writes work without production-only objects.

### Phase 5 — Security rehearsal

Actions:

- Apply proposed RLS/grants to the disposable project.
- Test anonymous, candidate, recruiter, admin, and service-role access.
- Test view and storage policy behavior.
- Verify public flows still work through narrow contracts.

Exit criteria:

- No sensitive real-equivalent data is visible to `anon`.
- No anonymous mutation exists except explicitly approved public intake operations.

### Phase 6 — Production remediation preparation

Actions:

- Generate additive production migrations and policy replacements.
- Create preflight SQL.
- Create rollback SQL where technically possible.
- Define deployment order and maintenance window.
- Take and verify backups.

Exit criteria:

- Every production step has owner, precheck, postcheck, and rollback.

### Phase 7 — Production stabilization

Actions:

- Apply the smallest security-critical changes first.
- Apply schema compatibility changes separately.
- Monitor logs and workflow health.
- Stop immediately if validation thresholds fail.

Exit criteria:

- Production matches the approved canonical contract.
- Critical workflows pass.
- Anonymous exposure is reduced to the approved public surface.

### Phase 8 — History reconciliation and CI

Actions:

- Archive or squash legacy migration history using a documented approach.
- Repair remote migration records only after validation.
- Add clean-rebuild and type-drift checks to CI.
- Require schema review for future migration changes.

Exit criteria:

- Git migrations can rebuild a disposable project.
- Generated types and expected object inventory are checked automatically.

## 8. What Should Not Be Touched Yet

During the stabilization sprint, do not:

- Drop or rename any live table, view, function, bucket, column, or enum.
- Merge or delete the parallel `terrer_*` tables.
- Delete the `resumes` bucket or move its files.
- Apply the current local-only migrations to production.
- Mark remote migrations as reverted or repaired.
- Replace `submissions` with a new pipeline model.
- Add interviews, offers, placements, fees, revenue, or stage-history structures.
- Re-key jobs, candidates, companies, or submissions.
- Convert every requirement to `skills.skill_id` before mapping quality is proven.
- Remove `candidate_scores` before understanding `vw_candidate_search_clean`.
- Rewrite the candidate search view before capturing its exact SQL and output contract.
- Make private storage buckets public.
- Remove anonymous access without mapping current public web flows.
- Disable live Edge Functions before caller analysis, except through a separately approved incident response.
- Redesign status vocabularies in the same release as baseline reproduction.
- Backfill large production datasets during the initial security-policy release.
- Modify application code as part of the planning or forensic-capture tasks.

## 9. Rollback and Backup Precautions

### Required backups before any production change

- Verified logical database backup including data.
- Schema-only dump including functions, triggers, grants, and policies.
- Storage bucket object inventory and metadata.
- Edge Function deployment/configuration record.
- Migration ledger export.
- Generated database types.
- Critical table row counts and checksums or stable aggregate signatures.

### Restore verification

A backup is not considered valid until:

- It can be restored into a disposable project or PostgreSQL environment.
- Critical objects and row counts are verified.
- Auth/profile relationships are checked.
- Storage object metadata and paths are recoverable.
- Required secrets are documented outside the repository.

### Change-level rollback requirements

| Change type | Minimum rollback |
|---|---|
| RLS/policy replacement | Previous policy DDL, grants, and role test results |
| Column/constraint change | Reverse DDL plus data compatibility plan |
| Backfill | Before/after counts, deterministic selection criteria, backup table or reversible mapping |
| View/function replacement | Previous full definition and grants |
| Storage policy change | Previous bucket/object policies and tested admin recovery path |
| Edge Function config | Previous deployed version and JWT/config metadata |

### Deployment safeguards

- Use one concern per production release where possible.
- Run preflight queries immediately before applying a change.
- Record exact start time and migration version.
- Validate row counts and workflow smoke tests immediately afterward.
- Monitor Auth, PostgREST, Storage, and Edge Function errors.
- Set explicit abort thresholds.
- Do not continue to the next phase after a failed validation.

## 10. Exact Next Codex Task

### Task name

**Schema Stabilization Sprint 1 — Authoritative Live Schema Capture**

### Exact task prompt

> Using `docs/AUDIT_D_AUTHORITATIVE_SCHEMA_AUDIT.md` and `docs/SCHEMA_STABILIZATION_PLAN.md`, perform a read-only authoritative capture of the linked Terrer Supabase project.
>
> Do not modify application code.  
> Do not modify Supabase.  
> Do not apply or create migrations.
>
> Capture and document:
>
> 1. Exact DDL for all public tables, views, database functions, triggers, indexes, constraints, sequences, grants, and RLS policies.
> 2. Exact storage bucket configuration and `storage.objects` policies for `candidate-resumes`, `bd-photo-intake`, and `resumes`.
> 3. Exact definitions and security settings for `profiles`, `is_current_user_admin`, `create_submission_with_activity`, and `vw_candidate_search_clean`.
> 4. Exact live definitions for `candidate_skills`, `skills`, `job_requirements`, `jobs`, `jobs_intake`, `submissions`, and `candidates`.
> 5. Migration ledger differences between local and remote.
> 6. A consumer/dependency map for every live-only or duplicate object.
> 7. Row counts only; do not export production row contents containing PII.
>
> If Docker-based `supabase db dump` is unavailable, use an approved read-only `pg_dump` path or Supabase metadata APIs. Do not infer policy definitions when exact capture is possible.
>
> Output:
>
> - `docs/SCHEMA_AUTHORITATIVE_CAPTURE.md`
> - `docs/SCHEMA_OBJECT_CLASSIFICATION_REGISTER.md`
> - read-only schema artifacts under `docs/schema-evidence/`, excluding credentials and production data
>
> Include confidence and unresolved evidence gaps. Stop before migration design.

### Why this is next

The next safe action is evidence capture, not migration creation. Exact DDL and policies are still missing because Audit D could generate live types but could not run the Docker-dependent schema dump. Authoring migrations before closing that gap would risk encoding another incomplete schema.

## Completion Definition

The stabilization planning step is complete when this document is accepted.

The stabilization sprint itself is complete only when:

- A clean disposable Supabase project can be rebuilt from Git.
- Current critical workflows operate against that rebuild.
- The canonical schema is documented and migration-backed.
- Anonymous access is limited to an explicitly approved public surface.
- Storage and function security are reproducible.
- Production remediation has been applied and validated.
- Migration drift checks run automatically.
