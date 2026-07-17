# Production Hardening Wrapper Readiness Review

Date: 2026-07-17

Status: planning / executable draft assembled; pending human approval

This review evaluates the non-runnable wrapper draft against:

- local migrations in `supabase/migrations`
- staging-proven hardening state
- production read-only inspection evidence
- current app/web code references where relevant

## Verdict

**CONDITIONAL READY**

The executable-form review package now exists at `docs/security/PRODUCTION_HARDENING_EXECUTABLE_WRAPPER_DRAFT_2026-07.sql`. The hardening logic has been assembled into exact SQL, but the draft remains a review artifact until it is approved line-by-line for production use.

The coverage matrix below is retained as the baseline evidence record from the pre-draft review. The current implementation state is the executable draft linked above.

## Coverage Matrix

| Area | Draft Coverage | Readiness | Notes |
| --- | --- | --- | --- |
| `candidate_web_jobs` create/repair | Present in draft | Partial | Shape is directionally correct, but executable SQL still needs exact column/constraint/index text and rollback text. |
| `candidates` RLS | Present in draft | Partial | Policy text is not yet exact. |
| `web_job_interest` policy replacement | Present in draft | Partial | Legacy policy removal is clear, but the final self-only and staff/service paths are not fully specified. |
| `jobs` policy tightening | Present in draft | Partial | Final public read/write boundary is still placeholder-based. |
| `employer_job_intake` policy tightening | Present in draft | Partial | Needs exact production-safe policy text. |
| `employer_intake_actions` policy tightening | Present in draft | Partial | Needs exact production-safe policy text. |
| `activity_log` policy tightening | Present in draft | Partial | Needs exact staff/service-role policy text. |
| Advisor/internal table RLS hardening | Present in draft | Partial | Table list is correct, but exact policies are not yet executable. |
| `profiles` ACL tightening | Present in draft | Partial | Revoke/grant plan needs exact rights mapping. |
| `is_current_user_admin()` EXECUTE tightening | Present in draft | Partial | Direction is approved, but the final grant set should be validated against all helper-dependent policies. |
| View `security_invoker` changes | Present in draft | Partial | The draft names examples, but executable SQL needs the finalized view list and dependency validation. |
| Post-change validation checks | Present in draft | Partial | High-level only; needs exact assertions for each target contract. |
| Rollback sections | Present in draft | Partial | Generic rollback exists, but item-specific rollback text is incomplete. |
| `vw_candidate_search_clean` handling | Present in draft | Partial | Correctly included, but still needs final dependency/consumer validation before executable SQL. |

## Risk Matrix

| Risk | Severity | Likelihood | Why it matters |
| --- | --- | --- | --- |
| Placeholder policies become executable too early | High | Medium | Could either overexpose data or break live flows. |
| `candidate_web_jobs` shape mismatch | High | Medium | This is a structural contract and must match live production before creation/repair. |
| `profiles` ACL tightening breaks admin policy evaluation | High | Medium | `is_current_user_admin()` depends on the profile contract. |
| `is_current_user_admin()` execute revocation breaks RLS checks | High | Low-Medium | The helper is policy-critical even if broad EXECUTE is temporary. |
| View invoker changes break downstream reads | Medium | Medium | Some views are dependency-heavy and should be flipped only with exact validation. |
| Incomplete rollback text | Medium | High | Policy/grant/view changes need exact reverse steps or backup restore strategy. |
| `vw_candidate_search_clean` consumer mismatch | High | Low-Medium | App code references it directly, so omission or wrong hardening could break candidate UI. |
| Overly broad internal table RLS enablement without final policies | Medium | Medium | Could silently block required staff/service workflows. |

## Rollback Completeness Table

| Change Type | Rollback Present | Completeness |
| --- | --- | --- |
| `candidate_web_jobs` structural create/repair | Generic backup fallback only | Incomplete |
| `candidates` policies | Generic drop-policy guidance only | Incomplete |
| `web_job_interest` policies | Generic drop-policy guidance only | Incomplete |
| `jobs` policies | Generic drop-policy guidance only | Incomplete |
| `employer_job_intake` and `employer_intake_actions` policies | Generic drop-policy guidance only | Incomplete |
| `activity_log` policies | Generic drop-policy guidance only | Incomplete |
| Advisor/internal table RLS and policies | Generic guidance only | Incomplete |
| `profiles` ACLs | Generic guidance only | Incomplete |
| `is_current_user_admin()` EXECUTE grants | Generic guidance only | Incomplete |
| View `security_invoker` flips | Generic guidance only | Incomplete |
| Validation assertions | No reverse action needed if read-only | Acceptable |

## Unresolved Evidence List

- Exact production-safe SQL text for `candidate_web_jobs` create/repair.
- Exact policy text for:
  - `candidates`
  - `web_job_interest`
  - `jobs`
  - `employer_job_intake`
  - `employer_intake_actions`
  - `activity_log`
  - the Advisor/internal tables
- Exact ACL deltas for `public.profiles`.
- Final `EXECUTE` grant matrix for `public.is_current_user_admin()`.
- Final view list for `security_invoker = true` conversion.
- Whether any view besides the ones already hardened in staging should remain non-invoker in production.
- Whether `vw_candidate_search_clean` needs a production wrapper create/repair path or only a security flip.

## Coverage Verdict By Item

| Item | Classification | Notes |
| --- | --- | --- |
| missing `candidate_web_jobs` | FIX IN WRAPPER | Included, but needs exact SQL before execution. |
| `candidates` RLS disabled | FIX IN WRAPPER | Included, but exact self/staff policy text is still missing. |
| `web_job_interest` public read | FIX IN WRAPPER | Included, but exact replacement policies are still missing. |
| `web_job_interest` anon update | FIX IN WRAPPER | Included, but exact replacement policies are still missing. |
| `jobs` broad read/write policies | FIX IN WRAPPER | Included, but exact replacement policies are still missing. |
| `employer_job_intake` anon select/insert | FIX IN WRAPPER | Included, but exact replacement policies are still missing. |
| `employer_intake_actions` anon select/insert | FIX IN WRAPPER | Included, but exact replacement policies are still missing. |
| `activity_log` anon select/insert | FIX IN WRAPPER | Included, but exact replacement policies are still missing. |
| RLS disabled `source_profiles` | FIX IN WRAPPER | Included, but exact policies are still missing. |
| RLS disabled `evidence_signals` | FIX IN WRAPPER | Included, but exact policies are still missing. |
| RLS disabled `skills` | FIX IN WRAPPER | Included, but exact policies are still missing. |
| RLS disabled `candidate_capabilities` | FIX IN WRAPPER | Included, but exact policies are still missing. |
| RLS disabled `candidate_scores` | FIX IN WRAPPER | Included, but exact policies are still missing. |
| RLS disabled `terrer_companies` | FIX IN WRAPPER | Included, but exact policies are still missing. |
| RLS disabled `terrer_company_contacts` | FIX IN WRAPPER | Included, but exact policies are still missing. |
| RLS disabled `terrer_jobs` | FIX IN WRAPPER | Included, but exact policies are still missing. |
| RLS disabled `terrer_candidates` | FIX IN WRAPPER | Included, but exact policies are still missing. |
| RLS disabled `terrer_skills` | FIX IN WRAPPER | Included, but exact policies are still missing. |
| RLS disabled `terrer_pipeline` | FIX IN WRAPPER | Included, but exact policies are still missing. |
| RLS disabled `job_candidate_matches` | FIX IN WRAPPER | Included, but exact policies are still missing. |
| RLS disabled `outreach_log` | FIX IN WRAPPER | Included, but exact policies are still missing. |
| broad `profiles` ACL matrix | FIX IN WRAPPER | Direction approved, but exact revokes/grants are not yet executable-safe. |
| `is_current_user_admin` broad EXECUTE | FIX IN WRAPPER | Direction approved, but final grant matrix needs explicit validation. |
| non-invoker Advisor views | ACCEPT TEMPORARILY | Staging already proved the invoker flips; production should change only the finalized list. |
| missing or unconfirmed `vw_candidate_search_clean` | INCLUDE IN WRAPPER | Code references it directly; must still be validated before executable SQL. |
| missing July validation/assertion migrations | FIX IN WRAPPER | Validation should be converted into exact post-change read-only assertions. |

## Views That Should Definitely Convert To `security_invoker = true`

Based on the staging hardening migration and production view inventory, these views should be treated as the definite invoker-flip set:

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
- `terrer_jobs_view`

## View Changes That Need More Evidence

- `vw_candidate_search_clean` needs final dependency and consumer validation before any executable SQL is written, even though it is included in the wrapper draft.
- Any view not present in the production view export should not be touched until it is confirmed by live evidence.

## Validation Checks

The current draft is **not yet complete enough** for executable SQL because the checks are still high-level.

To become executable-safe, the validation set should be expanded to exact checks for:

- `candidate_web_jobs` existence and published-read policy
- `candidates` RLS and self-access policy
- `web_job_interest` self-only and staff/service-role access
- `jobs` public-read and staff-write boundaries
- `employer_job_intake` and `employer_intake_actions` access paths
- `activity_log` staff/service-role access
- RLS enabled on all internal advisor tables
- `profiles` ACL reductions
- `public.is_current_user_admin()` grants
- view `security_invoker` state for each finalized view
- `vw_candidate_search_clean` existence and select privilege for authenticated users if the contract requires it

## Post-Deployment Smoke Tests

The smoke-test checklist is directionally correct but still needs to be translated into final deployment checks for the exact executable migration.

Must include at minimum:

- public jobs load without sign-in
- candidate sign-in still works
- verified-email candidate self-profile access still works
- candidate cannot access another candidate profile
- self-only `web_job_interest` still works
- employer preview remains anonymized
- employer intake/action flows still work via the intended server path
- candidate search UI still resolves via `vw_candidate_search_clean`
- Advisor rerun returns no critical public-RLS findings

## Exact Items That Must Be Approved Before Executable SQL

1. Exact `candidate_web_jobs` create/repair DDL.
2. Exact final policy text for every table in scope.
3. Exact `profiles` revoke/grant matrix.
4. Exact `is_current_user_admin()` revoke/grant matrix.
5. Exact finalized invoker-flip view list.
6. Exact read-only validation SQL text.
7. Exact rollback SQL text for each policy/grant/view change.
8. Final answer for whether `vw_candidate_search_clean` is being hardened as a live contract or only retained for compatibility.

## Final Verdict

**CONDITIONAL READY**

The exact SQL is now assembled into the executable draft, but production remains NO-GO until the operator completes a separate line-by-line approval pass and explicitly authorizes a runnable migration.
