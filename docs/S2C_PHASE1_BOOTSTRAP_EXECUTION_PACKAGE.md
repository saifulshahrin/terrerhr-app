# Phase S2C.1 Bootstrap Validation Execution Package

## Objective

Define the exact execution package for the first live S2C validation activity: disposable project identity, disposable auth bootstrap, disposable profile bootstrap, and validation evidence.

S2C Phase 1 is intentionally narrow. It does not include schema reconstruction, functions, triggers, views, storage, business fixtures, migrations, production, or application testing.

This document is documentation only. It does not create a project, create users, execute SQL, modify schema, modify auth, or touch production.

## Scope

### In scope

- Disposable Supabase project identification.
- Disposable project verification.
- Disposable auth bootstrap planning.
- Disposable profile bootstrap planning.
- Auth/profile validation assertions.
- Evidence collection requirements.
- Failure and rollback procedure.

### Not in scope

- Schema reconstruction.
- Database functions.
- Triggers.
- Views.
- Storage buckets or storage policies.
- Business fixtures.
- Migrations.
- Production.
- Application testing.
- Edge Function deployment.

## Required Human Approvals

Human approval is required before each of these actions:

1. Creating or selecting the disposable Supabase project.
2. Linking any local tooling to the disposable project.
3. Creating disposable Auth users.
4. Creating matching `public.profiles` rows.
5. Executing any SQL or API write required for profile creation.
6. Reading or recording disposable project metadata.
7. Writing evidence artifacts that include project identifiers.
8. Cleaning up or deleting disposable Auth users, profile rows, or the project.

No approval for Phase 1 authorizes schema reconstruction, storage changes, fixtures, migrations, application testing, or production access.

## Disposable Project Requirements

The disposable project must be:

- Clearly named as disposable, recommended pattern: `terrer-s2c-bootstrap-YYYYMMDD`.
- Separate from production.
- In a known organization/workspace.
- In a known region.
- Empty or safe for throwaway validation.
- Free of production data.
- Free of production credentials.
- Assigned a teardown owner.
- Assigned a target cleanup date.
- Verified before any auth/profile write occurs.

Required project metadata to record without secrets:

- Project name.
- Project ref, redacted if needed in public reports.
- Organization/workspace.
- Region.
- Project creation date.
- PostgreSQL version if visible.
- Auth provider settings relevant to email/password test users.
- Whether email confirmation is required for test users.
- Evidence directory path.
- Teardown owner and cleanup date.

## Auth User Creation Plan

Minimum required disposable Auth users:

| User fixture | Purpose | Required role expectation | Required approval | Notes |
|---|---|---|---|---|
| `s2c_admin` | Admin positive control. | `admin` via matching profile row. | Yes | Must be a real disposable Supabase Auth user. |
| `s2c_recruiter` | Non-admin positive control. | `recruiter` via matching profile row. | Yes | Must be a real disposable Supabase Auth user. |

Optional, not required for Phase 1:

- `s2c_bd`
- `s2c_inactive`
- `s2c_no_profile`

Auth user rules:

- Use synthetic non-production email addresses only.
- Do not use real names, real candidates, real clients, or real employee data.
- Do not record passwords, tokens, session cookies, refresh tokens, API keys, or service-role keys.
- Do not reuse production user IDs.
- Do not create users in production.

## Profile Creation Plan

Minimum required `public.profiles` rows:

| Profile fixture | Required fields | Relationship | Expected state |
|---|---|---|---|
| `PROFILE-ADMIN-001` | `id`, `email`, `full_name`, `role`, `is_active` | `id = s2c_admin auth.users.id` | `role = admin`, `is_active = true` |
| `PROFILE-REC-001` | `id`, `email`, `full_name`, `role`, `is_active` | `id = s2c_recruiter auth.users.id` | `role = recruiter`, `is_active = true` |

Profile creation rules:

- Profile rows must be created only in the disposable project.
- `profiles.id` must exactly match the corresponding disposable `auth.users.id`.
- Profile emails must be synthetic and correspond to disposable Auth users.
- Profile rows must not reference production users.
- Profile creation method must be explicitly approved before any write.

## Validation Assertions

Phase 1 only validates the bootstrap subset of `docs/S2C_VALIDATION_ASSERTION_MATRIX.md`.

Required Phase 1 assertions:

| Assertion ID | Area | Expected result | Stop condition |
|---|---|---|---|
| `AUTH-001` | Auth | Target matches disposable project only. | Stop if target is unknown or production-like. |
| `AUTH-002` | Auth | One synthetic admin auth user exists. | Stop if admin user cannot be created/confirmed. |
| `AUTH-003` | Auth | One synthetic recruiter auth user exists. | Stop if recruiter user cannot be created/confirmed. |
| `PROF-001` | Profiles | Admin `profiles.id` matches admin auth user ID. | Stop if row missing, FK fails, or ID mismatch occurs. |
| `PROF-002` | Profiles | Recruiter `profiles.id` matches recruiter auth user ID. | Stop if row missing, FK fails, or ID mismatch occurs. |
| `PROF-004` | Profiles | Positive-control profiles have `is_active = true`. | Stop if active state is missing or false. |
| `ROLE-001` | Roles | Admin profile role is `admin`. | Stop if role is missing or wrong. |
| `ROLE-002` | Roles | Recruiter profile role is `recruiter`. | Stop if role is missing or wrong. |
| `SEC-001` | Security boundary | No production project ref, credentials, data, or storage objects are used. | Stop all execution immediately if violated. |
| `SEC-002` | Security boundary | Evidence artifacts contain no secrets or PII. | Stop evidence publication; redact/remove. |

Not validated in Phase 1:

- RLS behavior.
- Storage behavior.
- Schema reconstruction.
- Candidate/job/submission workflows.
- Public web-layer workflows.
- Application smoke tests.

## Exact Actions To Be Performed During Bootstrap Validation

If explicit Phase 1 execution approval is granted, perform actions in this exact order:

| Step | Action | Owner | Required approval | Expected output | Stop condition | Rollback action if applicable |
|---:|---|---|---|---|---|---|
| 1 | Confirm Phase 1 approval is explicit, current, and limited to bootstrap validation. | Human | Yes | Written approval with scope boundary. | Approval is absent, broad, or ambiguous. | Do not proceed. |
| 2 | Confirm current branch is `schema-s1-stabilization`. | Codex | No | Branch name recorded. | Wrong branch. | Stop and ask before switching. |
| 3 | Confirm Git working tree is clean. | Codex | No | Clean status recorded. | Uncommitted files exist. | Stop and ask how to handle them. |
| 4 | Confirm Phase 1 excludes schema reconstruction, storage, fixtures, migrations, and app tests. | Human/Codex | Yes | Scope boundary recorded. | Any extra scope is requested implicitly. | Stop and require revised approval. |
| 5 | Create or select disposable Supabase project. | Human | Yes | Disposable project exists or is selected. | Project may be production or identity unclear. | Abandon target; do not link tooling. |
| 6 | Record disposable project name, ref, organization/workspace, and region without secrets. | Human/Codex | Yes | Project identity evidence. | Project ref cannot be verified. | Stop; do not configure tooling. |
| 7 | Confirm project is isolated from production. | Human | Yes | Isolation confirmation. | Any production relation is detected. | Stop and discard target by approval. |
| 8 | Record disposable Auth settings relevant to test users. | Human/Codex | Yes | Auth settings evidence. | Settings unavailable or target uncertain. | Stop and document unknowns. |
| 9 | Prepare local-only disposable environment context if required. | Human | Yes | Disposable local values available outside Git. | Values point to production or are committed. | Remove local values; stop. |
| 10 | Confirm secrets and local env files remain unstaged/uncommitted. | Codex | No | Safe Git status. | Secret/local file is staged or modified. | Stop; unstage only with approval. |
| 11 | Link local tooling to disposable project only if required for Phase 1. | Codex | Yes | Tooling target verified. | Link points to production or unknown project. | Stop; unlink only with approval. |
| 12 | Confirm target project ref before any auth/profile write. | Codex | Yes | Target confirmation log. | Target mismatch. | Stop immediately. |
| 13 | Create or confirm `s2c_admin` disposable Auth user. | Human/Codex | Yes | Admin auth user ID recorded without secrets. | User cannot be created/confirmed or target unclear. | Stop; remove user if approved. |
| 14 | Create or confirm `s2c_recruiter` disposable Auth user. | Human/Codex | Yes | Recruiter auth user ID recorded without secrets. | User cannot be created/confirmed or target unclear. | Stop; remove user if approved. |
| 15 | Create or confirm `PROFILE-ADMIN-001` profile row. | Codex | Yes | Profile row exists with `id = s2c_admin auth.users.id`. | FK fails, ID mismatch, role invalid, or target unclear. | Stop; remove row/user if approved. |
| 16 | Create or confirm `PROFILE-REC-001` profile row. | Codex | Yes | Profile row exists with `id = s2c_recruiter auth.users.id`. | FK fails, ID mismatch, role invalid, or target unclear. | Stop; remove row/user if approved. |
| 17 | Validate admin profile fields. | Codex | Yes | Admin profile has `role = admin` and `is_active = true`. | Role/active state invalid. | Stop; correct only with approval. |
| 18 | Validate recruiter profile fields. | Codex | Yes | Recruiter profile has `role = recruiter` and `is_active = true`. | Role/active state invalid. | Stop; correct only with approval. |
| 19 | Record Phase 1 evidence without secrets or PII. | Codex | Yes | Evidence summary exists. | Evidence contains secrets, tokens, passwords, PII, or production data. | Stop; redact/remove evidence. |
| 20 | Human checkpoint: approve cleanup, hold project, or proceed to later S2C phase planning. | Human | Yes | GO/NO-GO decision after bootstrap. | Decision absent or ambiguous. | Pause; leave project inactive with owner/deadline. |

## Evidence Collection Requirements

Evidence must include:

- Branch name and clean working-tree confirmation.
- Written Phase 1 approval reference.
- Disposable project name/ref/region/organization, without secrets.
- Production isolation confirmation.
- Auth settings relevant to test users, without secrets.
- Admin auth user ID, redacted if needed.
- Recruiter auth user ID, redacted if needed.
- Admin profile ID/role/active-state validation.
- Recruiter profile ID/role/active-state validation.
- Confirmation that no production data or credentials were used.
- Cleanup/hold decision.

Evidence must not include:

- Passwords.
- API keys.
- Service-role keys.
- Anon keys.
- Access tokens.
- Refresh tokens.
- Session cookies.
- Production project secrets.
- Production row data.
- PII.

## Failure Criteria

Phase 1 fails or must pause if:

- Human approval is absent or ambiguous.
- Target project identity is uncertain.
- Any production project ref, URL, credential, data, or storage object is detected.
- Disposable Auth users cannot be created or confirmed.
- Matching `profiles` rows cannot be created or confirmed.
- `profiles.id` does not match `auth.users.id`.
- Required roles are invalid or rejected.
- Positive-control profiles are not active.
- Evidence contains secrets or PII.
- Cleanup/hold decision is not recorded.

## Rollback Procedure

Rollback is limited to disposable bootstrap artifacts and requires human approval:

1. Stop all Phase 1 actions.
2. Confirm the target is disposable.
3. Preserve non-secret evidence of the failure.
4. Remove disposable profile rows, if approved.
5. Remove disposable Auth users, if approved.
6. Remove local disposable environment values, if created.
7. Unlink local tooling from the disposable project, if linked and approved.
8. Delete or archive the disposable project, if approved.
9. Record final cleanup/hold state.

If cleanup approval is not granted, mark the disposable project inactive with owner and cleanup deadline.

## Expected Outputs

Successful Phase 1 should produce:

- Verified disposable project identity.
- Verified production isolation.
- Two disposable Auth users:
  - admin
  - recruiter
- Two matching `public.profiles` rows:
  - admin profile
  - recruiter profile
- Evidence that auth IDs match profile IDs.
- Evidence that roles and active state are correct.
- Evidence that no production target, secrets, or PII were used.
- A human checkpoint decision:
  - cleanup now
  - hold disposable project
  - prepare later S2C schema reconstruction phase

## GO / NO-GO Recommendation

Recommendation: **CONDITIONAL GO for Phase 1 only** after explicit human execution approval.

Do not proceed beyond Phase 1 bootstrap validation until the Phase 1 evidence is reviewed and a new approval is granted for any later S2C activity.
