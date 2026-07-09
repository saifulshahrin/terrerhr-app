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
- RLS and ACL deltas reviewed.
- View treatment reviewed.
- Tests prepared.
- Rollback path documented.

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
