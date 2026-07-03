# S2C Jobs Execution Report: `public.jobs`

Branch: `schema-s1-stabilization`
Target disposable project: `terrer-schema-s2c-bootstrap`
Linked ref verified: `epigstfenpqbslgeyrtn`

## Summary

`public.jobs` was reconstructed successfully.

The final result is `PASS`.

This execution completed in two stages:

- the initial run successfully completed `public.jobs` DDL reconstruction
- that same run then stopped during validation setup because the synthetic `public.job_sources` insert referenced nonexistent column `is_active`
- the continuation resumed from the existing `public.jobs` state without recreating the table, dropping the table, or modifying schema

## Incident classification

The earlier stop was a validation-infrastructure bug.

It was:

- not a `public.jobs` DDL failure
- not a `public.jobs` schema failure
- not a production issue

Root cause:

- the synthetic validation insert used `job_sources.is_active`
- canonical `public.job_sources` does not have that column

Correction:

- continuation used the actual canonical `public.job_sources` columns only
- `is_active` was removed from the synthetic validation insert

## Current state before continuation

Before continuation, the following were already true:

- `public.jobs` existed
- `public.job_sources` existed
- `public.update_updated_at_column()` existed
- `public.jobs` had already been created successfully
- behavior validation had not completed
- cleanup had not run
- no execution report had been created yet

## Pre-continuation verification

Verified before continuation:

- `public.jobs` exists
- `public.job_sources` exists
- `public.update_updated_at_column()` exists
- expected constraints present:
  - `jobs_job_id_unique`
  - `jobs_job_source_id_fkey`
  - `jobs_pkey`
- expected indexes present:
  - `jobs_job_id_unique`
  - `jobs_pkey`
- no standalone secondary indexes beyond canonical evidence
- RLS enabled
- exactly 6 policies present
- trigger present:
  - `set_updated_at_jobs`
- canonical grants present, including `MAINTAIN` for:
  - `anon`
  - `authenticated`
  - `postgres`
  - `service_role`

## Reconstruction

Reconstructed object:

- `public.jobs`

No additional schema object beyond the approved target was reconstructed in this step.

No recreation was performed during continuation.

## Corrected validation infrastructure

Created only for validation:

- one temporary synthetic `public.job_sources` row

Inserted with canonical columns:

- `company_name = S2C Jobs Validation Company`
- `source_name = S2C Jobs Validation Source`
- `source_url = https://example.com/s2c-jobs-validation`
- `source_type = manual`
- `tier = tier_1`
- `trust_score = 87`
- `status = active`

Returned synthetic validation source:

- `id = c87309bf-6c14-4eef-943c-5e3071fe3e43`

This row existed only as FK validation infrastructure and was not part of the reconstructed target object.

## Valid insert

Executed successfully:

- inserted one synthetic `public.jobs` row with:
  - `id = d9f30d42-3561-4e11-b240-d64552127282`
  - `job_id = s2c-jobs-validation-001`
  - `job_source_id = c87309bf-6c14-4eef-943c-5e3071fe3e43`
  - initial `updated_at = 2026-07-02 18:13:16.933225+00`

Result:

- PASS

## Negative validation: duplicate `job_id`

Attempted:

- insert second row with `job_id = s2c-jobs-validation-001`

Result:

- correctly rejected by `jobs_job_id_unique`

Exact SQL error:

```text
ERROR:  23505: duplicate key value violates unique constraint "jobs_job_id_unique"
DETAIL:  Key (job_id)=(s2c-jobs-validation-001) already exists.
```

This was an expected successful negative validation.

## Negative validation: invalid `job_source_id`

Attempted:

- insert row with `job_id = s2c-jobs-validation-002`
- `job_source_id = ffffffff-ffff-ffff-ffff-ffffffffffff`

Result:

- correctly rejected by `jobs_job_source_id_fkey`

Exact SQL error:

```text
ERROR:  23503: insert or update on table "jobs" violates foreign key constraint "jobs_job_source_id_fkey"
DETAIL:  Key (job_source_id)=(ffffffff-ffff-ffff-ffff-ffffffffffff) is not present in table "job_sources".
```

This was an expected successful negative validation.

## Trigger behavior validation

Verified trigger:

- `set_updated_at_jobs`

Validated by updating the synthetic `public.jobs` row.

Observed:

- before update, `updated_at = 2026-07-02 18:13:16.933225+00`
- after update, `updated_at = 2026-07-02 18:13:52.114686+00`

Conclusion:

- `update_updated_at_column()` behavior is active for `public.jobs`
- trigger validation PASS

## Catalog validation

Confirmed after continuation:

- `public.jobs` exists
- constraints present:
  - `jobs_job_id_unique`
  - `jobs_job_source_id_fkey`
  - `jobs_pkey`
- index count: `2`
- expected indexes present:
  - `jobs_job_id_unique`
  - `jobs_pkey`
- RLS enabled
- policy count: `6`
- trigger count: `1`
- trigger present:
  - `set_updated_at_jobs`
- canonical grant surface present
- `MAINTAIN` confirmed for:
  - `anon`
  - `authenticated`
  - `postgres`
  - `service_role`

## Cleanup

Removed:

- synthetic `public.jobs` validation row(s) matching:
  - `s2c-jobs-validation-001`
  - `s2c-jobs-validation-002`
- synthetic `public.job_sources` validation row matching:
  - `https://example.com/s2c-jobs-validation`

Post-cleanup verification confirmed:

- `public.jobs` still exists
- synthetic `public.jobs` rows no longer exist
- synthetic `public.job_sources` row no longer exists

## Result

PASS

## Production safety

Production was not touched.

- only the linked disposable project was used
- no production SQL was executed
- no production schema object was modified
- no migration was created
- no next object was executed

## Notes

- `public.jobs` remains reconstructed and validated
- no continuation was made into:
  - `ai_assessments`
  - `submissions`
  - `applications`
