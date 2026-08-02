# Unified Opportunity Production Readiness Audit — August 2026

## Executive decision

**NO-GO — MATERIAL PRODUCTION BLOCKERS.** Staging acceptance is not evidence of production activation. The production Supabase project does not contain the Unified Opportunity migrations, tables, RPCs, or Edge Function. Production also has no eligible canonical inventory for this surface, and its only confirmed Auth user has no unique candidate mapping. Production Auth email/redirect/SMTP/recovery/rate-limit configuration could not be inspected with the available read-only interfaces and remains a mandatory pre-launch verification.

This was a read-only audit. No production or staging data, schema, configuration, secrets, functions, deployments, users, or aliases were changed. No secret value or personal data was retrieved or displayed.

## Audit anchors and identities

| Item | Evidence |
|---|---|
| Application repository | `saifulshahrin/terrerhr-app`; workspace `D:\TerrerOS APP Bolt\project-bolt-sb1-7tvmbjcr\project` |
| Audited application base | `main` at `19c3b0b187ac1670af71f24105501b8c9ec8c720`; clean before audit |
| Web repository | `saifulshahrin/terrer-web`; workspace `D:\Terrer Web\terrer-web` |
| Audited web base | `main` at `9dcc9c200cd192ecf976065ada069fc3cb02034b`; clean |
| Production Supabase | Project ref `tlufttnmwtjbuhjcrqmp`; project name `saifulshahrin@gmail.com's Project`; `ACTIVE_HEALTHY`; `ap-northeast-1`; PostgreSQL `17.6.1.084`; host `db.tlufttnmwtjbuhjcrqmp.supabase.co` |
| Staging Supabase | Project ref `nulpvbirlhauukccunqg`; project name `terrer-security-staging-2026-07`; `ACTIVE_HEALTHY`; `ap-south-1`; PostgreSQL `17.6.1.141`; host `db.nulpvbirlhauukccunqg.supabase.co` |
| Identity separation | Different project refs, names, regions, database hosts, and PostgreSQL patch builds. Production identity is not inferred from staging. |
| Preserved app stash | `stash@{0}: codex-local-safety-stash-before-unified-opportunity` |
| Preserved web stash | `stash@{0}: pre-unified-opportunity-web-integration: deferred cleanup roadmap` |

## Read-only production evidence

### Database and migration ledger

The production migration ledger ends at `20260723143425_reconcile_candidate_engine_production_authorization`. It does **not** contain either required Unified Opportunity migration:

- `20260731035000_unified_opportunity_surface_schema`
- `20260801085404_allow_employer_job_detail_external_source`

Read-only catalog checks returned:

- `external_opportunities`: absent
- `external_opportunity_reviews`: absent
- `create_external_opportunity_review_trusted`: absent
- guarded external-review note RPC: absent
- legacy `candidate_web_jobs`: present

Because the tables are absent, their constraints, normalized URL uniqueness, non-unique source-reference reconciliation index, RLS policies, grants, triggers, review uniqueness/idempotency, candidate ownership protections, and inventory/freshness indicators are **inaccessible by schema absence**, not zero-valued. They cannot be considered production-ready.

The production security advisor also reports existing, unrelated warnings including mutable function search paths and RLS-enabled tables without policies. These are not caused by the Unified Opportunity work, but should remain in the broader security backlog. See the [Supabase database linter guidance](https://supabase.com/docs/guides/database/database-linter).

### Edge Function and configuration

Production has four active Edge Functions (`parse-job-intake`, `layer2-assess`, `job-intake-parser`, and `bd-photo-vision-extract`). `unified-opportunities` is absent. Therefore no production version, activation timestamp, JWT setting, or deployed CORS/secret configuration exists to validate.

For comparison only, staging has `unified-opportunities` version 3, ACTIVE, with JWT verification enabled. That staging state was not treated as production evidence.

The reviewed function source is fail-closed:

- requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `TERRER_WEB_ALLOWED_ORIGINS`;
- rejects an absent or non-exact browser origin before authentication or data access;
- verifies the bearer token via Supabase Auth and requires a confirmed email;
- resolves the candidate from the authenticated user's normalized email, using the caller's JWT and candidate RLS, with explicit zero/multiple-match failures;
- never accepts a client-supplied candidate ID;
- returns `Cache-Control: no-store` and logs only request ID, operation, outcome, and external opportunity ID—not tokens or candidate PII;
- uses the service role only inside the Edge Function for the trusted review RPC.

Only secret **names** were reviewed. No production secret value was accessed. The available read-only metadata surface could not enumerate production Edge secrets or Auth settings. Since the function is absent, `TERRER_WEB_ALLOWED_ORIGINS` and inclusion of exactly `https://terrerhr.com` (and `https://www.terrerhr.com` if both domains remain supported) are BLOCKED pending deployment/configuration; wildcard origins are prohibited.

### Authentication and candidate identity

Aggregate-only production checks found:

| Metric | Count |
|---|---:|
| Auth users | 1 |
| Confirmed Auth users | 1 |
| Confirmed users with zero candidate matches | 1 |
| Confirmed users with exactly one candidate match | 0 |
| Confirmed users with ambiguous candidate matches | 0 |
| Duplicate normalized candidate-email groups | 3 |

No email, name, phone, resume, or other personal detail was selected or reported. The single confirmed user cannot currently pass the required candidate mapping. Duplicate candidate-email groups are a latent ambiguity risk for any matching Auth user.

Email/password provider status, confirmation/autoconfirm behavior, Site URL, redirect allow-list, custom SMTP, password recovery delivery, and Auth rate limits were not available through the approved read-only connector and are **NOT TESTED**. Supabase recommends email confirmation and production custom SMTP; the default SMTP is restricted and has no availability guarantee. These settings must be verified in the production dashboard before any test account or launch.

### Opportunity inventory and canonical isolation

Production has zero canonical publications and therefore zero eligible canonical publications. Eligible external opportunities, freshness, invalid/expired flags, source reachability, duplicate risk, and external review counts are not zero—they are inaccessible because the corresponding tables do not exist. Production does not have a credible launch inventory.

Static call-path review confirms the Unified Opportunity API has no references or writes to `web_job_interest`, `applications`, `submissions`, Confirm Interest, or representation records. Its only mutation is the narrowly scoped `create_external_opportunity_review_trusted` RPC. The response explicitly distinguishes review from application and employer submission. The approved schema preserves a separate external-review lifecycle.

## Production web evidence

Vercel project `terrer-web` (`prj_T99YIfHSHosuMBDHcJEx6IEiodZ9`, team `team_8YFQht6afIfPcFM8RhdSF0o7`) has production deployment `dpl_7EBcWjsxfDG56jphTMRcDSnP4FVH`, built from verified `main` commit `9dcc9c200cd192ecf976065ada069fc3cb02034b`. It is `READY`; aliases include `terrerhr.com`, `www.terrerhr.com`, and `terrer-web.vercel.app`. A read-only request to `https://terrerhr.com` returned HTTP 200 from Vercel and redirected to `https://www.terrerhr.com/`, proving the public domain resolves to the active deployment.

The public production bundle was inspected without extracting any key value:

- production Supabase ref `tlufttnmwtjbuhjcrqmp`: present;
- staging ref `nulpvbirlhauukccunqg`: absent;
- `/functions/v1/unified-opportunities`: present;
- service-role environment name or role marker: absent;
- four known staging pilot source IDs: absent.

The frontend source requires only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; the effective compiled bundle proves the URL points to production and that a public key was supplied. No `SUPABASE_SERVICE_ROLE_KEY` variable is used by the client. Environment metadata itself was not enumerable through the read-only Vercel connector, so name-level configuration should still be confirmed in Vercel before activation without revealing values.

Unauthenticated HTTP checks returned the SPA shell with 200 for `/jobs`, `/opportunities/:id`, `/my-matches`, `/my-activity`, `/profile`, and `/my-profile`. Source review confirms EN/BM sign-in copy, honest unauthenticated/error states, verified-email gating, and explicit missing/ambiguous candidate mapping messages. The authenticated Unified Opportunity path does not trust a localStorage candidate ID. No real production candidate login was attempted because no approved production test-account authorization was provided.

Known limitations: password recovery UX is absent; My Activity and profile onboarding retain non-authoritative legacy local storage. These can be deferred only for a tightly controlled rollout if the opportunity surface is clearly scoped and support can resolve mapping/onboarding issues; they block a broad self-service launch.

## End-to-end readiness matrix

| Area | Status | Evidence | Exact remediation |
|---|---|---|---|
| Schema | BLOCKED | Both Unified Opportunity tables absent | Apply the two reviewed pending migrations through the approved production migration workflow, then run catalog acceptance read-only |
| Migrations | BLOCKED | Production ledger stops before `20260731035000` | Reconcile ledger to main; apply only `20260731035000` and `20260801085404` after change approval |
| RLS | BLOCKED | Target tables absent | Validate all expected policies from authoritative catalogs after migration |
| RPC permissions | BLOCKED | Trusted review and guarded-note RPCs absent | Verify service-role-only trusted creation and staff-only note execution after migration |
| Edge Function | BLOCKED | `unified-opportunities` missing | Deploy reviewed function from audited app commit to production ref |
| JWT verification | BLOCKED | No production deployment | Deploy with JWT verification enabled and confirm metadata |
| CORS | BLOCKED | No deployed function/config to inspect | Set exact allowed origins; no wildcard; negative-test missing/different origins |
| Web environment | READY WITH CONDITION | Bundle targets production; no staging ref | Confirm Vercel variable names and redeploy only if metadata differs |
| Auth provider | NOT TESTED | Dashboard settings unavailable | Verify email/password, confirmation, Site URL, redirects, SMTP, recovery, and rate limits |
| Confirmed-user readiness | BLOCKED | One confirmed user; zero unique mapping | Authorize one controlled test identity and establish exactly one candidate mapping |
| Candidate mapping | BLOCKED | 0 single-match users; 3 duplicate email groups | Resolve duplicates safely and validate aggregate zero/one/many outcomes |
| Opportunity inventory | BLOCKED | 0 canonical; external schema absent | Load a small approved, current production inventory only after activation authorization |
| External review idempotency | BLOCKED | Table/constraint absent | Validate unique candidate/opportunity constraint and repeated-request behavior |
| Canonical lifecycle isolation | READY WITH CONDITION | Static path has only external review RPC | Repeat read-only before/after counts during authorized smoke test |
| EN/BM | READY WITH CONDITION | Locale/source coverage present | Test both languages in an authorized authenticated smoke session |
| Observability | BLOCKED | Function absent; no alert ownership | Create error/review-request monitoring with PII-safe logs and named owner |
| Rollback | READY WITH CONDITION | Vercel deployment is rollback-capable; DB plan below is non-destructive | Pre-assign decision owner and rehearse web/function disable path |
| Support/recovery | BLOCKED | Recovery absent; support staffing unconfirmed | Configure recovery and assign candidate mapping/review support owner and SLA |

## Launch risk register

| Risk | Likelihood | Impact | Blocker | Mitigation |
|---|---|---|---|---|
| Production web points to staging | Low (bundle disproves currently) | Critical | No | Recheck deployed bundle ref after every production build |
| Production Edge Function missing | Certain | Critical | Yes | Deploy only after approval; verify ACTIVE/JWT/version |
| CORS excludes Terrer domain or is unsafe | High until configured | High | Yes | Exact allow-list for approved domains; negative origin tests |
| Confirmation/reset mail unavailable | Unknown | High | Yes | Verify provider, SMTP, templates, redirects, delivery and limits |
| Candidate mapping is zero or multiple | High | High | Yes | Unique controlled mapping; resolve duplicate normalized emails; monitor mapping codes |
| No credible opportunity inventory | Certain | High | Yes | Curate a minimum current inventory and verify source URLs/freshness |
| External roles stale or invalid | High without process | High | Yes | Require stored verification timestamps and source checks; expire stale records |
| Review works but support is unstaffed | Medium | High | Yes | Named review owner, queue SLA, escalation path and coverage |
| Legacy My Activity/profile state confuses users | Medium | Medium | Broad launch only | Limit rollout; label states; prioritize authoritative migration |
| Rollback is unclear | Medium | High | Yes until owner assigned | Approve the non-destructive rollback sequence below and assign authority |
| No API/review monitoring | High | High | Yes | Alerts on 5xx, auth/mapping failures, latency, and unprocessed reviews |
| PII enters logs | Low in reviewed handler | Critical | No, with control | Preserve structured PII-free logging; prohibit request/body/token logging |

## Smallest safe activation plan (not executed)

### A. Mandatory before launch

1. Approve a production change window, owner, rollback authority, support owner, and controlled-test authorization.
2. Record before counts and ledger state using aggregate/read-only SQL: target relation/RPC existence, canonical publications, external opportunities by eligibility/freshness, external reviews, and canonical workflow tables (`web_job_interest`, `applications`, `submissions`, representation records).
3. Reconcile production ledger to audited app `main`. Apply only `20260731035000_unified_opportunity_surface_schema.sql` and `20260801085404_allow_employer_job_detail_external_source.sql` through the normal reviewed migration pipeline. Do not use remote repair, reset, or broad push.
4. Run the repository's read-only acceptance SQL and authoritative catalog checks for columns, constraints, indexes, triggers, RLS, grants, normalized URL uniqueness, non-unique source reference index, and both RPC permissions.
5. Configure the production Edge Function. Built-in names required by source are `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; custom secret `TERRER_WEB_ALLOWED_ORIGINS` must contain exact approved origins. Minimum required origin: `https://terrerhr.com`; because production redirects to and serves `https://www.terrerhr.com`, include that exact origin too unless the web alias is consolidated first. No wildcard.
6. From the audited application checkout, execute the approved deployment step: `npx supabase functions deploy unified-opportunities --project-ref tlufttnmwtjbuhjcrqmp`. Confirm project ref aloud/in change record before execution; verify ACTIVE, version, deployment time, and JWT verification afterward.
7. In Vercel production, confirm variable names `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; URL must be the production project. Confirm no service-role variable and no staging ref. Redeploy only if configuration changed, then repeat bundle inspection.
8. In Supabase Auth, verify email/password enabled, email confirmation policy, `https://terrerhr.com` Site URL, exact redirect allow-list (including approved `www` routes), custom SMTP delivery, recovery link flow, templates, and rate limits.
9. Resolve candidate normalized-email duplicates relevant to rollout. With explicit authorization, create or designate one non-PII controlled production test Auth account and exactly one matching candidate record; confirm the account and candidate are safe to use and removable/retirable under policy. Do not use a real candidate implicitly.
10. Establish a credible minimum inventory before exposure: at least one eligible canonical publication and a small approved set of fresh, source-reachable external opportunities covering intended launch categories. Record only explicit freshness metadata; reject unreachable/expired/duplicate URLs.
11. Smoke test in EN and BM: unauthenticated rejection; unconfirmed rejection; zero-match and ambiguous failures; valid unique mapping; catalogue read; canonical/external detail; one external review request; repeat request proves idempotency; candidate isolation; disallowed-origin rejection; expired-token rejection.
12. Record after counts and compare canonical workflow tables to before counts. Only the authorized external-review row may change. Confirm no write to Confirm Interest, `web_job_interest`, `applications`, `submissions`, or representation records.
13. Enable PII-safe monitoring for 401/403/409/5xx rate, latency, mapping failures, successful/repeated review requests, and aged unprocessed reviews. Assign named operational and incident owners with an SLA before exposing users.

### B. Recommended before launch

- Add a user-visible password recovery flow and test delivery end to end.
- Add dashboards/alerts for external inventory freshness, unreachable sources, duplicates, and review backlog.
- Resolve all duplicate normalized candidate emails, not only controlled-rollout accounts.
- Address relevant production security-advisor warnings under separate reviewed changes.
- Document the support playbook for missing/ambiguous mapping and review follow-up.

### C. Safe to defer after a controlled launch

- Replace legacy localStorage-backed My Activity/profile onboarding state with authoritative backend state, provided rollout copy and support clearly constrain expectations.
- Expand inventory breadth beyond the controlled minimum.
- Add richer candidate-facing review history and operational analytics.

## Non-destructive rollback plan

1. Stop new exposure by rolling the web alias back to the prior known-good Vercel deployment or disabling the feature entry point.
2. Remove the Terrer web origins from the function's allowed-origin configuration or withdraw the function route through the approved Supabase deployment workflow; do not drop tables or delete review history.
3. Preserve migrated schema and audit/review records for investigation. Do not reverse migrations under incident pressure.
4. Compare post-incident aggregate counts with the recorded baseline and verify canonical workflow isolation.
5. Communicate status to the named support owner; investigate PII-safely; reactivate only after the failed gate is retested and approved.

## Unresolved questions

- Are production email/password, confirmation, Site URL, redirect, SMTP, recovery, and rate-limit settings launch-ready?
- Who owns production review processing, candidate mapping exceptions, monitoring, and rollback authority, and what are the SLAs?
- Which explicitly authorized production test account and minimum production opportunities will be used?
- Will both apex and `www` remain supported browser origins, or will one canonical origin be enforced?
- When will legacy My Activity/profile local state be replaced for broad self-service launch?

## Audit closure

Final classification: **NO-GO — MATERIAL PRODUCTION BLOCKERS**.

Only this documentation file is intended to change on the audit branch. Production and staging remained untouched, both repository working trees were clean at evidence collection, and both `stash@{0}` entries remained preserved and unapplied.
