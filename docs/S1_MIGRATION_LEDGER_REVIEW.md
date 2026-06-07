# Phase S1 Migration Ledger Review

Date: 7 June 2026  
Mode: read-only review

## Inventory Summary

- Local migration files: 34.
- Ledger entries aligned by version: 18.
- Remote-only ledger versions: 3.
- Local-only ledger versions: 16.
- Live public tables: 38.
- Live public views: 30.
- Live public routines: 8.

The ledger and filesystem do not describe one replayable history.

## Ledger Comparison

### Aligned versions

`20260416032328`, `20260416033118`, `20260416033907`, `20260416085424`, `20260416090619`, `20260416091656`, `20260416094444`, `20260416100404`, `20260416111941`, `20260419120000`, `20260422120000`, `20260422133000`, `20260426113000`, `20260427173000`, `20260502`, `20260503`, `20260506`, `20260602090000`.

Alignment only confirms matching ledger identifiers. It does not prove that the resulting live object still matches the migration.

### Remote-only versions

- `20260507`
- `20260508`
- `20260509`

Matching local filenames exist with these short versions, but the ledger reports them as remote-only while the local side also reports the same short versions as local-only. This indicates filename/version parsing or migration-history divergence rather than a clean shared entry.

### Local-only versions

- `20260507113000`
- `20260507`
- `20260508`
- `20260509090000`
- `20260509`
- `20260510101500`
- `20260510104500`
- `20260510121500`
- `20260513140000`
- `20260513160000`
- `20260513173000`
- `20260514110000`
- `20260514143000`
- `20260521090000`
- `20260531093000`
- `20260605090000`

## Migration Issues

### Critical rebuild-safety gaps

Creation migrations are absent or incomplete for:

- `profiles`
- `candidates`
- `candidate_scores`
- `source_profiles`
- `skills`
- `jobs_intake`
- `activity_log`
- `web_candidate_intakes`
- `web_job_interest` base table
- `candidate_capabilities`
- `evidence_signals`
- core candidate search views
- canonical database functions and triggers
- storage buckets and storage policies
- multiple reporting and prototype objects

### Field and constraint drift

| Object | Migration issue |
|---|---|
| `candidate_skills` | Migration shape and current app writer do not represent live normalized columns |
| `job_requirements` | Migration and live IDs, field names, and requirement vocabulary differ |
| `jobs` | Base migration is materially behind live intelligence and lifecycle fields |
| `submissions` | Incremental migrations do not clearly represent the exact current consolidated contract |
| `companies` | Creation migration is partial relative to live identity and source-intelligence fields |
| `bd_contacts` | Multiple follow-on migrations and duplicate email indexes make final intent unclear |
| `profiles` | Entire auth-linked table and helper dependency are absent |

### Policy drift

- Early migrations deliberately grant anonymous CRUD to central operational tables.
- Duplicate submission policies exist live.
- Candidate base tables are RLS-disabled despite broad grants.
- Repository history cannot be treated as a production-safe authorization specification.
- Storage policy history is absent from local migrations.

### Unsafe replay characteristics

- Several files use `IF NOT EXISTS`, masking drift instead of asserting the intended contract.
- View migrations drop and recreate a large dependency chain.
- Seed migrations are mixed into schema history.
- Short version identifiers (`20260502`, `20260503`, `20260506`, `20260507`, `20260508`, `20260509`) coexist with timestamp versions and produce ledger ambiguity.
- Applying local-only migrations to production without reconciliation could duplicate policies, conflict with live columns, or introduce unused objects such as `candidate_intent_events`.

## Migration Classification

| Category | Examples | Recommendation |
|---|---|---|
| Historical aligned | Early submissions/jobs/assessments migrations | Retain as history; do not use as authoritative rebuild source |
| Historical drifted | candidate skills, requirements, jobs, submissions | Supersede through future baseline, not ad hoc replay |
| Local unapplied or ledger-diverged | May and June operational migrations | Reconcile intent against live object before ledger action |
| Seed/data migration | `20260507_seed_job_sources.sql` | Separate from structural baseline |
| Planned but absent live | `candidate_intent_events` | Do not include without product approval |
| Staging/import | Bullhorn staging migration | Preserve separately from canonical product baseline |

## Cleanup Recommendations

### Discovery and approval

1. Freeze migration application during S1 discovery.
2. Treat the live capture as forensic evidence and the future baseline as the rebuild authority.
3. Assign each local migration one status: represented live, drifted live, unapplied, obsolete, seed-only, or unknown.
4. Approve canonical and legacy boundaries before composing any baseline.

### Future repository cleanup

1. Create a consolidated baseline from approved live contracts in dependency order.
2. Keep historical migrations in an archived directory or tagged release rather than silently rewriting applied history.
3. Establish one timestamp naming convention.
4. Separate schema, policy, storage, seed, and data-repair migrations.
5. Add a baseline manifest containing object counts and expected migration version.
6. Add clean-project rebuild validation before ledger reconciliation.

### Future ledger reconciliation requiring explicit approval

Do not alter the production ledger until:

- A disposable project rebuild passes.
- Baseline DDL is reviewed.
- Current live schema diff is empty or explicitly accepted.
- Backup and rollback evidence exists.
- The team chooses between migration repair, squash/baseline marking, or a new-project cutover.

## Recommended Ledger Strategy

The safest likely strategy is:

1. Preserve the current repository and live ledger as historical evidence.
2. Build a new consolidated baseline for a disposable Supabase project.
3. Add post-baseline migrations only for approved stabilization changes.
4. Validate application workflows against the disposable rebuild.
5. Reconcile production by marking or adopting the baseline only through a separately approved runbook.

This avoids replaying drifted historical files against production and avoids pretending the current local/remote ledger is clean.

## Evidence

- `docs/schema-evidence/migration_ledger.txt`
- `supabase/migrations/`
- `docs/SCHEMA_AUTHORITATIVE_CAPTURE.md`
- `docs/AUDIT_D_AUTHORITATIVE_SCHEMA_AUDIT.md`

