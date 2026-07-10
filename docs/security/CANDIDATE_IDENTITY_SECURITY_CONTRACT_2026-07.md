# Candidate Identity Security Contract

Date: 2026-07

This contract describes the secure target state for candidate identity, ownership, browsing, and interest tracking.

It is written for the `terrer-web` implementation and for the verified-session baseline introduced in web commit `5006e1e`.

## Core Rules

1. `auth.jwt() ->> 'email'` is the compatibility source for candidate self-access.
2. `localStorage` is only a UX cache.
3. Browser code must not rely on `candidate_id` as authority.
4. Browser code must not use candidate email or name as an authority boundary outside verified auth.
5. No anonymous candidate PII read is allowed.
6. No anonymous `UPDATE`, `INSERT`, or `DELETE` is allowed on `web_job_interest`.
7. Public browsing stays on `candidate_web_jobs`.
8. Employer preview remains server-only and returns anonymized data only.

## Sign-In Flow

1. The user signs in with Supabase Auth magic-link session.
2. The browser reads the current session from Supabase Auth.
3. Private candidate routes are gated until the session is verified.
4. Candidate identity is resolved from the verified auth email.
5. If more than one candidate row matches that verified email, the app treats the state as ambiguous and surfaces recovery.

## Candidate Ownership Model

### Verified-email access

Use the canonical `candidates.email` column and compare it to the verified JWT email in lower case.

Conceptually:

```sql
lower(candidates.email) = lower(auth.jwt() ->> 'email')
```

The exact SQL must also guard against nulls and should use the live `candidates.email` text column.

### Transitional duplicate-email handling

Duplicate candidate emails are allowed to surface as a transitional risk.

Recommended handling:

- exact verified auth email may match more than one candidate row
- if multiple candidate rows share the same email, the web app should treat the state as ambiguous
- do not auto-merge profiles in this sprint
- recommend a later `candidate_account_links` table if strict one-to-one ownership becomes necessary

## Browser Access Contract

### Allowed from browser

- `public.candidate_web_jobs`
- `public.candidates` only for the signed-in owner rows, after RLS enforces verified-email self-access
- `public.web_job_interest` only for the signed-in owner rows, after RLS enforces verified-email self-access
- `public.profiles` only for the signed-in user row and only for role/active-state checks

### Not allowed from browser

- anonymous `public.candidates` access
- anonymous `public.web_job_interest` access
- browser access to `public.employer_job_intake`
- browser access to `public.employer_intake_actions`
- browser access to employer preview candidate lists
- caller-supplied `candidate_id` as an authorization boundary

### LocalStorage assumptions to remove

- `terrer_candidate_id` is not authoritative
- `terrer_candidate_email` is not authoritative
- `terrer_candidate_name` is not authoritative

These values may remain as UX cache only and must be ignored when auth ownership is absent.

## Table Access Contract

### `public.candidates`

- anon: no access
- authenticated candidate: self-only `SELECT` by verified auth email
- authenticated staff: read/write/delete as needed for internal recruiter workflows
- service-role: full access
- operations: no anonymous read, write, or delete
- sensitive columns: name, email, phone, URLs, notes, resume, consent, representation, salary, location, source, scoring, status
- consumer: candidate self-service, internal recruiter app, service workflows

### `public.web_job_interest`

- anon: no access
- authenticated candidate: self-only `SELECT`, `INSERT`, `UPDATE` through the owned candidate row
- authenticated staff: read/update for internal review workflows
- service-role: full access
- operations: no anonymous write or delete
- sensitive columns: candidate_id, job_id, job_title, company_name, status, next_action, representation fields, recruiter review fields
- consumer: candidate activity, recruiter review, service workflows

### `public.jobs`

- anon: no broad browser access
- authenticated staff: select/insert/update for internal workflows
- service-role: full access
- operations: candidate browsing should not depend on this table
- sensitive columns: operational status, source intelligence, extraction fields, descriptions, internal notes
- consumer: internal job operations, reporting, staff tools

### `public.candidate_web_jobs`

- anon: select published rows only
- authenticated candidate: select published rows only
- authenticated staff: manage publication rows
- service-role: full access
- operations: public `SELECT` only for published jobs; staff manage publication state
- sensitive columns: linked job_id and publication metadata
- consumer: public candidate browsing and publication management

### `public.employer_job_intake`

- anon: no access
- authenticated candidate: no access
- authenticated staff: server-mediated access only if explicitly needed
- service-role: full access
- operations: `INSERT` and `SELECT` only through trusted server flow
- sensitive columns: employer contact fields, intake narrative, fingerprint, status
- consumer: employer intake preview and staff review

### `public.employer_intake_actions`

- anon: no access
- authenticated candidate: no access
- authenticated staff: server-mediated access only if explicitly needed
- service-role: full access
- operations: `INSERT` only through trusted server flow
- sensitive columns: employer note, intake linkage, status
- consumer: employer intake action logging

## Rollout Order

1. Review the app security branch and web security branch together.
2. Back up production Supabase.
3. Ensure Supabase Auth magic-link settings are configured.
4. Deploy the web branch first.
5. Smoke test public jobs and candidate sign-in.
6. Apply the database migrations.
7. Smoke test My Matches, My Activity, Profile, interest actions, and employer preview.
8. Rerun Supabase Advisor.
9. Monitor logs.

## Migration Dependency Reconciliation

`candidate_web_jobs` was missing from the app repo history because the public candidate browsing contract was first created in `terrer-web` via `20260609090000_add_candidate_web_job_publication.sql`. The app hardening branch now owns the security policy for that table, so the app repo must also carry an idempotent table contract before the RLS migration references it.

The app repo now owns that contract in `supabase/migrations/20260708_0000_reconcile_web_publication_and_employer_contracts.sql`. The migration preserves the candidate-facing rule that anonymous users can only read rows where `status = 'published'`.

No web migration was imported unchanged. The original web migration includes seed publication rows and may already be present in production migration history, so the app repo uses a new compatibility migration instead. The related employer intake web migration was also not copied unchanged because its action-table columns differ from the captured live production evidence.

Remaining ownership risk: the web repo still depends on `candidate_web_jobs` and `web_job_interest`, but the app repo is now the database security owner. Before production deployment, verify the production migration ledger, confirm `candidate_web_jobs` exists with the expected columns, confirm `web_job_interest` remains authenticated self-access under web branch `5006e1e`, and validate the migrations in a disposable/local database.

This pass also reconciles the app-owned support tables that feed candidate search, scoring, provenance, and internal matching views: `source_profiles`, `evidence_signals`, `skills`, `candidate_capabilities`, `candidate_scores`, `terrer_companies`, `terrer_company_contacts`, `terrer_jobs`, `terrer_candidates`, `terrer_skills`, `terrer_pipeline`, `job_candidate_matches`, and `outreach_log`. Their app migration owner is `supabase/migrations/20260708_0001_reconcile_advisor_remaining_table_contracts.sql`, sourced from `docs/schema-evidence/live_schema_catalog_ddl.sql`.

These support tables do not change the browser identity boundary. Candidate self-access remains anchored on verified Auth email against `public.candidates`; browser code must not treat `source_profiles`, scores, capabilities, matches, or frozen `terrer_*` records as identity authority. A clean local reset should now be possible for these table dependencies once Docker is available, but view-definition ownership still needs proof before production deployment.

## Error and Recovery States

- no session: prompt sign-in
- session present but no linked candidate: prompt recovery
- duplicate-email match: ambiguous state, no automatic binding
- link revoked: prompt re-claim or support
- claim ambiguous: no automatic binding
- auth mismatch: block browser candidate reads until verified
