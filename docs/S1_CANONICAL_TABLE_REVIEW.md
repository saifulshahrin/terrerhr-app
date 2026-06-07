# Phase S1 Canonical Table Review

Date: 7 June 2026  
Mode: read-only discovery  
Authority: Phase S1 Authority Charter

## Decision Standard

A table is proposed as **canonical** when it is the current source of truth for an active Terrer workflow, an active read model depends on it, or it contains operational data that must survive a rebuild.

Canonical approval in S1 means:

- Preserve the object and its identifiers.
- Capture its live contract in the future baseline.
- Do not redesign or merge it during stabilization.
- Resolve writer, constraint, and security drift before destructive cleanup.

It does not mean the current shape or policies are production-safe.

## Proposed Canonical Tables

### Identity and authorization

| Table | Decision | Rationale | S1 posture |
|---|---|---|---|
| `profiles` | Approve canonical | Current user role and active-state contract; linked to `auth.users`; required by authorization policies | Preserve exact identity relationship and role vocabulary |

### Relationship intelligence

| Table | Decision | Rationale | S1 posture |
|---|---|---|---|
| `companies` | Approve canonical | Active account identity for BD pages, importer, submissions, and source intelligence | Preserve numeric IDs and current company fields |
| `bd_contacts` | Approve canonical | Active relationship, follow-up, and contactability record across BD workflows | Preserve company links and operational action fields |
| `bd_notes` | Approve canonical | Active notes writer exists and policies depend on `profiles` | Preserve despite zero current rows |

### Demand and requirement capture

| Table | Decision | Rationale | S1 posture |
|---|---|---|---|
| `job_sources` | Approve canonical | Active source registry referenced by `jobs` and source-health reporting | Preserve source IDs and health metadata |
| `jobs` | Approve canonical | Main role/demand record used by intake, job operations, matching, dashboards, and intelligence | Preserve `id` as relational key and `job_id` as nullable external/business identifier |
| `jobs_intake` | Approve canonical companion | Active raw/parsed intake record written alongside `jobs` | Preserve current one-row-per-job intent; repair unenforced relationship later |
| `job_requirements` | Approve canonical | Active matching input read by Top Matches | Preserve live weighted requirement contract; correct migration drift |

### Candidate intelligence

| Table | Decision | Rationale | S1 posture |
|---|---|---|---|
| `candidates` | Approve canonical | Current candidate identity, profile, consent, representation, and recruiter state | Preserve `candidate_id` and all current intake fields |
| `source_profiles` | Approve canonical | Current candidate provenance and external-source identity | Preserve candidate links and source metadata |
| `skills` | Approve canonical taxonomy | Normalized skill IDs are referenced by 2,709 candidate-skill rows | Preserve IDs; governance and uniqueness require improvement |
| `candidate_skills` | Approve canonical relation | Active search/matching dependency with substantial persisted data | Preserve live normalized shape; repair writer mismatch and missing uniqueness |
| `candidate_scores` | Approve canonical current projection | Active candidate creation and search-view dependency | Preserve during S1; later decide whether it remains projection, history, or cache |
| `candidate_capabilities` | Approve canonical derived support, provisional | `vw_candidate_search` depends on 1,620 rows although no direct app writer is known | Freeze shape and identify producer before baseline implementation |
| `evidence_signals` | Preserve as provisional candidate evidence | 1,164 persisted rows indicate a real generated dataset, but no active consumer is confirmed | Do not expose as primary contract until producer and purpose are identified |

### Matching and recruitment execution

| Table | Decision | Rationale | S1 posture |
|---|---|---|---|
| `ai_assessments` | Approve canonical | Active Terrer AI Review persistence used by Top Matches and dashboards | Preserve assessment identity, job/candidate pairing, and provenance |
| `submissions` | Approve canonical | Current pipeline membership and execution state used throughout recruiter workflows | Preserve live fields, unique job/candidate behavior, triggers, and view dependencies |
| `activity_log` | Approve canonical support | Database function and triggers use it to mutate submission stage and next action | Preserve until a future activity/task model is designed |

### Marketplace and intake

| Table | Decision | Rationale | S1 posture |
|---|---|---|---|
| `web_candidate_intakes` | Approve canonical intake boundary | Repository contains a public intake writer and resume workflow | Preserve narrow intake purpose even though live row count is zero |
| `web_job_interest` | Approve canonical marketplace state | Contains 37 live interest/representation records and an active internal review page | Preserve current records and representation fields |

### AI operating layer

| Table | Decision | Rationale | S1 posture |
|---|---|---|---|
| `autonomous_recruiter_runs` | Approve canonical AI operations | Active read page and persisted run evidence | Preserve while identifying production writer |
| `autonomous_recruiter_memory` | Approve canonical AI operations | Persisted learning memory linked to runs | Preserve while identifying producer and governance |

## Preserve but Do Not Yet Approve as Core Canonical

| Table | Proposed class | Rationale | Decision gate |
|---|---|---|---|
| `applications` | Dormant future | Zero rows and no repository consumer | Decide inbound application model |
| `job_candidate_matches` | Prototype matching persistence | Three rows and prototype view only | Decide persisted versus derived matching |
| `match_interactions` | Prototype feedback event | Six rows, no active consumer | Define feedback-learning taxonomy |
| `outreach_log` | Prototype execution log | One row and prototype view only | Decide relationship to `activity_log` |
| `employer_job_intake` | Prototype employer intake | Two rows, no internal app consumer | Confirm web-product ownership |
| `employer_intake_actions` | Prototype companion | Zero rows; depends on employer intake concept | Confirm employer workflow |
| `target_companies` | Prototype BD planning | 51 rows but no current app consumer | Identify owner and intended relationship to `companies` |
| `company_identity_merge_v1_snapshot` | Audit snapshot | Specific merge snapshot with 22 rows | Preserve for rollback evidence |
| `staging_bullhorn_companies` | Staging | Import-specific table | Retain under staging lifecycle |
| `staging_bullhorn_contacts` | Staging | Import-specific table | Retain under staging lifecycle |

## Proposed Legacy Tables

The following are proposed as one frozen legacy domain:

- `terrer_companies`
- `terrer_company_contacts`
- `terrer_jobs`
- `terrer_candidates`
- `terrer_skills`
- `terrer_pipeline`

Rationale:

- They duplicate approved canonical business domains.
- No current `src/`, repository script, or Edge Function consumer was found.
- Their only active read-model dependency is `terrer_jobs_view`.
- Their combined live row count is 24.
- They use a separate ID and workflow vocabulary from the active app.
- Merging them now would mix stabilization with product-model redesign.

Detailed controls are in `docs/S1_LEGACY_TABLE_FREEZE_PLAN.md`.

## Canonical Read and Transaction Contracts

These are not tables but must be preserved with the canonical domain:

- `vw_candidate_search`
- `vw_candidate_search_clean`
- `create_submission_with_activity`
- `is_current_user_admin`
- submission/activity synchronization triggers
- updated-at triggers supporting canonical tables

## Approval Recommendations

1. Approve the core canonical tables listed above as the S1 preservation boundary.
2. Approve `candidate_capabilities` as provisional canonical support because an active view depends on it.
3. Preserve `evidence_signals` without promoting it to an app contract until its producer is identified.
4. Freeze the entire `terrer_*` family as legacy; do not merge, drop, rename, or add new consumers during S1.
5. Keep staging, snapshot, and prototype objects outside the first canonical baseline until their ownership decisions are complete.
6. Treat canonical approval and production-safe RLS approval as separate gates.

## Evidence

- `docs/SCHEMA_AUTHORITATIVE_CAPTURE.md`
- `docs/SCHEMA_OBJECT_CLASSIFICATION_REGISTER.md`
- `docs/WRITER_MATRIX.md`
- `docs/schema-evidence/row_counts.json`
- `docs/schema-evidence/relations.json`
- `docs/schema-evidence/rewrite_dependencies.json`

