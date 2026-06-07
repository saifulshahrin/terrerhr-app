# Terrer Authoritative Live Schema Capture

Capture date: 7 June 2026 (Asia/Kuala_Lumpur)  
Database snapshot timestamp: 6 June 2026 21:01:56 UTC  
Linked Supabase project: `tlufttnmwtjbuhjcrqmp`  
Mode: read-only; no application, migration, or database changes

## Executive Summary

This sprint produced an authoritative catalog capture of the linked Terrer Supabase project without exporting production row contents.

Captured:

- 38 public tables.
- 30 public views.
- 8 public database functions.
- 14 public non-internal triggers.
- 1 event trigger backed by a public function.
- 65 public RLS policies.
- 9 `storage.objects` RLS policies.
- 3 requested storage buckets.
- 4 deployed Edge Functions.
- Exact counts for all 38 public tables using zero-body `HEAD` requests.
- Local-versus-remote migration ledger.
- Exact relation, routine, schema, and default ACL grants.

The capture closes the main evidence gap from Audit D. Docker-based `supabase db dump` was unavailable, so definitions were read directly from PostgreSQL catalogs inside a `REPEATABLE READ`, `READ ONLY` transaction. View, routine, trigger, index, constraint, default, and policy expressions use PostgreSQL server functions such as `pg_get_viewdef`, `pg_get_functiondef`, `pg_get_triggerdef`, `pg_get_indexdef`, `pg_get_constraintdef`, and `pg_get_expr`.

No credentials or production row data are stored under `docs/schema-evidence/`.

## Capture Method

### Database definitions

The capture connected using the Supabase CLI temporary login role and queried PostgreSQL system catalogs only.

The generated DDL artifact:

- Reconstructs table and sequence creation from exact catalog column/type/default/identity metadata.
- Uses exact server-returned definitions for constraints, indexes, views, functions, and triggers.
- Uses exact `pg_policy` expressions for RLS policies.
- Uses ACL expansion for relation, routine, schema, and default privileges.

### Storage configuration

Bucket configuration was read through the authenticated Supabase Storage management API because the CLI database login role could inspect storage catalogs but could not select rows from `storage.buckets`.

### Row counts

Counts were captured through service-role PostgREST `HEAD` requests with `Prefer: count=exact`. No row bodies were requested or saved.

### Migration and deployment metadata

- Migration history: `supabase migration list --linked`.
- Live generated types: `supabase gen types typescript --linked --schema public`.
- Edge Functions: `supabase functions list`.

## Evidence Inventory

| Artifact | Content |
|---|---|
| `docs/schema-evidence/live_schema_catalog_ddl.sql` | Catalog-derived table, sequence, constraint, index, view, routine, trigger, and policy DDL |
| `docs/schema-evidence/live_rls_policies.sql` | Exact public and storage RLS policy definitions |
| `docs/schema-evidence/live_relation_grants.sql` | Exact ACL-derived schema, relation, sequence, and routine grant statements |
| `docs/schema-evidence/relations.json` | Relation type, owner, persistence, RLS state, options |
| `docs/schema-evidence/columns.json` | Exact column types, nullability, defaults, identity/generated settings |
| `docs/schema-evidence/constraints.json` | Exact constraint definitions and references |
| `docs/schema-evidence/indexes.json` | Exact index definitions and validity state |
| `docs/schema-evidence/sequences.json` | Sequence configuration |
| `docs/schema-evidence/sequence_ownership.json` | Sequence ownership links |
| `docs/schema-evidence/views.json` | Exact view definitions, owners, and options |
| `docs/schema-evidence/routines.json` | Exact routine definitions and security properties |
| `docs/schema-evidence/triggers.json` | Exact non-internal trigger definitions |
| `docs/schema-evidence/event_triggers.json` | Exact event-trigger registration |
| `docs/schema-evidence/rls_policies.json` | Exact policy commands, roles, `USING`, and `WITH CHECK` |
| `docs/schema-evidence/relation_acl_grants.json` | Exact relation ACL privileges |
| `docs/schema-evidence/routine_acl_grants.json` | Exact function/procedure ACL privileges and signatures |
| `docs/schema-evidence/schema_grants.json` | Exact schema privileges |
| `docs/schema-evidence/default_acl_grants.json` | Exact default privileges |
| `docs/schema-evidence/rewrite_dependencies.json` | Exact view-to-relation dependencies through `pg_rewrite` |
| `docs/schema-evidence/relation_dependencies.json` | Catalog relation dependencies |
| `docs/schema-evidence/storage_buckets.json` | Requested bucket configuration |
| `docs/schema-evidence/row_counts.json` | Exact public table counts only |
| `docs/schema-evidence/migration_ledger.txt` | Local/remote migration comparison |
| `docs/schema-evidence/edge_functions.json` | Deployed Edge Function metadata |
| `docs/schema-evidence/live_public_types.ts` | Generated live public schema types |
| `docs/schema-evidence/capture_live_schema.mjs` | Credential-free reproducible capture script |

The JSON files retained from information-schema grant/dependency queries are secondary evidence. ACL and `pg_rewrite` artifacts are authoritative where information-schema visibility was empty.

## Live Public Object Inventory

### Tables

`activity_log`, `ai_assessments`, `applications`, `autonomous_recruiter_memory`, `autonomous_recruiter_runs`, `bd_contacts`, `bd_notes`, `candidate_capabilities`, `candidate_scores`, `candidate_skills`, `candidates`, `companies`, `company_identity_merge_v1_snapshot`, `employer_intake_actions`, `employer_job_intake`, `evidence_signals`, `job_candidate_matches`, `job_requirements`, `job_sources`, `jobs`, `jobs_intake`, `match_interactions`, `outreach_log`, `profiles`, `skills`, `source_profiles`, `staging_bullhorn_companies`, `staging_bullhorn_contacts`, `submissions`, `target_companies`, `terrer_candidates`, `terrer_companies`, `terrer_company_contacts`, `terrer_jobs`, `terrer_pipeline`, `terrer_skills`, `web_candidate_intakes`, `web_job_interest`.

### Views

`hiring_leaderboard_malaysia`, `jobs_latest`, `jobs_latest_practical`, `jobs_reporting`, `recruiter_active_submissions`, `terrer_hiring_now`, `terrer_jobs_view`, `v_match_shortlist`, `v_outreach_due`, `vw_activity_log_enriched`, `vw_candidate_pipeline_summary`, `vw_candidate_search`, `vw_candidate_search_clean`, `vw_company_pipeline_summary`, `vw_followup_queue`, `vw_job_shortlist`, `vw_jobs_tier1_malaysia`, `vw_live_work_queue`, `vw_market_signals`, `vw_market_signals_active`, `vw_market_signals_realtime`, `vw_market_signals_recent`, `vw_outcomes_summary`, `vw_pipeline_summary`, `vw_recruiter_dashboard`, `vw_submissions_enriched`, `vw_tier1_source_diagnostics`, `vw_tier1_source_health`, `vw_tier1_source_health_summary`, `vw_tier1_source_health_v2`.

### Public database functions

| Function | Security |
|---|---|
| `create_submission_with_activity(uuid,uuid,bigint,text)` | Invoker; volatile; PL/pgSQL |
| `is_current_user_admin()` | `SECURITY DEFINER`; stable; `search_path=public` |
| `rls_auto_enable()` | `SECURITY DEFINER`; event-trigger function; `search_path=pg_catalog` |
| `set_updated_at()` | Invoker trigger function |
| `sync_submission_next_action_from_activity()` | Invoker trigger function |
| `sync_submission_stage_from_activity()` | Invoker trigger function |
| `update_submission_stage_timestamp()` | Invoker trigger function |
| `update_updated_at_column()` | Invoker trigger function |

## Exact Priority Object Definitions

The exact executable definitions are in the evidence artifacts. The following summarizes the captured contracts.

### `profiles`

| Property | Live definition |
|---|---|
| Primary key | `id uuid` |
| Auth relation | FK `id -> auth.users(id) ON DELETE CASCADE` |
| Required fields | `id`, `role`, `is_active`, `created_at`, `updated_at` |
| Role check | `admin`, `recruiter`, or `bd` |
| Default role | `recruiter` |
| RLS | Enabled |
| Policies | Authenticated own/admin select and update only |
| Insert policy | None |

There is no captured public trigger that automatically creates a profile when an Auth user is created.

### `is_current_user_admin()`

- SQL, stable, `SECURITY DEFINER`.
- Owner: `postgres`.
- Fixed `search_path` of `public`.
- Returns true when `auth.uid()` has an active `profiles.role = 'admin'` row.
- `EXECUTE` is granted to `PUBLIC`, `anon`, `authenticated`, `service_role`, and `postgres`.

The function is safe in purpose but broadly executable. Its behavior depends entirely on the integrity of `profiles`.

### `candidate_skills`

| Property | Live definition |
|---|---|
| Columns | `candidate_id uuid`, `skill_id uuid`, `source_profile_id uuid`, `evidence_id uuid`, `proficiency_score numeric` |
| Primary key | None |
| Unique constraint | None |
| Candidate FK | `candidate_id -> candidates(candidate_id)` |
| Skill FK | `skill_id -> skills(skill_id)` |
| Source/evidence FKs | None |
| Index | B-tree on `candidate_id` |
| RLS | Enabled |
| Policies | Anon select, insert, and update using unconditional expressions |

Critical implications:

- Duplicate candidate-skill rows are structurally possible.
- Orphan `source_profile_id` and `evidence_id` values are possible.
- The current manual writer uses nonexistent `skill` and `proficiency` columns.

### `skills`

| Property | Live definition |
|---|---|
| Columns | `skill_id uuid NOT NULL`, `skill_name text NULL` |
| Primary key | `skill_id` |
| Name uniqueness | None |
| Default ID | None |
| RLS | Disabled |
| Row count | 53 |

Broad ACL grants exist for `anon` and `authenticated`. With RLS disabled, taxonomy rows are directly exposed to those roles, including mutation privileges.

### `job_requirements`

| Property | Live definition |
|---|---|
| Primary key | `job_requirement_id uuid DEFAULT gen_random_uuid()` |
| Job field | `job_id uuid NOT NULL` |
| Job FK | None |
| Required skill field | `skill_name text NOT NULL` |
| Type check | `must_have` or `good_to_have` |
| Optional fields | `min_years numeric`, `weight integer`, `notes text`, `created_at timestamptz` |
| RLS | Enabled |
| Policies | Anon select, insert, and update using unconditional expressions |

`demo_seed.sql` writes `nice_to_have`, which conflicts with the live check constraint `good_to_have`.

### `jobs`

| Property | Live definition |
|---|---|
| Primary key | `id uuid DEFAULT gen_random_uuid()` |
| Secondary identifier | Nullable `job_id text`, unique |
| Company fields | `company_id bigint`, `company_name text`; no FK on `company_id` |
| Source FK | `job_source_id -> job_sources(id) ON DELETE SET NULL` |
| Operational state | `operational_status text NOT NULL DEFAULT 'not_started'` |
| Legacy migration fields absent live | `status`, `created_at` |
| Demand fields | URLs, source IDs, extraction/freshness, market classification, descriptions, responsibilities, qualifications |
| RLS | Enabled |
| Policies | Anon and authenticated select/insert/update, all unconditional |
| Row count | 2,236 |

### `jobs_intake`

| Property | Live definition |
|---|---|
| Primary key | `job_id uuid DEFAULT gen_random_uuid()` |
| FK to `jobs` | None |
| Intake fields | title, company, location, work mode, seniority, skills array, raw input, creator, status, notes |
| RLS | Enabled |
| Policies | Select and insert for both anon and authenticated |
| Update/delete policy | None |
| Row count | 19 |

The application deliberately sets `jobs_intake.job_id = jobs.id`, but the database does not enforce this relationship.

### `submissions`

| Property | Live definition |
|---|---|
| Primary key | `id uuid DEFAULT gen_random_uuid()` |
| FKs | Job, candidate, and company |
| Unique index | `(job_id, candidate_id)` |
| Stage check | 13 allowed stages |
| Next-action check | Requires dates for active stages and null dates for terminal stages |
| Workflow/output fields | Match/rank, owner, decision, outcome, notes, generated submission content, timestamps |
| RLS | Enabled |
| Policy count | 12 |
| Row count | 11 |

There are overlapping and duplicate demo policies:

- Two anonymous insert policies.
- Two anonymous select policies.
- Two anonymous update policies.
- Two anonymous delete policies.
- Authenticated CRUD policies.

The relation ACL grants broad privileges to both `anon` and `authenticated`; RLS currently permits anonymous CRUD, including deletion.

### `create_submission_with_activity(...)`

- Inserts a `submissions` row with stage `new`, next action in three days, and supplied owner/company/job/candidate.
- Inserts an initial `activity_log` row.
- Returns the submission UUID.
- Invoker security, not `SECURITY DEFINER`.
- Executable by `PUBLIC`, `anon`, `authenticated`, `service_role`, and `postgres`.
- No app call was found under `src/`.

Because underlying anonymous insert policies exist on both tables, an anonymous caller can potentially use this function successfully.

### `candidates`

| Property | Live definition |
|---|---|
| Primary key | `candidate_id uuid`; no default |
| Identity/profile fields | Names, location, role, contact channels, source, resume, status |
| Scoring fields | `score_total`, `tier_label`, `contactability_status` |
| Consent/representation fields | Consent text/version/time, opt-in, status, counsellor timestamp |
| Structured preference fields | Current/target role, seniority, priorities, salary, location, notice, confidence, skills |
| Updated-at trigger | Present |
| RLS | Disabled |
| Row count | 189 |

The ACL gives `anon` and `authenticated` broad relation privileges. With RLS disabled, candidate PII is exposed at the base-table level and can be mutated by the browser role.

### `vw_candidate_search_clean`

Exact definition:

```sql
SELECT DISTINCT ON (candidate_id)
  candidate_id,
  display_name,
  full_name,
  country,
  city,
  primary_role,
  source_name,
  source_handle,
  source_profile_url,
  score,
  score_reason,
  top_skills,
  capabilities
FROM vw_candidate_search
ORDER BY candidate_id, scored_at DESC;
```

Security:

- Owner: `postgres`.
- View option: `security_invoker=true`.
- Direct dependency: `vw_candidate_search`.
- Transitive dependencies: `candidates`, `candidate_scores`, `source_profiles`, `candidate_skills`, `skills`, and `candidate_capabilities`.
- Broad ACL grants exist for `anon` and `authenticated`.
- Several underlying candidate tables have RLS disabled.

## Triggered Write Paths

| Source table | Trigger | Side effect |
|---|---|---|
| `activity_log` | `trg_sync_submission_next_action_from_activity` | Updates `submissions.next_action_date` and `updated_at` |
| `activity_log` | `trg_sync_submission_stage_from_activity` | Maps activity types into submission stages and terminal next-action behavior |
| `submissions` | `set_submission_stage_updated_at` | Refreshes `stage_updated_at` when stage changes |
| `submissions` | `set_updated_at_submissions` | Refreshes `updated_at` |
| `jobs` | `set_updated_at_jobs` | Refreshes `updated_at` |
| `candidates` | `set_updated_at_candidates` | Refreshes `updated_at` |
| `companies` | Two updated-at triggers | Both execute `update_updated_at_column()` on update |

`companies` has duplicate updated-at triggers: `set_updated_at` and `set_updated_at_companies`.

The event trigger `ensure_rls` is enabled for `ddl_command_end`, filtered to table-creation tags, and executes `public.rls_auto_enable()`.

## Storage Capture

### Bucket configuration

| Bucket | Public | File-size limit | MIME allowlist | Row/object policies |
|---|---:|---:|---|---|
| `candidate-resumes` | No | None | None | Anon insert; authenticated insert/select |
| `bd-photo-intake` | No | None | None | Authenticated select/insert/update/delete |
| `resumes` | No | None | None | Anon insert only |

### Exact policy behavior

`candidate-resumes`:

- Anonymous uploads are allowed when `bucket_id = 'candidate-resumes'`.
- Authenticated uploads and reads are allowed for every object in the bucket.
- No update/delete policy was captured.
- No owner or path-prefix check exists.

`bd-photo-intake`:

- Policy names say “own,” but expressions only test `bucket_id`.
- Any authenticated user can read, insert, update, or delete any object in the bucket.
- No owner/path check exists.

`resumes`:

- Anonymous insert is allowed for the entire bucket.
- No captured read/update/delete policy exists.

All three buckets are private, have no size limit, and have no MIME allowlist.

## Exact Row Counts

| Table | Count | Table | Count |
|---|---:|---|---:|
| `activity_log` | 2 | `ai_assessments` | 9 |
| `applications` | 0 | `autonomous_recruiter_memory` | 3 |
| `autonomous_recruiter_runs` | 8 | `bd_contacts` | 204 |
| `bd_notes` | 0 | `candidate_capabilities` | 1,620 |
| `candidate_scores` | 182 | `candidate_skills` | 2,709 |
| `candidates` | 189 | `companies` | 113 |
| `company_identity_merge_v1_snapshot` | 22 | `employer_intake_actions` | 0 |
| `employer_job_intake` | 2 | `evidence_signals` | 1,164 |
| `job_candidate_matches` | 3 | `job_requirements` | 6 |
| `job_sources` | 11 | `jobs` | 2,236 |
| `jobs_intake` | 19 | `match_interactions` | 6 |
| `outreach_log` | 1 | `profiles` | 1 |
| `skills` | 53 | `source_profiles` | 583 |
| `staging_bullhorn_companies` | 106 | `staging_bullhorn_contacts` | 232 |
| `submissions` | 11 | `target_companies` | 51 |
| `terrer_candidates` | 3 | `terrer_companies` | 2 |
| `terrer_company_contacts` | 0 | `terrer_jobs` | 18 |
| `terrer_pipeline` | 1 | `terrer_skills` | 0 |
| `web_candidate_intakes` | 0 | `web_job_interest` | 37 |

## Migration Ledger Differences

### Aligned

18 versions are aligned:

`20260416032328`, `20260416033118`, `20260416033907`, `20260416085424`, `20260416090619`, `20260416091656`, `20260416094444`, `20260416100404`, `20260416111941`, `20260419120000`, `20260422120000`, `20260422133000`, `20260426113000`, `20260427173000`, `20260502`, `20260503`, `20260506`, `20260602090000`.

### Remote-only

- `20260507`
- `20260508`
- `20260509`

### Local-only according to CLI

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

Matching filename prefixes do not make the histories aligned. Supabase compares the version portion before the first underscore, and the ledger still reports ambiguity around `20260507`, `20260508`, and `20260509`.

## Edge Function Capture

| Function | Version | JWT verification | Repository |
|---|---:|---:|---|
| `parse-job-intake` | 10 | Yes | No |
| `quick-processor` (`layer2-assess`) | 5 | No | No |
| `job-intake-parser` | 17 | Yes | Yes |
| `bd-photo-vision-extract` | 2 | Yes | Yes |

The two repository functions parse content but do not directly write canonical database tables.

## Authoritative Security Findings

1. `candidates`, `candidate_scores`, `source_profiles`, and `skills` have RLS disabled.
2. ACLs grant broad relation privileges to `anon` and `authenticated`; RLS-disabled tables are therefore directly exposed for reads and mutations.
3. `submissions` has 12 policies and permits anonymous select, insert, update, and delete.
4. `jobs` permits anonymous select, insert, and update.
5. `jobs_intake` permits anonymous select and insert.
6. `candidate_skills` and `job_requirements` permit anonymous select, insert, and update.
7. `ai_assessments` permits anonymous select, insert, and update.
8. `bd_contacts` permits anonymous select and update.
9. `web_job_interest` permits public insert and anonymous read/update.
10. `activity_log` permits anonymous insert and select; its triggers can update submissions.
11. `create_submission_with_activity` is executable by `PUBLIC` and `anon`.
12. Storage policies are bucket-wide rather than owner/path scoped.
13. `quick-processor` is deployed without JWT verification.

## Evidence Limitations

- The generated catalog DDL is not a byte-for-byte `pg_dump` file. It is a semantic reconstruction from exact live catalog values and exact PostgreSQL server-generated object definitions.
- Row counts are exact at request time but are not transactionally synchronized with the earlier catalog timestamp.
- External writers outside this repository can only be marked unknown unless represented in live functions, triggers, or deployment metadata.

## Conclusion

The live schema is now captured sufficiently to stop inferring core definitions from migrations. Migration design should still not begin until the object classification register is accepted and the writer matrix is used to sequence RLS changes safely.
