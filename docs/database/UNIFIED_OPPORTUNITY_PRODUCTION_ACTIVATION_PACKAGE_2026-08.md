# Unified Opportunity Production Activation Package — August 2026

## Status and authority boundary

**Preparation only. This package is not production activation authorization.** It was prepared from application base `19c3b0b187ac1670af71f24105501b8c9ec8c720` and production web commit `9dcc9c200cd192ecf976065ada069fc3cb02034b`. Production is Supabase project `tlufttnmwtjbuhjcrqmp`; staging is the distinct project `nulpvbirlhauukccunqg`.

No migration, deployment, secret/configuration change, Auth mutation, inventory insert, test login, or production/staging write was performed while preparing this package. Do not execute any gate until its named approver has approved the production change window.

## 1. Read-only recheck — 2026-08-02 (Asia/Kuala_Lumpur)

The audit facts are unchanged:

- Production ledger still ends at `20260723143425_reconcile_candidate_engine_production_authorization`.
- Production still lacks `20260731035000_unified_opportunity_surface_schema` and `20260801085404_allow_employer_job_detail_external_source`.
- `external_opportunities`, `external_opportunity_reviews`, `create_external_opportunity_review_trusted`, `update_external_opportunity_review_note`, and the `unified-opportunities` Edge Function remain absent.
- Auth aggregates remain: 1 user, 1 confirmed, 1 confirmed zero-match, 0 confirmed single-match, 0 confirmed ambiguous; 3 duplicate normalized candidate-email groups.
- Canonical publications remain 0, including 0 eligible. External inventory and review counts remain inaccessible because their tables are absent.
- Current canonical-isolation baseline: `web_job_interest` 60, `applications` 0, `submissions` 11, representation requests 2.
- `https://terrerhr.com` returns 200 and resolves to `https://www.terrerhr.com/`. Bundle `index-Cz-QJ_le.js` contains production ref `tlufttnmwtjbuhjcrqmp` and `/functions/v1/unified-opportunities`; it contains no staging ref, service-role name/claim, or known staging pilot ID.

## 2. Exact migration execution package

### Complete ordered gap

Only these repository migrations sort after the production endpoint and exist on audited app main:

| Order | Migration | Classification | Skip decision |
|---:|---|---|---|
| 1 | `20260731035000_unified_opportunity_surface_schema.sql` | Required for activation. Creates the two tables, normalizer, constraints, indexes, triggers, RLS, grants, trusted creation RPC, guarded staff-note RPC, and staff queue RPC. | **Unsafe to skip.** All backend contracts depend on it. |
| 2 | `20260801085404_allow_employer_job_detail_external_source.sql` | Required for exact app-main ledger/schema alignment. Extends the constrained source taxonomy with `employer_job_detail`. | **Unsafe to skip in the ordered deployment.** It depends on migration 1 and prevents future direct employer detail pages being misclassified. |

There are no already-functionally-present, unrelated ordered dependencies, or safe-to-defer migrations in this gap. Apply in filename order through the normal reviewed migration workflow; do not edit the migration ledger and do not selectively copy DDL.

### Preflight SQL (read-only; all statements must complete)

```sql
begin transaction read only;

select current_database(), current_user, current_setting('server_version');

select version, name
from supabase_migrations.schema_migrations
order by version desc
limit 5;

select
  current_setting('server_version_num')::integer >= 150000 as postgres_15_or_newer,
  to_regnamespace('private') is not null as private_schema_exists,
  to_regclass('public.candidates') is not null as candidates_exists,
  to_regclass('public.profiles') is not null as profiles_exists,
  to_regprocedure('private.is_current_user_active_staff()') is not null as active_staff_helper_exists,
  to_regclass('public.external_opportunities') is null as opportunities_absent,
  to_regclass('public.external_opportunity_reviews') is null as reviews_absent;

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'candidates' and column_name in ('candidate_id', 'email'))
    or (table_name = 'profiles' and column_name in ('id', 'role', 'is_active')))
order by table_name, ordinal_position;

select rolname, rolbypassrls
from pg_roles
where rolname in ('anon', 'authenticated', 'service_role')
order by rolname;

select
  (select count(*) from public.candidate_web_jobs) as canonical_publications,
  (select count(*) from public.candidate_web_jobs where status = 'published') as eligible_canonical,
  (select count(*) from public.web_job_interest) as web_job_interest,
  (select count(*) from public.applications) as applications,
  (select count(*) from public.submissions) as submissions,
  (select count(*) from public.web_job_interest where representation_requested_at is not null) as representation_requests;

commit;
```

Preflight passes only if the project identity is independently confirmed as `tlufttnmwtjbuhjcrqmp`, the ledger endpoint is exactly `20260723143425`, dependencies are true, target relations are absent, and baseline counts are recorded in the change record. Any mismatch stops the run.

### Execution specification

From a clean checkout pinned to approved application commit `19c3b0b187ac1670af71f24105501b8c9ec8c720`, first discover the installed CLI interface with `npx supabase --version`, `npx supabase migration --help`, and `npx supabase db push --help`. Use the repository's approved production CI/integration migration workflow where available. If an explicitly approved operator uses the CLI, link/target only `tlufttnmwtjbuhjcrqmp`, confirm the dry-run/pending list contains exactly the two files above, then perform one reviewed ordered push. Never use `--include-all`, ledger repair, reset, or direct copied DDL for this activation.

### Post-migration validation SQL

Run the repository's complete read-only specification:

`supabase/validation/20260731035000_unified_opportunity_surface_read_only_acceptance.sql`

Then record this compact gate; every boolean must be true, counts exact, and forbidden queries empty:

```sql
begin transaction read only;

select
  to_regclass('public.external_opportunities') is not null as opportunities_exists,
  to_regclass('public.external_opportunity_reviews') is not null as reviews_exists,
  to_regprocedure('public.create_external_opportunity_review_trusted(uuid,text,smallint,text[])') is not null as trusted_rpc_exists,
  to_regprocedure('public.update_external_opportunity_review_note(uuid,text)') is not null as note_rpc_exists,
  to_regprocedure('public.list_external_reviews_for_staff()') is not null as staff_queue_rpc_exists;

select version, name
from supabase_migrations.schema_migrations
where version in ('20260731035000', '20260801085404')
order by version;

select c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('external_opportunities', 'external_opportunity_reviews')
order by c.relname;

select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('external_opportunities', 'external_opportunity_reviews')
order by tablename, policyname;

select conrelid::regclass as relation, conname, contype, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.external_opportunities'::regclass,
                   'public.external_opportunity_reviews'::regclass)
order by relation::text, conname;

select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('external_opportunities', 'external_opportunity_reviews')
order by tablename, indexname;

select p.oid::regprocedure as routine, p.prosecdef,
       coalesce(array_agg(distinct case when a.grantee = 0 then 'PUBLIC'
         else pg_get_userbyid(a.grantee) end)
         filter (where a.privilege_type = 'EXECUTE'), '{}'::text[]) as execute_grantees
from pg_proc p
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
where p.oid in (
  'public.create_external_opportunity_review_trusted(uuid,text,smallint,text[])'::regprocedure,
  'public.update_external_opportunity_review_note(uuid,text)'::regprocedure,
  'public.list_external_reviews_for_staff()'::regprocedure)
group by p.oid, p.prosecdef
order by routine::text;

-- Must return zero rows: no API-role access to internal note/reviewer columns.
select grantee, privilege_type, column_name
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'external_opportunity_reviews'
  and grantee in ('anon', 'authenticated') and privilege_type = 'SELECT'
  and column_name in ('review_notes', 'reviewed_by');

-- Must return zero rows: no source-reference uniqueness.
select i.relname, pg_get_indexdef(i.oid)
from pg_index x join pg_class i on i.oid = x.indexrelid
join pg_class t on t.oid = x.indrelid join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public' and t.relname = 'external_opportunities'
  and x.indisunique and lower(pg_get_indexdef(i.oid)) ~
    'source_type.*source_name.*source_reference_id';

-- Must return zero rows: generated routines do not cross canonical lifecycles.
with generated as (
  select p.oid::regprocedure routine, lower(pg_get_functiondef(p.oid)) definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where (n.nspname, p.proname) in (
    ('private','set_row_updated_at'), ('public','normalize_external_source_url'),
    ('private','guard_external_opportunity_immutable_fields'),
    ('private','guard_external_review_transition'),
    ('public','create_external_opportunity_review_trusted'),
    ('public','update_external_opportunity_review_note'),
    ('public','list_external_reviews_for_staff')))
select routine from generated
where definition ~ '\m(web_job_interest|applications|submissions|representation)\M';

commit;
```

Required ACL outcomes: trusted creation EXECUTE only for `service_role`; guarded note and staff queue EXECUTE only for `authenticated`; no `PUBLIC` or `anon` execution. Both tables must have RLS enabled. Candidate review SELECT must be verified-email ownership-scoped. Staff mutations must require active admin/recruiter authorization. No DELETE policy exists.

### Non-destructive database rollback/disable

Do not drop tables, functions, policies, or historical rows. If a database gate fails, stop exposure, leave schema in place, preserve evidence, and correct forward with a reviewed migration. Withdraw the frontend entry point and Edge Function access while investigating. Reconcile the ledger only through normal reviewed migrations.

## 3. Edge Function deployment specification

| Item | Required value |
|---|---|
| Function | `unified-opportunities` |
| Source commit | `19c3b0b187ac1670af71f24105501b8c9ec8c720` |
| Source entrypoint | `supabase/functions/unified-opportunities/index.ts` plus its relative `src/lib` dependencies |
| Project | `tlufttnmwtjbuhjcrqmp` |
| Expected URL | `https://tlufttnmwtjbuhjcrqmp.supabase.co/functions/v1/unified-opportunities` |
| JWT verification | Enabled (`verify_jwt = true`) |
| Required built-ins | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Required custom secret | `TERRER_WEB_ALLOWED_ORIGINS` |
| Exact custom value semantics | Exactly `https://terrerhr.com,https://www.terrerhr.com`; no wildcard, preview, localhost, or staging origin |

Do not record secret values in Git, tickets, terminal output, screenshots, or this runbook. Confirm only presence and approved origin semantics. Discover CLI syntax via `npx supabase functions deploy --help`; the intended deployment is `npx supabase functions deploy unified-opportunities --project-ref tlufttnmwtjbuhjcrqmp` with JWT verification enabled by project/function configuration.

Preflight/health tests after authorized deployment:

| Test | Request | Pass criterion |
|---|---|---|
| Exact apex preflight | `OPTIONS` with Origin `https://terrerhr.com` | 204; exact matching allow-origin; expected methods/headers; `Vary: Origin` |
| Exact www preflight | Same with `https://www.terrerhr.com` | Same |
| Negative origin | `OPTIONS` from a staging/preview/attacker origin | 403 and no permissive CORS header |
| Missing token | `GET` from allowed origin, no Authorization | 401; no data |
| Invalid token | `GET` from allowed origin, invalid bearer | 401; no data, no token logged |
| Valid token | Controlled confirmed test identity | 200 only after unique candidate mapping |

Safe rollback: withdraw the production function deployment or remove both allowed origins using the approved Supabase deployment/configuration control, then verify requests cannot reach data. Retain database schema/reviews. Do not replace the function with an unauthenticated stub and do not disable JWT verification.

## 4. Auth and candidate identity package

### Dashboard verification checklist

- Email/password provider enabled.
- Email confirmation required; autoconfirm behavior explicitly recorded.
- Site URL exactly the selected canonical production domain.
- Redirect allow-list contains only required HTTPS production callback/routes for both approved domains; no staging/preview wildcard.
- Custom production SMTP configured, sender/domain verified, and credentials not exposed.
- Confirmation email reaches the controlled mailbox and link returns to the approved domain.
- Password-reset email reaches the controlled mailbox; link and token expiry work without touching a real candidate.
- Rate limits cover expected launch traffic and abuse protection; document thresholds.
- Browser refresh/reopen preserves a valid session and sign-out removes local session state.
- The verified Auth email maps to exactly one candidate; the browser never supplies candidate ID.

### Controlled test-account strategy

After explicit approval, the Auth administrator creates a dedicated production test identity in a controlled Terrer mailbox, labels the paired candidate record `internal production acceptance test`, confirms the email normally, and ensures exactly one normalized-email candidate match. Do not reuse a real candidate, trigger a reset for one, or store credentials in Git/tickets. Limit the record to minimum non-sensitive matching fields. After acceptance, revoke sessions first, then retire/remove the test identity and clearly labelled candidate under the approved retention procedure; remember that deleting an Auth user alone does not invalidate existing access tokens.

### Aggregate identity SQL (read-only; no PII output)

```sql
with candidate_groups as (
  select lower(btrim(email)) normalized_email, count(*)::int candidate_count
  from public.candidates
  where nullif(btrim(email), '') is not null
  group by lower(btrim(email))
), mappings as (
  select u.id, coalesce(c.candidate_count, 0) candidate_count
  from auth.users u
  left join candidate_groups c on c.normalized_email = lower(btrim(u.email))
  where u.email_confirmed_at is not null
)
select
  count(*) filter (where candidate_count = 0) as zero_mappings,
  count(*) filter (where candidate_count = 1) as exactly_one_mapping,
  count(*) filter (where candidate_count > 1) as ambiguous_mappings,
  (select count(*) from candidate_groups where candidate_count > 1)
    as duplicate_normalized_candidate_email_groups
from mappings;
```

## 5. Proposed minimum production inventory

Inventory requires separate user approval and insertion design review. Nothing below was inserted. All external references are new relative to the staging pilot and were verified from primary employer Workday APIs/pages on 2026-08-02. No Google result, staging fixture ID, fake/sample label, or invented date is used.

### Canonical minimum

Select **one real, actively recruited Terrer client job** already approved by its internal owner. Publish it through the existing canonical `candidate_web_jobs` workflow only after verifying `jobs.operational_status`, employer visibility, title/company/location, owner, and publication status. No suitable record can be named from aggregate-only production evidence without exposing or guessing business data; **USER SELECTION REQUIRED**.

### Proposed external set

| Title | Company / location | Role family | Source | Publication/freshness evidence | Verified | Suitability |
|---|---|---|---|---|---|---|
| Engineer – CMMS | Shell / Shell Centre Kuala Lumpur | engineering | `employer_ats`; [direct Shell Workday page](https://shell.wd3.myworkdayjobs.com/en-US/shellcareers/job/Shell-Centre-Kuala-Lumpur/Engineer---CMMS_R202829) | Official API `startDate` 2026-07-31; page HTTP 200 | 2026-08-02 | Current engineering role at a recognizable employer; direct application source |
| Data Science Engagement Lead | Shell / Shell Centre Kuala Lumpur | data | `employer_ats`; [direct Shell Workday page](https://shell.wd3.myworkdayjobs.com/en-US/shellcareers/job/Shell-Centre-Kuala-Lumpur/Data-Science-Engagement-Lead_R202323-1) | Official API `startDate` 2026-07-29; page HTTP 200 | 2026-08-02 | Adds senior data/analytics coverage and differs from engineering |
| Cisco Network Engineer (L2) | NTT DATA / Petaling Jaya, Malaysia | infrastructure | `employer_ats`; [direct NTT DATA Workday page](https://nttlimited.wd3.myworkdayjobs.com/en-US/NTT_Careers/job/Petaling-Jaya-Malaysia/Cisco-Network-Engineer--L2-_R-147453) | Official API `startDate` 2026-07-24; page HTTP 200 | 2026-08-02 | Adds mid-level network/infrastructure coverage from a direct ATS |
| Fresh Graduate Analyst - Engineering | Accenture / Kuala Lumpur | fresh-graduate | `employer_ats`; [direct Accenture Workday page](https://accenture.wd103.myworkdayjobs.com/en-US/AccentureCareers/job/Kuala-Lumpur/Fresh-Graduate-Analyst---Engineering_R00319644) | Official API `startDate` 2026-07-29; page HTTP 200 | 2026-08-02 | Covers an early-career audience and broadens seniority mix |

Before authorized insertion, re-fetch every page, confirm the title/location/reference remains identical, run normalized-URL collision checks, capture only employer-published facts, and set `last_verified_at` to actual execution time. If any page is unavailable or materially changed, stop and return it for approval rather than substituting a record.

## 6. Operations and monitoring package

| Responsibility | Minimum requirement | Owner |
|---|---|---|
| External review queue | Review during business hours; acknowledge within 1 business day; complete/close within 3 business days or communicate delay | Recruitment Operations Lead — **USER ASSIGNMENT REQUIRED** |
| Candidate support | Own login, confirmation, recovery, and mapping tickets; respond within 1 business day | Candidate Support Owner — **USER ASSIGNMENT REQUIRED** |
| Mapping exceptions | Verify normalized email aggregate, never disclose another candidate, escalate duplicates to data steward, record resolution | Candidate Data Steward — **USER ASSIGNMENT REQUIRED** |
| Technical monitoring | Own alerts, dashboards, incident triage and PII-safe evidence | Production Engineering On-call — **USER ASSIGNMENT REQUIRED** |
| Rollback decision | Sole authority to stop exposure/withdraw function after a failed gate or incident | Production Change Owner — **USER ASSIGNMENT REQUIRED** |

Minimum monitoring:

- Edge Function 5xx rate and count, latency p50/p95/p99, and availability.
- 401/403/409 rates split by safe outcome code; spikes in missing/expired auth and zero/ambiguous mapping.
- Successful and idempotent-repeat review-request volume.
- Requested/under-review queue age, with alert before the response SLA breaches.
- Inventory eligibility/freshness and source-unavailable counts.
- No raw Authorization header, JWT, email, name, phone, resume, request body, review notes, or service key in logs. Log only request ID, operation, outcome, timing, and non-PII opportunity ID.

Launch-week daily review: check function health/latency/error ratios, auth/mapping outcomes, review queue/SLA, inventory freshness/reachability, canonical before/after invariants, support tickets, browser errors, and any security-advisor change. Record owner, timestamp, result, and action.

Escalation: support → Recruitment Operations/Data Steward for workflow or identity issues; support/on-call → Production Change Owner for security, isolation, sustained 5xx, or data-integrity events. Security/PII evidence triggers immediate exposure stop and incident handling.

## 7. Controlled production smoke-test package

### Baseline and after-count SQL

Run the same read-only query immediately before and after. Store only aggregates:

```sql
select
  (select count(*) from public.external_opportunity_reviews) external_reviews,
  (select count(*) from public.web_job_interest) web_job_interest,
  (select count(*) from public.applications) applications,
  (select count(*) from public.submissions) submissions,
  (select count(*) from public.web_job_interest
    where representation_requested_at is not null) representation_requests;
```

Expected delta: external reviews `+1` after first POST and `+0` after repeated POST; every canonical lifecycle count delta is exactly zero.

### Exact sequence and pass/fail

1. **OPTIONS:** apex and www exact origins return 204 with exact CORS headers. Any wildcard/mismatch fails.
2. **Missing token:** allowed-origin GET returns 401 and no catalogue. Any data/200 fails.
3. **Invalid token:** invalid bearer returns 401 without token/PII logging. Any data or secret detail fails.
4. **Authenticated GET:** confirmed, uniquely mapped test identity returns 200. Zero/ambiguous mapping or server error fails.
5. **Inventory:** response includes the one approved canonical job and all approved eligible external rows, with origin labels correct. Missing/unapproved/stale rows fail.
6. **Sensitive fields:** response excludes candidate IDs, candidate PII, review notes/reviewer, internal job fields, service credentials, and raw employer content not approved for display. Any exposure fails.
7. **First POST:** one approved external opportunity returns 200, one review ID, `not_an_application`, and `not_submitted`; count increments once. Any canonical write fails.
8. **Repeated POST:** same candidate/opportunity returns the same review ID and no additional row. A second row fails.
9. **Reload:** refresh/re-authenticated GET preserves the review state without browser-supplied candidate ID. Loss/duplication fails.
10. **EN/BM:** sign-in, catalogue, details, states, and action outcome are understandable and semantically consistent in both languages. Missing/incorrect critical copy fails.
11. **Search/filter:** title/company/location/role-family filtering is deterministic and does not hide the selected review unexpectedly. Errors or cross-user data fail.
12. **Details:** canonical and external routes render correct provenance/actions; external detail never presents Confirm Interest/application. Mislabeling fails.
13. **`/my-matches`:** authenticated state loads the unified catalogue and review state; unauthenticated access is honest. Trusting legacy candidate ID fails.
14. **Isolation:** after-counts show only `external_opportunity_reviews +1`; `web_job_interest`, `applications`, `submissions`, and representation requests unchanged. Any nonzero canonical delta fails and triggers rollback.
15. **Console/network:** no uncaught error, secret, token, PII, staging URL, failed CORS, or unexpected mutation. Any sensitive output fails.
16. **Mobile/accessibility basics:** at 360px and desktop, keyboard-only flow reaches controls, focus is visible, labels/names exist, contrast is usable, zoom does not break the flow, and status is not color-only. A blocking defect fails controlled release.

No failed step may be waived during the run. Record request IDs and aggregate evidence, not tokens or PII.

## 8. Ordered activation runbook

| Gate | Exact action | Evidence required | Stop condition | Rollback/disable | Responsible role |
|---|---|---|---|---|---|
| 0 — User approval | Approve window, both domains, backend deployment, test identity/mapping, inventory, SLA, owners and rollback authority | Written approval naming scope and roles | Any choice missing | Do not start | Product Owner / Production Change Owner — **USER ASSIGNMENT REQUIRED** |
| 1 — Backup and baseline | Verify current backup/PITR availability; run preflight and baseline SQL; pin commits | Backup status, project ref, clean checkout, ledger and counts | Wrong project/ledger, missing dependency/backup, drift | Do not mutate; investigate | DBA / Production Engineer — **USER ASSIGNMENT REQUIRED** |
| 2 — Migrations | Dry-run confirms exactly two; apply in order; run full acceptance and compact validation | Ledger rows, all expected catalog/ACL results, zero forbidden rows | Any extra migration, SQL error, failed boolean/ACL | Stop exposure; preserve schema; forward-fix under review | DBA / Production Engineer |
| 3 — Function and secrets | Confirm secret names/origins; deploy pinned function with JWT; run preflight/negative/auth rejection tests | ACTIVE metadata, version/time/hash, JWT true, exact CORS results | Missing/unsafe secret, wildcard, wrong ref, any negative test failure | Withdraw function/origins; retain DB | Production Engineer |
| 4 — Auth/test identity | Verify provider/email/redirect/SMTP/reset/rates/session; authorize and establish exactly one test mapping | Checklist evidence; delivery results; aggregate mapping `=1` for test | Email failure, unsafe redirect, zero/multiple mapping | Revoke test sessions; stop test; no real-candidate action | Auth Admin + Data Steward |
| 5 — Inventory | User selects canonical record and approves external set; reverify direct URLs; insert through separately reviewed idempotent mechanism | Approval, live URLs, timestamps, collision checks, eligible counts | Any stale/unapproved/colliding record | Suppress exposure; preserve records for audit | Recruitment Operations + Data Steward |
| 6 — Smoke test | Execute all 16 steps with controlled account and before/after counts | Complete pass sheet, request IDs, zero canonical deltas | Any failed step or unexpected write | Stop web exposure and withdraw function access | QA Lead + Production Engineer — **USER ASSIGNMENT REQUIRED** |
| 7 — GO/rollback | Review every gate and choose controlled release or rollback | Signed gate record and blocker-free evidence | Missing evidence, security/isolation defect, unresolved blocker | Execute non-destructive rollback plan | Production Change Owner |
| 8 — Monitoring | Restrict release audience; perform launch-week daily checks and SLA handling | Dashboard/alerts, daily log, staffed queue | Sustained errors/latency, PII, SLA breach, integrity anomaly | Change Owner stops exposure; incident workflow | On-call + Operations + Support |

## 9. Exact user decisions required

1. Approve the production migration/deployment window and its duration.
2. Approve deployment of `unified-opportunities` to `tlufttnmwtjbuhjcrqmp` after the two migrations pass.
3. Confirm both exact production origins remain supported: `https://terrerhr.com` and `https://www.terrerhr.com`.
4. Approve the dedicated controlled production test identity and controlled mailbox.
5. Approve creating exactly one clearly labelled matching candidate record and its post-test retention/removal treatment.
6. Select and approve one real canonical Terrer opportunity for the launch inventory.
7. Approve, reject, or amend the four proposed external opportunities above after execution-day reverification.
8. Assign the Recruitment Operations review owner and approve the proposed 1-business-day acknowledgement / 3-business-day completion SLA.
9. Assign Candidate Support, Candidate Data Steward, and Production Monitoring owners.
10. Assign the Production Change Owner with final GO/rollback authority.

Everything else in the runbook is routine technical execution once these decisions and the change window are approved.

## Package decision

The package is executable and reviewable, but production remains **NO-GO** until Gate 0 decisions and all subsequent gates pass. A staging pass or this documentation package does not authorize production activation.
