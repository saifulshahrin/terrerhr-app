# Phase S1 Schema Stabilization Execution Plan

Date: 7 June 2026  
Status: proposed sequence after discovery approval  
Current mode: planning only

## Objective

Make Terrer rebuild-safe and production-safe while preserving current recruiter workflows and avoiding destructive redesign.

## Phase Gates

No production SQL, migration application, schema change, RLS change, auth change, storage policy change, or deployment may occur without explicit approval.

## Recommended Sequence

### S1.1 Approve object boundaries

Actions:

1. Review and approve `docs/S1_CANONICAL_TABLE_REVIEW.md`.
2. Mark `terrer_*` as legacy-frozen.
3. Classify staging, snapshots, prototypes, and dormant future objects.
4. Name owners for external and unknown writers.

Risk: Low.  
Rollback: Documentation revert only.  
Exit gate: Every live object has an approved class.

### S1.2 Approve schema contracts

Actions:

1. Produce per-object contract sheets from live DDL.
2. Resolve key semantics for jobs, candidate skills, requirements, submissions, and profiles.
3. Define approved nullability, constraints, indexes, and trigger behavior.
4. Define browser, authenticated, service-role, RPC, and external writer roles.

Risk: Medium because incorrect approval can encode existing defects.  
Rollback: Revise contracts before migrations exist.  
Exit gate: Canonical contracts are signed off by domain and technical owners.

### S1.3 Design the rebuild baseline

Actions:

1. Draft a consolidated baseline in dependency order.
2. Include extensions, tables, sequences, constraints, indexes, functions, triggers, views, grants, policies, and storage definitions.
3. Separate exact-live reproduction from stabilization deltas.
4. Keep legacy objects in a clearly marked compatibility section or separate legacy baseline.
5. Exclude unapproved prototypes from the canonical product baseline.

Risk: Medium.  
Rollback: Discard drafts; no live effect.  
Exit gate: Static review confirms complete object coverage and no credentials/data.

### S1.4 Prove rebuild safety in a disposable project

Actions:

1. Create an isolated non-production Supabase project or local stack.
2. Apply the baseline from zero.
3. Generate types and compare schema signatures.
4. Load synthetic, non-PII fixtures.
5. Run build, targeted workflow tests, and schema validation queries.

Risk: Low to production; medium execution effort.  
Rollback: Destroy disposable environment.  
Exit gate: Rebuild succeeds with expected tables, views, functions, triggers, policies, and storage.

### S1.5 Draft contract repairs

Recommended order:

1. `candidate_skills` normalized writer and uniqueness contract.
2. `skills` taxonomy insertion/governance contract.
3. `job_requirements` field and vocabulary alignment.
4. `jobs` key/status/intelligence contract.
5. `jobs_intake` FK and transactional write design.
6. `profiles` bootstrap contract.
7. `submissions` duplicate-policy and activity-function contract.
8. Candidate search view dependency/security contract.

Risk: High if mixed with live security changes; medium while drafts remain unapplied.  
Rollback: Per-migration down/compensation drafts and compatibility views where required.  
Exit gate: Each repair has impact analysis, writer validation, data checks, and rollback SQL.

### S1.6 Design security stabilization

Actions:

1. Decide production auth mode.
2. Replace or protect browser writes that currently rely on `anon`.
3. Define least-privilege RLS matrices.
4. Secure candidate PII and internal BD/submission data.
5. Scope storage policies by bucket, path, ownership, MIME type, and size.
6. Restrict broad function execution.

Risk: Critical because current demo workflows depend on anonymous access.  
Rollback: Restore prior policy/grant set from authoritative evidence.  
Exit gate: Authenticated and public-intake workflows pass in disposable environment.

### S1.7 Reconcile migration history

Actions:

1. Select baseline adoption strategy.
2. Archive or clearly label historical migrations.
3. Normalize future version naming.
4. Separate seed and repair operations.
5. Prepare production ledger reconciliation runbook.

Risk: High. Incorrect ledger changes can cause future migrations to replay or skip.  
Rollback: Ledger backup and exact restoration commands.  
Exit gate: Local, disposable remote, and expected baseline versions agree.

### S1.8 Production rollout

This phase requires explicit approval and is outside the current task.

Use small, reversible releases:

1. Backup and preflight.
2. Additive schema compatibility.
3. Application writer updates.
4. Constraint validation.
5. Auth/RLS/storage policy changes.
6. Post-deploy workflow and security verification.
7. Legacy write freeze only after consumer confirmation.

Risk: Critical.  
Rollback: Release-specific app rollback plus schema/policy restoration scripts.

## Risk Register

| Risk | Level | Control |
|---|---|---|
| Anonymous access removed before protected writes exist | Critical | Sequence auth/write paths before policy revocation |
| Baseline reproduces migration assumptions instead of live contract | Critical | Generate from authoritative capture and contract review |
| External ingestion breaks | Critical | Identify job/source/AI writers before grants or constraints change |
| Candidate matching degrades silently | High | Repair and validate candidate-skill writer with fixture comparisons |
| Job intake creates partial records | High | Design atomic transaction/RPC before tightening policies |
| Pipeline mutations break | High | Test submission/activity triggers, functions, and all UI actions |
| Migration ledger is marked incorrectly | High | Reconcile only after disposable rebuild and ledger backup |
| Legacy data is lost | Medium | Freeze and archive; no deletion during S1 |
| Storage files become inaccessible | High | Release URL/access changes with storage policies |

## Rollback Requirements

Every future implementation migration must include:

- Exact pre-change schema and policy evidence.
- Row counts and integrity checks.
- Forward validation SQL.
- Compensating or restoration SQL.
- Application compatibility assessment.
- Named abort conditions.
- Expected lock and runtime behavior.
- Backup verification.

For security changes, rollback must restore policies and grants without restoring unsafe application assumptions permanently.

## What Must Not Be Touched Yet

- Production data.
- `terrer_*` rows or definitions.
- Production migration ledger.
- Auth mode or profile bootstrap.
- RLS and grants.
- Storage buckets or object policies.
- Candidate/job identity keys.
- Submission stage vocabulary.
- External ingestion configuration.
- Environment variables.

## Immediate Next Codex Task

After the discovery package is approved:

> Create Phase S1.2 canonical schema contract sheets and a baseline object manifest from the authoritative evidence. Draft only; do not create migrations or execute SQL. Include keys, fields, constraints, indexes, dependencies, writers, approved roles, validation queries, and rollback requirements for every approved canonical object.

## Discovery Package

- `docs/S1_CANONICAL_TABLE_REVIEW.md`
- `docs/S1_LEGACY_TABLE_FREEZE_PLAN.md`
- `docs/S1_SCHEMA_CONTRACT_REVIEW.md`
- `docs/S1_MIGRATION_LEDGER_REVIEW.md`
- `docs/S1_EXECUTION_PLAN.md`

