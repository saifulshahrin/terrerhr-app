# Employer Action Save Repair Report

## Files changed

- `api/employer-intake-action.ts`
- `docs/EMPLOYER_ACTION_SAVE_FAILURE_ANALYSIS.md`
- `docs/EMPLOYER_ACTION_SAVE_REPAIR_REPORT.md`

## Exact before/after behavior

### Before

- Clicking `Request Terrer Intro Review` or `Request Terrer Hiring Review` showed `Saving...`
- The save request failed with a safe employer-facing error
- Production logs showed `PGRST204`
- The API attempted to reference `candidate_ref`
- `employer_intake_actions` did not contain `candidate_ref`

### After

- The action endpoint now accepts the employer request payload but only writes live columns
- The insert payload contains only:
  - `employer_job_intake_id`
  - `action_type`
  - `employer_note`
  - `status`
- `candidateRef` can still be received from the client, but it is intentionally ignored and not written to the database
- Candidate linkage is deferred until the schema supports it
- Employer-safe success/error responses are preserved

## Exact fix

- Added a Vercel API route at `api/employer-intake-action.ts`
- Removed any database write dependency on `candidate_ref`
- Aligned the persistence path with the live `employer_intake_actions` schema
- Kept failures employer-safe and non-technical

## Validation performed

- `npm run build`
- `npx tsc --noEmit --module esnext --target es2020 --moduleResolution node api/employer-intake-action.ts`
- Static verification that `candidate_ref` is no longer present in the route file

## Remaining risks

- The route has not yet been smoke-tested in production after this repair
- If the frontend sends an unexpected action type or intake ID shape, the route will still reject it safely
- Any future need for candidate linkage will require a schema change or a separate supported table

## Status

The smallest safe repair is in place and locally validated.

