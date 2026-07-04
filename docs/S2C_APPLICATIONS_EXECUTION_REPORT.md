# S2C Applications Execution Report: `public.applications`

Branch: `schema-s1-stabilization`
Target disposable project: `terrer-schema-s2c-bootstrap`
Linked ref verified: `epigstfenpqbslgeyrtn`

## Summary

`public.applications` was reconstructed successfully.

This execution reconstructed only `public.applications`.

## Pre-state

Verified before DDL:

- `public.applications` did not exist
- `public.jobs` existed
- `public.candidates` existed

## Reconstruction

Applied:

- canonical table definition
- owner assignment to `postgres`
- RLS enablement
- constraints:
  - `applications_candidate_id_fkey`
  - `applications_job_id_candidate_id_key`
  - `applications_job_id_fkey`
  - `applications_pkey`
- canonical grants for `anon`, `authenticated`, `postgres`, and `service_role`

No policies were created.

No triggers were created.

## Validation infrastructure

Created only for validation:

- one temporary `public.job_sources` row
- one temporary `public.jobs` row
- one temporary `public.candidates` row

Captured IDs:

- `validation_job_source_id = 0248a416-b874-4ffc-8117-91eddfee4094`
- `validation_job_id = c24b23a0-0507-46ce-b55e-bce6fffd6a58`
- `validation_candidate_id = 91db85d3-a030-41ef-a18a-e661df93793c`
- `validation_application_id = 57895759-f5d8-4919-8a71-a2152f731c72`

Returned IDs were reused throughout validation and cleanup.

## Behavior validation

Valid insert:

- inserted one synthetic `public.applications` row
- `source = manual_validation`
- `application_status = new`
- result: PASS

Duplicate `(job_id, candidate_id)` rejection:

```text
ERROR:  23505: duplicate key value violates unique constraint "applications_job_id_candidate_id_key"
DETAIL:  Key (job_id, candidate_id)=(c24b23a0-0507-46ce-b55e-bce6fffd6a58, 91db85d3-a030-41ef-a18a-e661df93793c) already exists.
```

Invalid `job_id` FK rejection:

```text
ERROR:  23503: insert or update on table "applications" violates foreign key constraint "applications_job_id_fkey"
DETAIL:  Key (job_id)=(ffffffff-ffff-ffff-ffff-ffffffffffff) is not present in table "jobs".
```

Invalid `candidate_id` FK rejection:

```text
ERROR:  23503: insert or update on table "applications" violates foreign key constraint "applications_candidate_id_fkey"
DETAIL:  Key (candidate_id)=(ffffffff-ffff-ffff-ffff-ffffffffffff) is not present in table "candidates".
```

All negative validations were expected successful checks of canonical constraint enforcement.

## Catalog validation

Confirmed:

- `public.applications` exists
- constraints present:
  - `applications_candidate_id_fkey`
  - `applications_job_id_candidate_id_key`
  - `applications_job_id_fkey`
  - `applications_pkey`
- exactly the canonical indexes:
  - `applications_job_id_candidate_id_key`
  - `applications_pkey`
- RLS enabled
- policy count: `0`
- trigger count: `0`
- canonical grants present, including `MAINTAIN` for:
  - `anon`
  - `authenticated`
  - `postgres`
  - `service_role`

## Cleanup

Removed all synthetic validation rows:

- synthetic `public.applications` row
- synthetic `public.jobs` row
- synthetic `public.candidates` row
- synthetic `public.job_sources` row

Post-cleanup verification confirmed:

- `public.applications` still exists
- synthetic application no longer exists
- synthetic job no longer exists
- synthetic candidate no longer exists
- synthetic job source no longer exists

## Result

PASS

## Notes

- No migration files were created.
- No production resources were touched.
- No continuation was made into:
  - `activity_log`
  - any remaining tables
