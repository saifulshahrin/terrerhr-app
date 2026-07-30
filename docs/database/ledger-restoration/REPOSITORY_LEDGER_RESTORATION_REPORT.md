# Repository-ledger restoration package

## Status

This package restores repository migration files only. It does not authorize or perform migration execution, database reset, Supabase linking, Supabase push, branch merge, application-code changes or Unified Opportunity migration changes.

Repository: `saifulshahrin/terrerhr-app`

Base: `main` at `7e086a1db266fb09f59027bd4f542ab85994242c`

Branch: `ledger/repository-restoration-2026-07`

Authoritative database evidence:

- staging: `nulpvbirlhauukccunqg`
- production: `tlufttnmwtjbuhjcrqmp`
- source table: `supabase_migrations.schema_migrations`
- compared fields: `version`, `name`, `statements`

## Scope reconciliation

A complete comparison of repository `main` against the shared staging and production ledgers found:

1. three genuine predecessor files missing inside `main`'s existing timestamp range;
2. 13 missing July security files;
3. six missing shared Candidate Engine files;
4. one production-only Candidate Engine event that must remain outside the replay chain.

Two apparent May version gaps are normalization aliases, not missing SQL:

- repository `20260507_seed_job_sources.sql` maps to ledger version `20260507000000`;
- repository `20260509_add_canonical_intelligence_fields_to_jobs.sql` maps to ledger version `20260509000000`.

No duplicate 14-digit files were created for those aliases.

## Earlier security-chain restoration matrix

Every row exists under the same version and name in staging and production. Both databases returned the same normalized SQL hash.

| Version | Migration | Ledger hash | Historical source commit | Result |
|---|---|---|---|---|
| `20260416100300` | `reconcile_pipeline_view_dependencies` | `ad276935abf4b515a7a8a52fca1e0134` | `ba359a3e9550de3c74b920d44d5f461a273a0e48` | byte-identical file restored |
| `20260425000000` | `create_candidate_marketplace_contracts` | `8284f4c13d8dd51c59c10f14c1723619` | `4ebc7662d1de158f85c6d2a32fd8afc618570b86` | byte-identical file restored |
| `20260604090000` | `reconcile_profiles_contract` | `af7c39bacf442931a877c185757b16b4` | `ba359a3e9550de3c74b920d44d5f461a273a0e48` | byte-identical file restored |
| `20260708000000` | `reconcile_web_publication_and_employer_contracts` | `4699f060a127cf15071385126544c819` | `ba359a3e9550de3c74b920d44d5f461a273a0e48` | byte-identical file restored |
| `20260708000100` | `reconcile_advisor_remaining_table_contracts` | `5257fb4e717505eb0a28c23493f9e938` | `ba359a3e9550de3c74b920d44d5f461a273a0e48` | byte-identical file restored |
| `20260708000200` | `reconcile_advisor_view_contracts` | `2a8d3edb5f690ed5dc139b21984c5184` | `ba359a3e9550de3c74b920d44d5f461a273a0e48` | byte-identical file restored |
| `20260709000100` | `candidate_email_and_interest_rls` | `18217a043d87f5301f9f1f6cf5f6cabe` | `ba359a3e9550de3c74b920d44d5f461a273a0e48` | byte-identical file restored |
| `20260709000200` | `advisor_remaining_table_rls` | `28e3accee9c323e07f2672214df9489f` | `ba359a3e9550de3c74b920d44d5f461a273a0e48` | byte-identical file restored |
| `20260709000300` | `acl_corrections` | `8bfa723d02bafd3581d4dabb81b877f0` | `ba359a3e9550de3c74b920d44d5f461a273a0e48` | byte-identical file restored |
| `20260709000400` | `view_security_hardening` | `d544cc0b9c89ce3b40172e580981bdb6` | `ba359a3e9550de3c74b920d44d5f461a273a0e48` | byte-identical file restored |
| `20260709000500` | `validation_assertions` | `5f1d4614a8fb226076504244449c93f7` | `ba359a3e9550de3c74b920d44d5f461a273a0e48` | byte-identical file restored |
| `20260711000100` | `drop_legacy_web_job_interest_public_read` | `aea0d08ec7cda85f8beeae5c21d0e0ac` | `af9f2b8a18255d34f945fd0771f4cf02af28e7a0` | byte-identical file restored |
| `20260711000200` | `validation_public_select_assertions` | `926f0b27ee23f110ffcda1bd1965edd1` | `af9f2b8a18255d34f945fd0771f4cf02af28e7a0` | byte-identical file restored |
| `20260711000300` | `harden_remaining_staging_advisor_tables` | `6fd98ee6c1b62ea2e0d837e5074cae96` | `e0958f46f82d37ac561ddda12c3458debb29c146` | byte-identical file restored |
| `20260711000400` | `triage_staging_advisor_warnings` | `6591fe857e04e419344fbc586f5cd192` | `1dc703c1b3c100be2619fa7f38e43360a7759706` | byte-identical file restored |
| `20260711000500` | `validation_warning_lints` | `29d605c0855cdb46cef3e521509c91f3` | `1dc703c1b3c100be2619fa7f38e43360a7759706` | byte-identical file restored |

Historical source branch for all rows: `security/supabase-advisor-hardening-2026-07`.

Only the listed files were recovered from that branch. The branch was not merged and unrelated commits were not imported.

## Candidate Engine restoration matrix

The historical source branches are no longer reachable. For each row, staging and production contain identical statement arrays. The file was reconstructed by preserving each array element exactly and restoring only the SQL statement separators.

| Version | Migration | Staging hash | Production hash | Result |
|---|---|---|---|---|
| `20260723110000` | `reconstruct_applications_from_canonical_evidence` | `0cd63ca821eef75023b643705c359ab6` | `0cd63ca821eef75023b643705c359ab6` | exact ledger-array reconstruction |
| `20260723110554` | `candidate_engine_applications_staff_access` | `e9b541e4afff1f47f8098a2d826df74d` | `e9b541e4afff1f47f8098a2d826df74d` | exact ledger-array reconstruction |
| `20260723133303` | `active_staff_authorization_helper` | `4fb11326568c18968cd45d85011481ff` | `4fb11326568c18968cd45d85011481ff` | exact ledger-array reconstruction |
| `20260723134205` | `restore_active_staff_authorization_effects` | `ebb379a9f87d237862f0675f05563d40` | `ebb379a9f87d237862f0675f05563d40` | exact ledger-array reconstruction |
| `20260723135237` | `repair_submissions_active_staff_authorization` | `f3c7b793564b5f2e75ec69018743790a` | `f3c7b793564b5f2e75ec69018743790a` | exact ledger-array reconstruction |
| `20260723140703` | `repair_activity_log_active_staff_authorization` | `d3c45bf4062db1c6a0c3091f15b77657` | `d3c45bf4062db1c6a0c3091f15b77657` | exact ledger-array reconstruction |

## Hash method and exact evidence

For database evidence:

```sql
md5(
  regexp_replace(
    array_to_string(statements, ';') || ';',
    '\s+',
    '',
    'g'
  )
)
```

For repository files, all SQL whitespace is removed and MD5 is calculated. Equality proves the repository file contains the same ordered statements as the ledger evidence, independent of formatting between top-level statements.

The evidence manifest records, for every file:

- version and name;
- statement count;
- normalized ledger SQL hash;
- exact file SHA-256;
- staging and production project identities;
- historical source branch and commit when reachable;
- reconstruction provenance when the database arrays are the only authoritative source.

Manifest: `docs/database/ledger-restoration/ledger-evidence.json`

## Ordering and dependency review

The restored chain is ordered as follows:

1. missing predecessor contracts;
2. July structural security prerequisites;
3. July RLS, ACL and view hardening;
4. July validation and warning-lint migrations;
5. Candidate Engine `applications` reconstruction;
6. initial direct-profile staff policies;
7. private active-staff helper;
8. helper execution-boundary repair;
9. helper-backed `submissions` policies;
10. helper-backed `activity_log` policies.

`20260723133303` precedes every migration that requires `private.is_current_user_active_staff()`. `20260723134205` restores authenticated schema usage and function execution before `submissions` and `activity_log` policies depend on the helper.

## Collision and replay review

- Repository migration versions are unique after accounting for Supabase's eight-digit date normalization.
- No duplicate May replay files were added.
- `20260723110000` intentionally fails closed if `public.applications` already exists. This prevents a silent duplicate-object collision on an untracked database.
- On staging and production, all shared versions are already ledger-recorded and therefore should not replay.
- The production-only wrapper is absent from `supabase/migrations`.
- Exact hashes prevent rewritten SQL from being attached to an existing deployed version.
- Runtime replay behavior has not been tested because execution is outside authorization.

## Production-only event

`20260723143425_reconcile_candidate_engine_production_authorization` is documented only at:

`docs/database/ledger-restoration/PRODUCTION_ONLY_20260723143425_AUDIT.md`

No `.sql` replay migration was generated for this version.

## Static validation

`scripts/validate-ledger-restoration.mjs` checks:

- expected files and file ordering;
- duplicate versions;
- file SHA-256;
- normalized SQL hashes;
- helper-before-policy dependency ordering;
- absence of a `20260723143425` replay file;
- absence of Unified Opportunity objects from the Candidate Engine restoration files.

`supabase/validation/repository_ledger_restoration_read_only.sql` contains future read-only catalog comparisons. It was generated but not executed.

The filesystem validator is non-mutating and may be run with:

```text
node scripts/validate-ledger-restoration.mjs
```

## Approved source-identity decision

Phase 1 option C remains approved but deliberately unimplemented in this package:

- `normalized_source_url` remains the sole enforced exact identity;
- the source-reference unique index is to become a non-unique reconciliation index;
- the Unified Opportunity migration must not be amended until this restoration package is reviewed.

No Unified Opportunity migration file or branch was modified.

## Unrecoverable or ambiguous items

No migration SQL in the approved restoration scope is unrecoverable.

The six Candidate Engine source-branch commits remain unreachable, but this does not make their SQL ambiguous because both databases retain identical authoritative statement arrays and hashes.

The production-only event remains intentionally non-replayable.

## Execution boundary

No migration or validation SQL was executed. No local database was started, reset or changed. No staging or production database was changed. No Supabase project was linked, pushed or altered.
