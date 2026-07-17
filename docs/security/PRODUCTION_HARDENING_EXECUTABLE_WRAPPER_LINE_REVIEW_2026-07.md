# Production Hardening Executable Wrapper Line Review

Date: 2026-07-17

Scope reviewed:

- [docs/security/PRODUCTION_HARDENING_EXECUTABLE_WRAPPER_DRAFT_2026-07.sql](./PRODUCTION_HARDENING_EXECUTABLE_WRAPPER_DRAFT_2026-07.sql)
- production read-only inspection evidence
- SQL component review
- wrapper readiness review
- staging-proven migrations
- current app/web code references

## Verdict

**CONDITIONAL READY**

The executable-form draft is structurally sound and now has an explicit forward transaction boundary. The remaining issues are review concerns, not blockers, because production evidence already established the target contracts and the remaining cautions are about operator discipline and rollback scope.

## Line-Level Findings

### 1. Structural safety

- Lines 23 and 896 now wrap the forward production changes in `BEGIN;` / `COMMIT;`, which is the correct shape for a future runnable migration.
- Lines 897 to 1050 keep validation separate in its own read-only transaction, which is the right execution model.
- The only destructive DDL in the file is rollback-only at lines 1055 to 1062, where `DROP TABLE IF EXISTS public.candidate_web_jobs;` is used as part of containment.
- No forward `DROP TABLE`, `DROP COLUMN`, destructive `ALTER TABLE ... DROP`, or data-deletion statements were found in the forward section.

### 2. `candidate_web_jobs`

- Lines 26 to 71 are safe and idempotent for the evidence-backed production case:
- `CREATE TABLE IF NOT EXISTS` avoids recreating an existing table.
- `CREATE INDEX IF NOT EXISTS` is idempotent.
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` matches the reviewed hardening path.
- The published-row select policy and admin-management policy match the staging-proven contract.
- The object is known to be missing in production, so forward creation is appropriate.

Review concern:

- Lines 1055 to 1062 drop the table during rollback. That is acceptable for the current production evidence because the table is missing, but it would be too destructive if the object had unexpectedly existed before the wrapper. The operator should confirm the current production absence before any runnable migration is produced.

### 3. `candidates`, `web_job_interest`, and `jobs`

- Lines 76 to 158 harden `candidates` exactly in line with the reviewed production/staging contract.
- Lines 163 to 270 replace the broad `web_job_interest` exposure with verified-email ownership policies plus staff access.
- Lines 275 to 339 tighten `jobs` to staff-only RLS-backed access, while removing the broad anon/authenticated policies by name.
- The policy drop targets are the known unsafe policies from the production inspection and staging follow-up.
- The new policies preserve the browser and staff flows that were validated in staging.

No blocker found here.

### 4. Employer intake tables

- Lines 344 to 353 are intentionally service-role-only.
- No new row policies are added, which matches the source migration decision and the staging-proven workflow.
- This is safe as long as the application continues to use the approved server-side path.

Review concern:

- If a future app flow needs authenticated direct access to these tables, that would require a new reviewed contract. This draft does not invent one.

### 5. `activity_log` and Bullhorn staging tables

- Lines 358 to 460 are consistent with the production gap review and staging hardening.
- The anon policies are dropped by name before the new staff/admin policies are created.
- The staging Bullhorn tables are restricted to `public.is_current_user_admin()` management, which matches the approved staff/admin boundary.

No blocker found here.

### 6. Advisor/internal tables

- Lines 465 to 725 enable RLS on the full Advisor/internal table set and apply the staff-only policies and service-role ACLs previously proven in staging.
- The policy shapes match the reviewed staff contract using `public.profiles` role checks.
- The ACLs are not broader than the source migrations; they are narrower or equal.

No blocker found here.

### 7. `profiles` ACL and `is_current_user_admin()`

- Lines 730 to 733 tighten the `profiles` ACL to the reviewed posture: remove public/anon exposure, preserve authenticated `SELECT`/`UPDATE`, and keep service-role full access.
- Lines 738 to 741 remove `EXECUTE` from `public` and `anon` while preserving the authenticated, service-role, and postgres execute paths required by the helper contract.
- This is aligned with the approved review direction and does not break the helper dependencies documented in the runbook.

No blocker found here.

### 8. View hardening

- Lines 746 to 793 are the approved finalized `security_invoker = true` set.
- `vw_candidate_search_clean` is included and is the correct dependent view to harden because current app code references it directly.
- Lines 795 to 892 revoke broad view access and grant `SELECT` only to authenticated and service-role roles, which matches the staged hardening pattern.

Review concern:

- `CREATE OR REPLACE VIEW public.vw_candidate_search_clean` at lines 746 to 762 is safe in context because the compatibility migration already defines the same contract and app code depends on the view. It should still be line-checked against the live `vw_candidate_search` dependency chain before any runnable migration is produced.

### 9. Validation safety

- Lines 901 to 1050 are read-only validation checks and remain transaction-safe.
- The checks cover:
- RLS enabled state for all target tables
- anon exposure on sensitive tables
- authenticated profile privilege shape
- helper execute privileges
- `security_invoker = true` on the approved view list
- authenticated select grants on the key views

No blocker found here.

### 10. Rollback safety

- Lines 1055 to 1271 are item-specific rollback SQL, not a generic catch-all.
- Forward-only changes are reversed by dropping the policies, restoring the pre-wrapper ACL posture, and flipping the approved views back to `security_invoker = false`.
- The rollback for `public.profiles` restores the broader ACL matrix, which is what the pre-wrapper evidence requires.
- The rollback for `public.is_current_user_admin()` restores the broader execute posture that existed before the hardening step.

Review concern:

- The `candidate_web_jobs` rollback is safe only under the current production evidence that the table is missing before the wrapper. If that evidence changes, the rollback should be re-evaluated before becoming runnable SQL.

## Blockers

- None remaining after the forward transaction envelope was added.

## Non-Blocker Concerns

- `candidate_web_jobs` rollback drops the table if the wrapper created it. That is acceptable for the current evidence, but it depends on the preflight confirmation that production still lacks the table.
- `vw_candidate_search_clean` should still be checked against the live dependency tree before any runnable migration is authored.
- The draft remains a review artifact and should not be treated as a deployable migration yet.

## Required Edits Made

- Added `BEGIN;` before the forward wrapper section at line 23.
- Added `COMMIT;` after the forward wrapper section at line 896.
- No other SQL shape changes were required for this review pass.

## Rollback Concerns

- Rollback is item-specific and does not introduce new public exposure.
- Rollback does not make production less safe than the reviewed pre-wrapper state, as long as the current evidence about `candidate_web_jobs` remains true.
- Rollback for views only restores the intended reloptions and grants for the approved view list.

## Final Verdict

**CONDITIONAL READY**

The draft is ready for the next human approval step toward a runnable migration, but it is not itself a real migration and must not be executed against production yet.
