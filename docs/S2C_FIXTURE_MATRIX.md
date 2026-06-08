# Phase S2C Fixture Matrix

## Purpose

Define the minimum synthetic dataset required for S2C disposable-project validation. These fixtures support the validation assertions in `docs/S2C_VALIDATION_ASSERTION_MATRIX.md`.

This document is documentation only. It does not create users, SQL, fixtures, migrations, schema changes, Supabase changes, storage objects, deployments, or application code changes.

## Fixture Creation Channels

| Channel | Meaning |
|---|---|
| Auth/dashboard | Must be created through disposable Supabase Auth/dashboard or approved Auth API flow. |
| SQL | Would require approved SQL execution against disposable project only. |
| API | Would require approved API/client action against disposable project only. |
| Storage API/dashboard | Would require approved storage action against disposable project only. |
| Simulated in docs | Can be represented as expected values without being created. |

## Fixture Matrix

| Fixture ID | Purpose | Required fields | Relationships | Expected count | Validation use case | Creation channel | Cleanup requirement |
|---|---|---|---|---:|---|---|---|
| `AUTH-ADMIN-001` | Positive-control admin identity. | Synthetic email, confirmed disposable auth user ID, no real PII. | Must match `PROFILE-ADMIN-001.id`. | 1 | `AUTH-002`, `PROF-001`, `ROLE-001`, `RLS-001`. | Auth/dashboard | Delete disposable auth user if teardown approved. |
| `AUTH-REC-001` | Positive-control recruiter identity. | Synthetic email, confirmed disposable auth user ID, no real PII. | Must match `PROFILE-REC-001.id`. | 1 | `AUTH-003`, `PROF-002`, `ROLE-002`, `RLS-002`, recruiter workflows. | Auth/dashboard | Delete disposable auth user if teardown approved. |
| `AUTH-BD-001` | Optional BD workflow identity. | Synthetic email, disposable auth user ID. | Must match `PROFILE-BD-001.id` if created. | 0-1 | `AUTH-004`, `BD-001` to `BD-003`. | Auth/dashboard | Delete disposable auth user if teardown approved. |
| `AUTH-INACTIVE-001` | Optional inactive negative-control identity. | Synthetic email, disposable auth user ID. | Must match `PROFILE-INACTIVE-001.id` if created. | 0-1 | `AUTH-005`, `RLS-004`. | Auth/dashboard | Delete disposable auth user if teardown approved. |
| `AUTH-NOPROFILE-001` | Optional no-profile negative-control identity. | Synthetic email, disposable auth user ID. | Must not have a matching profile. | 0-1 | `AUTH-005`, `RLS-003`. | Auth/dashboard | Delete disposable auth user if teardown approved. |
| `PROFILE-ADMIN-001` | Admin app profile. | `id`, `email`, `full_name`, `role = admin`, `is_active = true`. | `id = AUTH-ADMIN-001.id`. | 1 | Admin helper, admin policy behavior. | SQL/API | Delete profile row if teardown approved. |
| `PROFILE-REC-001` | Recruiter app profile. | `id`, `email`, `full_name`, `role = recruiter`, `is_active = true`. | `id = AUTH-REC-001.id`. | 1 | Recruiter workflow and admin-deny behavior. | SQL/API | Delete profile row if teardown approved. |
| `PROFILE-BD-001` | Optional BD app profile. | `id`, `email`, `full_name`, `role = bd`, `is_active = true`. | `id = AUTH-BD-001.id`. | 0-1 | BD relationship and note ownership. | SQL/API | Delete profile row if teardown approved. |
| `PROFILE-INACTIVE-001` | Optional inactive profile. | `id`, `email`, `role = recruiter` or `bd`, `is_active = false`. | `id = AUTH-INACTIVE-001.id`. | 0-1 | Inactive access negative control. | SQL/API | Delete profile row if teardown approved. |
| `COMPANY-001` | Core company for jobs, contacts, BD notes. | `id`, `company_name`, location/status/source fields as needed. | Parent for `CONTACT-001`, `BDNOTE-001`, `JOB-001`. | 1 | `CO-001`, `CO-003`, BD and jobs workflows. | SQL/API | Delete row if teardown approved. |
| `COMPANY-002` | Negative/segmentation company. | `id`, `company_name`. | No required child rows. | 0-1 | Unauthorized or isolation checks, if needed. | SQL/API | Delete row if teardown approved. |
| `CONTACT-001` | BD contact linked to company. | `id`, `company_id`, name/email/role synthetic fields. | `company_id = COMPANY-001.id`. | 1 | `BD-001`, relationship intelligence. | SQL/API | Delete row if teardown approved. |
| `BDNOTE-001` | BD note owned by authenticated BD/recruiter user. | `id`, `company_id`, optional `contact_id`, note text, owner/user ID if present. | Company/contact; owner should map to BD or recruiter profile. | 1 | `BD-002`, `BD-003`. | SQL/API | Delete row if teardown approved. |
| `JOBSOURCE-001` | Job source context. | `id`, source name/url/status fields. | Referenced by `JOB-001` if source FK used. | 1 | `JOB-002`, jobs/source views. | SQL/API | Delete row if teardown approved. |
| `JOB-001` | Operational recruiter job. | `id`, `job_id` if needed, title, company, location, operational status, source reference. | Related to `COMPANY-001`, `JOBSOURCE-001`, `JOBINTAKE-001`, `JOBREQ-001`, `SUB-001`. | 1 | `JOB-001` to `JOB-004`, pipeline workflows. | SQL/API | Delete row if teardown approved. |
| `JOB-002` | Market-intelligence/source-health job. | Job fields required for market/source views. | May reference `JOBSOURCE-001`. | 0-1 | `APP-003`, source-health views. | SQL/API | Delete row if teardown approved. |
| `JOBINTAKE-001` | Requirement capture fixture. | `job_id`, raw input, parsed role/company/location/skills/status fields. | Links conceptually to `JOB-001`. | 1 | `JOB-003`, job intake workflow. | SQL/API | Delete row if teardown approved. |
| `JOBREQ-001` | Requirement/matching fixture. | `job_id` or live required identifiers, requirement type/value/importance fields. | Related to `JOB-001`. | 1 | `JOB-004`, matching validation. | SQL/API | Delete row if teardown approved. |
| `CAND-001` | Core candidate fixture. | `candidate_id`, name, location, role, status/source, consent/representation fields if applicable. | Parent for source profile, skills, scores, assessments, submissions. | 1 | `CAND-001`, candidate/recruiter workflows. | SQL/API | Delete row if teardown approved. |
| `CAND-002` | Negative or alternate candidate fixture. | Minimal candidate fields. | Not submitted to `JOB-001`. | 0-1 | Candidate search contrast/negative controls. | SQL/API | Delete row if teardown approved. |
| `SOURCEPROFILE-001` | Candidate source profile. | `candidate_id`, source channel, profile URL/metadata fields. | `candidate_id = CAND-001.candidate_id`. | 1 | `CAND-002`, candidate source/search views. | SQL/API | Delete row if teardown approved. |
| `SKILL-001` | Skill taxonomy fixture. | Skill ID/name per live structure. | Referenced by `CANDSKILL-001`. | 1 | `CAND-003`, matching/search. | SQL/API | Delete row if teardown approved. |
| `CANDSKILL-001` | Candidate-skill join fixture. | Candidate ID, skill ID/name fields per live nullable structure. | Candidate = `CAND-001`; skill = `SKILL-001`. | 1 | `CAND-003`, candidate search and matching. | SQL/API | Delete row if teardown approved. |
| `CANDSCORE-001` | Candidate score fixture. | Candidate ID, job/context fields if present, score fields. | Candidate = `CAND-001`; optional job = `JOB-001`. | 1 | `CAND-004`, matching intelligence. | SQL/API | Delete row if teardown approved. |
| `CANDCAP-001` | Candidate capability fixture. | Candidate ID, capability/score/metadata fields per live shape. | Candidate = `CAND-001`. | 1 | `CAND-005`, candidate intelligence. | SQL/API | Delete row if teardown approved. |
| `AIASSESS-001` | AI assessment fixture. | Candidate ID, job ID, assessment fields, unique pair fields. | Candidate = `CAND-001`; job = `JOB-001`. | 1 | Candidate/job matching and app-layer review. | SQL/API | Delete row if teardown approved. |
| `SUB-001` | Candidate submission fixture. | Submission ID, candidate ID, job ID, stage/status fields, timestamps as needed. | Candidate = `CAND-001`; job = `JOB-001`. | 1 | `SUB-001`, pipeline/recruiter views. | SQL/API | Delete row if teardown approved. |
| `ACTIVITY-001` | Activity log fixture. | Activity ID, submission/job/candidate references, action/stage/next-action fields. | Submission = `SUB-001`; candidate/job as needed. | 1 | `SUB-004`, activity triggers, follow-up views. | SQL/API | Delete row if teardown approved. |
| `WEBJOB-001` | Public web job interest fixture. | Synthetic public interest fields, candidate/contact/job context if present, review status fields. | May reference `JOB-001` or public job context. | 1 | `WEB-001`, public web-layer behavior. | API/SQL | Delete row if teardown approved. |
| `WEBCAND-001` | Public candidate intake fixture. | Synthetic email/contact/profile, desired role/location, consent flags, status. | May promote conceptually to `CAND-001`; no real PII. | 1 | `WEB-002`, public candidate intake. | API/SQL | Delete row if teardown approved. |
| `EMPINTAKE-001` | Employer intake placeholder. | Synthetic employer/company/contact/intake request fields if relevant table/flow exists. | May link conceptually to `COMPANY-001` or `WEBJOB-001`. | 0-1 | Employer-facing placeholder validation if applicable. | Simulated in docs/API/SQL | Delete if created; otherwise no cleanup. |
| `AUTO-RUN-001` | Autonomous recruiter run fixture. | Run ID, status, role/job context, timestamps, payload fields. | May reference `JOB-001` or role family. | 1 | `AI-001`, AI operating layer. | SQL/API | Delete row if teardown approved. |
| `AUTO-MEM-001` | Autonomous recruiter memory fixture. | Memory ID, memory type, recommendation/payload/confidence/source run fields. | May reference `AUTO-RUN-001` via source run field. | 1 | `AI-002`, feedback learning. | SQL/API | Delete row if teardown approved. |
| `EVIDENCE-001` | Optional evidence signal fixture. | Candidate/job/evidence fields per live shape. | Candidate = `CAND-001`; optional job = `JOB-001`. | 0-1 | Evidence signal inclusion/defer decision. | SQL/API | Delete row if teardown approved. |
| `RESUME-OBJ-001` | Synthetic resume storage object. | Non-PII file name, path, content type, small test payload. | Linked conceptually to `CAND-001` or `WEBCAND-001`. | 1 | `STOR-001` to `STOR-005`. | Storage API/dashboard | Delete object if teardown approved. |
| `BDPHOTO-OBJ-001` | Synthetic BD photo storage object. | Non-PII file name, path, content type, small test payload. | Linked conceptually to `COMPANY-001` or BD photo workflow. | 1 | `STOR-002`, `STOR-006`. | Storage API/dashboard | Delete object if teardown approved. |
| `NEG-ANON-001` | Anonymous access negative-control fixture. | No auth session; expected anon role only. | Tests public tables/storage. | 1 test context | `RLS-006`, `WEB-003`, `STOR-005`. | Simulated in docs/API | No persisted cleanup unless objects created. |
| `NEG-UNAUTH-001` | Unauthorized authenticated access fixture. | Non-owner/non-admin session. | Usually `AUTH-REC-001` or `AUTH-NOPROFILE-001`. | 1 test context | `BD-003`, `REC-002`, storage/RLS denial checks. | Auth/dashboard/API | Delete related auth user if created. |
| `NEG-PROD-001` | Production-target protection fixture. | Approved production ref denylist or documented “must not match” identifier. | Compared against target project ref. | 1 document entry | `SEC-001`. | Simulated in docs | No cleanup; must not expose secrets. |

## Minimum Required Fixture Set

S2C Day 1 must not proceed past bootstrap without:

- `AUTH-ADMIN-001`
- `AUTH-REC-001`
- `PROFILE-ADMIN-001`
- `PROFILE-REC-001`
- `COMPANY-001`
- `JOB-001`
- `CAND-001`
- `SUB-001` or `ACTIVITY-001`
- `RESUME-OBJ-001`
- `NEG-PROD-001`

## Recommended Expanded Fixture Set

For full S2C validation, include:

- `AUTH-BD-001`
- `PROFILE-BD-001`
- `AUTH-INACTIVE-001`
- `AUTH-NOPROFILE-001`
- `CONTACT-001`
- `BDNOTE-001`
- `JOBSOURCE-001`
- `JOBINTAKE-001`
- `JOBREQ-001`
- `SOURCEPROFILE-001`
- `SKILL-001`
- `CANDSKILL-001`
- `CANDSCORE-001`
- `CANDCAP-001`
- `AIASSESS-001`
- `WEBJOB-001`
- `WEBCAND-001`
- `AUTO-RUN-001`
- `AUTO-MEM-001`
- `BDPHOTO-OBJ-001`
- `NEG-ANON-001`
- `NEG-UNAUTH-001`

## Fixture Rules

- Use synthetic non-PII data only.
- Use disposable Supabase Auth users only.
- Do not reuse production IDs, emails, files, resumes, contacts, companies, candidates, or jobs.
- Do not commit passwords, tokens, service-role keys, anon keys, refresh tokens, or session values.
- Every created fixture must have a cleanup requirement.
- Every fixture must map to at least one assertion or be deferred.
- Fixture repair during execution requires approval if it touches auth, schema, storage, RLS, or environment.

## Cleanup Summary

Cleanup should remove, in this order if approved:

1. Synthetic storage objects.
2. Synthetic public intake rows.
3. Synthetic activity/submission/assessment rows.
4. Synthetic candidate-derived rows.
5. Synthetic candidates/jobs/companies/contacts/notes.
6. Synthetic autonomous recruiter rows.
7. Synthetic profile rows.
8. Synthetic auth users.
9. Disposable environment values.
10. Disposable project itself, if teardown is approved.
