# Phase S2C Fixture and Bootstrap Specification

## Objective

Define the minimum synthetic auth/profile state required before Terrer can be reconstructed and validated in an isolated disposable Supabase project.

This specification is documentation-only. It does not create SQL, migrations, a disposable project, auth users, profile rows, schema changes, RLS changes, storage changes, application code changes, or any execution steps.

## Most Important Answer

**Minimum synthetic state required before Terrer can be reconstructed and validated:**

Terrer needs at least **two real Supabase Auth users in the disposable project**, each with a matching row in `public.profiles`, plus one optional negative-control auth state.

Minimum viable state:

1. One authenticated **admin** user in Supabase Auth.
2. One authenticated **non-admin recruiter or BD** user in Supabase Auth.
3. One `public.profiles` row for each real auth user, where `profiles.id = auth.users.id`.
4. Profile roles constrained to the live contract: `admin`, `recruiter`, or `bd`.
5. `is_active = true` for the two positive-control users.
6. Synthetic business fixtures that reference those profile IDs wherever user ownership or policy behavior requires it.
7. Optional negative-control case: an auth user with no profile, inactive profile, or non-admin role to validate deny behavior.

Without this state, S2C can validate structural DDL but cannot responsibly validate authenticated workflows, admin behavior, profile-dependent policies, BD notes ownership, recruiter execution behavior, or the `is_current_user_admin()` helper.

## 1. Why Auth/Profile Bootstrap Is the Biggest Blocker

The schema can be reconstructed physically without working auth fixtures, but Terrer cannot be validated as an operating system without them.

The blocker exists because:

- `profiles.id` depends on `auth.users(id)`.
- `profiles.role` controls admin/recruiter/BD behavior.
- `profiles.is_active` affects whether a user should be treated as operationally valid.
- `is_current_user_admin()` depends on the current authenticated user and `profiles`.
- Profile and note policies depend on auth identity.
- Some recruiter/BD workflows require authenticated ownership semantics.
- Supabase Auth users are platform-managed objects, not ordinary public-table rows.

This means a disposable rebuild must include real disposable Supabase Auth identities, not only simulated UUIDs in public tables.

## 2. Dependencies Discovered

The auth/profile validation chain is:

`Supabase Auth` → `auth.users` → `public.profiles` → `is_current_user_admin()` → profile-dependent policies and authenticated app workflows.

Related dependencies:

- `profiles` primary key is also a foreign key to `auth.users(id)`.
- `profiles.role` is constrained to `admin`, `recruiter`, and `bd`.
- `profiles` is read by app authentication context and admin helper logic.
- `bd_notes` and other user-owned behavior depend on authenticated user identity.
- Broad grants and current RLS posture are evidence to validate, not final security approval.
- Storage tests need role-aware users for authenticated upload/read behavior.

## 3. Required Auth Objects

The disposable project must provide real Supabase-managed auth objects:

| Auth object | Required? | Purpose |
|---|---:|---|
| Admin auth user | Yes | Positive-control admin behavior and `is_current_user_admin()` success case. |
| Non-admin auth user | Yes | Authenticated non-admin behavior and admin-deny control. |
| Optional no-profile auth user | Recommended | Negative-control behavior for missing profile. |
| Optional inactive-profile auth user | Recommended | Negative-control behavior for inactive profile. |

Required auth attributes to record without exposing secrets:

- User ID.
- Email address using synthetic domain.
- Confirmation status.
- Creation method.
- Whether password, magic link, or admin-created fixture was used.
- Whether the user is admin, non-admin, missing-profile, or inactive-profile in the test design.

Do not record passwords, tokens, session cookies, refresh tokens, API keys, or service-role values.

## 4. Required Profile Objects

Each positive-control auth user must have one matching `public.profiles` row.

Minimum required profile fields:

| Field | Required fixture behavior |
|---|---|
| `id` | Must equal the disposable `auth.users.id`. |
| `email` | Synthetic email matching or clearly corresponding to auth email. |
| `full_name` | Synthetic non-PII display name. |
| `role` | One of `admin`, `recruiter`, or `bd`. |
| `is_active` | `true` for positive controls. |
| timestamp fields | May use disposable project defaults if present. |

Recommended fixture profile roles:

- `admin` for administrative validation.
- `recruiter` for recruitment execution validation.
- `bd` if BD ownership and BD note behavior are tested separately.

If only two users are allowed, use `admin` and `recruiter`, and simulate BD ownership with the recruiter only where policies permit. If BD-specific behavior must be validated, add a third real auth user.

## 5. Required Seeded Users/Roles

Minimum role set:

| Fixture user | Auth source | Profile role | Active? | Purpose |
|---|---|---|---:|---|
| `s2c_admin` | Real disposable auth user | `admin` | Yes | Admin helper success, admin-readable policy checks. |
| `s2c_recruiter` | Real disposable auth user | `recruiter` | Yes | Standard authenticated workflow checks. |

Recommended expanded role set:

| Fixture user | Auth source | Profile role | Active? | Purpose |
|---|---|---|---:|---|
| `s2c_bd` | Real disposable auth user | `bd` | Yes | BD notes/company relationship checks. |
| `s2c_inactive` | Real disposable auth user | `recruiter` or `bd` | No | Inactive-profile negative control. |
| `s2c_no_profile` | Real disposable auth user | None | N/A | Missing-profile negative control. |

All users must use synthetic non-production email addresses and no real person data.

## 6. Required Test Fixtures

Auth/profile fixtures must support the wider S2C validation matrix.

Minimum business fixtures:

- One synthetic company.
- One synthetic BD contact linked to the company.
- One synthetic BD note owned by an authenticated user.
- One synthetic job linked to the company or company name context.
- One synthetic job intake row.
- One synthetic job requirement row.
- One synthetic candidate.
- One synthetic source profile linked to the candidate.
- One synthetic skill.
- One synthetic candidate-skill relationship.
- One synthetic candidate score.
- One synthetic candidate capability row, if included.
- One synthetic AI assessment linking candidate and job.
- One synthetic submission linking candidate and job.
- One synthetic activity log row for trigger validation.
- One synthetic public `web_candidate_intakes` row.
- One synthetic public `web_job_interest` row.
- One synthetic autonomous recruiter run.
- One synthetic autonomous recruiter memory row.
- One synthetic file for `candidate-resumes`.
- One synthetic file for `bd-photo-intake`.

These fixtures should be minimal, deterministic, non-PII, and designed to make views/functions/triggers return predictable results.

## 7. Minimum Viable Bootstrap State

The smallest acceptable bootstrap state is:

1. Real disposable Supabase Auth admin user.
2. Real disposable Supabase Auth recruiter user.
3. Matching `profiles` row for admin.
4. Matching `profiles` row for recruiter.
5. Synthetic company.
6. Synthetic candidate.
7. Synthetic job.
8. Synthetic submission or activity fixture for execution validation.
9. Synthetic resume file.
10. Confirmed role-policy test sessions for admin and recruiter.

This state is sufficient to validate:

- `profiles` FK linkage to `auth.users`.
- `is_current_user_admin()` positive and negative cases.
- Authenticated reads/writes that depend on `auth.uid()`.
- Basic recruiter execution flow.
- Candidate/job/submission relationships.
- Storage behavior for authenticated users.

It is not sufficient to fully validate marketplace intake, BD-specific behavior, candidate-derived matching, AI memory, or all view outputs. Those need the expanded fixtures listed above.

## 8. Validation Sequence

Execution is not approved yet. If later approved, validate bootstrap in this order:

1. Confirm target is the disposable project.
2. Confirm no production credentials or project refs are active.
3. Record Auth settings without secrets.
4. Create or confirm real disposable auth users.
5. Create or confirm matching `profiles` rows.
6. Confirm `profiles.id = auth.users.id`.
7. Confirm role values match allowed contract.
8. Confirm active-state values.
9. Validate admin session.
10. Validate non-admin session.
11. Validate `is_current_user_admin()` returns true for admin.
12. Validate `is_current_user_admin()` returns false for non-admin.
13. Validate missing-profile or inactive-profile behavior, if included.
14. Validate profile-dependent table policies.
15. Validate storage behavior using authenticated test users.
16. Load or validate business fixtures.
17. Validate trigger/function/view behavior using fixture owners.
18. Record pass/fail evidence.

## 9. Failure Modes

| Failure mode | Impact | Classification |
|---|---|---|
| Auth user cannot be created in disposable project | Blocks all authenticated validation | `BLOCKER` |
| `profiles` row cannot reference auth user ID | Blocks profile and policy validation | `BLOCKER` |
| Role check rejects required role | Blocks role matrix | `CRITICAL_DRIFT` |
| `is_current_user_admin()` fails for admin | Blocks admin policy validation | `SECURITY_DRIFT` |
| `is_current_user_admin()` succeeds for non-admin | Blocks security validation | `SECURITY_DRIFT` |
| Missing profile behavior is undefined | Creates policy ambiguity | `CONTRACT_GAP` |
| Inactive profile still behaves as active | Creates authorization ambiguity | `SECURITY_DRIFT` |
| Storage tests fail for authenticated user | Blocks storage validation | `PLATFORM_DRIFT` or `SECURITY_DRIFT` |
| Synthetic fixtures cannot link to profile-owned rows | Blocks workflow validation | `FIXTURE_GAP` |

## 10. Assumptions

This specification assumes:

- S2C will use a new isolated disposable Supabase project.
- No production credentials or production row data will be used.
- Supabase Auth is available in the disposable project.
- `auth.users` cannot be simulated only by public-table UUIDs for full validation.
- `profiles` exact live structure and constraints are available from prior evidence.
- The role set remains `admin`, `recruiter`, and `bd`.
- `is_active = true` means the user should be eligible for positive-control validation.
- Documentation-only fixture specification is allowed before execution approval.

## 11. Risks

Key risks:

- Auth fixtures may be created inconsistently if the method is not approved first.
- Role behavior may differ from intended app behavior because current policies are evidence, not final security design.
- Service-role use may be needed for setup, requiring explicit approval and strict isolation.
- Missing-profile and inactive-profile behavior may expose unclear product/security decisions.
- Disposable Supabase platform behavior may differ from live project behavior.
- Overbuilding fixtures could mask the true minimum rebuild requirement.
- Underbuilding fixtures could produce false confidence in reconstruction readiness.

## 12. What Can Be Simulated

The following can be simulated with deterministic non-PII fixture data:

- Profile names and emails.
- Companies, contacts, notes, jobs, candidates, submissions, and activities.
- Skill taxonomy rows.
- Candidate skill/score/capability rows.
- Public web intake rows.
- Autonomous recruiter run and memory rows.
- Resume and BD photo storage files.
- Positive and negative expected results.
- View output assertions.
- Trigger side-effect assertions.

Simulation is appropriate for business data and expected workflow scenarios.

## 13. What Must Come From Real Supabase Auth

The following must come from the disposable Supabase Auth platform:

- Real `auth.users.id` values.
- Authenticated sessions or tokens used for policy tests.
- Role behavior observed through Supabase API calls as `anon` or `authenticated`.
- `auth.uid()` behavior.
- `is_current_user_admin()` behavior under real authenticated context.
- Profile FK enforcement against `auth.users`.
- Missing-profile behavior for an actual authenticated user without a profile row.

These cannot be responsibly proven with public-table UUIDs alone.

## 14. Recommendation for Disposable-Project Validation

Recommendation: **approve this bootstrap strategy as the minimum auth/profile prerequisite for S2C execution planning, but do not execute yet.**

Before execution, create one more documentation artifact:

- `docs/S2C_VALIDATION_ASSERTION_MATRIX.md`

That artifact should define exact expected pass/fail assertions for every canonical table, function, trigger, view, policy, storage bucket, and fixture role.

Once the assertion matrix is approved, S2C can be upgraded from `CONDITIONAL GO` to a tightly scoped execution approval request for a disposable project only.

## Execution Boundary

This specification does not authorize:

- SQL creation or execution.
- Migration creation or application.
- Disposable project creation.
- Auth user creation.
- Profile row creation.
- Schema, RLS, auth, storage, environment, application, production, or deployment changes.

All execution remains forbidden until explicitly approved.
