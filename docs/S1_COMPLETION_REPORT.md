# Phase S1 Completion Report

Date: 7 June 2026  
Phase: S1 — Schema Stabilization Discovery and Specification  
Status: recommended complete

## Executive Summary

Phase S1 established an authoritative, implementation-ready understanding of Terrer’s current Supabase schema without changing the application or database.

The phase:

- Captured the live schema and security posture.
- Established the canonical data boundary.
- Classified and froze the parallel `terrer_*` model as legacy.
- Documented schema contracts, dependencies, readers, and writers.
- Identified migration-ledger drift and rebuild-safety gaps.
- Defined the exact object scope and order for a clean rebuild.
- Produced validation, backup, rollback, and stop/go criteria.
- Kept all production execution deferred.

Terrer is not yet rebuild-safe or production-safe, but it now has the evidence and specifications required to begin controlled implementation in an isolated environment.

## 1. Work Completed

### Authoritative discovery

- Captured live public tables, views, functions, triggers, indexes, constraints, grants, policies, sequences, storage configuration, and exact row counts.
- Compared live objects with repository migrations and application expectations.
- Mapped active application readers and writers.
- Recorded local/remote migration-ledger divergence.
- Preserved read-only evidence under `docs/schema-evidence/`.

### Canonical and legacy classification

- Approved the active operational schema as the preservation boundary.
- Classified provisional, prototype, staging, snapshot, and preserve-only objects.
- Identified six parallel `terrer_*` tables and `terrer_jobs_view` as legacy-frozen.
- Confirmed no current repository application consumer uses the legacy tables.

### Contract and ownership mapping

- Documented object purpose, keys, columns, nullability, constraints, indexes, dependencies, readers, writers, drift, and proposed S1 repairs.
- Documented browser, authenticated, service-role, database-function, and unknown writer ownership.
- Identified production writers that must be confirmed before security or constraint changes.

### Baseline and validation specification

- Defined core and full-fidelity disposable baseline variants.
- Defined object creation dependency order.
- Separated canonical, provisional, legacy, staging, and platform-managed objects.
- Defined validation checkpoints for structure, relationships, functions, triggers, views, roles, storage, and application compatibility.
- Defined backup requirements, rollback principles, stop/go gates, and rebuild success criteria.

## 2. Approved Decisions

| Decision | Status |
|---|---|
| Canonical table boundary | Approved |
| Freeze of `terrer_*` tables | Approved |
| Disposable-project baseline preparation | Approved |
| Production migration execution | Deferred |

### Canonical boundary

The approved core includes:

- `profiles`
- `companies`, `bd_contacts`, `bd_notes`
- `job_sources`, `jobs`, `jobs_intake`, `job_requirements`
- `candidates`, `source_profiles`, `skills`, `candidate_skills`, `candidate_scores`, `candidate_capabilities`
- `ai_assessments`, `submissions`, `activity_log`
- `web_candidate_intakes`, `web_job_interest`
- `autonomous_recruiter_runs`, `autonomous_recruiter_memory`
- Required candidate-search views, public functions, triggers, and canonical storage buckets

### Legacy freeze

The following are frozen from further product development:

- `terrer_companies`
- `terrer_company_contacts`
- `terrer_jobs`
- `terrer_candidates`
- `terrer_skills`
- `terrer_pipeline`
- `terrer_jobs_view`

Freeze means no new consumers, writers, imports, schema enhancements, merges, or deletion during stabilization.

## 3. Unresolved Items

### Contract decisions

- Candidate-skill uniqueness and required fields.
- Skill taxonomy ownership, ID generation, and name normalization.
- Minimum required fields for candidates, companies, jobs, submissions, and activities.
- Exact purpose of `jobs.job_id` versus `jobs.id`.
- FK strategy for `jobs_intake`, `job_requirements`, and `jobs.company_id`.
- Whether candidate scores are current-state projections or history.
- Long-term role of `activity_log`.
- Which duplicate company updated-at trigger should remain.
- Whether automatic RLS enablement is a platform invariant.

### Writer ownership

Production ownership remains unknown for:

- Job ingestion and source-health updates.
- Skill taxonomy and normalized candidate skills.
- Candidate scores, capabilities, and evidence signals.
- Public job-interest creation.
- Autonomous recruiter runs and memory.
- Direct activity events.
- The legacy/unknown `resumes` storage bucket.

### Migration strategy

- The local and remote migration ledgers remain divergent.
- The final baseline adoption method is not selected.
- Historical migrations have not been archived, repaired, or replaced.
- No disposable rebuild has yet been executed.

## 4. Remaining Risks

### Critical current-state risks

- Candidate PII and related tables are insufficiently protected.
- Anonymous users can mutate central operational records.
- `candidate_skills` writes can fail silently because the application payload does not match the live schema.
- Current migrations cannot reconstruct the working database.
- Auth, RLS, and storage changes could break active workflows if deployed independently.

### High implementation risks

- Unknown external writers may break under constraints or policy changes.
- Job intake can persist partial records because job and intake writes are separate.
- Submission and activity triggers embed pipeline behavior and stage vocabulary.
- Storage policies are bucket-wide rather than owner/path scoped.
- Incorrect migration-ledger reconciliation could replay or skip changes.

### Risk posture

| Area | Rating |
|---|---|
| S1 documentation and discovery | Low |
| Baseline drafting | Medium |
| Disposable-project validation | Low to production |
| Contract and security implementation | High |
| Production rollout | Critical |

## 5. Recommended Phase S2 Objectives

Phase S2 should be an isolated rebuild and proof phase, not a production migration phase.

### S2.1 Baseline artifact preparation

- Draft the structural baseline from the approved specification.
- Separate structural DDL, functions/triggers, views, security policies, storage configuration, and synthetic fixtures.
- Keep all artifacts unapplied until environment approval.

### S2.2 Disposable-project validation

- Create or select an isolated Supabase environment after explicit approval.
- Rebuild from zero using synthetic, non-PII data.
- Compare generated schema signatures and types with the approved contracts.
- Validate active application workflows.

### S2.3 Contract repair design

Prioritize:

1. `candidate_skills` and `skills`.
2. `job_requirements`.
3. `jobs` and `jobs_intake`.
4. `profiles` bootstrap.
5. `submissions`, `activity_log`, and transaction functions.
6. Candidate search-view security dependencies.

### S2.4 Security target design

- Define authenticated internal operations.
- Define narrow public-intake operations.
- Define service-role ingestion ownership.
- Draft least-privilege RLS and storage path policies.
- Test exact-live and stabilized security models separately.

### S2.5 Migration and rollout planning

- Select a baseline adoption strategy only after the disposable rebuild passes.
- Prepare production backup, rollback, observation, and ledger-reconciliation runbooks.
- Continue to defer production execution.

## 6. Completion Recommendation

**Phase S1 should be considered complete.**

The phase objective was discovery, classification, contract mapping, and rebuild specification—not implementation. Those outputs are complete and committed on the `schema-s1-stabilization` branch.

S1 completion does not mean:

- The schema is stabilized in production.
- Security risks are fixed.
- Migration drift is repaired.
- The application is rebuild-safe yet.

It means Terrer now has an approved, evidence-backed foundation for Phase S2 implementation and isolated validation.

## Key Deliverables

- `docs/S1_DECISION_PACKAGE.md`
- `docs/S1_CANONICAL_CONTRACTS.md`
- `docs/S1_BASELINE_OBJECT_MANIFEST.md`
- `docs/S1_WRITER_OWNERSHIP_MAP.md`
- `docs/S1_VALIDATION_AND_ROLLBACK_PLAN.md`
- `docs/S1_BASELINE_SPECIFICATION.md`

