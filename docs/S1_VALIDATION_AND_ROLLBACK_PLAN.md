# Phase S1.2 Validation and Rollback Plan

Date: 7 June 2026  
Mode: draft validation plan; no commands executed against Supabase

## Validation Principles

- Use synthetic, non-PII fixtures in the disposable project.
- Validate schema shape and behavior, not production row contents.
- Separate exact-live reproduction tests from proposed repair tests.
- Treat security behavior as a testable contract.
- Stop on unexplained schema diff, missing writer, or irreversible action.

## Disposable-Project Baseline Validation

### Build integrity

1. Initialize a fresh supported Supabase environment.
2. Apply only the reviewed disposable baseline.
3. Confirm every included object is created once.
4. Confirm no legacy-frozen or staging object appears unless explicitly selected.
5. Generate database types and compare canonical object signatures with authoritative evidence.

### Object inventory

Validate expected counts and names for:

- Tables and sequence.
- Views.
- Public functions.
- Table and event triggers.
- Constraints and indexes.
- Grants and RLS policies.
- Storage buckets and `storage.objects` policies.

Exact counts depend on core versus full-fidelity baseline scope and must be recorded in the baseline manifest version.

### Column contract

For every canonical table:

- Column name, type, order, default, identity/generated status.
- Required versus nullable.
- Primary and business keys.
- Foreign-key target and delete action.
- Check and unique constraints.
- Expected indexes.

Fail if a canonical column is missing, renamed, differently typed, or unexpectedly required.

### Dependency validation

- Create root tables before relation tables.
- Create functions before dependent policies/triggers.
- Create base views before dependent views.
- Verify `vw_candidate_search_clean` resolves through `vw_candidate_search`.
- Verify pipeline and source-health view chains compile.
- Verify storage policies reference existing buckets and roles.

### Synthetic workflow tests

Use synthetic records only:

1. Create auth user/profile fixture and verify role helper behavior.
2. Create company, contact, and note.
3. Create source, job, intake, and requirements.
4. Create candidate, source profile, score, skill, candidate skill, and capability.
5. Verify candidate search views return one stable candidate row.
6. Create AI assessment for job/candidate and verify unique-pair behavior.
7. Create submission/activity and verify stage, timestamp, and next-action triggers.
8. Exercise allowed submission stages and terminal next-action behavior.
9. Insert public intake fixture using intended public role.
10. Exercise authenticated recruiter reads/updates.
11. Upload synthetic files within approved bucket paths and verify denied cross-path operations.
12. Insert autonomous run/memory through intended service identity.

### Negative tests

- Reject invalid profile role.
- Reject invalid source tier/trust score.
- Reject invalid requirement type.
- Reject invalid submission stage or terminal next-action combination.
- Reject duplicate AI assessment pair.
- Reject duplicate submission job/candidate pair.
- Reject unauthorized candidate PII read/write.
- Reject unauthorized pipeline mutation.
- Reject cross-user storage access.
- Reject unapproved MIME type or oversized file after policy design.

### Application validation

- `npm run build`.
- Targeted lint/type checks for any future changed files.
- Candidate list and profile load.
- Job intake and job status update.
- Top Matches and Terrer AI Review.
- Submission creation and pipeline actions.
- BD company/contact/note flows.
- Interested Candidates review.
- Resume and BD photo upload/read flows.
- Autonomous Recruiter read flows.

## Validation Before Any Production Change

### Evidence refresh

- Fresh schema-only authoritative capture.
- Fresh migration ledger comparison.
- Fresh row counts for affected tables.
- Fresh policy/grant and storage-policy capture.
- Confirm no unexpected writes to legacy-frozen objects.
- Confirm current production branch and deployed app version.

### Data integrity preflight

Before adding constraints, measure:

- Null primary/business relationship fields.
- Orphan job intake and requirement rows.
- Orphan candidate source/score/skill/capability rows.
- Duplicate candidate-skill combinations under the proposed key.
- Duplicate skill names under proposed normalization.
- Duplicate submission and assessment pairs.
- Invalid stage/type vocabulary.
- Missing profile rows for active auth users.

### Writer preflight

- Name the owner and credential class for every affected writer.
- Confirm payload fields and operation type.
- Confirm whether the writer bypasses RLS.
- Confirm retry/idempotency behavior.
- Confirm compatibility with both old and proposed contracts.

### Operational preflight

- Backup completed and restore tested.
- Migration/runtime estimate reviewed.
- Lock behavior reviewed.
- Rollback scripts reviewed.
- Application rollback version available.
- Maintenance or observation window approved.
- Monitoring and validation owner assigned.

## Backup Requirements

Before any approved production implementation:

1. Logical schema-only dump.
2. Database backup or platform point-in-time recovery confirmation.
3. Exact migration ledger export.
4. Grants and RLS policy export.
5. Storage bucket configuration and object-policy export.
6. Row counts and integrity-query results.
7. Targeted export of affected non-PII/reference data where appropriate.
8. Encrypted, access-controlled backup for affected production data if required.
9. Current application commit and deploy artifact reference.
10. Restoration procedure tested outside production.

No credentials or raw PII should be committed to Git.

## Rollback Considerations

### Additive schema changes

- Prefer nullable/additive first.
- Roll back by stopping new writers and removing only unused additions.
- Do not drop compatibility columns until all writers have migrated.

### Constraint changes

- Validate data before enforcing.
- Prefer `NOT VALID`/validation sequencing where supported and approved.
- Roll back by dropping the new constraint, not deleting data.

### Writer-contract changes

- Support old and new payloads during a transition where practical.
- Deploy server/RPC support before removing browser permissions.
- Keep application rollback compatible with the database state.

### RLS and grants

- Capture exact prior grants and policies.
- Prepare restoration statements before change.
- Verify service-role and authenticated paths separately.
- Never restore unsafe anon access as a casual long-term rollback; use a time-bounded emergency procedure.

### Storage

- Preserve bucket objects and paths.
- Change application access and policies together.
- Prepare policy restoration and signed-URL fallback.
- Never delete objects as part of policy rollback.

### Migration ledger

- Do not repair ledger and schema in the same step.
- Back up ledger rows exactly.
- Prepare exact restoration of version/name entries.
- Stop if local, disposable, and production histories cannot be reconciled unambiguously.

### Legacy freeze

- Documentary freeze has no technical rollback.
- A future privilege freeze requires captured prior grants and a restoration plan.
- No legacy data deletion is part of S1.

## Stop/Go Criteria

### GO for baseline drafting

- Canonical boundary approved.
- Legacy freeze approved.
- Authoritative evidence available.
- Documentation-only scope maintained.

### GO for disposable-project creation/application

Requires explicit approval plus:

- Baseline and manifest reviewed.
- No credentials or PII in artifacts.
- Core/full-fidelity scope selected.
- Synthetic fixture plan approved.
- Environment is demonstrably isolated from production.

### GO for production migration design review

- Disposable rebuild passes.
- All canonical objects and dependencies validate.
- Writer ownership blockers resolved.
- Schema diff is explained.
- Validation and rollback SQL are drafted.

### GO for production execution

Requires separate explicit approval and:

- Backup and restore evidence complete.
- Application compatibility proven.
- Auth/RLS/storage sequencing approved.
- Rollback scripts reviewed.
- Named operator, observer, and abort authority assigned.
- Maintenance/monitoring window approved.

### STOP immediately if

- A command targets the linked production database without approval.
- Baseline includes credentials, PII, or row exports.
- An external writer remains unidentified for an affected object.
- A proposed constraint would fail current data.
- A schema diff contains an unexplained object or policy.
- A migration would drop/rename data-bearing objects.
- Authenticated workflows fail before anon access is removed.
- Storage access cannot be tested without exposing files.
- Migration ledger reconciliation is ambiguous.

## Required Evidence per Future Change

Each implementation proposal must attach:

- Objects changed.
- Exact current and proposed contract.
- Writers/readers affected.
- Data integrity preflight.
- Forward validation.
- Negative/security tests.
- Backup evidence.
- Rollback procedure.
- Stop/go decision and approver.

