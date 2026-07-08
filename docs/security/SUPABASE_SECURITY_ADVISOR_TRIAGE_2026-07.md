# Supabase Security Advisor Triage

Date: 2026-07

This is the first-pass security triage for the Supabase Advisor surface and the related `terrer-web` contract checks.

Scope:

- No migrations were created.
- No production data was modified.
- `terrer-web` was inspected read-only as a dependency-audit target.
- The active branch is `security/supabase-advisor-hardening-2026-07`.

## Working-Tree State

The pre-existing local artifacts were cleaned before this audit continued:

- `supabase/.temp/linked-project.json` was restored to `HEAD`.
- `.vercel/` was removed from the workspace.

## High-Priority Table Audit

### `public.candidates`

Current access sites in `terrer-web`:

- Browser: `src/pages/TalentOnboarding.tsx:465-481`
- Browser: `src/lib/candidateContext.ts:48-74`
- Browser: `src/components/TalentProfileModal.tsx:689-694`
- Browser: `src/pages/CandidateProfileWorkspace.tsx:225-226`
- Browser: `src/pages/MyActivity.tsx:291-320`
- Browser: `src/pages/MyMatches.tsx:449-450`
- Browser: `src/pages/ReturningCandidateHomepage.tsx:723-725`
- Serverless API: `api/employer-match-preview.ts:383-403`

Summary:

- Browser reads are done with the publishable/browser client from `src/lib/supabase.ts`.
- The browser identifies the candidate through `localStorage` values (`terrer_candidate_id`, `terrer_candidate_email`, `terrer_candidate_name`).
- The browser can therefore change its own candidate lookup key.
- The employer preview API uses the service-role client from `process.env.SUPABASE_URL` + `process.env.SUPABASE_SERVICE_ROLE_KEY`.
- Candidate PII risk is high because the browser can directly query the base table and the service-role API reads the table before anonymising the response.

### `public.candidate_web_jobs`

Current access sites:

- Browser: `src/lib/publicJobs.ts:157-192`

Summary:

- Uses the browser/publishable Supabase client.
- SELECT only.
- Filters `status = 'published'`, orders by `is_featured`, `display_order`, `published_at`, and limits to 200 rows.
- The caller cannot directly inject SQL, but the public contract depends on the table and the inner `jobs` join remaining compatible.
- Public candidate-visible job publication is the intended contract; enforcement should remain on `candidate_web_jobs` with strict publication rules.

### `public.web_job_interest`

Current access sites:

- Browser: `src/lib/candidateJobActions.ts:34-90`
- Browser: `src/pages/ReturningCandidateHomepage.tsx:202-221,462-465`
- Browser: `src/pages/MyActivity.tsx:186-210,511-618`
- Browser: `src/pages/MyMatches.tsx:461-471`
- Browser: `src/pages/MarketSignalClusterPage.tsx:187-220`
- Browser: `src/pages/TalentOnboarding.tsx:532-630`
- Browser: `src/components/TalentProfileModal.tsx:727-730`

Summary:

- Browser uses the publishable client.
- Operations are SELECT, INSERT, and UPDATE.
- Filters are driven by `candidate_id`, `job_id`, `job_title`, `company_name`, and `interest_source`.
- The caller can manipulate the candidate context by changing localStorage or by tampering with the browser request.
- Risk of candidate interest PII exposure is high, because this table stores relationship state, job titles, and representation/workflow signals.

### `public.jobs`

Current access sites:

- Browser: `src/pages/TalentOnboarding.tsx:507-510`
- Browser: `src/pages/MyActivity.tsx:405-406`

Summary:

- Browser uses the publishable client.
- SELECT only in the current web code.
- The browser requests `id, job_title, company_name, location, updated_at` and orders by `updated_at desc`, limited to 50 rows.
- The caller does not currently pass a direct SQL filter, but the result set is still public-facing and broad.
- Risk of candidate PII exposure is moderate because job rows can contain rich descriptive text in the wider schema, but the current browser selects only a narrow set of fields.

### `public.employer_job_intake`

Current access sites:

- Serverless API: `api/employer-match-preview.ts:270-275,493-524`

Summary:

- Uses the service-role client.
- SELECT and INSERT.
- Lookup filter is `submission_fingerprint = sha256(companyName|contactEmail|jobTitle|location|jobDescription|requiredSkills)`.
- INSERT writes company/contact/job fields plus `status`, `source`, timestamps, and the fingerprint.
- The request body controls the payload, but not the table name or target relation.
- Candidate PII exposure risk is low in the response path, but the intake itself stores employer contact data and should remain server-only.

### `public.employer_intake_actions`

Current access sites:

- Serverless API: `api/employer-intake-action.ts:72-126`

Summary:

- Uses the service-role client.
- INSERT only.
- Writes `employer_job_intake_id`, `action_type`, `employer_note`, and `status`.
- The caller controls the posted action fields.
- This is a trusted-server contract; it should not be exposed to the browser directly without an authenticated and authorised server endpoint.

## `TalentOnboarding` Flow

Active route state:

- `src/App.tsx` currently redirects `/talent/onboarding` to `/my-matches`.
- The `TalentOnboarding` component still exists, but it is not mounted by the active router in the current app shell.
- The component has no auth guard in its own code.

Candidate lookup flow:

1. The component reads `terrer_candidate_id`, `terrer_candidate_email`, and `terrer_candidate_name` from browser localStorage.
2. If `candidate_id` exists, it queries `public.candidates` by `.eq('candidate_id', storedCandidateId).maybeSingle()`.
3. If that fails and an email exists, it queries `public.candidates` by `.eq('email', storedCandidateEmail).order('created_at', { ascending: false }).limit(1).maybeSingle()`.
4. It then stores the resolved candidate id back into localStorage.
5. It queries `public.jobs` for 50 rows and `public.web_job_interest` for existing interest rows.
6. Save/review actions write back to `public.web_job_interest`.

Security interpretation:

- The lookup key is client-controlled.
- A malicious user can tamper with localStorage and enumerate other rows if the live RLS/policy contract allows it.
- The browser currently does need direct access to `public.candidates` for this implementation.
- Safer contract: authenticated self-access or a narrow server-side endpoint, not a raw browser lookup by arbitrary `candidate_id` or `email`.

## `api/employer-match-preview.ts`

Verification:

- It uses `process.env.SUPABASE_URL` and `process.env.SUPABASE_SERVICE_ROLE_KEY`.
- That key is server-only by design in this file.
- Candidate records are anonymised before response: the API returns `candidateLabel`, `candidateRef`, `score`, `matchedSkills`, `terrerAiReview`, `targetRole`, `yearsExperience`, `location`, and `noticePeriod`.
- The API does not return candidate names, emails, or phone numbers.
- Arbitrary candidate queries cannot be driven by request parameters; the request body affects the employer intake fingerprint and scoring inputs, but the candidate query itself is a fixed `SELECT ... FROM candidates ORDER BY created_at DESC LIMIT 250`.

## Recommendation

- `terrer-web` changes are required for the candidate identity contract, because the browser currently uses direct `public.candidates` access with client-controlled identifiers.
- `public.web_job_interest` also looks too permissive for a long-term secure design, because the browser can read and mutate the table directly.
- I have not changed `terrer-web` yet, per instruction.

## Next-Step Decision

This triage is sufficient to stop guessing about the security posture, but not sufficient to ship the hardening migrations.
The next step is to reconcile the object matrix and then design any required RLS or compatibility changes.
