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

The app repo owner for the publication contract is now `supabase/migrations/20260708_0000_reconcile_web_publication_and_employer_contracts.sql`. It creates `public.candidate_web_jobs` idempotently, keeps anonymous access limited to published rows, and does not seed production publication data.

No web-repo migration was copied unchanged. The original candidate-publication migration may already exist in production migration history if it was applied from `terrer-web`, so the app repo uses a new compatibility migration. The web employer-intake migration was not copied unchanged because it no longer matches the captured live contract for `employer_intake_actions`.

Before production deployment, check whether production already records `20260609090000_add_candidate_web_job_publication.sql`, confirm the live columns on `candidate_web_jobs`, `employer_job_intake`, and `employer_intake_actions`, confirm the web branch `5006e1e` is deployed or ready, and run local/disposable migration validation once Docker or an equivalent local Postgres proof environment is available.

This pass reconciles the remaining Advisor RLS-disabled table contracts referenced by `supabase/migrations/20260709_0002_advisor_remaining_table_rls.sql`: `source_profiles`, `evidence_signals`, `skills`, `candidate_capabilities`, `candidate_scores`, `terrer_companies`, `terrer_company_contacts`, `terrer_jobs`, `terrer_candidates`, `terrer_skills`, `terrer_pipeline`, `job_candidate_matches`, and `outreach_log`.

The app repo owner for those table contracts is now `supabase/migrations/20260708_0001_reconcile_advisor_remaining_table_contracts.sql`. The source of evidence is `docs/schema-evidence/live_schema_catalog_ddl.sql`; the web repo did not contain base migrations for these 13 tables. The migration is structural only, uses `create table if not exists`, guarded column additions, and live-confirmed indexes, and it does not add permissive RLS or anonymous grants.

Before production deployment, also confirm the production migration ledger does not contain an equivalent app-owned migration under a different filename, compare the live table shapes against the captured evidence, and keep the migration in review-only status until local/disposable reset validation is available. A clean local reset should now be possible for the table dependencies once Docker is available, but view definitions hardened by `20260709_0004_view_security_hardening.sql` still need migration-history ownership proof.

## View Definition Reconciliation

`supabase/migrations/20260709_0004_view_security_hardening.sql` hardens 30 views: the 29 Advisor views and the extra dependent view `vw_candidate_search_clean`. `vw_candidate_search_clean` is included because it depends on `vw_candidate_search`, is actively used by app candidate-search workflows, and contains candidate search fields that must not remain anonymously readable.

Definitions were reconciled only from `docs/schema-evidence/live_schema_catalog_ddl.sql`. The app repo already owned 11 views in `supabase/migrations/20260416100404_add_ready_for_bd_review_stage.sql`: `vw_submissions_enriched`, `recruiter_active_submissions`, `vw_company_pipeline_summary`, `vw_candidate_pipeline_summary`, `vw_activity_log_enriched`, `vw_pipeline_summary`, `vw_outcomes_summary`, `vw_live_work_queue`, `vw_followup_queue`, `vw_job_shortlist`, and `vw_recruiter_dashboard`.

`supabase/migrations/20260708_0002_reconcile_advisor_view_contracts.sql` now owns the remaining 19 missing view contracts: `jobs_latest`, `jobs_latest_practical`, `hiring_leaderboard_malaysia`, `jobs_reporting`, `terrer_hiring_now`, `terrer_jobs_view`, `v_match_shortlist`, `v_outreach_due`, `vw_candidate_search`, `vw_candidate_search_clean`, `vw_jobs_tier1_malaysia`, `vw_market_signals`, `vw_market_signals_active`, `vw_market_signals_realtime`, `vw_market_signals_recent`, `vw_tier1_source_health`, `vw_tier1_source_health_v2`, `vw_tier1_source_diagnostics`, and `vw_tier1_source_health_summary`.

The same compatibility migration adds only the missing `public.jobs` columns required to compile those exact live views, guarded with `add column if not exists`. Existing production columns are left untouched; fresh local rebuilds get the dependency surface needed before the views are created.

Creation order is dependency-safe: base tables first, then jobs rollup views, candidate search before the clean candidate view, tier-1 health before v2/diagnostics/summary, and existing recruiter/pipeline views before the security hardening migration. No unresolved view definitions remain based on captured live schema evidence.

Before production deployment, verify the production migration ledger, confirm the live views still match the captured definitions, and run a local or disposable reset/apply once Docker or equivalent local Postgres is available. The compatibility migration uses guarded create-if-missing logic and does not alter existing production view definitions.

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
