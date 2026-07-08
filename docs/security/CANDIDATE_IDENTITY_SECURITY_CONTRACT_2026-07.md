# Candidate Identity Security Contract

Date: 2026-07

This contract describes the secure target state for candidate identity, ownership, browsing, and interest tracking.

It is written for the `terrer-web` implementation and for future RLS/policy migration review.

## Core Rules

1. `auth.uid()` is the authoritative candidate ownership source.
2. `localStorage` is only a UX cache.
3. Browser code must not rely on `candidate_id`, candidate email, or candidate name as an authorization boundary.
4. No anonymous candidate PII read is allowed.
5. No anonymous UPDATE or DELETE is allowed.
6. Public browsing stays on a deliberate publication contract such as `candidate_web_jobs`.
7. Employer preview remains server-only and returns anonymized data only.

## Sign-In Flow

1. The user signs in with Supabase Auth.
2. The browser reads the current session from Supabase Auth.
3. The browser may read its own `public.profiles` row to determine app role and active state.
4. The browser then requests the linked candidate record through a narrow server endpoint or self-only database policy.
5. If no candidate link exists, the app shows a claim state rather than guessing by email or localStorage.

## Candidate Ownership Model

### Proposed mapping relation

Use a dedicated mapping relation instead of overloading `public.candidates`:

- `public.candidate_auth_links`

Recommended columns:

- `candidate_id uuid not null references public.candidates(candidate_id) on delete cascade`
- `auth_user_id uuid not null references auth.users(id) on delete cascade`
- `verified_email text null`
- `claim_source text not null`
- `claim_status text not null default 'linked'`
- `claimed_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `claimed_by uuid null references auth.users(id) on delete set null`
- `claim_notes text null`

Recommended constraints:

- unique `(candidate_id)`
- unique `(auth_user_id)`
- optional unique `(verified_email)` only if the verified-email path is approved for the recovery workflow

### Why a mapping table is preferred

- It preserves the current `candidates` shape.
- It prevents one account from claiming multiple unrelated profiles.
- It prevents multiple accounts from claiming the same profile.
- It supports re-linking during recovery without rewriting candidate business fields.
- It gives an auditable claim history when paired with row timestamps and an optional event log.

### Claim flow

1. The browser submits a claim request after verified auth sign-in.
2. A trusted server endpoint verifies the auth session and reads `auth.uid()` plus the verified email claim.
3. The server finds the intended candidate by approved recovery rules.
4. If exactly one safe match exists, the server inserts or updates `candidate_auth_links`.
5. If there is ambiguity, the request is routed to manual review.

### Duplicate-email handling

Do not bind solely by email.

Recommended handling:

- exact verified auth email may be a hint
- if multiple candidate rows share the same email, do not auto-link
- require manual review or a one-time claim token
- prefer the candidate ID already known to the internal claim workflow

### Future recovery

Recovery should support:

- verified auth re-login
- admin-assisted re-linking
- revocation and re-claim
- duplicate email resolution without exposing full candidate lists

## Browser Access Contract

### Allowed from browser

- `public.candidate_web_jobs`
- `public.candidates` only for the signed-in owner row, after claim link exists and RLS enforces self-only access
- `public.web_job_interest` only for the signed-in owner row, after claim link exists and RLS enforces self-only access
- `public.profiles` only for the signed-in user row and only for role/active-state checks

### Not allowed from browser

- anonymous `public.candidates` access
- anonymous `public.web_job_interest` access
- browser access to `public.employer_job_intake`
- browser access to `public.employer_intake_actions`
- browser access to employer preview candidate lists

### LocalStorage assumptions to remove

- `terrer_candidate_id` is not authoritative
- `terrer_candidate_email` is not authoritative
- `terrer_candidate_name` is not authoritative

These values may remain as UX cache only and must be ignored when auth ownership is absent.

## Table Access Contract

### `public.candidates`

- anon: no access
- authenticated candidate: self-only select and self-only update on owned row
- authorised recruiter/admin: select all, update scoped by role policy
- service-role: full access
- operations: no anonymous read, update, or delete
- sensitive columns: name, email, phone, URLs, notes, resume, consent, representation, salary, location, source, scoring, status
- consumer: candidate self-service, internal recruiter app, service workflows

### `public.web_job_interest`

- anon: no access
- authenticated candidate: self-only select/insert/update on owned row
- authorised recruiter/admin: read all and limited internal status updates
- service-role: full access
- operations: no anonymous write or delete
- sensitive columns: candidate_id, job_id, job_title, company_name, status, next_action, representation fields, recruiter review fields
- consumer: candidate activity, recruiter review, service workflows

### `public.jobs`

- anon: no browser access for candidate pages
- authenticated candidate: no direct dependency for candidate browsing
- authorised recruiter/admin: select all; insert/update only through staff workflows
- service-role: full access
- operations: browser candidate pages should not depend on this table
- sensitive columns: operational status, source intelligence, extraction fields, descriptions, internal notes
- consumer: internal job operations, reporting, staff tools

### `public.candidate_web_jobs`

- anon: select published rows only
- authenticated candidate: select published rows only
- authorised recruiter/admin: manage publication rows
- service-role: full access
- operations: public SELECT only for published jobs; staff manage publication state
- sensitive columns: linked job_id and publication metadata
- consumer: public candidate browsing and publication management

### `public.employer_job_intake`

- anon: no access
- authenticated candidate: no access
- authorised recruiter/admin: server-mediated access only
- service-role: full access
- operations: INSERT and SELECT only through trusted server flow
- sensitive columns: employer contact fields, intake narrative, fingerprint, status
- consumer: employer intake preview and staff review

### `public.employer_intake_actions`

- anon: no access
- authenticated candidate: no access
- authorised recruiter/admin: server-mediated access only
- service-role: full access
- operations: INSERT only through trusted server flow
- sensitive columns: employer note, intake linkage, status
- consumer: employer intake action logging

## Rollout Order

1. Deploy compatible web changes first.
2. Add candidate ownership support.
3. Enable strict candidate self-only RLS.
4. Remove anonymous candidate PII access.
5. Tighten employer preview and staff-only flows.
6. Verify smoke tests and only then consider further hardening.

## Error and Recovery States

- no session: prompt sign-in
- session present but no linked candidate: prompt claim flow
- duplicate claim detected: manual review
- link revoked: prompt re-claim or support
- claim ambiguous: no automatic binding
- auth mismatch: block browser candidate reads until verified

