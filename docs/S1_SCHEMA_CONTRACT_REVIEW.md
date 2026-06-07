# Phase S1 Schema Contract Review

Date: 7 June 2026  
Mode: read-only contract analysis

## Contract Model

Terrer currently has four overlapping schema contracts:

1. **Live database contract** — authoritative current columns, constraints, functions, triggers, grants, and policies.
2. **Application contract** — fields and operations expected by `src/`.
3. **Writer contract** — payloads produced by browser pages, scripts, database functions, and external systems.
4. **Migration contract** — objects and fields reproducible from repository migrations.

A production-safe baseline must reconcile all four. Today they are not aligned.

## Current Canonical Contracts

| Object | Current operational contract | Main consumers/writers |
|---|---|---|
| `profiles` | `id` equals `auth.users.id`; role is `admin`, `recruiter`, or `bd`; active state gates internal access | `AuthContext`, admin policies |
| `companies` | Numeric `id`; company identity plus source/career intelligence | BD pages, company intelligence, importer |
| `bd_contacts` | UUID contact linked to numeric company; relationship and follow-up fields | BD Relationships, Tasks, Photo Intake, importer |
| `bd_notes` | Note linked to company/contact and authenticated creator | BD Relationships |
| `jobs` | UUID `id` is relational key; nullable text `job_id` is unique external/business key; source and intelligence fields coexist | Job Intake, Jobs, matching, dashboards, external ingestion |
| `jobs_intake` | `job_id` is primary key intended to equal `jobs.id`; raw and parsed intake metadata | Job Intake, dashboard |
| `job_requirements` | UUID requirement, UUID job reference by convention, text skill, type `must_have` or `good_to_have`, years and weight | Top Matches |
| `candidates` | UUID `candidate_id`; identity, profile, recruiter state, consent, representation, resume, and preference fields | Candidate pages, admin import, matching |
| `source_profiles` | Source identity and provenance linked to candidate | Candidate intake/profile/search |
| `skills` | Integer-like `skill_id` primary key and skill name | Candidate-skill relation/search |
| `candidate_skills` | Candidate/skill relation with optional source/evidence IDs and proficiency score | Matching and candidate search |
| `candidate_scores` | Current candidate score/search projection keyed by candidate | Candidate intake and search views |
| `ai_assessments` | Persisted job/candidate Terrer AI Review with scores, reasoning, recommendation, and model provenance | Top Matches, dashboard |
| `submissions` | One candidate/job pipeline record with stage, next action, output, outcome, company, and owner fields | Pipeline, Top Matches, Candidates, BD queues |
| `activity_log` | Activity event optionally linked to submission; triggers synchronize submission stage and next action | Database function/triggers |
| `web_candidate_intakes` | Public intake payload plus consent and resume reference | Web intake library |
| `web_job_interest` | Candidate/job interest and representation review state | External creator, Interested Candidates |
| `autonomous_recruiter_runs` | Run result and iteration artifacts | Autonomous Recruiter page, external runner |
| `autonomous_recruiter_memory` | Learning memory linked to source run | Autonomous Recruiter page, external runner |

## Contract Violations

### Critical

| Violation | Evidence | Risk |
|---|---|---|
| `candidate_skills` writer does not match live normalized schema | App attempts an obsolete skill payload while live requires `skill_id`; errors can be non-fatal | Candidate saves can appear successful while normalized matching evidence is missing |
| `candidate_skills` lacks a primary or unique constraint | Only candidate and skill FKs exist | Duplicate candidate/skill rows and unstable upsert semantics |
| `skills` has no generated/default ID and no enforced unique skill name | Live primary key requires explicit ID | No safe browser taxonomy insertion contract |
| `job_requirements` migration differs from live contract | Live uses `job_requirement_id`, `skill_name`, `min_years`, and `good_to_have`; migration history describes another shape | Clean rebuild breaks matching and seed behavior |
| `jobs` migrations do not reproduce live table | Live lacks migration-era `status`/`created_at` assumptions and contains many unmigrated intelligence fields | Rebuild cannot support current app and ingestion |
| `candidates`, `profiles`, `jobs_intake`, core search views, functions, and storage are not creation-backed | App depends on undocumented live objects | Repository is not rebuild-safe |
| RLS-disabled candidate tables have broad role grants | `candidates`, `candidate_scores`, `source_profiles`, and `skills` are directly exposed | Candidate PII and operational data can be read or mutated outside intended workflows |
| Browser writes depend on `anon` in demo mode | Jobs, submissions, assessments, candidate relations, and BD data use browser Supabase client | Removing unsafe policies without auth/write-path sequencing breaks core workflows |

### High

| Violation | Evidence | Risk |
|---|---|---|
| `jobs_intake.job_id` has no FK to `jobs.id` | Separate browser inserts with no transaction | Orphan intake rows or jobs without intake records |
| `job_requirements.job_id` has no FK | Relationship exists only by convention | Requirements can reference nonexistent jobs |
| `jobs.company_id` has no FK to `companies.id` | Company relation is unenforced | Account/job intelligence can diverge |
| `submissions` has duplicate and broad anonymous policies | Twelve policies include duplicate demo CRUD access | Central pipeline is publicly mutable |
| `create_submission_with_activity` is executable by broad roles | Function is invoker security and grants include PUBLIC/anon | Public callers can create pipeline/activity state under permissive table policies |
| `activity_log` anonymous inserts can indirectly update submissions | Insert triggers synchronize stage and next action | Indirect unauthorized pipeline mutation |
| `profiles` has no repository-backed creation/bootstrap path | Policies assume profile row exists | Strict authentication can succeed while app authorization fails |
| `vw_candidate_search_clean` depends on multiple RLS-disabled tables | Security-invoker clean view sits over broad base access | View hardening alone cannot secure candidate data |
| Storage policies are bucket-wide, not path/owner scoped | Resume and BD image policies lack ownership boundaries | Cross-user file access or upload abuse |

### Medium

| Violation | Evidence | Risk |
|---|---|---|
| `jobs` carries operational and market-intelligence semantics together | Scraped and recruiter-owned roles share table | Status and lifecycle changes can affect ingestion/reporting unexpectedly |
| `submissions` overloads pipeline, client submission, outcome, and generated output | Missing stage-history and downstream entities | Auditing and future placement/revenue modeling are constrained |
| `candidate_scores` and `candidate_capabilities` producer ownership is unclear | Views depend on them; writer coverage is incomplete | Baseline may preserve stale derived behavior without a regeneration path |
| Two company updated-at triggers exist | Live trigger evidence | Redundant behavior and baseline ambiguity |
| External writers are unidentified | Job ingestion, autonomous recruiter, web interest creator, normalized skill producer | RLS/grant changes may break hidden systems |

## Contract Decisions Required Before Migration Drafting

1. Approve `jobs.id` as the relational key and define the purpose of `jobs.job_id`.
2. Approve normalized `candidate_skills(candidate_id, skill_id, source_profile_id, evidence_id, proficiency_score)`.
3. Select the duplicate rule for candidate skills, likely candidate plus skill plus provenance.
4. Approve `job_requirements.requirement_type` vocabulary and map `nice_to_have` to `good_to_have` or revise the contract explicitly.
5. Confirm whether `candidate_scores` is current-state projection or assessment history.
6. Confirm whether `activity_log` remains the temporary canonical activity mechanism.
7. Identify external writers before changing grants or policies.
8. Approve authenticated production operation or protected server/RPC writes before anonymous policy removal.
9. Define storage object path ownership and accepted file constraints.
10. Separate internal candidate search from any future public candidate projection.

## Recommended Contract Artifacts for Implementation

For each approved canonical object, create a reviewed contract sheet containing:

- Primary/business keys.
- Required and nullable fields.
- Foreign keys and delete behavior.
- Check/unique constraints.
- Indexes.
- Browser, service-role, function, and external writers.
- Approved read/write roles.
- Trigger side effects.
- Dependent views/functions.
- Backward-compatibility notes.
- Validation and rollback queries.

## S1 Contract Approval Order

1. Identity/auth dependency: `profiles`, `is_current_user_admin`.
2. Candidate read chain: candidates, sources, skills, scores, capabilities, search views.
3. Demand chain: job sources, jobs, intake, requirements.
4. Execution chain: submissions, activity, assessments, pipeline views/functions.
5. Relationship chain: companies, contacts, notes.
6. Marketplace and storage contracts.
7. AI operations and external writer contracts.

## Conclusion

The live database supports real workflows, but the effective contract is distributed across live state and application behavior rather than migrations. The first S1 implementation must reproduce and protect current contracts before improving the data model.

