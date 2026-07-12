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
