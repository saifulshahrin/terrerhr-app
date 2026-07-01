# S2C Phase 2-1 Correction Note

## Scope

This note corrects the pre-execution package for reconstructing only `public.job_sources`.

## Failure Cause

The Phase 2-1 pre-state validation query was unsafe because it attempted:

```sql
SELECT count(*) FROM public.job_sources
```

before `public.job_sources` existed.

That caused the validation step to fail with:

```text
ERROR: 42P01: relation "public.job_sources" does not exist
```

## Why No DDL Was Run

The failure occurred during the pre-state validation step.

- The error happened before any DDL submission.
- No reconstruction SQL was executed after the failure.
- No repair or retry was attempted.
- No schema object was created or modified by the failed attempt.

## Corrected Pre-State Validation

Pre-state validation must be existence-only:

```sql
SELECT
  to_regclass('public.job_sources') AS job_sources;
```

Additional row-count validation is allowed only after `public.job_sources` exists.

## Canonical DDL Status

The canonical `job_sources` DDL remains valid.

- Table definition: confirmed from live schema evidence.
- Constraints: confirmed from live schema evidence.
- Indexes: confirmed from live schema evidence.
- RLS and policies: confirmed from live schema evidence.
- Grants: confirmed from live schema evidence.

The failure was in the pre-state validation design, not in the canonical DDL.

## Correction Summary

- Replace unsafe pre-state row-count validation with `to_regclass` only.
- Defer any row count query until after the table exists.
- Preserve the canonical DDL as approved.
- Do not retry execution until the corrected package is re-approved.
