# Phase S2B Reconstruction Gap Report

Date: 7 June 2026  
Status: evidence gap analysis  
Mode: documentation only

## Executive Summary

No approved canonical table or view is fully blocked from physical definition drafting. The evidence is strongest for table structure, views, functions, triggers, grants, and policies.

The remaining gaps are concentrated in:

- Auth/profile bootstrap.
- External writer ownership.
- Candidate-derived data production.
- Storage platform behavior.
- Conditional event-trigger and duplicate-trigger decisions.
- Runtime proof in an empty disposable project.

## 1. Missing Evidence

### Platform evidence

- Disposable Supabase, Postgres, Auth, and Storage versions.
- Whether event triggers are supported and behave identically.
- Empty-project default grants and platform objects.
- Storage bucket creation/reconciliation behavior.
- Auth fixture and user-ID generation behavior.

### Runtime evidence

- Successful zero-to-working reconstruction.
- Reconstructed generated types.
- Schema-signature diff.
- Trigger execution results.
- Function execution results.
- View output results.
- Role-policy positive and negative tests.
- Storage upload/read/update/delete tests.

### Operational evidence

- External job ingestion identity and payload.
- Source-health writer.
- Skill taxonomy writer.
- Candidate skill/score/capability/evidence producer.
- Web job-interest creator.
- Autonomous recruiter writer.
- Direct activity-log producer.
- Consumer of the `resumes` bucket.

### Usage evidence

- Runtime consumers of reporting views.
- External consumers of excluded prototype or legacy objects.
- Recent write evidence for conditional/provisional objects.

## 2. Ambiguous Contracts

| Object/domain | Ambiguity | Reconstruction impact |
|---|---|---|
| `profiles` | No bootstrap mechanism | Physical table ready; auth behavior blocked |
| `companies` | Duplicate updated-at triggers | Exact live reproducible; target trigger set unresolved |
| `jobs` | `id` versus `job_id`; unenforced company link | Exact live ready; target integrity unresolved |
| `jobs_intake` | Intended one-to-one job relation not enforced | Exact live ready; workflow integrity unresolved |
| `job_requirements` | Unenforced job link; historical vocabulary conflict | Exact live ready; target constraint unresolved |
| `skills` | Explicit IDs, nullable/non-unique names | Structural draft possible; controlled creation not defined |
| `candidate_skills` | No key, all nullable, writer mismatch | Exact live draft possible; reliable workflow not proven |
| `candidate_scores` | One-current-row versus history | Exact live draft possible; cardinality unresolved |
| `candidate_capabilities` | Producer and uniqueness unknown | Exact live draft possible; regeneration not proven |
| `activity_log` | Canonical activity model versus temporary support | Trigger behavior ready; ownership unresolved |
| `web_job_interest` | Public creation and internal review state overlap | Exact live ready; target writer/security unresolved |
| AI run/memory | Production writer and lifecycle unknown | Exact live ready; operational validation partial |
| Storage | Path ownership, size, MIME, signed access | Current policies captured; behavior/target design partial |

## 3. Unknown Writers

| Object | Known writer state | Gap severity | Evidence action |
|---|---|---|---|
| `job_sources` | Seed known; production writer unknown | High | Identify ingestion process and credential role |
| `jobs` | Browser and script known; external ingestion unknown | Critical | Capture production ingestion payload and role |
| `job_requirements` | Seed only | High | Identify parser/requirement writer |
| `skills` | None found | Critical | Identify taxonomy owner |
| `candidate_skills` | App writer incompatible; producer unknown | Critical | Trace normalized row producer |
| `candidate_scores` | Manual intake plus unknown scoring | High | Identify scoring lifecycle |
| `candidate_capabilities` | None found | High | Identify generation process |
| `evidence_signals` | None found | Medium | Identify producer or confirm preserve-only status |
| `web_job_interest` | Internal updater; creator external | Critical | Locate web-shell/API creator |
| `activity_log` | DB function known; external writer unknown | High | Search logs and external services |
| Autonomous tables | Reader known; production writer unknown | High | Identify runner identity and payload |

## 4. Unresolved Dependencies

### Auth dependency chain

`auth.users` → `profiles` → `is_current_user_admin()` → profile/note policies.

Missing:

- Approved disposable bootstrap.
- Expected behavior when profile is absent/inactive.

### Candidate search chain

Candidates → source profiles/scores/skills/capabilities → `vw_candidate_search` → `vw_candidate_search_clean`.

Missing:

- Producers for scores/capabilities/normalized skills.
- Synthetic fixture rules that guarantee deterministic aggregation.

### Recruitment execution chain

Jobs/candidates/companies → submissions → activity log → trigger updates → reporting views.

Missing:

- Direct activity writer ownership.
- Proof of trigger behavior in a clean environment.

### Storage chain

Bucket → `storage.objects` policy → app path convention → authenticated/signed access.

Missing:

- Target platform behavior.
- Path conventions and ownership enforcement.

## 5. Objects Not Yet Reconstructable with High Confidence

### BLOCKED

| Object/dependency | Reason |
|---|---|
| Synthetic profile bootstrap | No approved mechanism or exact definition exists |

### PARTIAL

| Object | Reason |
|---|---|
| `profiles` operational behavior | Table is exact; lifecycle/bootstrap is not |
| `skills` | Physical definition exact; creation/governance unknown |
| `candidate_skills` | Physical definition exact; writer and uniqueness broken/unknown |
| `candidate_scores` | Physical definition exact; cardinality/producer unknown |
| `candidate_capabilities` | Physical definition exact; producer unknown |
| `web_candidate_intakes` | External caller and promotion flow unknown |
| `web_job_interest` | Creator and intended role split unknown |
| Autonomous recruiter tables | Production writer unknown |
| `evidence_signals` | Producer and active purpose unknown |
| `rls_auto_enable()` / `ensure_rls` | Exact definition known; baseline inclusion unapproved |
| Company updated-at triggers | Exact duplicate known; target selection unresolved |
| `candidate-resumes` | Exact current configuration known; platform/path behavior untested |
| `bd-photo-intake` | Exact current configuration known; ownership/retention behavior untested |
| Supabase Auth/Storage portability | Target platform version not selected/tested |

### READY

All other canonical tables, selected views, canonical functions, and canonical triggers have sufficient evidence for exact-live definition drafting.

## 6. Recommended Evidence Collection Actions

### Before finalizing S2B drafts

1. Select exact-live scope decisions:
   - Include audit snapshot.
   - Exclude `resumes`.
   - Represent both company triggers in exact-live evidence.
   - Keep `rls_auto_enable()` conditional.
2. Cross-check each table against generated types.
3. Cross-check every view output against generated types.
4. Verify every function signature and grant.
5. Verify trigger and event-trigger definitions.
6. Produce a source-reference index from each draft object to evidence files.

### Before disposable-project execution approval

1. Define synthetic profile bootstrap for testing.
2. Select and record target Supabase versions.
3. Define deterministic synthetic fixtures.
4. Define expected trigger and view results.
5. Define storage object paths and synthetic files.
6. Create an environment-isolation and teardown checklist.
7. Obtain explicit authority to execute only against the disposable target.

### Before stabilized target design

1. Identify unknown writers using runtime logs, deployment configuration, and external repositories.
2. Decide candidate-skill uniqueness.
3. Decide skills taxonomy ownership.
4. Decide candidate score cardinality.
5. Decide job identity and FK repairs.
6. Approve auth role matrix.
7. Approve storage ownership/path design.
8. Decide whether automatic RLS enablement remains.

## 7. Readiness by Canonical Domain

| Domain | Status | Rationale |
|---|---|---|
| Identity/Auth | BLOCKED operationally | Profile bootstrap missing; physical definitions otherwise available |
| Relationship Intelligence | READY exact-live | Tables/FKs/indexes captured; duplicate trigger is target-design gap |
| Demand Intelligence | READY exact-live | Complete physical/view evidence; external writer gap affects target security |
| Requirement Capture | READY exact-live | Live structure known; target FKs and writer remain unresolved |
| Candidate Intelligence | PARTIAL | Base table ready; skills/scores/capabilities production contracts incomplete |
| Matching Intelligence | PARTIAL | Assessments ready; candidate-derived inputs lack known producers |
| Recruitment Execution | READY exact-live | Submission/activity/functions/triggers/views captured |
| Marketplace | PARTIAL | Physical state ready; external public writers unknown |
| AI Operating Layer | PARTIAL | Physical definitions ready; production writer/lifecycle unknown |
| Storage | PARTIAL | Buckets/policies captured; platform/path behavior untested |

## 8. Gap Closure Priority

1. Profile bootstrap specification.
2. Candidate skill/score/capability writer ownership.
3. External job and web-interest writers.
4. Disposable platform version and environment isolation.
5. Company trigger and RLS auto-enable decisions.
6. Synthetic fixtures and expected behavioral assertions.
7. Storage path and access behavior.
8. Reporting-view consumer confirmation.

## Conclusion

The evidence gap is not primarily missing table DDL. The physical schema is well captured.

The gap is operational proof: auth bootstrap, writer ownership, platform portability, and successful execution in an isolated empty project.

