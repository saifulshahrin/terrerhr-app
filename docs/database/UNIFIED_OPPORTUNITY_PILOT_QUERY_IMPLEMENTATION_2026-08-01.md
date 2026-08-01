# Unified Opportunity pilot and query implementation

Date: 2026-08-01

Branch: `feature/unified-opportunity-pilot-query-2026-08`

Approved staging project: `nulpvbirlhauukccunqg` (`terrer-security-staging-2026-07`)

## Scope and outcome

This change adds a controlled four-record staging pilot and the first common
candidate-facing query contract across canonical Terrer jobs and governed external
opportunities. The tables and lifecycles remain separate. No production project,
frontend page, canonical application flow, submission flow, Confirm Interest flow,
representation record, fixture pipeline, backfill, or scraper was changed.

## Approved pilot records

| Category | Title | Company | Location | Source | Reference |
| --- | --- | --- | --- | --- | --- |
| finance-advisory | Management Consulting - Financial Services: Capital Markets (Analyst/Consultant/Manager) S&C GN MY | Accenture | Kuala Lumpur, Exchange 106 | Accenture Workday (`employer_ats`) | R00314590 |
| software | Software Engineer (Platform Development) | Dassault Systèmes | Petaling Jaya, Selangor | Dassault Systèmes Careers (`employer_job_detail`) | 548642 |
| data | Data Analyst | NTT DATA | Petaling Jaya, Malaysia | NTT DATA Workday (`employer_ats`) | R-143823 |
| fresh-graduate | R&A FAC Analyst | Shell | Shell Centre Kuala Lumpur, Selangor | Shell Workday (`employer_ats`) | R207428 |

All four use the exact employer URLs approved by the user. Source pages were
checked on 2026-08-01. Only the Dassault page exposed a publication date, so only
that row records `posted_at` (`2026-06-15`). The other three publication dates and
all four summaries remain null. `discovered_at` and `last_verified_at` record the
pilot execution/verification time, not an invented source-page date.

## Insertion and schema repair

`supabase/pilot/20260801_unified_opportunity_staging_pilot.sql` is deliberately
outside `supabase/migrations`. Its supported execution path is the fail-closed
`scripts/applyUnifiedOpportunityStagingPilot.mjs` wrapper. The wrapper requires an
explicit `--project-ref`, accepts only `nulpvbirlhauukccunqg`, and verifies that
the supplied database URL hostname is exactly
`db.nulpvbirlhauukccunqg.supabase.co` before starting `psql`. It cannot silently
pair the approved label with a different project's URL.

The SQL independently requires the wrapper-supplied `target_project_ref` psql
variable and checks it again before the transaction reaches the INSERT. Missing
or different values abort. A ledger precondition remains defense in depth but is
not treated as project identity. The script inserts only
`public.external_opportunities`, uses stable IDs, reconciles on generated
`normalized_source_url`, and asserts every approved identity field before commit.
A second run inserts zero rows.

Exact PowerShell invocation (credentials remain outside Git):

```powershell
$env:TERRER_STAGING_DATABASE_URL = '<staging direct Postgres connection URI>'
node scripts/applyUnifiedOpportunityStagingPilot.mjs `
  --project-ref nulpvbirlhauukccunqg
```

Runtime proof showed that the approved Dassault `employer_job_detail` source type
was rejected by the original constraint. The forward migration
`20260801085404_allow_employer_job_detail_external_source.sql` adds that precise
first-party source category. It does not change RLS, grants, RPCs, indexes,
triggers, or any canonical table.

Removal is isolated and explicit:

```sql
delete from public.external_opportunities
where id in (
  'pilot:finance-advisory:accenture:r00314590',
  'pilot:software:dassault-systemes:548642',
  'pilot:data:ntt-data:r-143823',
  'pilot:fresh-graduate:shell:r207428'
);
```

No review rows exist for these IDs, so removal does not affect canonical jobs.

## Unified query architecture

- `opportunityDto.ts` defines one stable DTO and explicit `canonical_terrer` or
  `external` origin.
- `unifiedOpportunityQuery.ts` combines repository results without ranking by
  origin and attaches only trusted matches supplied by each source.
- `unifiedOpportunities.ts` adapts existing Supabase repositories: published
  `candidate_web_jobs` select canonical `jobs`; currently eligible external rows
  come from `external_opportunities`; canonical match evidence comes from
  `ai_assessments`; external match evidence comes from candidate-owned reviews.
- Stable DTO IDs are namespaced (`canonical:<id>` and `external:<id>`) while
  retaining the source ID.
- Shared fields cover title, company, location, optional summary/source URL,
  freshness, role cluster, trusted score/reasons, and action capabilities.

Action capabilities are deliberately fail-closed:

- canonical: canonical interest available; external review unavailable;
- external: employer source and external review available; canonical interest
  unavailable;
- missing optional source actions use an explicit unavailable action and reason.

No method in this query layer performs inserts or updates.

## Validation

Local:

- Supabase CLI 2.110.0 full `db reset --local --no-seed`: passed, including
  migration `20260801085404`.
- Pilot first run: 4 inserted; second run: 0 inserted.
- Pilot target guard: missing reference rejected; production/different reference
  rejected; mismatched database host rejected; exact staging reference accepted.
- Pilot acceptance: passed; collision probe produced 2 rows/2 companies and rolled
  back; pilot count remained 4.
- Unified Opportunity read-only acceptance: passed with no SQL error.
- Query tests: 3/3 passed (both origins/common shape, action isolation, empty state).
- Targeted TypeScript and ESLint checks: passed.
- Vite production build: passed.
- Repository ledger validation: passed (22 restored migrations).
- Repository-wide typecheck remains red on pre-existing unrelated files; no error
  was reported from the new query files under the targeted strict check.

Staging:

- Initial ledger ended at `20260731035000_unified_opportunity_surface_schema`.
- Applied only `20260801085404_allow_employer_job_detail_external_source`.
- Pilot executed twice successfully; final pilot count is 4.
- Exact row metadata, URLs, source references, categories, and the single explicit
  publication date were verified.
- Normalized URL unique index: present and unique.
- Source-reference reconciliation index: present and non-unique.
- Same reference/different company probe: 2 rows/2 companies, then rolled back.
- RLS: seven approved policies remain; candidate review selection still requires
  matching non-empty verified email ownership.
- Triggers: the approved three external-only triggers remain.
- RPCs: service role retains trusted review creation; authenticated retains the
  guarded note RPC; service role remains unable to execute the note RPC.
- Final pilot review count: 0.
- Applications, submissions, and `web_job_interest`: unchanged at 0. No Confirm
  Interest or representation object is referenced by the pilot/query changes.

## Known limitations and next step

This is a backend query contract, not a deployed candidate UI. It intentionally
does not add ingestion, ranking changes, external-to-canonical conversion, pilot
analytics, or action mutations. Canonical visibility continues to depend on the
existing `candidate_web_jobs` publication contract and caller authorization.

The next frontend step is to consume `fetchUnifiedOpportunities` in the candidate
opportunities surface, render origin-neutral cards from `CandidateOpportunity`,
and dispatch buttons strictly from `actions` without adding table-specific writes
to the component.

## Rollback

1. Remove only the four stable pilot IDs with the SQL above on staging.
2. Revert the application commit to remove the DTO/query layer.
3. If the taxonomy addition must be reversed, first confirm no
   `employer_job_detail` rows remain, then restore the previous source-type check
   in a new forward migration. Do not rewrite the applied migration ledger.
