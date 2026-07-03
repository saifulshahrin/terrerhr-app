# S2C AI Assessments Execution Report: `public.ai_assessments`

Branch: `schema-s1-stabilization`
Target disposable project: `terrer-schema-s2c-bootstrap`
Linked ref verified: `epigstfenpqbslgeyrtn`

## Summary

`public.ai_assessments` was reconstructed successfully.

The canonical structure was preserved exactly:

- 4 constraints
- only the implicit indexes directly supported by the canonical evidence
- RLS enabled
- exactly 4 policies
- no triggers
- canonical grants including `MAINTAIN`

Temporary synthetic validation infrastructure was used only to satisfy FK validation:

- one `public.job_sources` row
- one `public.jobs` row
- one `public.candidates` row using the previously proven minimal validation pattern

All synthetic validation rows were removed at the end of the run.

## Pre-state

Verified before DDL:

- `public.ai_assessments` did not exist
- `public.jobs` existed
- `public.candidates` existed

## Reconstruction

Reconstructed only:

- `public.ai_assessments`

Applied:

- canonical table definition
- owner assignment to `postgres`
- RLS enablement
- constraints:
  - `ai_assessments_candidate_id_fkey`
  - `ai_assessments_job_id_candidate_id_key`
  - `ai_assessments_job_id_fkey`
  - `ai_assessments_pkey`
- policies:
  - `Allow anon select on ai_assessments`
  - `Anon users can insert ai_assessments`
  - `Anon users can read ai_assessments`
  - `Anon users can update ai_assessments`
- canonical grants for:
  - `anon`
  - `authenticated`
  - `postgres`
  - `service_role`

## Validation infrastructure

Created only for validation:

- one temporary synthetic `public.job_sources` row
- one temporary synthetic `public.jobs` row
- one temporary synthetic `public.candidates` row

Synthetic validation identifiers:

- `job_source_id = e99a1a7d-57b0-4e57-a9f2-d963f97ea4d0`
- `job_id = dc457209-2a00-44bc-831e-e88cb13239e5`
- `candidate_id = 22222222-2222-2222-2222-222222222222`

These rows were validation prerequisites only. They were not part of the reconstructed target object.

## Behavior validation

Successful valid insert:

- inserted one `public.ai_assessments` row with:
  - `id = d71b3e0d-e9ed-496d-b062-c5a9031952de`
  - `job_id = dc457209-2a00-44bc-831e-e88cb13239e5`
  - `candidate_id = 22222222-2222-2222-2222-222222222222`
  - `submission_ready = false`

Result:

- PASS

## Expected negative validation: duplicate `(job_id, candidate_id)`

Attempted:

- second insert using the same `job_id` and `candidate_id`

Result:

- correctly rejected by `ai_assessments_job_id_candidate_id_key`

Exact SQL error:

```text
ERROR:  23505: duplicate key value violates unique constraint "ai_assessments_job_id_candidate_id_key"
DETAIL:  Key (job_id, candidate_id)=(dc457209-2a00-44bc-831e-e88cb13239e5, 22222222-2222-2222-2222-222222222222) already exists.
```

## Expected negative validation: invalid `job_id`

Attempted:

- insert with `job_id = ffffffff-ffff-ffff-ffff-ffffffffffff`

Result:

- correctly rejected by `ai_assessments_job_id_fkey`

Exact SQL error:

```text
ERROR:  23503: insert or update on table "ai_assessments" violates foreign key constraint "ai_assessments_job_id_fkey"
DETAIL:  Key (job_id)=(ffffffff-ffff-ffff-ffff-ffffffffffff) is not present in table "jobs".
```

## Expected negative validation: invalid `candidate_id`

Attempted:

- insert with `candidate_id = ffffffff-ffff-ffff-ffff-ffffffffffff`

Result:

- correctly rejected by `ai_assessments_candidate_id_fkey`

Exact SQL error:

```text
ERROR:  23503: insert or update on table "ai_assessments" violates foreign key constraint "ai_assessments_candidate_id_fkey"
DETAIL:  Key (candidate_id)=(ffffffff-ffff-ffff-ffff-ffffffffffff) is not present in table "candidates".
```

## Catalog validation

Confirmed:

- `public.ai_assessments` exists
- constraints present:
  - `ai_assessments_candidate_id_fkey`
  - `ai_assessments_job_id_candidate_id_key`
  - `ai_assessments_job_id_fkey`
  - `ai_assessments_pkey`
- index count: `2`
- expected implicit indexes present:
  - `ai_assessments_pkey`
  - `ai_assessments_job_id_candidate_id_key`
- no standalone secondary indexes are directly supported by the canonical evidence
- RLS is enabled
- policy count: `4`
- policies present:
  - `Allow anon select on ai_assessments`
  - `Anon users can insert ai_assessments`
  - `Anon users can read ai_assessments`
  - `Anon users can update ai_assessments`
- trigger count: `0`
- canonical grant surface present
- `MAINTAIN` confirmed for:
  - `anon`
  - `authenticated`
  - `postgres`
  - `service_role`

## Cleanup

Removed:

- the synthetic `public.ai_assessments` validation row
- the synthetic `public.jobs` validation row
- the synthetic `public.candidates` validation row
- the synthetic `public.job_sources` validation row

Post-cleanup verification confirmed:

- `public.ai_assessments` still exists
- synthetic `public.ai_assessments` row no longer exists
- synthetic `public.jobs` row no longer exists
- synthetic `public.candidates` row no longer exists
- synthetic `public.job_sources` row no longer exists

## Result

PASS

## Notes

- No migration files were created.
- No production resources were touched.
- No next reconstruction object was executed.
- No continuation was made into:
  - `submissions`
  - `applications`
