# Production Security Hardening Runbook

Date: 2026-07

This runbook defines the required deployment order for the security hardening sprint.

It is intentionally conservative and does not modify production by itself.

## Mandatory Deployment Order

1. Review app security branch and web security branch together.
2. Back up production Supabase.
3. Ensure Supabase Auth magic-link settings are configured.
4. Deploy the web branch first.
5. Smoke test public jobs and candidate sign-in.
6. Apply the database hardening migrations.
7. Smoke test My Matches, My Activity, Profile, interest actions, and employer preview.
8. Rerun Supabase Advisor.
9. Monitor logs.

## Deployment Rules

- Do not apply RLS migrations before the compatible web build is ready.
- Do not restore anonymous candidate reads to keep a broken page working.
- Do not run the hardening migrations directly against production until the review set is approved.
- Keep public browsing on the deliberate publication contract.
- Keep employer preview server-only.
- Do not use browser-supplied `candidate_id` as an authority boundary.

## Pre-Deployment Checklist

- Candidate identity contract reviewed.
- Verified-email RLS assumptions documented.
- Duplicate-email transitional risk accepted and documented.
- Migration dependency reconciliation reviewed.
- Production migration ledger checked for web-owned migration versions.
- RLS and ACL deltas reviewed.
- View treatment reviewed.
- Tests prepared.
- Rollback path documented.

## Migration Dependency Reconciliation

`candidate_web_jobs` was missing from the app repo migration history because the table was originally introduced by the web repo migration `20260609090000_add_candidate_web_job_publication.sql`. The security hardening branch now needs to harden that table from the app repo, so the database contract has been reconciled into app history.

The app repo owner for the publication contract is now `supabase/migrations/20260708000000_reconcile_web_publication_and_employer_contracts.sql`. It creates `public.candidate_web_jobs` idempotently, keeps anonymous access limited to published rows, and does not seed production publication data.

No web-repo migration was copied unchanged. The original candidate-publication migration may already exist in production migration history if it was applied from `terrer-web`, so the app repo uses a new compatibility migration. The web employer-intake migration was not copied unchanged because it no longer matches the captured live contract for `employer_intake_actions`.

Before production deployment, check whether production already records `20260609090000_add_candidate_web_job_publication.sql`, confirm the live columns on `candidate_web_jobs`, `employer_job_intake`, and `employer_intake_actions`, and confirm the web branch `5006e1e` is deployed or ready.

This pass reconciles the remaining Advisor RLS-disabled table contracts referenced by `supabase/migrations/20260709000200_advisor_remaining_table_rls.sql`: `source_profiles`, `evidence_signals`, `skills`, `candidate_capabilities`, `candidate_scores`, `terrer_companies`, `terrer_company_contacts`, `terrer_jobs`, `terrer_candidates`, `terrer_skills`, `terrer_pipeline`, `job_candidate_matches`, and `outreach_log`.

The app repo owner for those table contracts is now `supabase/migrations/20260708000100_reconcile_advisor_remaining_table_contracts.sql`. The source of evidence is `docs/schema-evidence/live_schema_catalog_ddl.sql`; the web repo did not contain base migrations for these 13 tables. The migration is structural only, uses `create table if not exists`, guarded column additions, and live-confirmed indexes, and it does not add permissive RLS or anonymous grants.

Before production deployment, also confirm the production migration ledger does not contain an equivalent app-owned migration under a different filename, compare the live table shapes against the captured evidence, and keep the migration in review-only status until the ledger strategy is approved. Local Supabase reset validation has now passed against the full app repo migration chain.

## View Definition Reconciliation

`supabase/migrations/20260709000400_view_security_hardening.sql` hardens 30 views: the 29 Advisor views and the extra dependent view `vw_candidate_search_clean`. `vw_candidate_search_clean` is included because it depends on `vw_candidate_search`, is actively used by app candidate-search workflows, and contains candidate search fields that must not remain anonymously readable.

Definitions were reconciled only from `docs/schema-evidence/live_schema_catalog_ddl.sql`. The app repo already owned 11 views in `supabase/migrations/20260416100404_add_ready_for_bd_review_stage.sql`: `vw_submissions_enriched`, `recruiter_active_submissions`, `vw_company_pipeline_summary`, `vw_candidate_pipeline_summary`, `vw_activity_log_enriched`, `vw_pipeline_summary`, `vw_outcomes_summary`, `vw_live_work_queue`, `vw_followup_queue`, `vw_job_shortlist`, and `vw_recruiter_dashboard`.

`supabase/migrations/20260708000200_reconcile_advisor_view_contracts.sql` now owns the remaining 19 missing view contracts: `jobs_latest`, `jobs_latest_practical`, `hiring_leaderboard_malaysia`, `jobs_reporting`, `terrer_hiring_now`, `terrer_jobs_view`, `v_match_shortlist`, `v_outreach_due`, `vw_candidate_search`, `vw_candidate_search_clean`, `vw_jobs_tier1_malaysia`, `vw_market_signals`, `vw_market_signals_active`, `vw_market_signals_realtime`, `vw_market_signals_recent`, `vw_tier1_source_health`, `vw_tier1_source_health_v2`, `vw_tier1_source_diagnostics`, and `vw_tier1_source_health_summary`.

The same compatibility migration adds only the missing `public.jobs` columns required to compile those exact live views, guarded with `add column if not exists`. Existing production columns are left untouched; fresh local rebuilds get the dependency surface needed before the views are created.

Creation order is dependency-safe: base tables first, then jobs rollup views, candidate search before the clean candidate view, tier-1 health before v2/diagnostics/summary, and existing recruiter/pipeline views before the security hardening migration. No unresolved view definitions remain based on captured live schema evidence.

Before production deployment, verify the production migration ledger and confirm the live views still match the captured definitions. Local Docker proof has passed, but the compatibility migration still uses guarded create-if-missing logic and does not alter existing production view definitions.

## Migration Ledger / Backfilled Migration Risk

The `20260425000000`, `20260708000000`, `20260708000100`, and `20260708000200` compatibility migrations are intentionally backfilled so local reset can rebuild the schema before the `20260709000100` through `20260709000500` security hardening migrations reference candidate, web publication, employer intake, Advisor table, and Advisor view contracts.

The July migration files were renamed from short `20260708_000x` / `20260709_000x` prefixes to full timestamp prefixes because Supabase CLI `2.90.0` collapsed the short names into duplicate migration versions (`20260708` and `20260709`) during local reset. The full timestamp filenames are required for deterministic local migration history.

The local proof also added two reconstruction-only dependency migrations: `20260416100300_reconcile_pipeline_view_dependencies.sql` for early recruiter/pipeline view prerequisites and `20260604090000_reconcile_profiles_contract.sql` for the `profiles`/admin-helper contract used by staff policies. The historical Bullhorn staging migration `20260531093000_create_bullhorn_staging_tables.sql` was repaired only by removing a UTF-8 BOM that caused local SQL parsing failure. That BOM repair is for repository/local reset correctness and must not be interpreted as a production schema delta to apply blindly.

Local Supabase proof passed on Docker Desktop with `npx --yes supabase@2.90.0 db reset --yes`, and the transaction-safe validation SQL `20260709000500_validation_assertions.sql` was run explicitly afterward with all assertion blocks passing and rolling back cleanly.

These backfilled migrations are safe as local reconstruction inputs, but they must not be treated as an automatic production deployment plan. Production may already have some equivalent objects from earlier app work, web-repo migrations, manual SQL, or Supabase-hosted changes that are not represented by the app repo ledger. Applying this branch with `supabase db push` without a ledger review would be unsafe and ambiguous because the CLI could attempt to apply backfilled migrations after later production migrations are already recorded, or record compatibility migrations that overlap with web-owned history.

A production migration-ledger check is mandatory before any database deployment. Confirm which migration versions already exist in `supabase_migrations.schema_migrations`, especially any web-owned migration such as `20260609090000_add_candidate_web_job_publication.sql`, and compare live object definitions against `docs/schema-evidence/live_schema_catalog_ddl.sql`.

If production already has later migrations recorded, use Supabase migration repair only after an explicit ledger plan is approved. Mark backfilled compatibility migrations as applied only when their live-equivalent changes are already present and verified. If an object differs materially, do not repair blindly; prepare a current-timestamp production wrapper or manual reviewed SQL that applies only the approved delta.

The recommended production strategy is: deploy the compatible web build first, back up Supabase, perform a read-only production ledger and schema comparison, decide whether each backfilled compatibility migration is repair-only or needs a current-timestamp wrapper, then apply only the reviewed security deltas. Direct `supabase db push` from this branch is not allowed until that ledger plan exists, even though local reset validation has passed.

Local app checks after the migration proof: `npm run build` passed. `npm run typecheck` and `npm run lint` still fail on pre-existing app TypeScript/lint debt outside the migration work; these failures are not caused by the security migration patches. `npm test` is unavailable because the repository has no `test` script.

## Staging Validation Findings

Staging project `nulpvbirlhauukccunqg` was used for the first remote validation pass. The full app migration chain applied successfully to staging.

Staging smoke SQL found one real issue before production: legacy policy `"allow read all for now"` on `public.web_job_interest` allowed authenticated users to see all interest rows. This was fixed by `20260711000100_drop_legacy_web_job_interest_public_read.sql`, and the guardrail was strengthened by `20260711000200_validation_public_select_assertions.sql`.

After the fix, local `supabase db reset --yes` passed again. Staging validation assertions passed. Rollback-only staging smoke SQL passed and confirmed anonymous denial for `candidates` and `web_job_interest`, verified-email candidate self-access, denial of other candidate rows, self-only `web_job_interest`, published-only public `candidate_web_jobs`, and viable service-role employer intake/action paths.

Staging dashboard Security Advisor rerun is still pending manually. Web branch `5006e1e` still needs Vercel/staging preview deployment and browser smoke testing.

Production remains blocked. Do not run direct production `supabase db push`. Production still requires ledger review because production may already contain equivalent app, web, or manual SQL changes. The production strategy must be either approved migration repair or a reviewed current-timestamp wrapper/manual SQL plan. Also document the staging ledger quirks around older date-only `20260507` / `20260509` migrations before using staging evidence as a production readiness artifact.

## Staging Advisor Critical Follow-Up

Manual Supabase Security Advisor rerun on staging project `nulpvbirlhauukccunqg` reported `3` remaining critical errors and no new production action was taken. The remaining critical errors were all `RLS Disabled in Public`:

- `public.activity_log`
- `public.staging_bullhorn_companies`
- `public.staging_bullhorn_contacts`

These are now patched in app migration `20260711000300_harden_remaining_staging_advisor_tables.sql`.

Production impact review before deployment:

- `activity_log` exists in live schema evidence and feeds internal recruiter/pipeline views. It is now staff-only through the existing active `profiles.role in ('admin', 'recruiter', 'bd')` contract, with service-role preserved.
- `staging_bullhorn_companies` and `staging_bullhorn_contacts` exist in live schema evidence and are import/QA landing tables. They are sensitive internal data surfaces and are now admin/service-role only.
- The patch drops the legacy anonymous `activity_log` policies captured in live evidence and does not create public/anon policies.
- The patch does not address the remaining Advisor warnings or info suggestions. Those require separate triage after critical errors are cleared.

The follow-up staging Advisor rerun verified these three critical errors were cleared. Production remains blocked until the production ledger review decides whether this current-timestamp migration can be applied directly, repaired as already equivalent, or wrapped into reviewed production SQL with the rest of the hardening set.

## Staging Advisor Warning Follow-Up

After the critical errors were cleared, staging Advisor export for project `nulpvbirlhauukccunqg` showed `0` errors, `22` warnings, and `9` info suggestions.

The warning cleanup is implemented by:

- `20260711000400_triage_staging_advisor_warnings.sql`
- `20260711000500_validation_warning_lints.sql`

Treatment:

- Broad anonymous mutation was removed from `ai_assessments`, `bd_contacts`, `candidate_skills`, `job_requirements`, and `submissions`.
- Broad authenticated mutation was replaced with the existing staff profile contract on `ai_assessments`, `autonomous_recruiter_memory`, `autonomous_recruiter_runs`, `bd_contacts`, `candidate_skills`, `companies`, `job_requirements`, and `submissions`.
- `candidate_intent_events` kept browser insert compatibility but no longer uses `WITH CHECK (true)`; inserts must include a non-empty candidate identifier, a non-null job id, and an allowed action type.
- Anonymous direct execution of `public.is_current_user_admin()` was revoked.
- Authenticated direct execution of `public.is_current_user_admin()` is retained because existing RLS policies rely on this helper and the function returns only a boolean.

Final staging Advisor result after warning triage: `0` errors, `1` warning, and `9` info suggestions. The original broad mutation warnings were cleared. The only remaining warning is authenticated execution of `public.is_current_user_admin()`, and it is accepted temporarily pending a deeper helper redesign. Anonymous/public execute was revoked. The `9` info suggestions are deferred and are not blocking this security release unless later review proves otherwise.

Staging DB gate status: passed. The next required gate is the `terrer-web` Vercel/staging preview browser smoke test against staging using web branch `5006e1e`.

Production implications:

- Do not apply these warning-cleanup migrations to production through direct `supabase db push`.
- Verify production ledger and live policy state first; production may already differ from staging because many warnings originated in older demo/app migrations.
- Confirm internal staff profiles exist and are active before applying staff-only mutation policies.
- Confirm web branch `5006e1e` does not need direct access to any tightened internal table.
- Keep production blocked until the ledger strategy, approved deployment plan, and web preview smoke tests are complete.

## Production Ledger Review Attempt 2026-07-13

Production deployment strategy is currently `NO-GO`.

Read-only production inspection was attempted for the supplied production project ref `tlufftnmwtjbuhjcrqmp`. Before the remote command, the local Supabase link was checked and confirmed to point to staging ref `nulpvbirlhauukccunqg`. The attempted production link failed with Supabase CLI authorization/project lookup result `Not Found`. The local link remained staging after the failed attempt.

No production migration, SQL mutation, deployment, or merge was run.

Because the supplied production ref could not be authenticated/resolved from this environment, the production migration ledger and live schema could not be verified. Do not try alternate project refs by guesswork. The operator must confirm the exact production project ref and provide an approved read-only inspection path before production planning can proceed.

### Migration Groups For Future Ledger Review

Reconstruction/local-reset compatibility migrations:

- `20260416100300_reconcile_pipeline_view_dependencies.sql`
- `20260425000000_create_candidate_marketplace_contracts.sql`
- `20260604090000_reconcile_profiles_contract.sql`
- `20260708000000_reconcile_web_publication_and_employer_contracts.sql`
- `20260708000100_reconcile_advisor_remaining_table_contracts.sql`
- `20260708000200_reconcile_advisor_view_contracts.sql`

These are not approved for blind production `db push`. They were created to reconstruct missing app-history contracts for local and clean staging validation. In production, each one must be classified as either:

- already-equivalent and suitable for migration repair after evidence review;
- partially missing and requiring a current-timestamp production wrapper;
- materially different and requiring manual reviewed SQL or a new design decision.

Security hardening migrations:

- `20260709000100_candidate_email_and_interest_rls.sql`
- `20260709000200_advisor_remaining_table_rls.sql`
- `20260709000300_acl_corrections.sql`
- `20260709000400_view_security_hardening.sql`
- `20260709000500_validation_assertions.sql`
- `20260711000100_drop_legacy_web_job_interest_public_read.sql`
- `20260711000200_validation_public_select_assertions.sql`
- `20260711000300_harden_remaining_staging_advisor_tables.sql`
- `20260711000400_triage_staging_advisor_warnings.sql`
- `20260711000500_validation_warning_lints.sql`

These are production-intended security deltas only after ledger/schema review proves the target objects and policy assumptions match production. Validation/assertion migrations are transaction-safe in local/staging proof, but they must still be reviewed against the production ledger strategy.

### Required Read-Only Production Comparison

Before any production deployment, inspect only read-only evidence for:

- migration rows in `supabase_migrations.schema_migrations`;
- table/view/function existence and shape for `candidates`, `web_job_interest`, `candidate_web_jobs`, `jobs`, `employer_job_intake`, `employer_intake_actions`, `activity_log`, `staging_bullhorn_companies`, and `staging_bullhorn_contacts`;
- all Advisor-hardened tables and views;
- policies on `candidates`, `web_job_interest`, `jobs`, `candidate_web_jobs`, and the warning-triage tables;
- grants and execute privileges on `public.is_current_user_admin()`;
- whether web-owned migration `20260609090000_add_candidate_web_job_publication.sql` or equivalent manual SQL already exists in production history.

Do not reveal secrets in logs or documentation. Do not run production SQL mutations.

## Production Read-Only Inspection Pack

Use `docs/security/production_readonly_inspection_2026-07.sql` only for a manual run in the Supabase dashboard SQL Editor on the production project.

Operator instructions:

1. Confirm the dashboard project ref is `tlufttnmwtjbuhjcrqmp` before running anything.
2. Paste the SQL exactly as written.
3. Verify the script begins with `begin transaction read only;`.
4. Verify the script ends with `rollback;`.
5. Run the script only on production and do not modify it in place.
6. Copy the result sets back into Codex for analysis.
7. Keep production in `NO-GO` status until the results are reviewed against local migration files and the security plan is updated.

## Wrapper Draft Approval

Approved planning decisions:

- Strategy: `B. current-timestamp production wrapper strategy`
- `candidate_web_jobs`: include in the wrapper draft
- `vw_candidate_search_clean`: include in the wrapper draft because local code and docs reference it directly
- `profiles` ACL: tighten carefully and preserve admin-gated access through `is_current_user_admin()`
- `is_current_user_admin()`: revoke `EXECUTE` from `public` and `anon` where safe; keep `authenticated`, `service_role`, and `postgres` as needed
- July validation/assertions: convert to post-change validation only
- Rollback: reverse-policy SQL first, backup restore for structural failure

Final review requirement before executable SQL:

- confirm `candidate_web_jobs` live shape;
- confirm `vw_candidate_search_clean` dependency tree and consumer impact;
- confirm exact policy text and ACL deltas;
- confirm `security_invoker` changes on the selected views;
- confirm rollback text for every change;
- confirm the draft remains non-runnable until a separate executable migration is approved.

Reminder: production remains `NO-GO` until the executable SQL is explicitly approved.

## Production Evidence Review 2026-07-17

Production project analyzed: `tlufttnmwtjbuhjcrqmp`

Local workspace link remained on staging throughout the read-only review:

- Staging ref: `nulpvbirlhauukccunqg`
- Production ref: `tlufttnmwtjbuhjcrqmp`

### Ledger Findings

Production migration history shows the older app chain plus legacy date-only entries for `20260507`, `20260508`, and `20260509`.

From the supplied ledger export, production clearly records the early app migrations through the June baseline and does not yet record any of the July hardening migrations.

Local migrations that are already represented in production include the early baseline and reconciliation chain up through the June evidence set. The production ledger still needs repair/strategy review for the local reconstruction-only entries that were introduced to make the repository reset clean.

Local migrations missing from production include the July security set:

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
- `20260711000400_triage_staging_advisor_warnings.sql`
- `20260711000500_validation_warning_lints.sql`

### Schema, RLS, And Policy Findings

- `public.candidates` exists, but RLS is disabled and no policies were returned in the supplied policy batch.
- `public.web_job_interest` exists with RLS enabled, but the policies are still broad: anon insert and update, plus a public read policy.
- `public.candidate_web_jobs` is missing from production.
- `public.jobs` exists with RLS enabled, but read and write policies are still broad for anon and authenticated users.
- `public.employer_job_intake` and `public.employer_intake_actions` exist with RLS enabled, but both still have anon-select/insert exposure in the policy batch.
- `public.activity_log` exists with RLS enabled, but anon select/insert policies are still present.
- `public.staging_bullhorn_companies` and `public.staging_bullhorn_contacts` exist with RLS enabled and no policies were returned in the supplied policy batch.
- The Advisor-hardened internal tables exist, but RLS is still disabled on:
  - `source_profiles`
  - `evidence_signals`
  - `skills`
  - `candidate_capabilities`
  - `candidate_scores`
  - `terrer_companies`
  - `terrer_company_contacts`
  - `terrer_jobs`
  - `terrer_candidates`
  - `terrer_skills`
  - `terrer_pipeline`
  - `job_candidate_matches`
  - `outreach_log`
- `public.profiles` has admin-gated policies for `SELECT` and `UPDATE`, but the privilege matrix is very broad at the table ACL layer.

### View Findings

- All requested Advisor-hardened views in the supplied export exist in `public`.
- All returned views are owned by `postgres`.
- `reloptions` is `null` across the returned views.
- `security_invoker_true` is `false` for every returned view, so the views remain in the default non-invoker posture and are still likely to participate in `security_definer_view` warnings.
- `vw_candidate_search_clean` was not present in the supplied view export, so that dependent hardening view still needs separate confirmation.

### Function And Helper Findings

- `public.is_current_user_admin()` exists as `SECURITY DEFINER`, `STABLE`, `LANGUAGE sql`.
- The function checks `public.profiles` for `auth.uid()` with `role = 'admin'` and `is_active = true`.
- Execute privilege is granted to `anon`, `authenticated`, `service_role`, `public`, and `postgres`.
- The broad `EXECUTE` grant is tolerable only as a temporary policy helper if the surrounding profile contract is intentionally locked down. It is not a final hardened state because the `profiles` privilege matrix is broad.

### Remaining Production Gaps

- Missing `candidate_web_jobs` table.
- Broad `web_job_interest` public read and anon update exposure.
- Broad `jobs` read/write policy surface.
- Broad anon access on `activity_log`, `employer_job_intake`, and `employer_intake_actions`.
- RLS-disabled internal advisor tables.
- Broad `profiles` ACL matrix.
- All returned views remain non-invoker views.
- `vw_candidate_search_clean` still needs confirmation.
- Production does not yet show the July validation/assertion migrations.

### Final Strategy And Deployment Decision

Current recommendation: `D. NO-GO`

Direct `supabase db push`: forbidden.

Reason:

- Production still differs materially from the hardening target.
- The repository has backfilled reconstruction migrations that should not be pushed blindly.
- The production ledger does not yet include the July hardening chain.
- There are unresolved structural gaps, especially `candidate_web_jobs`, plus broad public/anon policies and RLS-disabled internal tables.
- The helper/profile contract is not yet in a comfortably hardened state because the `profiles` ACL matrix is broad.

Required evidence or fixes to move out of NO-GO:

1. Decide whether `candidate_web_jobs` is a production compatibility table that must be repaired into history or recreated as a wrapper migration.
2. Decide whether the July hardening chain should be applied through migration repair, a current-timestamp wrapper, or reviewed manual SQL.
3. Tighten or explicitly accept the `web_job_interest`, `jobs`, and `activity_log` policy surfaces.
4. Harden the RLS-disabled internal advisor tables.
5. Resolve the `profiles` ACL posture and confirm the helper contract is safe enough for the intended deployment shape.
6. Confirm whether `vw_candidate_search_clean` needs to be present in production before any deployment.

### Wrapper Design Follow-Up

The next planning artifact is `docs/security/PRODUCTION_HARDENING_WRAPPER_DESIGN_2026-07.md`.

It defines the production-safe wrapper scope, the gap classification, the SQL operations that are allowed in principle, and the operations that must stay out of production until a draft wrapper is explicitly approved.

Do not execute any wrapper SQL until the design is reviewed and the operator confirms the final scope.

### Strategy Decision

Current recommendation: `D. NO-GO`.

Reason: the production evidence now confirms a real ledger/schema mismatch and multiple unresolved security gaps, so the release is not ready for a direct deployment path.

After the correct production ref/access is confirmed and read-only evidence is captured, choose one of:

1. Migration repair strategy, only for backfilled migrations proven equivalent in production.
2. Current-timestamp production wrapper strategy, if reconstruction migrations are unsafe but the reviewed security deltas can be applied cleanly.
3. Manual SQL deployment with documented ledger handling, only if Supabase CLI migration flow remains unsafe.

### Backup, Deployment, Rollback, And Advisor Requirements

Production backup requirements before any future deployment:

- Supabase point-in-time recovery confirmed or full backup taken.
- Migration ledger snapshot exported.
- Public schema DDL/policy/function snapshot exported.
- Web preview smoke-test evidence attached to the release record.

Required deployment order after NO-GO is cleared:

1. Confirm production project ref and ledger evidence.
2. Confirm compatible `terrer-web` preview smoke test passed against staging.
3. Select and approve migration repair/wrapper/manual SQL strategy.
4. Back up production.
5. Deploy compatible web build first or have rollback-ready web release staged.
6. Apply only approved database deltas.
7. Run validation assertions and smoke SQL.
8. Run browser smoke tests against production.
9. Rerun Supabase Security Advisor.
10. Monitor Auth, API, and RLS error logs.

Rollback and containment:

- Do not restore anonymous candidate-table access as a rollback.
- If candidate pages fail, disable or roll back the web candidate feature before widening RLS.
- If employer preview fails, disable the server endpoint or roll back the endpoint release; do not expose candidate PII.
- If a database migration fails, stop at the failed version, capture logs, and use the approved rollback SQL/restore plan.
- If Security Advisor reintroduces critical findings, hold production release until fixed.

Post-deployment Advisor checklist:

- Confirm `0` critical errors.
- Confirm any `public.is_current_user_admin()` authenticated execute warning is still explicitly accepted or redesigned.
- Confirm no RLS-disabled public tables are reintroduced.
- Confirm no broad anonymous candidate, interest, submission, BD contact, Bullhorn staging, or AI assessment mutations are present.
- Confirm info suggestions are triaged separately and do not affect the release access contract.

## Smoke Tests

- Public jobs load without sign-in.
- Candidate sign-in uses a magic-link session.
- Signed-in candidate can load own profile only by verified email.
- Signed-in candidate cannot load another candidate profile.
- Signed-in candidate can save and review own job interest only.
- Candidate self-interest rows are rejected for other emails.
- Employer preview returns anonymized data only.
- Employer preview does not expose candidate PII.

## Rollback Approach

- Web rollback: revert to the last compatible browser release.
- Database rollback: revert only the security changes that were approved for this sprint.
- Candidate access rollback: disable verified-email self-access before re-enabling any wider access.
- Containment: if a check fails, keep anonymous candidate PII blocked and disable only the new path that failed.

## Operational Notes

- Do not use remote Supabase commands from this repository branch.
- Do not merge the branch as part of the audit pass.
- Do not touch production data during documentation or review.
