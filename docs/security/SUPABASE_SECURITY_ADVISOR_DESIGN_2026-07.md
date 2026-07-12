# Supabase Security Advisor Design

Date: 2026-07

This document records the target security posture for the 43 Advisor objects in scope:

- 14 RLS-disabled tables
- 29 security-definer views

It reflects the compatible web baseline introduced by web commit `5006e1e` (`Harden candidate access with verified sessions`).

## Candidate Ownership Design

Use verified Supabase Auth email as the compatibility boundary for the current sprint.

Rationale:

- It matches the web branch that now derives candidate identity from a Supabase Auth session.
- It avoids introducing a new claim/link table during this sprint.
- It keeps localStorage out of the authorization path.
- It tolerates duplicate candidate emails as a transitional ambiguity state.
- It can be upgraded later to a dedicated `candidate_account_links` table if the product needs stricter one-to-one ownership.

Recommended policy shape:

- authenticated candidate: self-only by verified auth email
- recruiter/admin: read and manage internal records
- service-role: full access
- anon: no access to sensitive candidate data

## Web Compatibility Rules

- `auth.jwt() ->> 'email'` is the compatibility source for candidate self-access.
- Browser-supplied `candidate_id` must never be treated as authority.
- Candidate-facing public browsing stays on `candidate_web_jobs`.
- Candidate interest actions must validate ownership through the candidate row.
- Employer preview stays service-role only and anonymised.

## Table Plan

### `public.candidates`

- Sensitivity: high PII
- anon: deny all
- authenticated candidate: self-only SELECT by verified auth email
- authenticated staff: read/write/delete as needed for internal recruiter workflows
- service-role: full
- compatibility note: duplicate-email matches are allowed for the same verified email account during the transition
- rollback: restore previous broader access only if the verified-email web branch must be temporarily reverted

### `public.web_job_interest`

- Sensitivity: high PII and workflow state
- anon: deny all
- authenticated candidate: self-only SELECT/INSERT/UPDATE through the owned candidate row
- authenticated staff: read/update for internal review workflows
- service-role: full
- compatibility note: ownership is checked through `candidates.candidate_id` and verified auth email, not browser identity
- rollback: preserve the owner check even if the candidate UX is degraded

### `public.jobs`

- Sensitivity: operational data and rich internal descriptions
- anon: deny broad direct table access
- authenticated staff: read/write for internal app workflows
- service-role: full
- compatibility note: candidate browsing should use `candidate_web_jobs`, not the base table
- rollback: keep `candidate_web_jobs` public if the internal jobs table is tightened further

### `public.candidate_web_jobs`

- Sensitivity: published job data only
- anon: SELECT published rows only
- authenticated candidate: SELECT published rows only
- authenticated staff: manage publication rows
- service-role: full
- compatibility note: this is the deliberate public publication contract
- rollback: retain the publication contract unchanged

### `public.employer_job_intake`

- Sensitivity: employer contact and intake data
- anon: deny all
- authenticated candidate: deny all
- authenticated staff: server-mediated access only if explicitly needed
- service-role: full
- compatibility note: employer preview remains server-only and should not require browser table access
- rollback: keep data private even if preview is temporarily degraded

### `public.employer_intake_actions`

- Sensitivity: employer workflow notes
- anon: deny all
- authenticated candidate: deny all
- authenticated staff: server-mediated access only if explicitly needed
- service-role: full
- compatibility note: action logging should stay on the trusted server path
- rollback: keep action logging server-only

### `public.candidate_scores`

- Sensitivity: internal scoring and ranking
- anon: deny all
- authenticated staff: read/write/delete for internal candidate workflows
- service-role: full
- compatibility note: these rows feed candidate search and internal profile review
- rollback: retain staff-only access

### `public.source_profiles`

- Sensitivity: provenance and source linkage
- anon: deny all
- authenticated staff: read/write/delete for internal candidate workflows
- service-role: full
- compatibility note: candidate profile and resume review still need this table
- rollback: retain staff-only access

### `public.skills`

- Sensitivity: taxonomy, low PII
- anon: deny direct mutation and broad public reads
- authenticated staff: read-only unless a specific writer is proven
- service-role: full
- compatibility note: keep the vocabulary available for matching and reporting views
- rollback: keep read access only

### `public.candidate_capabilities`

- Sensitivity: derived candidate intelligence
- anon: deny all
- authenticated staff: read-only
- service-role: full
- compatibility note: used by search/reporting views, not browser self-service
- rollback: keep through trusted internal paths only

### `public.evidence_signals`

- Sensitivity: internal enrichment
- anon: deny all
- authenticated staff: read-only
- service-role: full
- compatibility note: no current browser dependency
- rollback: internal-only access only

### `public.job_candidate_matches`

- Sensitivity: internal matching outputs
- anon: deny all
- authenticated staff: read/write/delete if the prototype is still needed
- service-role: full
- compatibility note: keep the prototype behind authenticated access only
- rollback: keep internal-only

### `public.outreach_log`

- Sensitivity: outreach history and contact context
- anon: deny all
- authenticated staff: read/write/delete if the prototype is still needed
- service-role: full
- compatibility note: keep the prototype behind authenticated access only
- rollback: keep internal-only

### `public.terrer_candidates`

- Sensitivity: legacy parallel data
- anon: deny all
- authenticated: deny all unless a legacy tool still proves need
- service-role: full
- compatibility note: no active app consumer was found
- rollback: move out of exposed schema when safe

### `public.terrer_companies`

- Sensitivity: legacy parallel data
- anon: deny all
- authenticated: deny all unless a legacy tool still proves need
- service-role: full
- compatibility note: no active app consumer was found
- rollback: move out of exposed schema when safe

### `public.terrer_company_contacts`

- Sensitivity: legacy parallel PII
- anon: deny all
- authenticated: deny all unless a legacy tool still proves need
- service-role: full
- compatibility note: no active app consumer was found
- rollback: move out of exposed schema when safe

### `public.terrer_jobs`

- Sensitivity: legacy parallel job data
- anon: deny all
- authenticated: deny all unless a legacy tool still proves need
- service-role: full
- compatibility note: no active app consumer was found
- rollback: move out of exposed schema when safe

### `public.terrer_pipeline`

- Sensitivity: legacy pipeline state
- anon: deny all
- authenticated: deny all unless a legacy tool still proves need
- service-role: full
- compatibility note: no active app consumer was found
- rollback: move out of exposed schema when safe

### `public.terrer_skills`

- Sensitivity: legacy parallel taxonomy
- anon: deny all
- authenticated: deny all unless a legacy tool still proves need
- service-role: full
- compatibility note: no active app consumer was found
- rollback: move out of exposed schema when safe

## View Plan

### Security-invoker views

Use `security_invoker` where the view should inherit base-table RLS and remain safe for a browser or authenticated consumer:

- `vw_candidate_search_clean`
- `vw_jobs_tier1_malaysia`
- `vw_market_signals`
- `vw_market_signals_active`
- `vw_market_signals_realtime`
- `vw_market_signals_recent`
- `vw_tier1_source_diagnostics`
- `vw_tier1_source_health`
- `vw_tier1_source_health_summary`
- `vw_tier1_source_health_v2`

These are read-model candidates that should remain compatible with the verified-session web branch and the internal recruiter app.

### Keep authenticated browser/internal access, revoke anon

- `hiring_leaderboard_malaysia`
- `jobs_latest`
- `jobs_latest_practical`
- `jobs_reporting`
- `recruiter_active_submissions`
- `terrer_hiring_now`
- `v_match_shortlist`
- `v_outreach_due`
- `vw_activity_log_enriched`
- `vw_candidate_pipeline_summary`
- `vw_candidate_search`
- `vw_company_pipeline_summary`
- `vw_followup_queue`
- `vw_job_shortlist`
- `vw_live_work_queue`
- `vw_outcomes_summary`
- `vw_pipeline_summary`
- `vw_recruiter_dashboard`
- `vw_submissions_enriched`

These are internal reporting or pipeline projections and should not remain anonymous-facing.

### Move outside the exposed schema when safe

- `terrer_jobs_view`

This is the strongest candidate for schema relocation or retirement after dependency confirmation.

## Migration Sequence

1. Candidate marketplace contract reconciliation.
2. Web publication and employer intake contract reconciliation.
3. Candidate and `web_job_interest` verified-email compatibility.
4. Remaining Advisor table RLS lock-down.
5. ACL corrections.
6. View-security hardening.
7. Validation assertions and smoke tests.

## Migration Dependency Reconciliation

`candidate_web_jobs` was missing from the app repo history because the public job-publication table was introduced in the web repository migration `20260609090000_add_candidate_web_job_publication.sql`. The app security migration started hardening that table, but the app migration history did not own the table creation contract.

The app repo now owns the required compatibility contract through `supabase/migrations/20260708000000_reconcile_web_publication_and_employer_contracts.sql`. This migration creates `public.candidate_web_jobs` idempotently, preserves the public `status = 'published'` read contract, and intentionally does not import the web migration's seed rows.

No web-repo migration was copied unchanged. The candidate publication migration was reconciled as an idempotent app compatibility migration because the original web filename may already be present in production migration history if it was deployed from `terrer-web`. The web employer-intake migration was not copied unchanged because its `employer_intake_actions.intake_id` / `candidate_ref` shape differs from the captured live app evidence, which uses `employer_job_intake_id`, `employer_note`, and `status`.

Remaining cross-repo DB ownership risk: `terrer-web` still consumes `candidate_web_jobs`, `web_job_interest`, `employer_job_intake`, and `employer_intake_actions`, while the app repo is becoming the canonical security owner. Before production deployment, verify the production migration ledger, confirm whether `20260609090000_add_candidate_web_job_publication.sql` is already recorded, confirm `candidate_web_jobs` rows exist or can be managed separately, and smoke test web branch `5006e1e` against the final RLS contract.

This pass also reconciles the remaining Advisor RLS-disabled table contracts referenced by `supabase/migrations/20260709000200_advisor_remaining_table_rls.sql`: `source_profiles`, `evidence_signals`, `skills`, `candidate_capabilities`, `candidate_scores`, `terrer_companies`, `terrer_company_contacts`, `terrer_jobs`, `terrer_candidates`, `terrer_skills`, `terrer_pipeline`, `job_candidate_matches`, and `outreach_log`.

The app repo owner for those table contracts is now `supabase/migrations/20260708000100_reconcile_advisor_remaining_table_contracts.sql`. It is based on `docs/schema-evidence/live_schema_catalog_ddl.sql`, uses guarded structural DDL, adds the live-confirmed indexes, and does not add permissive policies or broad anonymous access.

The web repo did not define these 13 remaining Advisor tables. They appear to be app/internal schema, frozen legacy `terrer_*` schema, or reporting/matching support tables already present in live evidence. No stale web migration was imported for them.

The table dependency gap is reconciled and has now been proven by a clean local Supabase reset against the full app migration chain.

## View Definition Reconciliation

`supabase/migrations/20260709000400_view_security_hardening.sql` hardens 30 views: the 29 Advisor views plus `vw_candidate_search_clean`. `vw_candidate_search_clean` is included because it depends on `vw_candidate_search`, is the active candidate-search clean read model used by the app, and would otherwise remain an unhardened candidate-data view.

The exact live definitions are available in `docs/schema-evidence/live_schema_catalog_ddl.sql`. The app repo already owned 11 recruiter/pipeline view definitions through `supabase/migrations/20260416100404_add_ready_for_bd_review_stage.sql`: `vw_submissions_enriched`, `recruiter_active_submissions`, `vw_company_pipeline_summary`, `vw_candidate_pipeline_summary`, `vw_activity_log_enriched`, `vw_pipeline_summary`, `vw_outcomes_summary`, `vw_live_work_queue`, `vw_followup_queue`, `vw_job_shortlist`, and `vw_recruiter_dashboard`.

The missing view contracts are now reconciled by `supabase/migrations/20260708000200_reconcile_advisor_view_contracts.sql`: `jobs_latest`, `jobs_latest_practical`, `hiring_leaderboard_malaysia`, `jobs_reporting`, `terrer_hiring_now`, `terrer_jobs_view`, `v_match_shortlist`, `v_outreach_due`, `vw_candidate_search`, `vw_candidate_search_clean`, `vw_jobs_tier1_malaysia`, `vw_market_signals`, `vw_market_signals_active`, `vw_market_signals_realtime`, `vw_market_signals_recent`, `vw_tier1_source_health`, `vw_tier1_source_health_v2`, `vw_tier1_source_diagnostics`, and `vw_tier1_source_health_summary`.

The same migration also reconciles the live `public.jobs` columns required by those exact view definitions, using guarded `add column if not exists` statements. This is dependency-only DDL from `live_schema_catalog_ddl.sql`, not a security or semantic redesign.

Dependency order is now: base tables and compatibility table contracts, then `jobs_latest` / `jobs_latest_practical`, then dependent jobs views; `vw_candidate_search` before `vw_candidate_search_clean`; `vw_tier1_source_health` before `vw_tier1_source_health_v2`, then diagnostics and summary; and earlier recruiter/pipeline views before `20260709000400`.

Security treatment remains in `20260709000400`: all target views are set to `security_invoker`, anonymous access is revoked, authenticated read remains for reviewed internal/app contexts, and `service_role` retains read access. Candidate PII views such as candidate search, submission enrichment, job shortlist, follow-up queue, activity enrichment, and recruiter dashboard are not anonymously readable.

No view remains unresolved in migration history based on the available live evidence. A clean local reset has passed with Supabase CLI `2.90.0`, and the transaction-safe validation SQL passed when run explicitly after reset.

## Local Proof Notes

The July migrations use full timestamp filenames (`20260708000000` through `20260709000500`) because Supabase CLI `2.90.0` collapsed the earlier short `20260708_000x` / `20260709_000x` names into duplicate ledger versions during local reset.

Local proof also required two reconstruction-only dependency contracts: `20260416100300_reconcile_pipeline_view_dependencies.sql` for early pipeline view dependencies and `20260604090000_reconcile_profiles_contract.sql` for the `profiles`/admin-helper contract used by staff policies. The Bullhorn staging migration had only a UTF-8 BOM removed so local SQL parsing can succeed; that repair is not a production schema delta.

The local migration proof passed `npx --yes supabase@2.90.0 db reset --yes` and explicit execution of `20260709000500_validation_assertions.sql`. `npm run build` passed. `npm run typecheck` and `npm run lint` still fail on pre-existing app debt outside this migration work, and `npm test` is unavailable because no `test` script exists.

## Staging Proof Notes

Staging validation used Supabase project `nulpvbirlhauukccunqg`. The full migration chain applied successfully to staging.

The staging smoke test found a real legacy policy issue: `public.web_job_interest` policy `"allow read all for now"` allowed authenticated users to see all interest rows. That violated the target self-only interest contract. The fix is `20260711000100_drop_legacy_web_job_interest_public_read.sql`; the added post-cleanup assertion is `20260711000200_validation_public_select_assertions.sql`.

After those follow-up migrations, local reset passed again, staging validation assertions passed, and staging smoke SQL confirmed anonymous denial for candidate data, verified-email candidate self-access, denial of other candidate rows, self-only `web_job_interest`, published-only public `candidate_web_jobs`, and service-role employer intake/action viability.

Remaining validation work is outside SQL migration proof: manually rerun staging Supabase Security Advisor, deploy web commit `5006e1e` to a preview/staging host, and complete browser smoke tests. Production remains blocked pending production ledger review and an approved migration repair or current-timestamp wrapper strategy. Staging ledger quirks around older date-only `20260507` / `20260509` migrations must be documented before using staging as a durable release environment.

## Test Plan

Create transaction-safe tests for:

- anonymous candidate-data denial
- authenticated candidate self-profile access by verified email
- denial of another candidate profile
- candidate self-interest access
- denial of another candidate interest row
- published public jobs still readable
- unpublished jobs remain private
- authorised recruiter/admin access
- unauthorised authenticated-user denial
- service-role workflows
- view output compatibility
- no public candidate PII exposure
