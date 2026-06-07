# Terrer Canonical Writer Matrix

Capture date: 7 June 2026  
Scope: current repository, live database functions/triggers, and known operational SQL/scripts  
Mode: read-only analysis

## Authentication Context

The browser client is created with `VITE_SUPABASE_ANON_KEY`.

- Default `VITE_AUTH_MODE=demo`: no Supabase session is required, so browser writes execute as `anon`.
- `VITE_AUTH_MODE=strict`: signed-in writes execute as `authenticated`.
- The same page/component can therefore be either anon or authenticated depending on deployment configuration.
- `scripts/importBdRelationships.mjs` explicitly uses the service-role key.
- `demo_seed.sql` and rollback SQL execute as the database role used by the operator.
- Edge Functions in this repository do not directly write canonical tables.

## Canonical Table Writers

| Table | App page/component writer | Edge Function / script / DB writer | Operation | Effective role | Risk if schema/RLS changes |
|---|---|---|---|---|---|
| `profiles` | No browser writer | Auth provisioning outside repo unknown; `setAdminPassword.mjs` reads only | Unknown insert source; browser update possible under policy but no UI found | Auth provisioning unknown; browser authenticated | Critical: strict login blocks if profile bootstrap or select policy changes |
| `companies` | BD Relationships; BD Photo Intake; company intelligence editor | `importBdRelationships.mjs`; `demo_seed.sql`; rollback SQL | Insert, update; seed insert/delete | Browser anon in demo or authenticated in strict; importer service-role; SQL operator | High: BD company creation/import can fail; anon read removal affects Opportunities and BD views |
| `bd_contacts` | BD Relationships; BD Tasks & Follow-ups; BD Photo Intake | `importBdRelationships.mjs`; `demo_seed.sql`; rollback SQL | Insert, update; seed insert/delete | Browser anon/authenticated; importer service-role; SQL operator | Critical: current demo writes depend on anon update; photo-intake fields may drift |
| `bd_notes` | BD Relationships | None found | Insert | Browser authenticated required by live RLS; fails in demo anon | Medium: tightening creator/ownership rules may affect note creation |
| `job_sources` | No app writer; app resolves/reads | `demo_seed.sql`; rollback SQL; external sourcing writer unknown | Seed insert/delete; production writer unknown | SQL operator / unknown | Medium: ingestion may fail if external writer is not identified |
| `jobs` | Job Intake; Jobs operational status editor | `demo_seed.sql`; rollback SQL; external job ingestion unknown; updated-at trigger | Insert, update; seed insert/delete; trigger update timestamp | Browser anon/authenticated; SQL operator; external unknown | Critical: current demo requires anon insert/update; ingestion contract may use service role or direct DB |
| `jobs_intake` | Job Intake through `createJob()` | None found | Insert | Browser anon/authenticated | Critical: separate second write can fail after job insert; policy removal must be coordinated |
| `job_requirements` | No current app writer | `demo_seed.sql`; rollback SQL; future parser/ingestion unknown | Seed insert/delete | SQL operator / unknown | High: live check uses `good_to_have`; current seed writes `nice_to_have` |
| `candidates` | Candidates manual intake; Admin Resume Import | `demo_seed.sql`; rollback SQL; updated-at trigger | Insert, update, compensating delete; seed insert/delete | Browser anon/authenticated; SQL operator | Critical: RLS is disabled today; enabling it without policies breaks all candidate intake/import |
| `source_profiles` | Candidates manual intake | `demo_seed.sql`; rollback SQL | Insert and compensating delete; seed insert/delete | Browser anon/authenticated; SQL operator | Critical: RLS disabled; candidate creation rollback depends on delete |
| `skills` | No current app writer | Seed/source process unknown | Unknown | Unknown | High: normalized candidate-skill writes require a controlled taxonomy writer |
| `candidate_skills` | Candidates manual intake attempts obsolete insert; compensating delete | Production sourcing writer unknown | Insert and delete | Browser anon/authenticated; external unknown | Critical: current app insert shape is invalid; RLS tightening can hide the existing silent failure |
| `candidate_scores` | Candidates manual intake | `demo_seed.sql`; rollback SQL; scoring writer unknown | Insert and compensating delete; seed insert/delete | Browser anon/authenticated; SQL operator; external unknown | Critical: RLS disabled; search view depends on score row presence |
| `ai_assessments` | Top Matches Terrer AI Review | `demo_seed.sql`; rollback SQL | Insert or update; seed insert/delete | Browser anon/authenticated; SQL operator | Critical: current review generation depends on anon write in demo |
| `submissions` | StoreContext actions used by Candidates, Top Matches, Pipeline, BD Queue; BD Tasks notes | `create_submission_with_activity`; activity triggers; `demo_seed.sql`; rollback SQL | Upsert, update, delete, bulk update/delete; DB function insert; trigger update | Browser anon/authenticated; function caller role; SQL operator | Critical: 12 permissive policies; any policy/constraint change affects the central pipeline |
| `activity_log` | No direct app writer found | `create_submission_with_activity`; external activity writer unknown | Insert; triggers then update submissions | Function caller role; external unknown | Critical: anon insert currently can cause submission stage/next-action updates |
| `web_candidate_intakes` | `submitWebCandidateIntake()` library; no caller in current internal app | External web shell likely; writer not in repo | Insert | Intended anon public intake | High: public intake must remain narrow; table is empty live |
| `web_job_interest` | Interested Candidates updates status | External web shell creates rows; creator not in repo | App update; external insert | Browser anon/authenticated; external likely anon | Critical: current policy permits public insert and anon read/update |
| `autonomous_recruiter_runs` | No app writer; Autonomous Recruiter page reads | `demo_seed.sql`; rollback SQL; autonomous runner outside repo | Insert/delete seed; production insert unknown | SQL operator; external likely service-role/authenticated | High: writer must be identified before restricting insert |
| `autonomous_recruiter_memory` | No app writer; Autonomous Recruiter page reads | Autonomous runner outside repo | Insert unknown | Likely authenticated/service-role; unverified | High: memory generation can break if role assumption is wrong |

## Canonical View and Function Writers

Views do not store rows, but their dependencies make upstream writers relevant.

| Object | Writer/effect | Caller | Effective role | Change risk |
|---|---|---|---|---|
| `vw_candidate_search_clean` | Read model over candidate sources/scores/skills/capabilities | Candidates and pipeline candidate lookups | Browser anon/authenticated | Critical: column or security changes affect all candidate lists |
| `vw_candidate_search` | Aggregates candidate domain | Indirect through clean view | View invoker | Critical: dependency/aggregation drift |
| `create_submission_with_activity` | Inserts submission and activity | No repository caller found | Executable by PUBLIC/anon/authenticated/service-role | Critical: broad execute plus permissive table policies |
| `is_current_user_admin` | Reads profiles for RLS | Profiles policies | Caller role under security definer | Critical: authorization dependency |

## Trigger-Side Writers

| Trigger source | Target mutation | Trigger role behavior | Risk |
|---|---|---|---|
| Insert into `activity_log` | Updates `submissions.next_action_date`, `submission_stage`, and `updated_at` | Invoker context | Critical: anonymous activity insert can indirectly mutate submissions |
| Update `submissions` | Updates `stage_updated_at` and `updated_at` | Invoker context | Medium: application timestamps may be overwritten intentionally |
| Update `jobs` | Updates `updated_at` | Invoker context | Low |
| Update `candidates` | Updates `updated_at` | Invoker context | Low |
| Update `companies` | Two triggers both set `updated_at` | Invoker context | Medium: duplicate trigger should be classified before baseline |
| Update parallel `terrer_*` tables | Updates timestamps | Invoker context | Low while legacy objects remain |

## Storage Writers

| Bucket | App writer | Operation | Effective role | RLS/policy risk |
|---|---|---|---|---|
| `candidate-resumes` | Candidates; Admin Resume Import; web candidate intake library | Upload; cleanup remove on intake failure | Browser anon/authenticated | Anon upload allowed bucket-wide; authenticated read/upload bucket-wide; no MIME/size/owner restriction; deletes may fail |
| `bd-photo-intake` | BD Photo Intake storage helper | Upload; potential update/delete through storage client | Authenticated expected | Policies allow any authenticated user to operate on every object despite “own” names |
| `resumes` | No repository writer found | External/legacy upload unknown | Anon insert policy exists | Unknown consumer and no read policy |

## Edge Function Write Matrix

| Function | Canonical DB writes | Storage writes | Authentication | Schema/RLS risk |
|---|---|---|---|---|
| `job-intake-parser` | None | None | JWT verified | Output-shape changes affect app parsing, not DB directly |
| `bd-photo-vision-extract` | None | None | JWT verified | Sensitive payload processing; page performs subsequent DB writes |
| `parse-job-intake` | Unknown deployed source; no repository source/caller | Unknown | JWT verified | Audit before retirement |
| `quick-processor` | Unknown deployed source; no repository source/caller | Unknown | JWT not verified | Critical unknown public surface |

## Operational SQL and Script Writers

| Writer | Tables | Operations | Role | Risk |
|---|---|---|---|---|
| `scripts/importBdRelationships.mjs --apply` | `companies`, `bd_contacts` | Read-then-insert/update | Service role | Bypasses RLS; schema changes must preserve payload fields |
| `demo_seed.sql` | Sources, jobs, candidates, scores, profiles, requirements, submissions, assessments, autonomous runs, companies, contacts | Targeted delete then insert | SQL operator | Not production-safe by default; currently conflicts with requirement type check |
| `rollback_demo_seed.sql` | Same demo tables | Targeted delete | SQL operator | Constraint/FK changes can change delete order requirements |
| `scripts/setAdminPassword.mjs` | `auth.users` only | Admin password update | Service role | Does not write `profiles`; strict auth still depends on existing profile row |
| External job ingestion | `jobs`, `job_sources` likely | Unknown | Unknown | Must identify before RLS/grant changes |
| External autonomous recruiter | Run and memory tables | Unknown inserts | Unknown | Must identify before RLS/grant changes |
| External web shell | Candidate intakes and job interest | Public insert likely | Anon | Must preserve only explicitly approved insert contracts |

## Highest-Risk RLS Change Dependencies

### Candidate domain

Enabling RLS on `candidates`, `candidate_scores`, `source_profiles`, and `skills` without first adding authenticated and approved public policies will immediately break:

- Candidate list/search dependencies.
- Manual candidate creation.
- Admin resume import.
- Candidate creation compensating deletes.
- Candidate profile reads.
- Top Matches candidate retrieval.

### Submission domain

Removing anonymous policies is required, but demo mode currently writes as `anon`. Security remediation must either:

- Move production to strict auth first, or
- Replace browser writes with protected server/RPC paths before revoking anon.

### Job intake

`jobs` and `jobs_intake` are two browser writes. Revoking one policy before the other can create partial saves.

### BD relationship domain

`bd_contacts` is actively updated from three pages and imported with service role. Authenticated policies must support all page operations before anon update is removed.

### Storage

Storage policy changes and URL-access changes must be released together. Private buckets should remain private; application reads should use signed/authenticated paths.

## Writer Gaps Requiring Owner Confirmation

1. Production writer for scraped/external `jobs`.
2. Production writer for `job_sources` health metrics.
3. Writer for normalized `skills` and the 2,709 `candidate_skills` rows.
4. Writer for `candidate_capabilities` and `evidence_signals`.
5. Creator of `web_job_interest` rows.
6. Deployment containing the actual `web_candidate_intakes` caller.
7. Production writer for autonomous recruiter runs and memory.
8. Any caller of `create_submission_with_activity`.
9. Any caller of legacy Edge Functions.
10. Any writer/reader of the `resumes` bucket.

## Conclusion

The central implementation constraint is clear: production safety requires removing anonymous access, but the current default demo mode intentionally performs most browser writes as `anon`. Authentication rollout, protected write paths, and RLS remediation must therefore be sequenced as one coordinated stabilization program rather than independent policy edits.
