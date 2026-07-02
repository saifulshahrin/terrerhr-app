# S2C Candidate Skills Execution Report: `public.candidate_skills`

Branch: `schema-s1-stabilization`
Target disposable project: `terrer-schema-s2c-bootstrap`
Linked ref verified: `epigstfenpqbslgeyrtn`

## Summary

`public.candidate_skills` was reconstructed successfully.

The canonical structure was preserved exactly:

- no primary key
- no unique constraint
- nullable `candidate_id`
- nullable `skill_id`
- RLS enabled
- three anon policies
- one standalone index on `candidate_id`

One temporary synthetic `public.candidates` row and one temporary synthetic `public.skills` row were used only as validation infrastructure for foreign-key testing. They were not part of the reconstructed target object and were removed at the end of the run.

## Pre-state

- `public.candidate_skills` did not exist.
- `public.candidates` existed.
- `public.skills` existed.

## Reconstruction

Reconstructed only:

- `public.candidate_skills`

Applied:

- canonical table definition
- owner assignment to `postgres`
- RLS enablement
- `candidate_skills_candidate_id_fkey`
- `candidate_skills_skill_id_fkey`
- `idx_candidate_skills_candidate_id`
- three anon policies
- canonical table grants for `anon`, `authenticated`, `postgres`, and `service_role`

## Catalog validation

Confirmed:

- `public.candidate_skills` exists.
- `candidate_skills_candidate_id_fkey` exists.
- `candidate_skills_skill_id_fkey` exists.
- no primary key exists.
- no unique constraint exists.
- standalone index exists:
  - `idx_candidate_skills_candidate_id`
- RLS is enabled.
- policies exist:
  - `Anon can insert candidate_skills`
  - `Anon can read candidate_skills`
  - `Anon can update candidate_skills`
- no table triggers exist.
- canonical grants exist for:
  - `anon`
  - `authenticated`
  - `postgres`
  - `service_role`

## FK behavior validation

Validation prerequisites only:

- Inserted one temporary synthetic candidate:
  - `candidate_id = aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
- Inserted one temporary synthetic skill:
  - `skill_id = bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`
- Purpose:
  - satisfy FK validation for `candidate_skills`
  - not part of the reconstructed object set

Successful FK-backed insert:

- Inserted candidate skill row with:
  - `candidate_id = aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
  - `skill_id = bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`
  - `proficiency_score = 0.85`
- Result: succeeded

Expected negative validation 1:

- Attempted insert with nonexistent `candidate_id = cccccccc-cccc-cccc-cccc-cccccccccccc`
- Result: rejected by `candidate_skills_candidate_id_fkey`

Expected negative validation 2:

- Attempted insert with nonexistent `skill_id = dddddddd-dddd-dddd-dddd-dddddddddddd`
- Result: rejected by `candidate_skills_skill_id_fkey`

## Cleanup

Removed:

- the synthetic `candidate_skills` validation row
- the synthetic `candidates` validation prerequisite row
- the synthetic `skills` validation prerequisite row

Post-cleanup verification confirmed:

- synthetic `candidate_skills` row no longer exists
- synthetic `candidates` row no longer exists
- synthetic `skills` row no longer exists

## Result

PASS

## Exact expected negative-validation errors

```text
ERROR:  23503: insert or update on table "candidate_skills" violates foreign key constraint "candidate_skills_candidate_id_fkey"
DETAIL:  Key (candidate_id)=(cccccccc-cccc-cccc-cccc-cccccccccccc) is not present in table "candidates".
```

```text
ERROR:  23503: insert or update on table "candidate_skills" violates foreign key constraint "candidate_skills_skill_id_fkey"
DETAIL:  Key (skill_id)=(dddddddd-dddd-dddd-dddd-dddddddddddd) is not present in table "skills".
```

## Notes

- No migration files were created.
- No production resources were touched.
- No next reconstruction object was executed.
