# TerrerHR sourcing acceleration — 21 October 2026

## Decision
Use Recruiter OS/Supabase as the system of record, internal rediscovery first, public GitHub evidence for selected technical roles, and one paid provider only after a matched-role trial. Do not buy two overlapping sourcing subscriptions now. No paid subscription or external outreach was executed in this work.

## Verified production baseline
Project: tlufttnmwtjbuhjcrqmp, ACTIVE_HEALTHY. Repository: saifulshahrin/terrerhr-app. Production baseline commit: 080833b. Branch: feat/sourcing-acceleration-20261020.

| Evidence | Result | Implication |
|---|---:|---|
| candidates | 205 | Existing pool available for rediscovery |
| candidates without source_type | 180 | Attribution requires repair from provenance, not guessing |
| candidates with email populated | 24 | Presence is not delivery verification or outreach consent |
| candidates with candidate_consent_given=true | 19 | Does not substitute for job/client-specific representation consent |
| source_profiles | 583 across 182 candidate IDs | Not 583 unique people; repeated source rows exist |
| source snapshots older than 90 days | 583 | Refresh priority before assuming current employer/location |
| source platform rows | GitHub 582; Other 1 | Multi-provider engine is not operational in the observed database |
| outreach_log | 1 | Response/conversion rates cannot be credibly inferred |
| submissions | 11 | Pipeline activity exists |
| placement_job_orders | 0 | Commercial gate must be completed before client submission |
| candidate_submission_consents | 0 | Existing submissions are not evidence of authorised client delivery |

Five deployed edge functions cover intake parsing, AI assessment, photo extraction and unified opportunities. No deployed Juicebox/Metaview sourcing adapter was found in that inventory. Autonomous run controls explicitly say display-only. A prior candidate-engine-preview-20261010 branch contains a prospect pool not present in the production schema; this work reuses and repairs it.

Security baseline: existing advisor notices include six mutable function search paths, legacy RLS tables without policies, intentional public catalogue security-definer access, authenticated security-definer functions and disabled leaked-password protection. These are separate existing items, not silently changed in this sourcing release.

## Matched-role benchmark
Actual pipeline role: Motorola Solutions, Android Software Engineer (Fresh Graduate), Bayan Lepas/Penang. Canonical job ID 7592c7a6-1f6d-4a96-9ce4-9ace92fcd716, requisition R62748; six linked submission records. Requirements: relevant degree, native Java/Kotlin, Android SDK/Studio, MVVM/MVP, debugging and communication; willingness to work in Bayan Lepas. AOSP and LTE/DMR are advantages. Employer job URL resolves but search retrieval returned no page body, so live hiring status is **not confirmed**. This is a real pipeline benchmark, not a claim of a signed client mandate or current vacancy confirmation.

| Channel | Actual result | Relevance/contactability | Cost and limitation |
|---|---|---|---|
| Internal role/key_skills search | 0 direct hits | Role labels alone miss skills | Existing infrastructure; seconds |
| Internal normalised skills join | 10 distinct Kotlin profiles | Broad technical evidence; 0 recorded email/phone; 0 recorded processing consent among these 10; degree, graduation and Penang availability unknown | Existing infrastructure; seconds; April source snapshots |
| Public GitHub discovery | 3 profiles inspected below | 1 strong Android evidence; 1 graduate-adjacent; 1 location/education signal only | No new subscription; manual verification during this session |
| LinkedIn connected search | HTTP 400 | No candidate result returned | Tool failure; not evidence of no Malaysian coverage |
| Juicebox | Sign-in required | No authorised account search executed | Credits, API entitlement and Malaysian yield unverified |
| Metaview | Sign-in required | No authorised account search executed | Credits, API entitlement and Malaysian yield unverified |

Public profiles inspected (not invented or marked qualified):

| Person/profile | Observed professional evidence | Recruiter use and missing checks |
|---|---|---|
| https://github.com/KongQuan98 | Malaysia/Kuala Lumpur; Android, Kotlin, Java; Jetpack Compose projects and MVVM movie app; public LinkedIn link | Technical evidence worth review. Fresh-graduate fit and Penang relocation unknown; no email verified |
| https://github.com/Jameschoong7 | UOW Malaysia KDU Penang CS student, expected December 2026 graduation; Java/Kotlin and Android Studio; backend/full-stack focus; public contact route | Adjacent graduate prospect. Android depth and start date need confirmation; published email is not delivery-verified |
| https://github.com/thomaslimfc | Penang software developer; software-engineering student; public LinkedIn route | Exploratory only: no Kotlin evidence confirmed in the retrieved page |

Internal Kotlin handles: irshu355, JasonKhew96, T-baby, WaheedNazir, iChun, yccheok, OysterD3, shiburagi, Padman83, jerrychong25. These are discovery evidence, not a qualified shortlist. No outreach or claims about willingness were fabricated. A full paid-provider comparison is blocked by sign-in, so no provider winner is asserted.

## Provider economics and integration limits
Official sources accessed 21 October 2026:
- https://juicebox.ai/pricing — Free limited searches; Starter 500 contact and 500 export credits. Page contains $99/$179 annual-equivalent and $119/$199 monthly variants; verify checkout cadence before any purchase. Agent add-on shown at $199/agent/month. ATS integrations do not establish that Terrer has unrestricted API access. Sources: https://docs.juicebox.ai/help/ats-setup/spott and https://docs.juicebox.ai/help/ats-setup/ubeeo .
- https://www.metaview.ai/pricing — Free first 100 sourced profiles; Pro $100/user/month for 200 sourced profiles. Contact enrichment, API access and Malaysian coverage require account/contract verification; a sourced profile is not a verified contact or consented candidate.
- https://www.metaview.ai/outreach — sequences and contact enrichment are advertised; no claim that Terrer has that entitlement.

Public pages do not prove account balances. Both available browser sessions reached sign-in/signup screens. No new account, subscription or agreement was created. Recommendation: retain existing Juicebox access as the first trial if accessible; Metaview as comparison/backup. Scale only after recording unique relevant profiles, verified reachable contacts and replies against the same brief. Discontinue duplicate spend if incremental qualified conversations do not cover it.

## Implemented release
- Reuse existing prospect-pool UI/schema rather than create another candidate store. Prospects remain separate from candidates.
- Import a public profile with source, role and skills; canonicalise URLs and enforce source-URL uniqueness in the pool.
- Persist recruiter decisions without resetting responded/promoted lifecycle state.
- Require actual response evidence and recruiter approval before promotion. Require processing-consent evidence; preserve it on the resulting candidate. Promotion runs atomically, is idempotent, and rejects an existing candidate profile instead of guessing a merge.
- Keep exact job/client submission-consent controls unchanged. Processing consent is not client representation consent.
- Store job-specific prospect-match evidence and source action/credit records in separate tables, ready for adapters. Automated enrichment, outreach sending, bulk provider ingestion and analytics UI are still backlog items.
- Manual candidate intake checks visible source profiles for duplicate identity, preserves key_skills and no longer writes nonexistent skill/proficiency columns. This client preflight does not guarantee cross-client race exclusion; pool uniqueness is database-enforced.
- Replace hard-coded 18/3 source counts with loaded internal pool size and unknown external/source-attributed counts. Status edits remain clearly labelled session notes.
- Fix two pre-existing undefined icon references caught by TypeScript.

## Validation and rollback
TypeScript, Vite build and 81 Node tests pass. Database dry run creates schema inside a transaction and rolls it back; checks URL duplicate rejection, RLS enabled and no anon SELECT. Authenticated-admin integration test checks missing-response rejection, missing-consent rejection, actual candidate/provenance creation and repeat promotion returning one candidate. Fixtures roll back. See tests/prospectPool.integration.sql.

Additive schema: external_prospects, prospect_job_matches, prospect_source_actions and one security-invoker promotion RPC. No existing table data is rewritten. Active-staff RLS; no anonymous grants; no authenticated DELETE grant; RPC execution limited to authenticated with row-level authorisation. Rollback frontend to prior deployment; retain new tables/data for recovery rather than drop sourced records. Production deploy record is appended after verification.

## Prioritised execution backlog
| Priority | Action | Acceptance evidence |
|---|---|---|
| P0 | Confirm employer mandate/current vacancy and job order | Approved job order, current brief, founder commercial approval |
| P0 | Refresh the ten internal Kotlin prospects | Current URL/date, Android evidence, graduation, Penang willingness, contact route |
| P0 | Recover provider authorised session | Actual account plan, remaining credits, search/export entitlement; no guessed balance |
| P1 | Trial same brief with one provider | 30 reviewed profiles; deduplicated vs internal pool; contacts, replies and costs logged |
| P1 | Log contact and reply evidence in workflow | Every attempt has person/job/source/time/channel/result; suppression respected |
| P1 | Add source-attribution repair with preview | Only deterministic unique source mappings; retain audit of old/new values |
| P1 | Add source action/credit and conversion dashboards | Unique prospects → contacted → replied → consented → validated → shortlist → interview → placement |
| P2 | Build documented provider adapter | Licensed API/export access, rate limits, retry/idempotency and freshness checks |
| P2 | Harden cross-channel identity merge | Human review for conflicting identity; canonical URL concurrency tests |

## 30-day operating plan (targets, not forecasts)
Days 1–7: one confirmed commercial brief; refresh ten internal Kotlin records; review the three public profiles; capture all source timestamps; recover provider access. Target 100% source attribution for new records and 0 submissions without job/client consent.

Days 8–14: review 30 unique prospects for the same role across available channels. Target at least 10 recruiter-approved and reachable prospects; contact only after message/identity/permission checks. Record actual time and credit use. If paid access remains unavailable, continue internal/public channels and report unavailable cells.

Days 15–21: target 5 substantive replies, 3 completed screens and 2 consented recruiter-validated profiles. These are operating targets, not promised outcomes. Record reasons for non-fit and decline to improve the next search.

Days 22–30: target 2 client-authorised submissions and 1 interview; placement is a stretch outcome dependent on an actual client mandate, employer speed and candidate acceptance. Review channel economics weekly. Scale on cost per qualified conversation and interview; do not optimise raw profile volume.

Expected commercial impact is directional: fewer duplicate imports, less false reporting and faster reuse of existing technical evidence. Revenue cannot be forecast credibly from one outreach event and no approved orders. Illustrative only: at RM6,000 monthly base and 18% of annual base, one placement fee would be RM12,960 before costs/taxes; this is not an employer quote or hiring forecast. Keep new sourcing spend at zero until account access and comparative yield are verified.

## Release reconciliation
The candidate-engine base landed on main as 48fc59a during this execution. Preserve its original source migration 20261010090000_add_external_prospect_pool.sql; the remote ledger records that base as 20261021112314_add_external_prospect_pool. The hardening migration is 20261021112529_harden_sourcing_prospect_workflow, applied and verified. Do not replay the base twice. Three public benchmark profiles and their job-match evidence were loaded as discovered/unreviewed, with no outreach or candidate promotion.

The second repository, saifulshahrin/terrer-web, was accessible read-only; its package confirms Vite/React, Supabase, candidate provisioning, authenticated/anonymous opportunity tests and a curated catalogue pipeline. No website code was changed in this release. Broader web implementation review remains separate from the sourcing controls audited here.
