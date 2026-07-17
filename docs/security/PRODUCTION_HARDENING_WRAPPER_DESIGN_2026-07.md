# Production Hardening Wrapper Design

Date: 2026-07-17

Status: planning only

This document defines a production-safe wrapper design for the next hardening phase.
It does not contain runnable production SQL and must not be treated as a migration.

## Production Evidence Summary

Production project ref: `tlufttnmwtjbuhjcrqmp`

Read-only inspection findings:

- Production differs materially from the staging-hardened target.
- The July hardening chain is missing from production migration history.
- `candidate_web_jobs` is missing in production.
- `candidates` has RLS disabled.
- `web_job_interest`, `jobs`, `employer_job_intake`, `employer_intake_actions`, and `activity_log` still have broad policy exposure.
- The Advisor-hardened internal tables still have RLS disabled.
- `profiles` is admin-gated by policy, but its table ACL matrix is broad.
- `public.is_current_user_admin()` is `SECURITY DEFINER` and broadly executable.
- Advisor views exist, but they remain non-invoker views.
- `vw_candidate_search_clean` was not confirmed in the supplied view export.

## Approved Planning Decisions

- Strategy: `B. current-timestamp production wrapper strategy`
- `candidate_web_jobs`: include in the wrapper draft
- `vw_candidate_search_clean`: `INCLUDE IN WRAPPER` because local code and docs reference it directly
- `profiles` ACL: tighten carefully, preserve authenticated access only where RLS/admin policies require it, and keep admin-gated access through `is_current_user_admin()`
- `is_current_user_admin()`: revoke `EXECUTE` from `public` and `anon` where safe; keep `authenticated`, `service_role`, and `postgres` as needed
- July validation/assertion logic: translate into post-change validation checks only
- Rollback: reverse-policy SQL for policy/grant/view rollback; production backup restore for structural failure

## Gap Classification

Legend:

- `FIX IN WRAPPER` = include in the production wrapper plan.
- `ACCEPT TEMPORARILY` = document and carry forward for now.
- `DEFER` = do not include in the next wrapper.
- `NEEDS MORE EVIDENCE` = confirm before deciding.

| Item | Classification | Rationale |
| --- | --- | --- |
| missing `candidate_web_jobs` | FIX IN WRAPPER | Production is missing the public publication contract. |
| `candidates` RLS disabled | FIX IN WRAPPER | Candidate data must be controlled before production hardening can proceed. |
| `web_job_interest` public read | FIX IN WRAPPER | Broad public read conflicts with the intended self-only interest contract. |
| `web_job_interest` anon update | FIX IN WRAPPER | This is part of the broad browser-write exposure that needs narrowing. |
| `jobs` broad read/write policies | FIX IN WRAPPER | Current browser-facing policy surface is too permissive. |
| `employer_job_intake` anon select/insert | FIX IN WRAPPER | Intake should be narrowed to the intended server-side path. |
| `employer_intake_actions` anon select/insert | FIX IN WRAPPER | This is a trusted-server workflow and should not stay public. |
| `activity_log` anon select/insert | FIX IN WRAPPER | Internal workflow log should not remain anonymously accessible. |
| RLS disabled `source_profiles` | FIX IN WRAPPER | Internal advisor surface. |
| RLS disabled `evidence_signals` | FIX IN WRAPPER | Internal advisor surface. |
| RLS disabled `skills` | FIX IN WRAPPER | Internal advisor surface. |
| RLS disabled `candidate_capabilities` | FIX IN WRAPPER | Internal advisor surface. |
| RLS disabled `candidate_scores` | FIX IN WRAPPER | Internal advisor surface. |
| RLS disabled `terrer_companies` | FIX IN WRAPPER | Internal advisor surface. |
| RLS disabled `terrer_company_contacts` | FIX IN WRAPPER | Internal advisor surface. |
| RLS disabled `terrer_jobs` | FIX IN WRAPPER | Internal advisor surface. |
| RLS disabled `terrer_candidates` | FIX IN WRAPPER | Internal advisor surface. |
| RLS disabled `terrer_skills` | FIX IN WRAPPER | Internal advisor surface. |
| RLS disabled `terrer_pipeline` | FIX IN WRAPPER | Internal advisor surface. |
| RLS disabled `job_candidate_matches` | FIX IN WRAPPER | Internal advisor surface. |
| RLS disabled `outreach_log` | FIX IN WRAPPER | Internal advisor surface. |
| broad `profiles` ACL matrix | FIX IN WRAPPER | Table-level ACLs should be tightened to match the admin-only contract. |
| `is_current_user_admin` broad EXECUTE | ACCEPT TEMPORARILY | Helper can remain callable while policy checks depend on it, but the broad grant is not final-state hardened. |
| non-invoker Advisor views | ACCEPT TEMPORARILY | Read-only views can be left in place until the next wrapper proves that invoker switching will not break dependent reads. |
| missing or unconfirmed `vw_candidate_search_clean` | INCLUDE IN WRAPPER | `src/lib/candidates.ts` calls `vw_candidate_search_clean` directly, and multiple docs/runtime references depend on the contract. |
| missing July validation/assertion migrations | FIX IN WRAPPER | Their logic should be translated into the wrapper as read-only validation checks. |

## Source Migrations To Translate

The production wrapper should draw from these staging-hardened or local-target migrations:

- `20260708000000_reconcile_web_publication_and_employer_contracts.sql`
- `20260708000100_reconcile_advisor_remaining_table_contracts.sql`
- `20260708000200_reconcile_advisor_view_contracts.sql`
- `20260709000100_candidate_email_and_interest_rls.sql`
- `20260709000200_advisor_remaining_table_rls.sql`
- `20260709000300_acl_corrections.sql`
- `20260709000400_view_security_hardening.sql`
- `20260709000500_validation_assertions.sql`
- `20260711000100_drop_legacy_web_job_interest_public_read.sql`
- `20260711000200_validation_public_select_assertions.sql`
- `20260711000300_harden_remaining_staging_advisor_tables.sql`

## `vw_candidate_search_clean` Evidence

Local repository evidence indicates the view is live and consumed:

- `src/lib/candidates.ts:279`
- `src/lib/candidates.ts:297`
- `docs/S1_CANONICAL_CONTRACTS.md:387`
- `docs/AUDIT_D_AUTHORITATIVE_SCHEMA_AUDIT.md:101`
- `docs/SCHEMA_AUTHORITATIVE_CAPTURE.md:270`

That makes `vw_candidate_search_clean` part of the wrapper draft rather than a deferral.

## Safe To Translate Into A Current-Timestamp Wrapper

Safe translation targets are the parts that are:

- additive or idempotent;
- based on existing production objects;
- not tied to local reset history reconstruction;
- not dependent on copying historical migration filenames;
- not dependent on web-repo ledger continuity.

Safe wrapper contents:

- create or repair the `candidate_web_jobs` compatibility table only if the live production shape can be matched exactly;
- enable RLS on the target tables that already exist in production;
- drop or replace the broad legacy policies on `web_job_interest`;
- replace the broad `jobs` policies with the reviewed target policies;
- tighten `employer_job_intake`, `employer_intake_actions`, and `activity_log` to the intended server/staff paths;
- enable RLS and add staff/admin policies for the Advisor-hardened internal tables;
- revoke broad ACLs from `profiles` and re-grant only the minimum required privileges;
- optionally revoke broad `EXECUTE` from `public.is_current_user_admin()` if the surrounding policy checks still work with the narrower grant set;
- refresh or replace the Advisor views only if the view dependency tree validates cleanly in production;
- translate validation/assertion queries into read-only post-change checks.

Draft wrapper contents should be limited to the minimum delta needed to harden the live production shape. Anything that depends on local reset history, historical filenames, or unknown live dependencies must stay out of the executable migration until it is separately approved.

## Reconstruction-Only Parts That Must Not Be Applied Directly

Do not include these reconstruction patterns in a production wrapper:

- backfilled migration history repair based only on local filenames;
- local-reset BOM repairs;
- copied historical web-repo migration bodies that represent prior repository history rather than production deltas;
- any statement that assumes production already has the same object lineage as local reset;
- any wrapper that depends on `supabase db push` semantics;
- any change that would blindly recreate missing historical migrations instead of checking the live object first.

## Candidate Web Jobs Decision

`candidate_web_jobs` is included in the wrapper draft because the hardened web/candidate flow needs a safe public jobs surface.

The executable version still needs live-shape verification before it is allowed to run.

## `vw_candidate_search_clean` Decision

`vw_candidate_search_clean` is included in the wrapper draft because current code and docs reference it directly.

The executable version still needs dependency validation and security invoker confirmation.

## Proposed Order Of Operations

1. Take a production backup and export a migration ledger snapshot.
2. Confirm the production project ref in the dashboard is `tlufttnmwtjbuhjcrqmp`.
3. Confirm the current web deployment is compatible with the proposed RLS contract.
4. Create or repair `candidate_web_jobs` only if the live shape matches the compatibility contract.
5. Enable or tighten RLS on `candidates`, `web_job_interest`, `jobs`, `employer_job_intake`, `employer_intake_actions`, and `activity_log`.
6. Enable RLS and add staff/admin policies on the Advisor-hardened internal tables.
7. Revoke broad `profiles` ACLs and tighten `public.is_current_user_admin()` execution if safe.
8. Refresh only the views that validate cleanly against the production dependency tree.
9. Run validation/assertion SQL.
10. Run smoke checks in the dashboard and browser.
11. Rerun Supabase Advisor.

## Final Review Checklist Before Executable SQL

- Confirm the wrapper scope matches the approved decisions in this document.
- Confirm `candidate_web_jobs` live shape.
- Confirm `vw_candidate_search_clean` dependency tree and consumer impact.
- Confirm exact policy text for `candidates`, `web_job_interest`, `jobs`, `employer_job_intake`, `employer_intake_actions`, and `activity_log`.
- Confirm `profiles` ACL reductions do not break admin-gated access.
- Confirm `is_current_user_admin()` still evaluates correctly with narrowed EXECUTE grants.
- Confirm the chosen views can safely switch to `security_invoker = true` where planned.
- Confirm rollback text exists for every policy/grant/view change.
- Confirm the draft remains non-runnable until an executable migration is intentionally produced.

## SQL Operations Included

The wrapper may include these classes of SQL operations:

- `CREATE TABLE IF NOT EXISTS` only for a confirmed compatibility table contract;
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`;
- `CREATE POLICY` for reviewed self-service, staff-only, or service-role-only paths;
- `DROP POLICY` for legacy broad public policies;
- `ALTER TABLE ... FORCE ROW LEVEL SECURITY` only if the production contract supports it;
- `REVOKE` and `GRANT` to reduce table ACL exposure, especially on `profiles`;
- `ALTER FUNCTION ...` or `REVOKE EXECUTE` / `GRANT EXECUTE` for `public.is_current_user_admin()` only after the policy dependency check;
- `CREATE OR REPLACE VIEW` or `ALTER VIEW ... SET (security_invoker = true)` only after view dependency validation;
- read-only validation `SELECT` statements.

## SQL Operations That Must Not Be Included

- `supabase db push`;
- any command that mutates production outside the approved wrapper;
- blind `DROP TABLE`;
- blind `DROP VIEW`;
- blind `DROP FUNCTION`;
- blind migration repair based only on local history;
- any statement that introduces secrets, tokens, passwords, or service-role keys;
- any statement that assumes `candidate_web_jobs` can be recreated without checking the live shape;
- any statement that copies local reset-only reconstruction logic verbatim.

## Validation Checklist

After the wrapper runs, confirm:

- the production ledger still matches the approved strategy;
- `candidate_web_jobs` exists only if it was intentionally created or repaired;
- `candidates` RLS is enabled and anonymous access is blocked;
- `web_job_interest` is self-only for candidate access;
- `jobs` no longer has broad public write access;
- `employer_job_intake` and `employer_intake_actions` are no longer anonymously writable/readable unless intentionally accepted;
- `activity_log` is no longer anonymously readable/writable unless intentionally accepted;
- all Advisor-hardened internal tables have RLS enabled with reviewed policies;
- `profiles` ACLs are narrowed to the intended admin path;
- `public.is_current_user_admin()` still works for policy evaluation;
- the Advisor views compile and their security posture matches the approved plan;
- validation assertions pass and roll back cleanly where applicable;
- Supabase Advisor no longer reports critical public-RLS issues.

## Rollback And Containment

If the wrapper breaks:

- stop immediately and do not continue with later steps;
- keep anonymous candidate access blocked;
- disable only the new path that failed;
- if the failure is policy-related, revert only the last policy block;
- if the failure is view-related, keep the table hardening and revert only the view refresh;
- if the failure is structural and cannot be isolated, restore from the production backup rather than widening access;
- do not use rollback as a reason to reopen candidate PII access;
- do not widen `profiles` ACLs to make the site work;
- capture the exact failure result set for follow-up analysis.

## Final Recommendation

This wrapper design supports the next production-safe hardening pass, but it is still only a planning artifact.

Production remains `NO-GO` until explicit approval is given for an executable SQL migration derived from this draft.

The safest future execution path remains a current-timestamp production wrapper, not direct `supabase db push`.

## Readiness Review

See `docs/security/PRODUCTION_HARDENING_WRAPPER_READINESS_REVIEW_2026-07.md` for the pre-executable review.

Current readiness verdict: `CONDITIONAL READY`.
