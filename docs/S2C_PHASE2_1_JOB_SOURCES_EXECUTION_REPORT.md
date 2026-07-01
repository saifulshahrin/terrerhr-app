# S2C Phase 2-1 Job Sources Execution Report

## Status

**Status: PASS**

Phase 2-1 began in the approved disposable project and successfully reconstructed `public.job_sources`. The approved invalid `trust_score` behavior check returned the canonical check-constraint error as expected. The duplicate `source_url` runtime test was not executed and is deferred.

## Approved Target

- Project name: `terrer-schema-s2c-bootstrap`
- Project ref: `epigstfenpqbslgeyrtn`

## Precondition

- `supabase/.temp/project-ref` was verified as `epigstfenpqbslgeyrtn` before SQL execution.

## Pre-State Validation

Corrected pre-state query used:

```sql
SELECT to_regclass('public.job_sources') AS job_sources;
```

Observed result:

- `job_sources`: `null`

## Reconstruction DDL

The canonical `public.job_sources` DDL was executed successfully.

No other schema object was created.

## Approved Validation Queries

Executed and verified:

```sql
SELECT
  to_regclass('public.job_sources') AS job_sources,
  (SELECT count(*) FROM public.job_sources) AS row_count;
```

Observed result:

- `job_sources`: `job_sources`
- `row_count`: `0`

```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'job_sources'
ORDER BY ordinal_position;
```

```sql
SELECT
  conname,
  pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'job_sources'
ORDER BY conname;
```

```sql
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'job_sources'
ORDER BY indexname;
```

```sql
SELECT relrowsecurity
FROM pg_class
WHERE oid = 'public.job_sources'::regclass;
```

```sql
SELECT
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'job_sources'
ORDER BY policyname;
```

```sql
SELECT
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'job_sources'
ORDER BY grantee, privilege_type;
```

```sql
SELECT
  pg_get_userbyid(relowner) AS owner
FROM pg_class
WHERE oid = 'public.job_sources'::regclass;
```

Observed results matched canonical evidence:

- table exists
- row count `0`
- all canonical columns and defaults present
- primary key and check constraints present
- expected indexes present
- RLS enabled
- expected read policies present
- expected grants present
- owner is `postgres`

## Behavior Validation

### Valid Insert

Executed successfully:

```sql
INSERT INTO public.job_sources (
  company_name,
  source_name,
  source_url,
  source_type,
  tier,
  trust_score,
  status
)
VALUES (
  'Terrer Test Co',
  'Terrer Test Source',
  'https://example.com/terrertest-source',
  'manual',
  'tier_1',
  87,
  'active'
)
RETURNING id, company_name, source_url, trust_score;
```

Returned:

- `company_name`: `Terrer Test Co`
- `source_url`: `https://example.com/terrertest-source`
- `trust_score`: `87`

### Invalid trust_score

Executed and correctly rejected as the expected negative validation:

```sql
INSERT INTO public.job_sources (
  company_name,
  source_name,
  source_url,
  source_type,
  tier,
  trust_score,
  status
)
VALUES (
  'Terrer Test Co 2',
  'Terrer Test Source 2',
  'https://example.com/terrertest-source-2',
  'manual',
  'tier_1',
  101,
  'active'
);
```

Exact SQL error:

```text
ERROR:  23514: new row for relation "job_sources" violates check constraint "job_sources_trust_score_check"
DETAIL:  Failing row contains (3999ecd6-2c30-453b-8748-011657765e79, Terrer Test Co 2, Terrer Test Source 2, https://example.com/terrertest-source-2, manual, null, tier_1, 101, null, null, null, active, null, null, null, 2026-07-01 08:03:06.212026+00, 2026-07-01 08:03:06.212026+00, null, null, null, null, null, null, null, null, null, null, null).
```

## What Did Not Run

The duplicate `source_url` rejection test was deferred and did not run.

## Created Objects

Only the approved object was created:

- `public.job_sources`

No additional table, function, trigger, policy, migration, or fixture was created.

## Evidence Captured

- Linked project ref verification.
- Pre-state existence-only check.
- Canonical DDL execution output.
- Catalog validation results.
- Valid insert result.
- Invalid trust_score rejection error.
- Working tree status.

## Git Status

Current working tree status at report time:

```text
 M supabase/.temp/linked-project.json
?? .vercel/
?? docs/S2C_PHASE2_1_JOB_SOURCES_CORRECTION_NOTE.md
?? docs/S2C_PHASE2_1_JOB_SOURCES_EXECUTION_REPORT.md
```

## Production Safety

Production was not touched.

- No production SQL was executed.
- No production project ref was used.
- No production schema object was modified.
- No migration was created.

## Conclusion

Phase 2-1 passes.

- Canonical `public.job_sources` was reconstructed successfully.
- The invalid `trust_score` insert was rejected by the expected check constraint.
- The duplicate `source_url` runtime test remains deferred for a later approved step.
- No other schema object was created.
