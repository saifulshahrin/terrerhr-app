# Employer Action Save Failure Analysis

## Observed failure

The employer preview screen now renders successfully, but clicking either:

- `Request Terrer Intro Review`
- `Request Terrer Hiring Review`

enters a `Saving...` state and then fails with:

- `We could not save this action right now.`

## Exact endpoint

- `POST /api/employer-intake-action`

## Production evidence

Latest production logs for the failed click show:

- `λ POST /api/employer-intake-action`
- Supabase/PostgREST error:
  - `code: 'PGRST204'`
  - `message: "Could not find the 'candidate_ref' column of 'employer_intake_actions' in the schema cache"`

That means the request reaches the API route, but the database write path fails before a success response can be returned.

## What the schema proves

The live `public.employer_intake_actions` table currently has only these columns:

- `id`
- `employer_job_intake_id`
- `action_type`
- `employer_note`
- `status`
- `created_at`

The live generated types and DDL confirm:

- there is no `candidate_ref` column
- the table has an FK only on `employer_job_intake_id -> employer_job_intake.id`
- RLS allows inserts/selects, including for `service_role`

## Likely frontend / backend flow

Based on the UI behavior and the production route name:

1. The employer clicks an action button on a candidate preview card.
2. The frontend shows `Saving...`.
3. The frontend posts to `/api/employer-intake-action`.
4. The API attempts to persist the action to `employer_intake_actions`.
5. The write path references `candidate_ref`, which is not part of the live table schema.
6. Supabase returns `PGRST204`.
7. The frontend falls back to the employer-safe error state.

## Exact likely failing stage

The failing stage is the database insert/update mapping inside `/api/employer-intake-action`, specifically the code path that still references `candidate_ref`.

This is not currently behaving like:

- an env-var failure
- a blank-page render failure
- an RLS denial
- a duplicate/idempotency failure

The log is a schema mismatch, not an auth or runtime crash.

## Likely cause

The action endpoint is still using an outdated payload or column mapping that assumes `employer_intake_actions` has a `candidate_ref` column.

That field does not exist in the live schema, so any insert/update/select against it fails immediately.

## Smallest safe repair

Remove the `candidate_ref` dependency from the employer action save path and align the route with the live schema:

- persist only the columns that actually exist:
  - `employer_job_intake_id`
  - `action_type`
  - `employer_note`
  - `status`
- if action-to-candidate association is needed later, store it in a supported table or add an explicit schema migration first

## Validation plan

After the repair:

1. Run `npm run build`.
2. Click `Request Terrer Intro Review`.
3. Click `Request Terrer Hiring Review`.
4. Confirm the UI moves past `Saving...`.
5. Confirm the action saves successfully.
6. Confirm no internal IDs, UUIDs, or unsupported schema fields are exposed in the employer UI or logs.

## Bottom line

The employer action save failure is caused by a schema drift mismatch:

- code expects `candidate_ref`
- live `employer_intake_actions` does not have `candidate_ref`

The fix should be a minimal schema-aligned write-path correction, not a flow redesign.
