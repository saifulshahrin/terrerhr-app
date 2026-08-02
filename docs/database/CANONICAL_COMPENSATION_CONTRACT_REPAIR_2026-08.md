# Canonical Compensation Contract Repair — August 2026

## Outcome

This repair adds one authoritative, nullable candidate-facing compensation value to the canonical opportunity contract. It does not deploy, migrate an environment, insert an opportunity, or change candidate authorization.

## Root cause

Canonical opportunities follow:

```text
public.jobs
  → public.candidate_web_jobs
  → unified-opportunities Edge Function
  → CanonicalOpportunityRow
  → CandidateOpportunity
```

`public.jobs` and the canonical DTO previously had no salary field. The web therefore could not receive the approved `RM1,000 per month` value and fell back to a generated market estimate. Salary columns on `employer_job_intake` and `terrer_jobs` belong to separate workflows and are not authoritative for this publication path.

## Selected schema field

The forward migration adds:

```sql
public.jobs.compensation_text text null
```

The column has no default. It stores employer- or Terrer-authorized text verbatim, remains null when compensation is not disclosed, and must not contain generated or inferred market estimates. No structured minimum, maximum, currency or pay-period fields are added.

Migration: `20260802074653_add_canonical_compensation_text.sql`.

## API and DTO contract

- Both canonical database selectors include `compensation_text`.
- `CanonicalOpportunityRow.compensation_text` is `string | null`.
- `CandidateOpportunity.salaryText` is `string | null`.
- Canonical mapping preserves a valid string exactly and preserves null exactly.
- A clearly invalid non-string/non-null payload fails closed at the DTO boundary.
- No value is derived from title, role family, location or description.
- External opportunity mapping remains unchanged in behavior and returns `salaryText: null` to preserve the unified DTO shape.

## Security and exposure impact

- Candidate access to `public.jobs` is not broadened.
- No grant, policy, RLS, Auth, candidate-ownership, review authorization, secret or CORS change is included.
- The existing Edge Function continues to authenticate the user, resolve the owned candidate mapping, and query canonical rows with its server-side service client.
- Only the candidate-facing compensation string is added to the existing authorized response. Internal notes and service-role credentials remain excluded.

## Null behavior

`null` means compensation is not disclosed. The backend does not replace it with a default, estimate, inferred currency, range or pay period.

## Test evidence

Focused tests cover:

- exact `RM1,000 per month` preservation;
- null preservation;
- rejection of invalid non-string data;
- no trimming, parsing or inference;
- unchanged canonical fields;
- external mapping compatibility;
- migration shape, comment, null/no-default behavior and absence of access changes;
- existing missing/invalid authentication, candidate-ID spoofing, review isolation and POST behavior through the established API test suite.

Validation completed on 2026-08-02:

- focused compensation/query/auth API tests: **25 passed, 0 failed**;
- focused TypeScript check for the changed DTO/query/auth modules: **passed**;
- focused ESLint for changed TypeScript, Edge Function and test files: **passed**;
- production Vite build: **passed** (existing chunk-size/dynamic-import warnings only);
- full local Supabase reset through `20260802074653`: **passed**;
- local schema inspection: `text`, nullable, no default, expected comment;
- local RLS inspection: RLS remains enabled and `jobs_select_staff` remains limited to active admin/recruiter/BD profiles;
- repository-ledger restoration validation: **passed**.

The repository-wide typecheck and lint commands remain red on unrelated pre-existing files. No reported failure originates in this repair's changed code. Those unrelated failures were not modified or bypassed.

## Remaining web repair

The web must add nullable `salaryText` to its response type and normalizer, pass it into `PublicJob.salary`, remove all candidate-facing estimated-market-range generation, render an English/Bahasa Melayu undisclosed state for null, and add cross-surface tests. That work belongs in `terrer-web` and is intentionally excluded here.

## No estimate generated

This backend contract stores and returns only authoritative supplied text or null. It contains no compensation estimator and does not parse compensation from the job description.
