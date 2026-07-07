# S2C Companies Trigger Correction Report

Branch: `schema-s1-stabilization`
Target disposable project ref: `epigstfenpqbslgeyrtn`
Target object: canonical triggers on `public.companies`

## Scope

Correct and validate the pending canonical `public.companies` update triggers:

- `set_updated_at`
- `set_updated_at_companies`

No table reconstruction was performed.
No migrations were created.
Production was not touched.

## Background

`public.companies` had already been reconstructed and validated during Phase 2-2.
Later inventory review identified that the canonical live schema includes two `public.companies` update triggers that were not explicitly validated in the Phase 2-2 report.

Canonical trigger definitions:

- `CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
- `CREATE TRIGGER set_updated_at_companies BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`

Both triggers are canonical even though they overlap.

## Execution Summary

Pre-state validation showed both canonical triggers were absent.

Created only the missing canonical triggers:

- `set_updated_at`
- `set_updated_at_companies`

Catalog validation confirmed both triggers persisted and both point to:

- `public.update_updated_at_column()`

## Previous Behavior Validation Failure

The first behavior validation compared:

- `after_updated_at > before_updated_at`

That validation failed because:

- `public.update_updated_at_column()` sets `updated_at = now()`.
- `public.companies.updated_at` has `DEFAULT now()`.
- PostgreSQL `now()` is transaction-stable.
- The insert and update occurred inside the same transaction.

Therefore, `before_updated_at` and `after_updated_at` could be identical even when the trigger executed correctly.

Classification:

- validation-test bug / transaction timing artifact
- not a trigger DDL failure
- not a schema failure

## Corrected Behavior Validation

Corrected validation inserted one synthetic `public.companies` row with:

- `updated_at = NULL`

Then it updated the row and verified:

- `updated_at` became non-null after update

Result:

- `validation_result`: `PASS`
- `company_id`: `8`
- `before_updated_at`: `NULL`
- `after_updated_at`: `2026-07-07 13:53:17.502751+00`

## Cleanup

The synthetic validation row was deleted.

Cleanup verification:

- `cleanup_remaining`: `0`

## Verdict

PASS

Both canonical `public.companies` triggers were created and persisted.
Both point to `public.update_updated_at_column()`.
Corrected behavior validation passed.
Production was not touched.
