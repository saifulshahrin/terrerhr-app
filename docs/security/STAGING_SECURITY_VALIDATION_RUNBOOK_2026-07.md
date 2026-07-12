# Staging Security Validation Runbook

Date: 2026-07

This runbook prepares a staging-only validation gate for the Supabase Security Advisor hardening release.

It must not be used against production.

## Current Proof State

- App branch: `security/supabase-advisor-hardening-2026-07`
- App proof commit: `ba359a3 test: prove Supabase security migrations locally`
- Compatible web branch: `terrer-web/security/candidate-access-hardening-2026-07`
- Compatible web commit: `5006e1e Harden candidate access with verified sessions`
- Local Supabase proof: `npx --yes supabase@2.90.0 db reset --yes` passed
- Validation SQL: `supabase/migrations/20260709000500_validation_assertions.sql` passed explicitly
- App build: `npm run build` passed
- Typecheck/lint: known pre-existing app debt, not caused by security migrations

## Staging Validation Result

Staging project used: `nulpvbirlhauukccunqg` (`terrer-security-staging-2026-07`).

The full app migration chain applied successfully to staging through the July hardening sequence. Staging smoke SQL then found a real legacy policy issue: `public.web_job_interest` still had policy `"allow read all for now"` with broad public read behavior, which allowed authenticated users to see all interest rows instead of only their own verified-email rows.

Two follow-up migrations were added and validated:

- `20260711000100_drop_legacy_web_job_interest_public_read.sql`
- `20260711000200_validation_public_select_assertions.sql`

After the fix, local `supabase db reset --yes` passed again. Staging validation assertions passed, and rollback-only staging smoke SQL passed.

The staging smoke SQL confirmed:

- anon cannot read `public.candidates`
- anon cannot read/write `public.web_job_interest`
- authenticated verified-email candidate can read own candidate row
- authenticated candidate cannot read another candidate row
- authenticated candidate sees only own `web_job_interest`
- authenticated candidate cannot insert interest for another candidate
- `candidate_web_jobs` remains public only for published rows
- service-role employer intake/action path remains viable

Remaining staging tasks:

- Rerun Supabase Security Advisor manually in the staging dashboard.
- Deploy web branch `5006e1e` to a Vercel/staging preview and complete browser smoke tests.
- Document or clean staging ledger quirks around older date-only `20260507` / `20260509` migrations before treating this staging project as long-lived.

## Staging Advisor Rerun Follow-Up

Manual Supabase Security Advisor rerun on staging project `nulpvbirlhauukccunqg` reported `3` remaining critical errors, all `RLS Disabled in Public`:

- `public.activity_log`
- `public.staging_bullhorn_companies`
- `public.staging_bullhorn_contacts`

These tables are present in production/live schema evidence. `activity_log` feeds internal recruiter and pipeline views; it does not require anonymous access. The Bullhorn staging tables are import/QA landing tables and include contact/company data, so they must not be exposed publicly.

Patch migration `20260711000300_harden_remaining_staging_advisor_tables.sql` addresses those critical findings by enabling RLS, dropping the legacy anonymous `activity_log` policies captured in schema evidence, revoking public/anon access, preserving service-role operation, allowing staff-role access to `activity_log`, and limiting Bullhorn staging table access to admin/service-role paths.

The migration includes assertions that:

- RLS is enabled for all three tables.
- `anon` has no direct select/insert/update/delete privilege.
- no public/anon SELECT policy remains.
- no broad SELECT policy remains for these tables.

After applying this migration to staging, rerun Supabase Security Advisor manually again. The expected result is that the three remaining critical `RLS Disabled in Public` errors are cleared. The existing warnings and info suggestions should be triaged separately unless a new warning is directly caused by this migration.

## Staging Project Selection

Choose one of these staging options before any remote command is run:

1. Create a new disposable Supabase project named clearly for this sprint, for example `terrer-security-hardening-staging-2026-07`.
2. Use an existing non-production Supabase staging project only if it can be reset or repaired without affecting users.
3. Do not use production, a production read replica, or any project sharing production Auth/email settings.

The staging project should be treated as disposable unless it already has a documented staging ledger. Prefer a fresh project for the first remote proof because the branch contains backfilled compatibility migrations that are intended to reconstruct schema order cleanly.

## Required Staging Environment Variables

Set these only in staging/preview environments:

- `VITE_SUPABASE_URL`: staging Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: staging anon/publishable key
- `SUPABASE_URL`: staging Supabase project URL for serverless API paths, if used by the web host
- `SUPABASE_ANON_KEY`: staging anon/publishable key for server-side non-secret usage, if used
- `SUPABASE_SERVICE_ROLE_KEY`: staging service-role key, server-only, never exposed to browser bundles
- `SUPABASE_DB_URL`: staging database connection string, used only by controlled migration/validation jobs
- `SITE_URL` or equivalent web URL variable: staging/preview web origin

Never copy production secrets into staging. Confirm browser bundles expose only anon/publishable keys.

## Supabase Auth Magic-Link Settings

Configure the staging Supabase Auth settings before web smoke tests:

- Enable email magic-link sign-in.
- Set the staging Site URL to the staging web origin.
- Add only staging/preview redirect URLs.
- Keep production URLs out of the staging project unless a separate production rollout is approved.
- Use a staging-safe email template or clearly labeled email subject if possible.
- Confirm token/session expiry settings are acceptable for manual QA.

## Required Redirect URLs

Add redirect URLs for every staging/preview origin that will be used by web commit `5006e1e`.

Required patterns:

- Staging web root, for example `https://<staging-web-host>/`
- Candidate onboarding/profile routes used by magic-link return flows
- My Matches route
- My Activity route
- Profile / My Profile route
- Any Vercel/preview URL for the exact web branch build

Do not add production redirect URLs as part of this staging validation.

## Applying App Migrations To Staging Only

Use a staging-only Supabase project reference. Before applying, confirm the CLI is linked to staging and not production.

Recommended first proof for a fresh staging project:

1. Confirm current app branch is `security/supabase-advisor-hardening-2026-07`.
2. Confirm latest app commit is `ba359a3` or newer.
3. Link the Supabase CLI to the staging project only.
4. Run a dry ledger review against staging.
5. Apply migrations only to staging.
6. Record the resulting migration ledger.

Acceptable command shape for staging, after explicit human confirmation of the staging project ref:

```powershell
npx --yes supabase@2.90.0 link --project-ref <STAGING_PROJECT_REF>
npx --yes supabase@2.90.0 migration list --linked
npx --yes supabase@2.90.0 db push --linked --include-all --yes
npx --yes supabase@2.90.0 migration list --linked
```

Do not run these commands from this documentation task. They are staging execution instructions for the next gate.

If the staging project already has a ledger, do not blindly push. Compare its `supabase_migrations.schema_migrations` rows against the app repo migration filenames and decide whether staging needs repair, a reset, or a fresh project.

## Verifying The Staging Migration Ledger

After staging migration application, capture:

- Every row in `supabase_migrations.schema_migrations`
- Whether full timestamp July versions are present:
  - `20260708000000`
  - `20260708000100`
  - `20260708000200`
  - `20260709000100`
  - `20260709000200`
  - `20260709000300`
  - `20260709000400`
  - `20260709000500`
- Whether any old short versions appear:
  - `20260708`
  - `20260709`
  - `20260708_000x`
  - `20260709_000x`
- Whether web-owned migration `20260609090000_add_candidate_web_job_publication.sql` is absent or present.

For a fresh staging project, the expected result is that the app repo full timestamp migrations own the reconstructed security contract. For an existing staging project, document any repair decisions before continuing.

## Staging Web Deployment

Deploy only the web security branch to a staging/preview environment:

- Repository: `terrer-web`
- Branch: `security/candidate-access-hardening-2026-07`
- Commit: `5006e1e Harden candidate access with verified sessions`
- Environment variables: staging Supabase URL and staging anon key for browser code; staging service-role key only for serverless API paths.
- Hosting target: Vercel preview, staging domain, or another non-production host.

Do not promote the preview to production. Do not edit `terrer-web` as part of this staging-plan document.

## Required Staging Seed/Fixture Data

Prepare a small staging dataset:

- At least one published `candidate_web_jobs` row linked to a job.
- At least one unpublished `candidate_web_jobs` row for denial checks.
- At least one candidate row with a unique test email.
- Two candidate rows sharing the same test email for duplicate-email ambiguity checks.
- Existing `web_job_interest` rows for the unique test candidate and another candidate.
- One employer intake record and one employer intake action fixture.
- One recruiter/admin profile with `is_active = true` and role `admin`, `recruiter`, or `bd`.
- One authenticated non-staff user for denial checks.

Use staging-only email addresses and dummy PII.

## Smoke Tests

### Public Homepage Job Browsing

- Open the staging homepage without sign-in.
- Confirm public job browsing loads.
- Confirm the browser does not call `public.candidates` directly as anon.
- Confirm unpublished jobs do not appear.

### `candidate_web_jobs` Published Contract

- As anon, read published rows through the web UI.
- Confirm only `status = 'published'` rows appear.
- Confirm unpublished rows are not visible.

### Magic-Link Sign-In

- Request a magic link for the unique candidate test email.
- Confirm the redirect lands on the staging web origin.
- Confirm a Supabase Auth session exists in the browser.
- Confirm no production redirect URL is used.

### Candidate Profile Resolution By Verified Email

- Sign in as the unique candidate test email.
- Open Profile / My Profile.
- Confirm the candidate row is resolved by verified Auth email, not localStorage.
- Confirm name, email, profile fields, and candidate-specific data match only that email.

### Duplicate-Email Ambiguity State

- Sign in with the duplicate test email.
- Confirm the app does not silently bind to one candidate row.
- Confirm the UI shows the ambiguity/recovery state.
- Confirm no candidate PII for either duplicate row is exposed beyond the approved recovery state.

### My Matches

- Sign in as the unique candidate.
- Open My Matches.
- Confirm published job matches load.
- Confirm direct access to another candidate's match data is denied.

### My Activity

- Sign in as the unique candidate.
- Open My Activity.
- Confirm only that candidate's `web_job_interest` rows are shown.
- Confirm another candidate's activity is not visible by changing URL/query/localStorage values.

### Profile / My Profile

- Confirm profile reads work for the signed-in owner.
- Confirm profile update flows still work where supported.
- Confirm browser-supplied `candidate_id`, email, or localStorage changes do not authorize another profile.

### Save / Express Interest / Representation Request

- Save or express interest in a published job.
- Submit a representation request if the UI exposes the flow.
- Confirm `web_job_interest` insert/update succeeds only for the signed-in owner candidate.
- Confirm requests against unpublished jobs are rejected.

### `web_job_interest` Self-Only Behavior

- Attempt to read another candidate's `web_job_interest` row as the signed-in candidate.
- Attempt to insert or update interest using another candidate's `candidate_id`.
- Expected result: denied by RLS.

### Anonymous Denied From `candidates`

- In an anonymous browser/session, attempt a direct `select` from `public.candidates`.
- Expected result: denied/no rows due to RLS and grants.

### Anonymous Denied From `web_job_interest`

- In an anonymous browser/session, attempt direct `select`, `insert`, and `update` against `public.web_job_interest`.
- Expected result: denied.

### Employer Match Preview

- Call the staging employer match preview endpoint with a normal employer request.
- Confirm the response is anonymised.
- Confirm no candidate email, phone, raw resume, private notes, or direct candidate identifier is returned.
- Confirm request parameters cannot force arbitrary candidate enumeration.

### Employer Intake Action

- Submit a staging employer intake action through the server-side API.
- Confirm it succeeds using the staging service-role server path.
- Confirm no browser access to `employer_job_intake` or `employer_intake_actions` is required.

### Recruiter/Admin Views

- Sign in with the staging staff profile.
- Confirm recruiter/admin views that depend on hardened Advisor views still load where applicable.
- Confirm anonymous users cannot access candidate PII views.
- Confirm a non-staff authenticated user cannot access staff-only data.

## Running Validation Assertions Against Staging

Run the validation SQL against staging only after migrations are applied.

Preferred execution shape:

```powershell
npx --yes supabase@2.90.0 db query --linked --file supabase/migrations/20260709000500_validation_assertions.sql
```

Alternative execution through a staging database URL is acceptable if it is clearly pointed at staging and the command is logged without secrets.

Expected result:

- `BEGIN`
- six successful `DO` blocks
- `ROLLBACK`
- no raised exceptions

If any assertion fails, stop staging validation and record the exact assertion message before making changes.

## Rerunning Supabase Security Advisor In Staging

After migrations and smoke tests:

1. Open the staging Supabase dashboard.
2. Run Security Advisor for the staging project.
3. Export or screenshot the findings.
4. Confirm the 14 RLS-disabled Advisor tables are no longer reported as RLS-disabled.
5. Confirm targeted Advisor views are no longer reported as unsafe security-definer views, or document any remaining warning with evidence.
6. Confirm no new public data exposure warnings were introduced.

Do not run Advisor against production as part of staging validation.

## Expected Remaining Warnings

Expected non-blocking items:

- App `npm run typecheck` still fails on pre-existing frontend/app TypeScript debt.
- App `npm run lint` still fails on pre-existing lint debt.
- `npm test` is unavailable because no `test` script exists.
- Supabase CLI may warn that a newer CLI version exists.

Blocking items:

- Any staging RLS assertion failure.
- Any anonymous access to `public.candidates` or `public.web_job_interest`.
- Any employer preview candidate PII exposure.
- Any magic-link redirect to production.
- Any staging migration ledger ambiguity involving short July versions.

## Staging Rollback And Containment

If staging fails:

- Disable or discard the staging web preview.
- If the staging Supabase project is disposable, delete/recreate it and rerun from a clean ledger.
- If the staging project must be retained, stop and document the failed migration version, policy, or view before attempting repair.
- Do not weaken candidate RLS to recover a broken page.
- Do not reintroduce anonymous `candidates` or `web_job_interest` access.
- Keep employer preview server-only.
- Keep all failed-state evidence in staging artifacts/docs before making a new patch.

## Production Go/No-Go Criteria

Production remains blocked until all staging gates pass and a separate production ledger strategy is approved.

Minimum criteria for production consideration:

- Staging migrations apply cleanly.
- Staging validation assertions pass.
- Staging Security Advisor no longer reports the targeted RLS-disabled tables or unsafe view issues, or any remaining warnings are reviewed and accepted.
- Web branch `5006e1e` passes all candidate smoke tests against staging.
- Employer preview remains anonymised.
- Employer intake actions work through server-side staging APIs.
- App `npm run build` remains green.
- Typecheck/lint failures are reconfirmed as pre-existing and not security-related.
- Production ledger review is complete.
- A production repair/wrapper plan is approved.

Recommendation after staging pass only: conditional go for production planning, not production execution.

## Production Is Still Blocked

Production ledger review is still required.

Production may already contain equivalent migrations or objects from:

- prior app migrations
- `terrer-web` migrations
- manual SQL
- Supabase dashboard changes
- previous repair operations

Direct production `supabase db push` is not allowed from this branch. The backfilled compatibility migrations are safe for local reconstruction and fresh staging proof, but production may already have later ledger rows or equivalent objects under different migration versions.

Production requires one of these approved strategies:

1. Migration repair: mark backfilled compatibility migrations as applied only when live production objects are verified equivalent.
2. Current-timestamp wrapper: prepare reviewed production SQL that applies only the missing approved deltas.
3. Manual reviewed SQL: apply a controlled script outside the normal branch push flow with explicit rollback/containment.

No production command should run until the strategy is selected, reviewed, and approved.
