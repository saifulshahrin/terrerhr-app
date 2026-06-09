# S2C Phase 2 Approval Decision Summary

## Decision

**Recommendation: CONDITIONAL GO for S2C Phase 2 Reconstruction Validation in the disposable project only.**

Phase 2 should be divided into small execution batches. Approval for one batch must not authorize later batches automatically.

Proposed disposable target:

- Project: `terrer-schema-s2c-bootstrap`
- Project ref: `epigstfenpqbslgeyrtn`
- Production: excluded

This summary does not authorize execution.

## 1. What Phase 2 Would Reconstruct

Phase 2 would validate dependency-ordered reconstruction of:

- `companies_id_seq`.
- The remaining canonical tables while preserving the existing Phase 1 `profiles` table and Auth users.
- Canonical constraints, defaults, indexes, and ownership.
- Canonical functions and table triggers.
- Candidate, pipeline, jobs, market, and source-health views.
- Grants, RLS state, and policies as an exact-live evidence layer.
- `candidate-resumes` and `bd-photo-intake` storage configuration and policies.
- Synthetic non-PII fixtures and behavioral assertions.
- Generated Supabase types, if separately approved.

## 2. What Phase 2 Would Exclude

- Production access or changes.
- Repository migrations or migration-ledger changes.
- Application, WordPress, Edge Function, or deployment changes.
- Real PII or production data.
- Legacy `terrer_*` objects.
- Bullhorn staging tables.
- Prototype and dormant objects.
- The legacy/unknown `resumes` bucket.
- Any conditional object without explicit approval.

## 3. Why the Recommendation Is CONDITIONAL GO

The Auth/Profile Bootstrap blocker is resolved, and authoritative physical evidence exists for the canonical reconstruction objects.

The recommendation remains conditional because:

- The successful Phase 1 identity state must be preserved.
- Disposable target metadata and cleanup ownership remain approval prerequisites.
- Exact-live RLS and storage behavior may reproduce known security risks.
- Duplicate company triggers require a deliberate test decision.
- `rls_auto_enable()` and `ensure_rls` can affect later DDL broadly.
- `evidence_signals` and the audit snapshot remain optional.
- Disposable reconstruction success would not prove production migration safety.

## 4. Conditions Required Before Execution

1. Written approval must name project `terrer-schema-s2c-bootstrap` and ref `epigstfenpqbslgeyrtn`.
2. Region, organization/workspace, teardown owner, and cleanup deadline must be recorded.
3. Production isolation and absence of production credentials/data must be reconfirmed.
4. The existing Phase 1 Auth users, profile rows, UUID links, roles, and active states must be preserved and revalidated.
5. The approved execution batch must list every object and allowed action.
6. Disposable-only DDL execution must be explicitly approved.
7. Repository migration creation must remain prohibited.
8. Conditional objects must default to deferred unless individually approved.
9. Evidence must exclude secrets, tokens, credentials, session data, and PII.
10. Any repair after a failure must require renewed approval.
11. Cleanup or controlled-hold responsibility must be assigned before execution.

## 5. Safe Objects/Categories To Reconstruct First

The safest initial reconstruction targets are structurally simple objects with limited dependencies:

- Verify platform prerequisites without recreating them.
- Revalidate and preserve Phase 1 Auth/Profile state.
- `companies_id_seq`.
- `companies`, excluding triggers, grants, RLS policies, and fixtures.
- `job_sources`, excluding grants, RLS policies, and fixtures.
- Catalog validation for columns, defaults, nullability, constraints, indexes, ownership, and sequence relationships.

## 6. Objects/Categories That Should Wait

- `candidates` and public intake tables because security behavior requires separate policy review.
- Dependent, relationship, execution, and activity tables.
- All functions and triggers.
- Both duplicate company updated-at triggers.
- `rls_auto_enable()` and `ensure_rls`.
- All views.
- Grants, RLS enablement, and policies.
- Storage buckets and storage policies.
- Synthetic business fixtures.
- Generated types and application smoke tests.
- Conditional `evidence_signals`.
- `company_identity_merge_v1_snapshot`.

## 7. Should Phase 2 Be Split Into Smaller Execution Batches?

**Yes.**

Recommended batching:

1. Platform, identity preservation, sequence, and minimal root tables.
2. Remaining root and first-level dependent tables.
3. Relationship and execution tables.
4. Canonical functions and table triggers.
5. Views.
6. Grants and RLS policies.
7. Storage.
8. Synthetic fixtures and behavioral validation.
9. Optional conditional objects.
10. Evidence reconciliation and cleanup/hold.

Each batch should end with a human review and explicit decision to proceed, pause, repair, or roll back.

## Recommended First Execution Batch

**Batch 1: Minimal Structural Foundation**

### Allowed Actions

1. Confirm the target project name and ref.
2. Record platform metadata and production-isolation evidence.
3. Revalidate the existing Phase 1 Auth/Profile state without replacing it.
4. Capture the pre-batch object inventory.
5. Reconstruct `companies_id_seq`.
6. Reconstruct `companies`.
7. Reconstruct `job_sources`.
8. Validate only:
   - columns and data types;
   - defaults and nullability;
   - primary, unique, check, and foreign-key constraints;
   - indexes;
   - sequence ownership/default linkage; and
   - object ownership.
9. Record pass/fail evidence.
10. Stop for human review.

### Explicitly Not Allowed In Batch 1

- Dropping or recreating `profiles`.
- Creating or changing Auth users or profile rows.
- Company triggers.
- Any function or trigger.
- Grants, RLS enablement, or policies.
- Views.
- Storage objects or policies.
- Business fixtures or test rows.
- Generated types.
- Repository migrations.
- Production access.

### Why This Batch Is Recommended

It proves the basic reconstruction mechanism and sequence/table dependency handling with a small blast radius. It avoids Auth changes, policy behavior, trigger side effects, storage, fixtures, and broad dependency chains.

### Batch 1 Success Gate

Proceed to Batch 2 only if:

- The target remains verified as disposable.
- Phase 1 Auth/Profile state remains unchanged and valid.
- All three reconstructed objects match authoritative structural evidence.
- No production resource or credential is detected.
- No unapproved object is created.
- Evidence contains no secrets or PII.
- A human explicitly approves the next batch.

## 9. Required Human Approval Statement

```text
Approved to proceed with S2C Phase 2 Batch 1: Minimal Structural Foundation only.

Disposable Supabase project:
- Project name: terrer-schema-s2c-bootstrap
- Project ref: epigstfenpqbslgeyrtn
- Region: <REGION>
- Organization/workspace: <ORG_OR_WORKSPACE>
- Teardown owner: <OWNER>
- Cleanup or review date: <DATE>

I confirm this project is disposable and is NOT production.
I confirm no production credentials, data, Auth users, storage objects, or PII will be used.

I approve only:
- target and platform verification;
- revalidation and preservation of the existing Phase 1 Auth/Profile state;
- pre-batch object inventory;
- reconstruction of companies_id_seq;
- reconstruction of companies;
- reconstruction of job_sources;
- structural catalog validation for those objects; and
- non-secret evidence collection.

I do not approve:
- dropping, recreating, or modifying profiles or Auth users;
- functions or triggers;
- grants, RLS, or policies;
- views;
- storage work;
- fixtures or test rows;
- generated types;
- repository migrations;
- application or deployment changes;
- production access; or
- any object outside Batch 1.

Execution must stop after Batch 1 evidence is recorded.
Any failure repair, rollback, cleanup, or later batch requires separate approval.
```

## Final Approval Position

**GO for Batch 1 only after the exact approval statement is completed.**

**NO-GO for all later Phase 2 batches until Batch 1 evidence is reviewed and separate approval is granted.**

## Documentation Boundary

- No SQL was executed.
- No table, function, trigger, view, policy, fixture, bucket, or migration was created.
- The disposable project was not modified.
- Production was not accessed or changed.
