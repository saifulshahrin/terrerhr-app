# S2C Phase 2-4 Execution Report: `public.candidates`

Branch: `schema-s1-stabilization`
Target disposable project: `terrer-schema-s2c-bootstrap`
Linked ref verified: `epigstfenpqbslgeyrtn`

## Summary

`public.candidates` was reconstructed successfully.

Approved shared infrastructure executed with this phase:

- `public.update_updated_at_column()`
- `set_updated_at_candidates` trigger on `public.candidates`

No other functions or business-logic triggers were executed.

## Pre-state

- `public.candidates` did not exist.
- `public.update_updated_at_column()` did not exist.

## Reconstruction

Reconstructed:

- `public.update_updated_at_column()`
- `public.candidates`
- `set_updated_at_candidates`

Applied:

- canonical `candidates` table definition
- owner assignment to `postgres`
- `candidates_pkey`
- canonical table grants
- canonical function grants for `update_updated_at_column()`

## Catalog validation

Confirmed:

- `public.candidates` exists.
- `public.update_updated_at_column()` exists.
- `candidates_pkey` exists.
- only the implicit primary-key index exists:
  - `candidates_pkey`
- RLS is not enabled.
- no table policies exist.
- canonical table grants exist for:
  - `anon`
  - `authenticated`
  - `postgres`
  - `service_role`
- canonical function execute grants exist for:
  - `PUBLIC`
  - `anon`
  - `authenticated`
  - `postgres`
  - `service_role`
- trigger exists:
  - `set_updated_at_candidates`

## Behavior validation

Successful insert:

- Inserted candidate:
  - `candidate_id = 22222222-2222-2222-2222-222222222222`
  - `full_name = S2C Phase 2-4 Validation Candidate`
- Result: succeeded

Default-value validation:

- Inserted candidate:
  - `candidate_id = 33333333-3333-3333-3333-333333333333`
  - `full_name = S2C Phase 2-4 Default Validation Candidate`
- Confirmed defaults:
  - `candidate_status = active`
  - `representation_opt_in = false`
  - `salary_expectation_currency = MYR`

Expected negative validation:

- Attempted duplicate insert with existing `candidate_id`
- Result: rejected by `candidates_pkey`

Cleanup:

- Deleted both synthetic validation rows successfully.

## Trigger / function validation

- Insert behavior left `updated_at` as `null`, which matches the trigger design because the trigger runs only on `UPDATE`.
- Updating the first validation candidate changed `updated_at` to a non-null timestamp.
- This confirms `set_updated_at_candidates` executed through `public.update_updated_at_column()`.

## Result

PASS

## Exact expected negative-validation error

```text
ERROR:  23505: duplicate key value violates unique constraint "candidates_pkey"
DETAIL:  Key (candidate_id)=(22222222-2222-2222-2222-222222222222) already exists.
```

## Notes

- No migration files were created.
- No production resources were touched.
- No next reconstruction object was executed.
