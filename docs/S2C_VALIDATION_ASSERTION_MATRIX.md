# Phase S2C Validation Assertion Matrix

## Purpose

Define the behaviors that must be true after S2C disposable-project reconstruction. This matrix is required before any auth, schema, storage, RLS, fixture, or validation execution begins.

This document is documentation only. It does not authorize SQL execution, user creation, fixture creation, schema changes, Supabase access, deployment, or application code changes.

## Severity Levels

| Severity | Meaning |
|---|---|
| `BLOCKER` | Stop S2C immediately; validation cannot continue responsibly. |
| `CRITICAL` | Stop the affected workflow/security path and require decision. |
| `HIGH` | Continue only if isolated, documented, and explicitly accepted. |
| `MEDIUM` | Record as contract/fixture gap; may continue if not security-sensitive. |
| `LOW` | Non-blocking warning for future cleanup. |

## Assertion Matrix

| Assertion ID | Area | Description | Validation method | Expected result | Severity if failed | Touches auth/RLS/storage/schema | Stop condition if failed |
|---|---|---|---|---|---|---|---|
| `AUTH-001` | Auth | Disposable project target is confirmed before auth work. | Compare project ref/name/URL against approved disposable target. | Target matches disposable project only. | `BLOCKER` | auth | Stop immediately if target is unknown or production-like. |
| `AUTH-002` | Auth | Admin test user exists only in disposable Auth. | Inspect disposable Auth users without recording secrets. | One synthetic admin auth user exists. | `BLOCKER` | auth | Stop if user cannot be created/confirmed or target is unclear. |
| `AUTH-003` | Auth | Recruiter test user exists only in disposable Auth. | Inspect disposable Auth users without recording secrets. | One synthetic recruiter auth user exists. | `BLOCKER` | auth | Stop if user cannot be created/confirmed or target is unclear. |
| `AUTH-004` | Auth | BD test user exists if BD workflow validation is in scope. | Inspect disposable Auth users. | One synthetic BD auth user exists, or BD-specific tests are marked deferred. | `HIGH` | auth | Stop BD-specific checks if missing. |
| `AUTH-005` | Auth | Inactive or no-profile negative fixture exists if negative auth behavior is in scope. | Inspect fixture plan and disposable Auth state. | Negative-control user exists or test is explicitly deferred. | `MEDIUM` | auth | Stop negative-control checks if missing. |
| `PROF-001` | Profiles | Admin auth user has matching `profiles` row. | Compare disposable `auth.users.id` to `profiles.id`. | IDs match exactly. | `BLOCKER` | auth/schema | Stop profile/RLS/admin validation. |
| `PROF-002` | Profiles | Recruiter auth user has matching `profiles` row. | Compare disposable `auth.users.id` to `profiles.id`. | IDs match exactly. | `BLOCKER` | auth/schema | Stop recruiter/app workflow validation. |
| `PROF-003` | Profiles | BD auth user has matching `profiles` row if BD validation is in scope. | Compare disposable `auth.users.id` to `profiles.id`. | IDs match exactly, or BD tests are deferred. | `HIGH` | auth/schema | Stop BD-specific validation if required row is missing. |
| `PROF-004` | Profiles | Positive-control profiles are active. | Inspect `profiles.is_active`. | Admin/recruiter/BD positive controls have `is_active = true`. | `CRITICAL` | auth/schema | Stop role and workflow validation. |
| `ROLE-001` | Roles | Admin profile has role `admin`. | Inspect `profiles.role`. | Admin user role is `admin`. | `BLOCKER` | auth/schema/RLS | Stop admin/RLS validation. |
| `ROLE-002` | Roles | Recruiter profile has role `recruiter`. | Inspect `profiles.role`. | Recruiter user role is `recruiter`. | `CRITICAL` | auth/schema/RLS | Stop recruiter workflow validation. |
| `ROLE-003` | Roles | BD profile has role `bd` if BD validation is in scope. | Inspect `profiles.role`. | BD user role is `bd`, or BD tests are deferred. | `HIGH` | auth/schema/RLS | Stop BD-specific validation. |
| `ROLE-004` | Roles | Invalid role values are rejected. | Attempt only in approved disposable validation. | Role check rejects values outside `admin`, `recruiter`, `bd`. | `CRITICAL` | schema/RLS | Stop profile contract validation. |
| `RLS-001` | RLS | `is_current_user_admin()` returns true for admin session. | Execute helper under disposable admin session if approved. | Returns true. | `BLOCKER` | auth/RLS/schema | Stop admin and security validation. |
| `RLS-002` | RLS | `is_current_user_admin()` returns false for recruiter session. | Execute helper under disposable recruiter session if approved. | Returns false. | `CRITICAL` | auth/RLS/schema | Stop security validation. |
| `RLS-003` | RLS | Missing-profile user does not gain admin behavior. | Execute helper under no-profile session if fixture exists. | Returns false or access denied. | `CRITICAL` | auth/RLS | Stop negative auth validation. |
| `RLS-004` | RLS | Inactive user does not receive unintended privileged access. | Validate role/policy behavior for inactive fixture if included. | No privileged access. | `CRITICAL` | auth/RLS | Stop security validation. |
| `RLS-005` | RLS | Table policies match exact-live evidence layer. | Compare policy behavior against expected allow/deny matrix. | Expected exact-live behavior observed. | `HIGH` | RLS/schema | Stop affected security-sensitive workflow. |
| `RLS-006` | RLS | Dangerous anon access is identified, not normalized as approved target state. | Compare anon results to expected evidence notes. | Unsafe behavior is documented as evidence, not approved design. | `HIGH` | RLS | Stop if unsafe access is unclassified. |
| `STOR-001` | Storage | `candidate-resumes` bucket exists in disposable target only. | Inspect disposable storage bucket list. | Bucket exists with expected config. | `CRITICAL` | storage | Stop resume storage validation. |
| `STOR-002` | Storage | `bd-photo-intake` bucket exists in disposable target only. | Inspect disposable storage bucket list. | Bucket exists with expected config. | `CRITICAL` | storage | Stop BD photo storage validation. |
| `STOR-003` | Storage | Authenticated user can upload synthetic resume object as expected. | Upload synthetic non-PII file under approved path if execution approved. | Upload succeeds or expected denial is documented. | `HIGH` | auth/storage/RLS | Stop resume workflow validation. |
| `STOR-004` | Storage | Authenticated user can read expected synthetic resume object. | Read object using approved role/session. | Read behavior matches exact-live expectation. | `HIGH` | auth/storage/RLS | Stop resume workflow validation. |
| `STOR-005` | Storage | Unauthorized user/anon access behaves as expected for resume bucket. | Attempt access using negative role. | Allow/deny matches expected evidence. | `CRITICAL` | auth/storage/RLS | Stop storage security validation. |
| `STOR-006` | Storage | BD photo object CRUD behavior matches exact-live policy evidence. | Perform synthetic create/read/update/delete if approved. | Behavior matches expected exact-live policy. | `HIGH` | auth/storage/RLS | Stop BD photo validation. |
| `CO-001` | Companies | Synthetic company can be inserted with minimum required fields. | Load synthetic company fixture. | One company row exists. | `CRITICAL` | schema/RLS | Stop BD/job relationship validation. |
| `CO-002` | Companies | Company updated-at trigger behavior is deterministic enough to document. | Update synthetic company and compare timestamp behavior. | Timestamp changes; duplicate trigger behavior documented. | `MEDIUM` | schema | Record target-design issue if unstable. |
| `CO-003` | Companies | Company can relate to contacts, notes, and jobs as expected. | Validate joins/foreign references in synthetic fixtures. | Related fixtures resolve. | `HIGH` | schema | Stop relationship workflow validation. |
| `BD-001` | BD workflows | Synthetic BD contact links to synthetic company. | Validate contact/company relationship. | Contact row references expected company. | `HIGH` | schema/RLS | Stop BD relationship validation. |
| `BD-002` | BD workflows | Synthetic BD note is owned by authenticated user. | Validate note owner/user reference and access behavior. | Owner matches expected auth/profile user. | `HIGH` | auth/RLS/schema | Stop BD note validation. |
| `BD-003` | BD workflows | Non-owner or unauthorized access to BD notes behaves as expected. | Test role-policy behavior if approved. | Allow/deny matches exact-live evidence. | `CRITICAL` | auth/RLS/schema | Stop BD security validation. |
| `JOB-001` | Jobs | Synthetic job can be created with minimum operational fields. | Load synthetic job fixture. | One job row exists. | `CRITICAL` | schema/RLS | Stop demand workflow validation. |
| `JOB-002` | Jobs | Job source relationship resolves if source fixture is used. | Validate job/source join. | Source-related job returns expected data. | `MEDIUM` | schema | Classify fixture gap if missing. |
| `JOB-003` | Jobs | Job intake row exists for requirement capture validation. | Load/check `jobs_intake` fixture. | One intake row exists. | `HIGH` | schema/RLS | Stop job intake validation. |
| `JOB-004` | Jobs | Job requirement row exists and supports matching validation. | Load/check `job_requirements` fixture. | One requirement row exists. | `HIGH` | schema/RLS | Stop matching requirement validation. |
| `CAND-001` | Candidates | Synthetic candidate can be created with minimum profile fields. | Load synthetic candidate fixture. | One candidate row exists. | `CRITICAL` | schema/RLS | Stop candidate workflow validation. |
| `CAND-002` | Candidates | Candidate source profile links to candidate. | Validate `source_profiles` relationship. | Source profile resolves to candidate. | `HIGH` | schema | Stop candidate search validation. |
| `CAND-003` | Candidates | Skill taxonomy and candidate-skill relationship support search views. | Validate `skills` and `candidate_skills` fixtures. | Candidate skill joins produce expected result. | `HIGH` | schema | Stop candidate matching/search validation. |
| `CAND-004` | Candidates | Candidate score fixture supports matching intelligence. | Validate `candidate_scores` row. | Score row resolves to candidate/job context as expected. | `MEDIUM` | schema | Record cardinality/producer gap if ambiguous. |
| `CAND-005` | Candidates | Candidate capability fixture supports candidate intelligence. | Validate `candidate_capabilities` row. | Capability row resolves to candidate. | `MEDIUM` | schema | Record producer gap if ambiguous. |
| `SUB-001` | Submissions | Synthetic submission links candidate and job. | Load/check submission fixture. | Submission resolves to expected candidate/job. | `CRITICAL` | schema/RLS | Stop recruiter pipeline validation. |
| `SUB-002` | Submissions | `create_submission_with_activity(...)` creates expected submission/activity side effects. | Execute RPC in disposable project if approved. | Submission and activity rows created as expected. | `CRITICAL` | schema/RLS | Stop execution workflow validation. |
| `SUB-003` | Submissions | Submission stage timestamp trigger behaves as expected. | Update synthetic submission stage. | Stage timestamp updates as expected. | `HIGH` | schema | Stop pipeline stage validation. |
| `SUB-004` | Submissions | Activity triggers update submission next-action/stage behavior. | Insert approved activity fixture. | Submission fields update per trigger contract. | `HIGH` | schema | Stop activity workflow validation. |
| `REC-001` | Recruiter workflows | Recruiter can access expected candidate/job/submission workflow data. | Query app-layer read models as recruiter. | Expected rows visible. | `HIGH` | auth/RLS/schema | Stop recruiter workflow validation. |
| `REC-002` | Recruiter workflows | Recruiter does not receive admin-only behavior. | Run admin helper/policy checks as recruiter. | Admin-only actions denied or helper false. | `CRITICAL` | auth/RLS | Stop security validation. |
| `REC-003` | Recruiter workflows | Pipeline views return expected synthetic submissions. | Query pipeline views. | Expected synthetic pipeline rows returned. | `HIGH` | schema | Stop pipeline validation. |
| `WEB-001` | Public web-layer workflows | `web_job_interest` accepts expected synthetic public interest behavior. | Validate insert/read/update behavior under expected role. | Behavior matches exact-live evidence. | `HIGH` | RLS/schema | Stop public interest validation. |
| `WEB-002` | Public web-layer workflows | `web_candidate_intakes` supports expected public intake behavior. | Validate insert/read behavior under expected role. | Behavior matches exact-live evidence. | `HIGH` | RLS/schema/storage | Stop public candidate intake validation. |
| `WEB-003` | Public web-layer workflows | Unauthorized public access is documented and classified. | Negative anon/auth tests if approved. | Access matches expected evidence or is flagged. | `CRITICAL` | RLS/storage/schema | Stop public security validation. |
| `APP-001` | App-layer workflows | Candidate search views return expected synthetic candidate. | Query `vw_candidate_search_clean`. | Candidate appears with expected normalized fields. | `HIGH` | schema | Stop app candidate search validation. |
| `APP-002` | App-layer workflows | Dashboard/recruiter views return expected synthetic data. | Query dashboard/pipeline views. | Expected aggregate rows appear. | `HIGH` | schema | Stop app dashboard validation. |
| `APP-003` | App-layer workflows | Jobs market/source views return expected synthetic job rows. | Query jobs/reporting/source-health views. | Expected job/source rows appear. | `MEDIUM` | schema | Record view fixture gap if absent. |
| `APP-004` | App-layer workflows | Generated types can be produced from disposable schema. | Generate types if approved. | Types generated successfully. | `HIGH` | schema | Stop type contract validation. |
| `APP-005` | App-layer workflows | Generated types match expected canonical contract. | Compare generated types to expected contracts. | No critical drift, or drift documented. | `HIGH` | schema | Stop baseline migration readiness if critical drift. |
| `AI-001` | App-layer workflows | Autonomous recruiter run fixture can be created/read. | Validate `autonomous_recruiter_runs` fixture. | Synthetic run row is readable as expected. | `MEDIUM` | schema/RLS | Record writer-lifecycle gap if failed. |
| `AI-002` | App-layer workflows | Autonomous recruiter memory fixture can be created/read. | Validate `autonomous_recruiter_memory` fixture. | Synthetic memory row is readable as expected. | `MEDIUM` | schema/RLS | Record writer-lifecycle gap if failed. |
| `SEC-001` | Security boundary | No production project ref, credentials, data, or storage objects are used. | Review environment, target ref, evidence, fixture values. | Only disposable/synthetic data present. | `BLOCKER` | auth/RLS/storage/schema | Stop all execution immediately. |
| `SEC-002` | Security boundary | Evidence artifacts contain no secrets or PII. | Review evidence before saving/committing. | No secrets/PII present. | `BLOCKER` | auth/storage | Stop evidence publication; redact/remove. |
| `CLEAN-001` | Cleanup | Disposable artifacts have cleanup owner and teardown decision. | Confirm cleanup plan and owner. | Teardown/hold decision recorded. | `MEDIUM` | auth/storage/schema | Do not abandon unmanaged disposable resources. |

## Minimum Pass Conditions Before Day 1 Can Continue Past Bootstrap

S2C must not proceed past bootstrap unless:

- `AUTH-001` through `AUTH-003` pass.
- `PROF-001`, `PROF-002`, `PROF-004` pass.
- `ROLE-001` and `ROLE-002` pass.
- `SEC-001` passes.

## Minimum Pass Conditions Before Baseline Migration Design

Baseline migration design must not begin unless:

- All `BLOCKER` assertions pass.
- All `CRITICAL` failures are resolved or explicitly accepted as scoped disposable-only evidence.
- Schema, auth, RLS, and storage drift are documented.
- Generated types are produced or the failure is classified.
- S2C validation report is complete.
