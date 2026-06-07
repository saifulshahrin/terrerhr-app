# Schema Evidence

Read-only capture for Terrer Schema Stabilization Sprint 1.

Capture timestamp is recorded in `capture_metadata.json`.

## Safety

- No production row bodies are stored.
- `row_counts.json` contains aggregate counts only.
- `storage_buckets.json` contains bucket configuration only.
- No API keys, database passwords, access tokens, or user credentials are stored.
- The capture script reads connection settings from environment variables.

## Authoritative Files

- `live_schema_catalog_ddl.sql`
- `live_rls_policies.sql`
- `live_relation_grants.sql`
- `relations.json`
- `columns.json`
- `constraints.json`
- `indexes.json`
- `sequences.json`
- `sequence_ownership.json`
- `views.json`
- `routines.json`
- `triggers.json`
- `event_triggers.json`
- `rls_policies.json`
- `relation_acl_grants.json`
- `routine_acl_grants.json`
- `schema_grants.json`
- `default_acl_grants.json`
- `rewrite_dependencies.json`
- `relation_dependencies.json`
- `storage_buckets.json`
- `row_counts.json`
- `migration_ledger.txt`
- `edge_functions.json`
- `live_public_types.ts`

## Secondary Files

The following information-schema outputs were empty or less complete for the temporary CLI login role. They are retained to document the query result, but ACL and rewrite-catalog artifacts above take precedence:

- `table_grants.json`
- `routine_grants.json`
- `sequence_grants.json`
- `view_dependencies.json`

## Reproduction

`capture_live_schema.mjs` requires the Node `pg` package to be available at:

```text
.tmp/schema-capture/node_modules/pg
```

The package is intentionally not added to the application manifest. Install it temporarily before rerunning:

```text
npm install --prefix .tmp/schema-capture pg@8.16.3 --no-save --ignore-scripts --no-audit --no-fund
```

Provide `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` through the process environment. Never commit those values.

The script opens a `REPEATABLE READ`, `READ ONLY` transaction and queries catalogs only.
