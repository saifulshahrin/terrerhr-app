# S2C BD Contacts Execution Report: `public.bd_contacts`

Branch: `schema-s1-stabilization`
Target disposable project: `terrer-schema-s2c-bootstrap`
Linked ref verified: `epigstfenpqbslgeyrtn`

## Summary

`public.bd_contacts` was reconstructed successfully.

The canonical structure was preserved exactly:

- UUID primary key with `DEFAULT gen_random_uuid()`
- FK to `companies(id)` with `ON DELETE SET NULL`
- RLS enabled
- five policies
- three standalone indexes

One temporary synthetic `public.companies` row was used only as validation infrastructure for foreign-key testing. It was not part of the reconstructed target object and was removed at the end of the run.

## Pre-state

- `public.bd_contacts` did not exist.
- `public.companies` existed.

## Reconstruction

Reconstructed only:

- `public.bd_contacts`

Applied:

- canonical table definition
- owner assignment to `postgres`
- RLS enablement
- `bd_contacts_company_id_fkey`
- `bd_contacts_pkey`
- standalone indexes:
  - `bd_contacts_company_id_idx`
  - `bd_contacts_email_idx`
  - `bd_contacts_relationship_status_idx`
- five policies
- canonical table grants for `anon`, `authenticated`, `postgres`, and `service_role`

## Catalog validation

Confirmed:

- `public.bd_contacts` exists.
- `bd_contacts_company_id_fkey` exists.
- `bd_contacts_pkey` exists.
- total indexes present:
  - `bd_contacts_company_id_idx`
  - `bd_contacts_email_idx`
  - `bd_contacts_relationship_status_idx`
  - `bd_contacts_pkey`
- This means 3 standalone secondary indexes plus the primary-key index.
- RLS is enabled.
- policies exist:
  - `Anon users can read bd_contacts`
  - `Anon users can update bd_contacts`
  - `Authenticated users can insert bd_contacts`
  - `Authenticated users can read bd_contacts`
  - `Authenticated users can update bd_contacts`
- no table triggers exist.
- canonical grants exist for:
  - `anon`
  - `authenticated`
  - `postgres`
  - `service_role`

## FK behavior validation

Validation prerequisite only:

- Inserted one temporary synthetic company:
  - `id = 3`
- Purpose:
  - satisfy FK validation for `bd_contacts`
  - not part of the reconstructed object set

Successful FK-backed insert:

- Inserted bd contact row with:
  - `company_id = 3`
  - `full_name = S2C Validation Contact`
  - `email = s2c-bd-contact@example.com`
  - `relationship_status = new`
- Result: succeeded

Expected negative validation:

- Attempted insert with nonexistent `company_id = 999999999999`
- Result: rejected by `bd_contacts_company_id_fkey`

## Cleanup

Removed:

- the synthetic `bd_contacts` validation row
- the synthetic `companies` validation prerequisite row

Post-cleanup verification confirmed:

- synthetic `bd_contacts` row no longer exists
- synthetic `companies` row no longer exists

## Result

PASS

## Exact expected negative-validation error

```text
ERROR:  23503: insert or update on table "bd_contacts" violates foreign key constraint "bd_contacts_company_id_fkey"
DETAIL:  Key (company_id)=(999999999999) is not present in table "companies".
```

## Notes

- No migration files were created.
- No production resources were touched.
- No next reconstruction object was executed.
