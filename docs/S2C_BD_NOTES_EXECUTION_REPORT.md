# S2C BD Notes Execution Report: `public.bd_notes`

Branch: `schema-s1-stabilization`
Target disposable project: `terrer-schema-s2c-bootstrap`
Linked ref verified: `epigstfenpqbslgeyrtn`

## Summary

`public.bd_notes` was reconstructed successfully.

The approved validation path was followed exactly:

- structural execution only
- FK validation only
- `created_by = NULL`
- no authenticated runtime policy validation
- no synthetic `auth.users` or `profiles` rows

## Pre-state

Verified before DDL:

- `public.bd_notes` did not exist
- `public.companies` existed
- `public.bd_contacts` existed

## Reconstruction

Reconstructed only:

- `public.bd_notes`

Applied:

- canonical table definition
- owner assignment to `postgres`
- RLS enablement
- constraints:
  - `bd_notes_company_id_fkey`
  - `bd_notes_contact_id_fkey`
  - `bd_notes_created_by_fkey`
  - `bd_notes_pkey`
- indexes:
  - `bd_notes_company_id_created_at_idx`
  - `bd_notes_contact_id_idx`
  - `bd_notes_created_by_idx`
- policies:
  - `Authenticated users can insert bd_notes`
  - `Authenticated users can read bd_notes`
  - `Authenticated users can update own bd_notes`
- canonical grants for:
  - `anon`
  - `authenticated`
  - `postgres`
  - `service_role`

## Validation infrastructure

Created only for validation:

- one temporary synthetic `public.companies` row
  - `id = 4`
- one temporary synthetic `public.bd_contacts` row
  - `id = 6f9f5f35-e2dd-4a76-b07f-b5aeb08710d4`
  - `company_id = 4`

These were validation prerequisites only. They were not part of the reconstructed target object.

## Structural validation

Successful valid insert:

- inserted one `public.bd_notes` row with:
  - `id = a0e69dd4-ecb-42d7-9409-700c894588c9`
  - `company_id = 4`
  - `contact_id = 6f9f5f35-e2dd-4a76-b07f-b5aeb08710d4`
  - `note_type = general`
  - `created_by = NULL`

Result:

- PASS

## FK behavior validation

Expected negative validation 1:

- attempted insert with nonexistent `company_id = 999999999999`
- result: rejected by `bd_notes_company_id_fkey`

Exact error:

```text
ERROR:  23503: insert or update on table "bd_notes" violates foreign key constraint "bd_notes_company_id_fkey"
DETAIL:  Key (company_id)=(999999999999) is not present in table "companies".
```

Expected negative validation 2:

- attempted insert with nonexistent `contact_id = ffffffff-ffff-ffff-ffff-ffffffffffff`
- result: rejected by `bd_notes_contact_id_fkey`

Exact error:

```text
ERROR:  23503: insert or update on table "bd_notes" violates foreign key constraint "bd_notes_contact_id_fkey"
DETAIL:  Key (contact_id)=(ffffffff-ffff-ffff-ffff-ffffffffffff) is not present in table "bd_contacts".
```

Both negative validations were expected successful checks of canonical FK enforcement.

## Catalog validation

Confirmed:

- `public.bd_notes` exists
- exact table constraints present:
  - `bd_notes_company_id_fkey`
  - `bd_notes_contact_id_fkey`
  - `bd_notes_created_by_fkey`
  - `bd_notes_pkey`
- total indexes present:
  - `bd_notes_company_id_created_at_idx`
  - `bd_notes_contact_id_idx`
  - `bd_notes_created_by_idx`
  - `bd_notes_pkey`
- RLS is enabled
- total policies present: `3`
- policies present:
  - `Authenticated users can insert bd_notes`
  - `Authenticated users can read bd_notes`
  - `Authenticated users can update own bd_notes`
- table trigger count: `0`
- canonical grant surface present for all four roles
- `MAINTAIN` privilege confirmed for:
  - `anon`
  - `authenticated`
  - `postgres`
  - `service_role`

## Cleanup

Removed:

- the synthetic `public.bd_notes` validation row
- the synthetic `public.bd_contacts` validation row
- the synthetic `public.companies` validation row

Post-cleanup verification confirmed:

- `public.bd_notes` still exists
- synthetic `bd_notes` row no longer exists
- synthetic `bd_contacts` row no longer exists
- synthetic `companies` row no longer exists

## Result

PASS

## Notes

- The first attempted run failed before DDL because the pre-state SQL file used incorrect doubled single-quote syntax in `to_regclass(...)`.
- This retry corrected the quoting defect and completed successfully.
- No migration files were created.
- No production resources were touched.
- No subsequent reconstruction object was executed.
