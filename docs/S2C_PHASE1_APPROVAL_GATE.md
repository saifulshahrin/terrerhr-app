# Phase S2C.1 Approval Gate

## Purpose

Define the exact information and approval statement required before S2C Phase 1 Bootstrap Validation can begin.

S2C Phase 1 is approved in principle only. Execution cannot begin until the disposable Supabase project details are provided and the copy/paste approval statement is confirmed.

This document is documentation only. It does not create a project, create users, execute SQL, create migrations, modify schema, modify auth, modify RLS, modify storage, modify environment, modify application code, or touch production.

## 1. Exact Information Required From User

Before execution can begin, the user must provide:

1. Disposable Supabase project name.
2. Disposable Supabase project ref.
3. Project region.
4. Supabase organization/workspace confirmation.
5. Confirmation that the project is disposable and not production.
6. Confirmation that no production credentials will be used.
7. Confirmation that no production data will be copied or loaded.
8. Confirmation that Phase 1 scope is limited to disposable auth/profile bootstrap validation.
9. Auth email confirmation setting or instruction for handling test-user confirmation.
10. Approval to create or guide creation of two disposable Auth users.
11. Approval to create matching `public.profiles` rows for the two disposable Auth users.
12. Approval to write the validation report document after Phase 1.

## 2. Exact Project Information Required

| Field | Required value |
|---|---|
| Project name | User-provided disposable project name. |
| Project ref | User-provided Supabase project ref. |
| Region | User-provided Supabase region. |
| Organization/workspace | User confirmation. |
| Production status | Must be explicitly confirmed as not production. |
| Teardown owner | User confirmation. |
| Teardown expectation | Delete/hold decision after Phase 1 validation. |

## 3. Auth Settings Assumptions

Phase 1 assumes:

- Supabase Auth is enabled in the disposable project.
- Test users are synthetic and disposable.
- Email confirmation is either disabled for the disposable project or manually handled by the user.
- No real employee, client, candidate, company, or recruiter identity is used.
- No production Auth users are copied or reused.
- Passwords, tokens, session cookies, refresh tokens, API keys, anon keys, and service-role keys are never committed or pasted into documentation.
- If service-role access is required for profile creation, it must be disposable-project-only and explicitly approved at execution time.

## 4. Recommended Disposable Test-User Emails

Use synthetic emails that clearly identify the disposable project and cannot be confused with real users.

Recommended pattern:

- `s2c-admin@bootstrap.invalid`
- `s2c-recruiter@bootstrap.invalid`

Alternative pattern if Supabase rejects `.invalid`:

- `s2c-admin+bootstrap@example.com`
- `s2c-recruiter+bootstrap@example.com`

Rules:

- Do not use real user emails.
- Do not use production admin emails.
- Do not use personal emails.
- Do not use candidate/client/company/contact emails.

## 5. Recommended Naming Conventions

Recommended disposable project name:

- `terrer-s2c-bootstrap-YYYYMMDD`

Recommended fixture labels:

- Auth admin user: `s2c_admin`
- Auth recruiter user: `s2c_recruiter`
- Admin profile: `PROFILE-ADMIN-001`
- Recruiter profile: `PROFILE-REC-001`

Recommended evidence report:

- `docs/S2C_PHASE1_BOOTSTRAP_VALIDATION_REPORT.md`

Recommended evidence notes should use:

- Project name, project ref, and region only.
- Redacted project ref if the report is later shared publicly.
- No secrets or credentials.

## 6. Copy/Paste Approval Statement

The user must provide this exact statement before execution begins:

```text
Approved to proceed with S2C Phase 1 Bootstrap Validation only.

Disposable Supabase project:
- Project name: <PROJECT_NAME>
- Project ref: <PROJECT_REF>
- Region: <REGION>
- Organization/workspace: <ORG_OR_WORKSPACE>

I confirm this project is disposable and is NOT production.
I confirm no production credentials, production data, production Auth users, production storage objects, or PII will be used.
I approve creating or confirming two disposable Auth users only:
- s2c_admin
- s2c_recruiter

I approve creating matching public.profiles rows for those two disposable Auth users only.
I approve recording non-secret validation evidence and creating docs/S2C_PHASE1_BOOTSTRAP_VALIDATION_REPORT.md.

No schema reconstruction, storage work, fixtures beyond auth/profile bootstrap, migrations, application code changes, deployment, production access, or RLS hardening are approved.
```

## 7. Final Pre-Execution Checklist

Before any project creation, linking, auth creation, profile creation, SQL, or validation action:

- [ ] Copy/paste approval statement received.
- [ ] Project name provided.
- [ ] Project ref provided.
- [ ] Region provided.
- [ ] Organization/workspace confirmed.
- [ ] User confirmed the project is disposable and not production.
- [ ] User confirmed no production credentials or data will be used.
- [ ] Auth email confirmation handling is known.
- [ ] Test-user emails are approved.
- [ ] Branch is `schema-s1-stabilization`.
- [ ] Git working tree is clean or only approved documentation changes are pending.
- [ ] No `.env`, `.env.local`, `.env.txt`, secrets, or local config files are staged.
- [ ] Phase 1 scope boundary is restated before execution.
- [ ] First target-verification action is performed before any write.

## 8. First Action Once Approval Is Received

First action:

1. Verify current Git branch and status.
2. Verify the provided project name/ref/region against the approval statement.
3. Confirm the target is disposable and not production.
4. Stop before linking or writing if any value is missing, ambiguous, or production-like.

No auth/profile write should occur until the disposable target is verified.

## 9. First Rollback Action If Execution Must Be Aborted

First rollback action:

- Stop immediately and do not perform the next action.

If any disposable resource has already been created:

1. Confirm the target is disposable.
2. Preserve non-secret evidence of the abort reason.
3. Ask for explicit cleanup approval before deleting users, profile rows, local config, or the disposable project.
4. If cleanup approval is not granted, mark the disposable project inactive with owner and cleanup deadline.

## 10. Execution Boundary

Still forbidden without separate explicit approval:

- Production access.
- Production linking.
- Production credentials.
- Production SQL.
- Schema reconstruction.
- Storage buckets or policies.
- Business fixtures.
- Migrations.
- Application code changes.
- Deployment.
- RLS hardening.
- Baseline migration creation.
