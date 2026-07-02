# S2C Phase 2-2 Execution Report: `public.companies`

Branch: `schema-s1-stabilization`
Target disposable project: `terrer-schema-s2c-bootstrap`
Linked ref verified: `epigstfenpqbslgeyrtn`

## Summary

`public.companies` was reconstructed successfully using the corrected phased method that preserves the pre-existing `public.companies_id_seq`.

This was an implementation adaptation for phased reconstruction. The logical schema target remains canonical.

## Pre-state

- `public.companies_id_seq` existed.
- `public.companies` did not exist.
- `public.job_sources` existed.

## Reconstruction

Reconstructed only:

- `public.companies`

Preserved and attached:

- `public.companies_id_seq`

## Post-state validation

Confirmed:

- `public.companies` exists.
- `public.companies_id_seq` exists.
- `public.companies.id` default resolves to `nextval('companies_id_seq'::regclass)`.
- `pg_get_serial_sequence('public.companies', 'id')` returns `public.companies_id_seq`.
- `public.companies_id_seq` is owned by `public.companies.id`.
- `companies_pkey` exists.
- `companies_source_status_check` exists.
- RLS is enabled.
- Policies exist for:
  - `anon` select
  - `authenticated` insert
  - `authenticated` select
- Grants exist for:
  - `anon`
  - `authenticated`
  - `postgres`
  - `service_role`

## Behavior validation

Successful insert:

- Insert with `company_name = 'S2C Phase 2-2 validation company'`
- `source_status = 'ready'`
- Result: succeeded
- Returned `company_status = 'active'`

Cleanup:

- The synthetic row was deleted after validation.

Expected negative validation:

- Insert with `source_status = 'not_allowed'`
- Result: rejected by `companies_source_status_check`

## Result

PASS

## Notes

- No migration files were created.
- No production resources were touched.
- No next object was executed.
