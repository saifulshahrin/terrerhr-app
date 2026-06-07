# Phase S1 Legacy Table Freeze Plan

Date: 7 June 2026  
Scope: `terrer_*` objects  
Mode: recommendation only; no database changes

## Freeze Objective

Prevent the parallel `terrer_*` model from accumulating new dependencies or data while Terrer stabilizes the active canonical schema.

Freeze does not mean deletion. It means:

- No new application consumers.
- No new writers or imports.
- No schema enhancement except an emergency compatibility fix.
- No data merge into canonical tables during S1.
- No deletion until external consumers and data ownership are disproved.

## Inventory

| Object | Type | Rows | Overlapping canonical domain | Known dependency |
|---|---|---:|---|---|
| `terrer_companies` | Table | 2 | `companies` | Parent of legacy jobs/contacts; read by `terrer_jobs_view` |
| `terrer_company_contacts` | Table | 0 | `bd_contacts` | Legacy company FK and indexes |
| `terrer_jobs` | Table | 18 | `jobs` | Read by `terrer_jobs_view`; legacy company FK |
| `terrer_candidates` | Table | 3 | `candidates` | Referenced by legacy pipeline |
| `terrer_skills` | Table | 0 | `skills` | No captured active read dependency |
| `terrer_pipeline` | Table | 1 | `submissions` plus future placement/revenue entities | Legacy job/candidate/contact links |
| `terrer_jobs_view` | View | N/A | Active job/reporting views | Reads `terrer_companies` and `terrer_jobs` |

Total legacy table rows: 24.

## Why the Domain Should Be Frozen

### Duplicate ownership

The active app reads and writes:

- `companies`, not `terrer_companies`
- `bd_contacts`, not `terrer_company_contacts`
- `jobs`, not `terrer_jobs`
- `candidates`, not `terrer_candidates`
- `skills`, not `terrer_skills`
- `submissions`, not `terrer_pipeline`

Allowing both models to evolve would create two sources of truth for the same business entities.

### Incompatible contracts

The legacy model contains attractive future fields such as salary, fees, placement probability, interview state, and loss reason. Those fields should inform future canonical design, but the legacy tables should not become canonical merely because they contain a more ambitious prototype.

### Low data volume, non-zero evidence value

The dataset is small but not empty. Its 24 rows may preserve prototype examples, manually entered information, or design history. Immediate deletion would offer little benefit and unnecessary risk.

### No current repository consumer

No consumer was found in:

- `src/`
- `scripts/`
- `supabase/functions/`

The only captured database read dependency is `terrer_jobs_view`.

## Recommended Freeze Controls

### Governance controls for S1

1. Mark all six tables and `terrer_jobs_view` as `LEGACY-FROZEN` in the classification register.
2. Reject new application references to any `terrer_*` object.
3. Reject new migrations that add business functionality to the legacy family.
4. Allow only read-only forensic queries during S1.
5. Record any discovered external consumer before changing permissions.
6. Preserve exact DDL and row counts in schema evidence.

### Future technical controls requiring separate approval

These are not to be executed during discovery:

1. Add database comments identifying the objects as legacy/frozen.
2. Revoke write privileges from browser roles after external writer verification.
3. Retain service-role or owner access only for controlled archival.
4. Add monitoring for unexpected writes.
5. Replace `terrer_jobs_view` consumers, if any, before retirement.

## Object-Specific Recommendation

| Object | Freeze recommendation | Future disposition |
|---|---|---|
| `terrer_companies` | Freeze all writes and schema evolution | Compare two rows with canonical companies; archive after consumer audit |
| `terrer_company_contacts` | Freeze immediately | Strong deprecation candidate because it is empty |
| `terrer_jobs` | Freeze all writes | Map 18 rows to canonical job identity; archive only after view retirement |
| `terrer_candidates` | Freeze all writes | Compare three identities with canonical candidates before archival |
| `terrer_skills` | Freeze immediately | Strong deprecation candidate because it is empty |
| `terrer_pipeline` | Freeze all writes | Preserve one row as prototype evidence; mine field vocabulary for future execution/placement design |
| `terrer_jobs_view` | Freeze definition | Deprecate only after logs and external consumer review |

## Explicit Non-Goals

S1 should not:

- Copy legacy rows into canonical tables.
- Add legacy columns to canonical tables.
- Rename legacy tables.
- Drop legacy foreign keys, indexes, triggers, or view.
- Build compatibility views.
- Treat `terrer_pipeline` as the placement/revenue model.
- Resolve identity duplicates using assumptions.

## Exit Criteria for a Successful Freeze

- The canonical review is approved.
- No repository consumer points to `terrer_*`.
- No new migration draft extends `terrer_*`.
- Owners confirm that new operational data must use canonical tables.
- External usage and recent-write evidence are collected before permission changes.
- A later archival decision has row-level mapping evidence and rollback artifacts.

## Rollback Considerations

The discovery freeze is documentary and requires no rollback.

For a future technical freeze:

- Capture a fresh schema-only dump and exact row counts.
- Export the 24 rows to an encrypted, access-controlled archive if policy permits.
- Capture current grants and policies.
- Prepare privilege restoration SQL before revoking writes.
- Do not drop the legacy view until its dependencies and access logs are reviewed.

