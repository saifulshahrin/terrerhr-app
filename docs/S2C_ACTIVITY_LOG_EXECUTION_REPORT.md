# S2C Activity Log Execution Report: `public.activity_log`

Branch: `schema-s1-stabilization`
Target disposable project: `terrer-schema-s2c-bootstrap`
Linked ref verified: `epigstfenpqbslgeyrtn`

## Summary

`public.activity_log` was reconstructed successfully.

The initial execution stopped during behavior validation because the Supabase API returned a retryable Cloudflare `520` before the invalid `activity_type` SQL validation completed.

That stop was an external Supabase/API interruption. It was not a schema failure, DDL failure, or SQL validation failure.

The corrected continuation completed the remaining validation, catalog validation, cleanup, and reporting.

## Pre-state

Verified before DDL during the original execution:

- `public.activity_log` did not exist
- `public.submissions` existed
- `public.sync_submission_next_action_from_activity()` existed
- `public.sync_submission_stage_from_activity()` existed

## Reconstruction

Reconstructed only:

- `public.activity_log`

Applied:

- canonical table definition
- owner assignment to `postgres`
- RLS enablement
- constraints:
  - `activity_log_activity_type_check`
  - `activity_log_pkey`
  - `activity_log_submission_id_fkey`
- policies:
  - `activity_log_insert_anon`
  - `activity_log_select_anon`
- canonical grants for:
  - `anon`
  - `authenticated`
  - `postgres`
  - `service_role`
- triggers:
  - `trg_sync_submission_next_action_from_activity`
  - `trg_sync_submission_stage_from_activity`

## Validation infrastructure

Created only for validation:

- one temporary `public.job_sources` row
- one temporary `public.companies` row
- one temporary `public.jobs` row
- one temporary `public.candidates` row
- one temporary `public.submissions` row
- one temporary `public.activity_log` row

Captured IDs:

- `validation_job_source_id = 9fcdb1ec-1bb9-4713-9c38-9903f6f5d046`
- `validation_company_id = 6`
- `validation_job_id = 83b640e6-f6a6-4fbb-a8a0-d90de68781b8`
- `validation_candidate_id = 09f03235-7708-49bd-af00-371b3c77de2e`
- `validation_submission_id = e048ce79-c849-408d-b819-53c0ef41ccf4`
- `validation_activity_id = c4743fbf-e842-4346-a5a4-13a47df5b717`

Returned IDs were reused throughout validation and cleanup.

## Behavior validation

Valid insert:

- inserted one synthetic `public.activity_log` row
- `activity_type = candidate_replied`
- `next_action_at = 2026-07-07 00:00:00+00`
- result: PASS

Trigger behavior:

- parent `public.submissions.submission_stage` became `responded`
- parent `public.submissions.next_action_date` became `2026-07-07`
- parent `public.submissions.updated_at` updated
- result: PASS

Invalid `submission_id` FK rejection:

```text
ERROR:  23503: insert or update on table "activity_log" violates foreign key constraint "activity_log_submission_id_fkey"
DETAIL:  Key (submission_id)=(ffffffff-ffff-ffff-ffff-ffffffffffff) is not present in table "submissions".
```

Invalid `activity_type` check rejection:

```text
ERROR:  23514: new row for relation "activity_log" violates check constraint "activity_log_activity_type_check"
DETAIL:  Failing row contains (96d9b2e9-43cb-43e3-ae03-3c43d40ceda7, e048ce79-c849-408d-b819-53c0ef41ccf4, null, null, invalid_activity_type, null, null, null, null, 2026-07-04 18:20:40.637527+00, null, null, 2026-07-04 18:20:40.637527+00).
```

All negative validations were expected successful checks of canonical constraint enforcement.

## Interruption classification

The first attempt to run the invalid `activity_type` validation did not return a SQL result. Supabase API returned a retryable Cloudflare `520`.

Classification:

- external retryable Supabase/API interruption
- not a schema failure
- not a DDL failure
- not a validation SQL failure

Continuation completed the interrupted validation successfully.

## Catalog validation

Confirmed:

- `public.activity_log` exists
- constraints present:
  - `activity_log_activity_type_check`
  - `activity_log_pkey`
  - `activity_log_submission_id_fkey`
- exactly the canonical index:
  - `activity_log_pkey`
- RLS enabled
- exactly 2 policies:
  - `activity_log_insert_anon`
  - `activity_log_select_anon`
- exactly 2 triggers:
  - `trg_sync_submission_next_action_from_activity`
  - `trg_sync_submission_stage_from_activity`
- canonical grants present, including `MAINTAIN` for:
  - `anon`
  - `authenticated`
  - `postgres`
  - `service_role`

## Cleanup

Removed all synthetic validation rows:

- synthetic `public.activity_log` row
- synthetic `public.submissions` row
- synthetic `public.jobs` row
- synthetic `public.candidates` row
- synthetic `public.companies` row
- synthetic `public.job_sources` row

Post-cleanup verification confirmed:

- `public.activity_log` still exists
- synthetic activity row no longer exists
- synthetic submission row no longer exists
- synthetic job row no longer exists
- synthetic candidate row no longer exists
- synthetic company row no longer exists
- synthetic job source row no longer exists

## Result

PASS

## Notes

- No migration files were created.
- No production resources were touched.
- No continuation was made into any other object.
