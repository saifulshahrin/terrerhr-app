# S2C Phase 2-5 Execution Report: `public.source_profiles`

Branch: `schema-s1-stabilization`
Target disposable project: `terrer-schema-s2c-bootstrap`
Linked ref verified: `epigstfenpqbslgeyrtn`

## Summary

`public.source_profiles` was reconstructed successfully.

One temporary synthetic `public.candidates` row was used only as validation infrastructure for foreign-key testing. It was not part of the reconstructed target object and was removed at the end of the run.

## Pre-state

- `public.source_profiles` did not exist.
- `public.candidates` existed.

## Reconstruction

Reconstructed only:

- `public.source_profiles`

Applied:

- canonical table definition
- owner assignment to `postgres`
- `source_profiles_candidate_id_fkey`
- `source_profiles_pkey`
- canonical table grants for `anon`, `authenticated`, `postgres`, and `service_role`

## Catalog validation

Confirmed:

- `public.source_profiles` exists.
- `source_profiles_candidate_id_fkey` exists.
- `source_profiles_pkey` exists.
- only the implicit primary-key index exists:
  - `source_profiles_pkey`
- RLS is not enabled.
- no table policies exist.
- no table triggers exist.
- canonical grants exist for:
  - `anon`
  - `authenticated`
  - `postgres`
  - `service_role`

## FK behavior validation

Validation prerequisite only:

- Inserted one temporary synthetic candidate:
  - `candidate_id = 22222222-2222-2222-2222-222222222222`
- Purpose:
  - satisfy FK validation for `source_profiles`
  - not part of the reconstructed object set

Successful FK-backed insert:

- Inserted source profile:
  - `profile_id = 44444444-4444-4444-4444-444444444444`
  - `candidate_id = 22222222-2222-2222-2222-222222222222`
  - `source_name = github`
- Result: succeeded

Expected negative validation:

- Attempted insert with nonexistent `candidate_id = 99999999-9999-9999-9999-999999999999`
- Result: rejected by `source_profiles_candidate_id_fkey`

## Cleanup

Removed:

- the synthetic `source_profiles` validation row
- the synthetic `candidates` validation prerequisite row

Post-cleanup verification confirmed:

- synthetic `source_profiles` row no longer exists
- synthetic `candidates` row no longer exists

## Result

PASS

## Exact expected negative-validation error

```text
ERROR:  23503: insert or update on table "source_profiles" violates foreign key constraint "source_profiles_candidate_id_fkey"
DETAIL:  Key (candidate_id)=(99999999-9999-9999-9999-999999999999) is not present in table "candidates".
```

## Notes

- No migration files were created.
- No production resources were touched.
- No next reconstruction object was executed.
