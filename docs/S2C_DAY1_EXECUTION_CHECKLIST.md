# Phase S2C Day 1 Execution Checklist

## Objective

Convert the S2C planning package into a practical Day 1 execution checklist for disposable-project reconstruction validation.

This document does not authorize execution. It is a pre-execution checklist only. No disposable project, users, SQL, migrations, schema changes, auth changes, RLS changes, storage changes, environment changes, application code changes, production changes, or deployment actions are created by this document.

## Prerequisites

- Human approval to begin S2C execution has been granted.
- Branch `schema-s1-stabilization` is clean and synced.
- S2C scope is limited to one isolated disposable Supabase project.
- No production credentials, project refs, storage objects, row data, or PII will be used.
- Required source docs are available:
  - `docs/S2C_EXECUTION_READINESS_PACKAGE.md`
  - `docs/S2C_EXECUTION_ARTIFACT_INVENTORY.md`
  - `docs/S2C_FIXTURE_AND_BOOTSTRAP_SPECIFICATION.md`
  - `docs/S2B_EXACT_LIVE_DRAFT_PACKAGE.md`
  - `docs/schema-evidence/`
- Minimum auth bootstrap is approved:
  - one disposable admin auth user
  - one disposable non-admin auth user
  - matching `public.profiles` rows
  - admin and non-admin roles

## First 20 Actions To Perform During S2C Execution

| Step | Action | Owner | Required approval | Expected output | Stop condition | Rollback action if applicable |
|---:|---|---|---|---|---|---|
| 1 | Confirm Day 1 execution approval is explicit and current. | Human | Yes | Written approval to start Day 1. | Approval is absent or ambiguous. | Do not proceed. |
| 2 | Confirm current branch is `schema-s1-stabilization`. | Codex | No | Branch name recorded. | Wrong branch. | Stop and ask before switching. |
| 3 | Confirm Git working tree is clean. | Codex | No | Clean status recorded. | Uncommitted files exist. | Stop and ask whether to commit/stash/ignore. |
| 4 | Confirm no execution commands have run yet. | Codex | No | Execution boundary recorded. | Prior unexpected execution found. | Stop and document. |
| 5 | Create/select disposable Supabase project. | Human | Yes | Disposable project exists or selected. | Production project selected or project identity unclear. | Abandon target; do not link. |
| 6 | Record disposable project name, ref, organization, and region without secrets. | Human/Codex | Yes | Project identity evidence. | Project ref cannot be verified. | Stop; do not configure tooling. |
| 7 | Confirm project is isolated from production. | Human | Yes | Isolation confirmation. | Any production relation detected. | Stop and discard target. |
| 8 | Record platform settings: PostgreSQL, Auth, Storage, extensions, exposed schemas. | Codex | Yes | Settings evidence artifact. | Settings unavailable or target uncertain. | Stop and document unknowns. |
| 9 | Prepare local-only disposable environment context. | Human | Yes | Local values available outside Git. | Values point to production or are committed. | Remove local values; stop. |
| 10 | Confirm `.env`, `.env.local`, `.env.txt`, secrets, and local config remain untracked/unstaged. | Codex | No | Safe Git status. | Credential file is staged or modified. | Unstage only with approval; stop. |
| 11 | Link local tooling to disposable project only, if required. | Codex | Yes | Tooling target verified. | Link points to production or unknown project. | Unlink/stop with approval. |
| 12 | Confirm target project ref before any SQL-capable command. | Codex | Yes | Target confirmation log. | Target mismatch. | Stop immediately. |
| 13 | Prepare reconstruction input artifact list from existing evidence. | Codex | No | Artifact checklist. | Required evidence missing. | Stop and document gap. |
| 14 | Prepare execution evidence directory, if approved. | Codex | Yes | Evidence location exists. | Directory would include secrets or production data. | Stop; choose safe path. |
| 15 | Create/confirm disposable admin auth user. | Human/Codex | Yes | Admin auth user ID recorded without secrets. | Auth user cannot be created or target unclear. | Stop; remove user if approved. |
| 16 | Create/confirm disposable non-admin auth user. | Human/Codex | Yes | Non-admin auth user ID recorded without secrets. | Auth user cannot be created or target unclear. | Stop; remove user if approved. |
| 17 | Create/confirm matching admin `profiles` row. | Codex | Yes | `profiles.id = admin auth.users.id`. | FK fails or role invalid. | Stop; remove row/user if approved. |
| 18 | Create/confirm matching non-admin `profiles` row. | Codex | Yes | `profiles.id = non-admin auth.users.id`. | FK fails or role invalid. | Stop; remove row/user if approved. |
| 19 | Validate profile bootstrap assumptions. | Codex | Yes | Admin/non-admin profile state recorded. | Profile linkage, role, or active state invalid. | Stop; correct only with approval. |
| 20 | Decide whether to proceed to schema reconstruction. | Human | Yes | GO/NO-GO checkpoint. | Any bootstrap or isolation issue remains. | Stop; keep/discard disposable project by approval. |

## Day 1 Checklist

| Step | Action | Owner | Required approval | Expected output | Stop condition | Rollback action if applicable |
|---:|---|---|---|---|---|---|
| 21 | Reconfirm disposable project target before reconstruction. | Codex | Yes | Target ref logged. | Target mismatch or uncertainty. | Stop immediately. |
| 22 | Begin canonical object reconstruction in approved dependency order. | Codex | Yes | Initial schema objects created in disposable project. | Any production target detected. | Stop; preserve evidence; cleanup disposable only. |
| 23 | Reconstruct sequence and root tables. | Codex | Yes | Root objects present. | DDL dependency failure. | Classify failure; stop affected path. |
| 24 | Reconstruct first-level and relationship tables. | Codex | Yes | Dependent tables present. | FK, extension, or type failure. | Classify and document. |
| 25 | Reconstruct execution tables. | Codex | Yes | `ai_assessments`, `submissions`, `activity_log` present. | Critical table failure. | Stop workflow validation. |
| 26 | Reconstruct required functions. | Codex | Yes | Functions present. | Function body/signature failure. | Stop dependent triggers/RPC tests. |
| 27 | Reconstruct required triggers. | Codex | Yes | Triggers present. | Trigger creation failure. | Stop affected table validation. |
| 28 | Reconstruct required views. | Codex | Yes | Views present. | View dependency failure. | Stop view validation and document missing dependency. |
| 29 | Reconstruct grants, policies, constraints, indexes, and sequences. | Codex | Yes | Security/evidence layer present. | Dangerous unexpected permission behavior. | Stop security validation. |
| 30 | Configure disposable `candidate-resumes` bucket and policies. | Codex | Yes | Bucket/policy evidence recorded. | Storage target unclear or policy fails. | Remove bucket/objects if approved. |
| 31 | Configure disposable `bd-photo-intake` bucket and policies. | Codex | Yes | Bucket/policy evidence recorded. | Storage target unclear or policy fails. | Remove bucket/objects if approved. |
| 32 | Load minimum synthetic business fixtures. | Codex | Yes | Non-PII rows loaded. | Fixture references production data or PII. | Stop and delete fixture rows if approved. |
| 33 | Upload synthetic storage files. | Codex | Yes | Test files uploaded. | File path or access target unsafe. | Remove files if approved. |
| 34 | Validate table row counts. | Codex | Yes | Row-count evidence. | Counts mismatch expected fixtures. | Classify as fixture/schema gap. |
| 35 | Validate constraints, FKs, indexes, and sequences. | Codex | Yes | Structural validation evidence. | Critical contract drift. | Stop affected workflow path. |
| 36 | Validate `is_current_user_admin()` for admin and non-admin. | Codex | Yes | Admin true, non-admin false. | Incorrect result. | Stop security validation. |
| 37 | Validate `create_submission_with_activity(...)`. | Codex | Yes | Submission and activity side effects. | RPC failure or unexpected mutation. | Stop execution workflow validation. |
| 38 | Validate submission and activity triggers. | Codex | Yes | Expected timestamp/stage/next-action behavior. | Trigger side effects differ. | Classify and stop dependent checks. |
| 39 | Validate company updated-at trigger behavior. | Codex | Yes | Duplicate trigger behavior documented. | Conflicting or unstable timestamps. | Record as target-design blocker. |
| 40 | Validate candidate search and pipeline views. | Codex | Yes | Expected synthetic view rows. | Missing/incorrect outputs. | Classify as fixture or view drift. |
| 41 | Validate public intake behavior. | Codex | Yes | Expected anon/auth behavior for public intake rows. | Unexpected broad write/read behavior. | Stop public-security validation. |
| 42 | Validate candidate-derived rows. | Codex | Yes | Skills, scores, capabilities evidence. | Joins fail or duplicates appear. | Classify as contract gap. |
| 43 | Validate autonomous recruiter fixtures. | Codex | Yes | Run/memory rows readable as expected. | Writer/lifecycle assumptions fail. | Classify as operational gap. |
| 44 | Validate RLS allow/deny behavior by role. | Codex | Yes | Role-policy matrix evidence. | Dangerous allow or unexpected deny. | Stop security-sensitive validation. |
| 45 | Validate storage upload/read/update/delete/signed-access behavior. | Codex | Yes | Storage behavior evidence. | Unsafe access or platform drift. | Stop storage validation; cleanup if approved. |
| 46 | Generate Supabase types from disposable project. | Codex | Yes | Generated type artifact. | Type generation fails. | Classify platform/schema drift. |
| 47 | Compare generated types against canonical contracts. | Codex | Yes | Type comparison evidence. | Critical contract mismatch. | Stop baseline migration readiness. |
| 48 | Run approved build/smoke checks against disposable config only. | Codex | Yes | Build/smoke result. | Config points to production. | Stop; remove local config. |
| 49 | Classify every failure using S2C failure classes. | Codex | No | Failure register. | Unclassified failure remains. | Continue evidence documentation only. |
| 50 | Produce Day 1 evidence summary. | Codex | No | Evidence summary document. | Evidence includes secrets/PII. | Remove/redact before saving. |
| 51 | Human checkpoint: continue, pause, or teardown. | Human | Yes | Continuation decision. | Human decision absent. | Pause with disposable project inactive. |
| 52 | Execute cleanup/teardown only if approved. | Human/Codex | Yes | Cleanup evidence. | Approval absent. | Leave project inactive with owner/deadline. |

## Disposable Supabase Project Creation

- Owner: Human.
- Required approval: explicit approval before creation.
- Expected output: disposable project name, project ref, region, organization/workspace, and teardown owner.
- Stop condition: any ambiguity that the selected target may be production.
- Rollback action: abandon the target and do not link tooling; delete only with explicit approval.

## Disposable Project Verification

- Confirm project ref, URL, region, and organization.
- Confirm no production project ref is active.
- Confirm no production credentials are loaded.
- Confirm no production storage objects are visible.
- Record platform settings without secrets.

## Environment Setup

- Environment values must be local-only and uncommitted.
- Values must use disposable project credentials only.
- Codex must verify Git status before and after any environment-related step.
- Stop if any `.env`, `.env.local`, `.env.txt`, secret, token, key, or local config becomes staged.

## Auth Bootstrap Creation

Minimum required:

- `s2c_admin` real disposable Supabase Auth user.
- `s2c_recruiter` or equivalent real disposable Supabase Auth non-admin user.
- No real person data.
- No production auth users.
- No passwords, tokens, or sessions recorded in docs.

## Profile Bootstrap Validation

Minimum required:

- Admin profile row where `profiles.id = auth.users.id`.
- Non-admin profile row where `profiles.id = auth.users.id`.
- Admin role is `admin`.
- Non-admin role is `recruiter` or `bd`.
- Both positive-control profiles have `is_active = true`.
- `is_current_user_admin()` returns expected true/false results.

## Reconstruction Preparation

Before reconstruction:

- Confirm approved object inventory.
- Confirm source-of-truth hierarchy.
- Confirm evidence directory.
- Confirm exact-live versus target-design distinctions.
- Confirm `rls_auto_enable()` and `ensure_rls` handling.
- Confirm duplicate company trigger handling.
- Confirm storage buckets and synthetic file paths.

## Evidence Collection Requirements

Evidence must include:

- Target project verification.
- Platform settings.
- Object reconstruction results.
- Auth/profile bootstrap results.
- Fixture load row counts.
- Function outputs.
- Trigger side effects.
- View outputs.
- RLS allow/deny matrix.
- Storage operation results.
- Generated type comparison.
- Failure classification.
- Cleanup/teardown status.

Evidence must not include:

- Secrets.
- API keys.
- Passwords.
- Tokens.
- Production row data.
- PII.

## Failure Handling

Failure classes:

- `BLOCKER`: stop execution.
- `CRITICAL_DRIFT`: stop affected workflow validation.
- `SECURITY_DRIFT`: stop security-sensitive validation.
- `PLATFORM_DRIFT`: document platform incompatibility and pause affected checks.
- `CONTRACT_GAP`: continue only if isolated and documented.
- `FIXTURE_GAP`: repair fixture only with approval.
- `NON_BLOCKING_WARNING`: record and continue if safe.

Any production target, credential leak, or PII exposure is an immediate stop condition.

## Human Approval Checkpoints

Human approval is required before:

1. Starting Day 1 execution.
2. Creating/selecting the disposable project.
3. Linking tooling to the disposable project.
4. Creating local-only disposable environment configuration.
5. Executing SQL.
6. Creating auth users.
7. Creating `profiles` rows.
8. Creating storage buckets, policies, or objects.
9. Loading synthetic fixtures.
10. Running app checks against disposable configuration.
11. Cleaning up or deleting the disposable project.
12. Proceeding from Day 1 to baseline migration design.

## Estimated Duration

Estimated Day 1 duration:

- Project creation and verification: 30-60 minutes.
- Environment setup: 30-45 minutes.
- Auth/profile bootstrap: 30-60 minutes.
- Reconstruction preparation and initial execution: 2-4 hours.
- Core validation and evidence collection: 3-5 hours.
- Day 1 summary and checkpoint: 30-60 minutes.

Expected total: **1 working day** for a clean run. If auth, storage, platform, or fixture issues appear, expect **2-3 working days**.

## GO / NO-GO Recommendation

**Recommendation: CONDITIONAL GO for Day 1 only.**

Proceed only if the human explicitly approves disposable-project execution and the first 20 actions are treated as hard gates. If project identity, credentials, bootstrap, or profile validation fails, stop before schema reconstruction.

S2C remains forbidden until that explicit approval is granted.
