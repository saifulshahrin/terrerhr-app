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
