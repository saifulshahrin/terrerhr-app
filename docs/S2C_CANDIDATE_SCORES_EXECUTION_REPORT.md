# S2C Candidate Scores Execution Report: `public.candidate_scores`

Branch: `schema-s1-stabilization`
Target disposable project: `terrer-schema-s2c-bootstrap`
Linked ref verified: `epigstfenpqbslgeyrtn`

## Summary

`public.candidate_scores` was reconstructed successfully.

The canonical weak structure was preserved exactly:

- no primary key
- no unique constraint
- no standalone indexes
- nullable `candidate_id`

One temporary synthetic `public.candidates` row was used only as validation infrastructure for foreign-key testing. It was not part of the reconstructed target object and was removed at the end of the run.

## Pre-state

- `public.candidate_scores` did not exist.
- `public.candidates` existed.

## Reconstruction

Reconstructed only:

- `public.candidate_scores`

Applied:

- canonical table definition
- owner assignment to `postgres`
- `candidate_scores_candidate_id_fkey`
- canonical table grants for `anon`, `authenticated`, `postgres`, and `service_role`

## Catalog validation

Confirmed:

- `public.candidate_scores` exists.
- `candidate_scores_candidate_id_fkey` exists.
- no primary key exists.
- no unique constraint exists.
- no standalone indexes exist.
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
  - `candidate_id = 66666666-6666-6666-6666-666666666666`
- Purpose:
  - satisfy FK validation for `candidate_scores`
  - not part of the reconstructed object set

Successful FK-backed insert:

- Inserted candidate score row with:
  - `candidate_id = 66666666-6666-6666-6666-666666666666`
  - `score = 87`
  - `score_reason = Validation score row`
- Result: succeeded

Expected negative validation:

- Attempted insert with nonexistent `candidate_id = 77777777-7777-7777-7777-777777777777`
- Result: rejected by `candidate_scores_candidate_id_fkey`

## Cleanup

Removed:

- the synthetic `candidate_scores` validation row
- the synthetic `candidates` validation prerequisite row

Post-cleanup verification confirmed:

- synthetic `candidate_scores` row no longer exists
- synthetic `candidates` row no longer exists

## Result

PASS

## Exact expected negative-validation error

```text
ERROR:  23503: insert or update on table "candidate_scores" violates foreign key constraint "candidate_scores_candidate_id_fkey"
DETAIL:  Key (candidate_id)=(77777777-7777-7777-7777-777777777777) is not present in table "candidates".
```

## Notes

- No migration files were created.
- No production resources were touched.
- No next reconstruction object was executed.
