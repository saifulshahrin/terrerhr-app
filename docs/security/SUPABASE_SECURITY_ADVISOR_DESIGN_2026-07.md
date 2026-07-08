# Supabase Security Advisor Design

Date: 2026-07

This document records the target security posture for the 43 Advisor objects in scope:

- 14 RLS-disabled tables
- 29 security-definer views

It is a first draft for review, not an execution plan.

## Candidate Ownership Design

Use `public.candidate_auth_links` as the smallest compatible ownership mapping.

Rationale:

- It avoids changing the core `candidates` table shape.
- It gives one canonical auth user per candidate profile.
- It blocks one user from claiming multiple unrelated profiles.
- It blocks multiple users from claiming one profile.
- It supports manual recovery and admin re-linking.
- It can be audited with timestamps and a claim source.

Recommended policies:

- authenticated candidate: self-only on linked row
- recruiter/admin: read all, manage claims
- service-role: full access
- anon: none

## Table Plan

### `public.candidates`

- Sensitivity: high PII
- anon: deny all
- authenticated candidate: self-only SELECT and UPDATE
- authorised recruiter/admin: full SELECT, scoped UPDATE
- service-role: full
- ACL correction: remove anonymous privileges
- compatibility risk: direct browser access must move to auth-backed self access or server endpoints
- rollback: re-enable old policies only temporarily if a release fails

### `public.web_job_interest`

- Sensitivity: high PII and workflow state
- anon: deny all
- authenticated candidate: self-only SELECT/INSERT/UPDATE
- authorised recruiter/admin: SELECT all, internal status updates
- service-role: full
- ACL correction: remove anonymous SELECT/UPDATE
- compatibility risk: browser pages that rely on unauthenticated writes must be migrated to verified auth
- rollback: keep reads and writes scoped to the owner

### `public.jobs`

- Sensitivity: operational data, not candidate PII but still internal
- anon: deny direct table access for candidate pages
- authenticated candidate: no direct dependency
- authorised recruiter/admin: SELECT, limited INSERT/UPDATE
- service-role: full
- ACL correction: remove anonymous mutation and direct candidate browsing dependency
- compatibility risk: existing browser pages that query `jobs` directly need to switch to `candidate_web_jobs`
- rollback: keep publication contract intact while re-clamping direct table access

### `public.candidate_web_jobs`

- Sensitivity: published job data only
- anon: SELECT published rows only
- authenticated candidate: SELECT published rows only
- authorised recruiter/admin: full management
- service-role: full
- ACL correction: keep published read access only, no anonymous mutation
- compatibility risk: low if publication rows remain stable
- rollback: retain the publication contract

### `public.employer_job_intake`

- Sensitivity: employer contact and intake data
- anon: deny all
- authenticated candidate: deny all
- authorised recruiter/admin: server-mediated access only
- service-role: full
- ACL correction: remove browser access; keep server-only writes
- compatibility risk: employer preview API must remain trusted-server only
- rollback: keep data private even if preview feature is degraded

### `public.employer_intake_actions`

- Sensitivity: employer workflow notes
- anon: deny all
- authenticated candidate: deny all
- authorised recruiter/admin: server-mediated access only
- service-role: full
- ACL correction: remove browser access
- compatibility risk: low if only server writes are used
- rollback: keep action logging server-only

### `public.candidate_scores`

- Sensitivity: internal scoring and ranking
- anon: deny all
- authenticated candidate: optional self-summary only through a safe view, not the table
- authorised recruiter/admin: read
- service-role: full
- ACL correction: revoke anonymous broad access
- compatibility risk: candidate search and review views may need security-invoker treatment
- rollback: preserve internal read path only

### `public.source_profiles`

- Sensitivity: provenance and source linkage
- anon: deny all
- authenticated candidate: no direct browser table access
- authorised recruiter/admin: read
- service-role: full
- ACL correction: revoke anonymous access
- compatibility risk: candidate search view dependencies may need invoker mode
- rollback: retain read availability for trusted staff only

### `public.skills`

- Sensitivity: taxonomy, low PII
- anon: deny direct table access unless the public product explicitly needs it
- authenticated candidate: prefer view-based access only
- authorised recruiter/admin: read, controlled write
- service-role: full
- ACL correction: revoke open mutation
- compatibility risk: skill-search UI should use a safe read model
- rollback: keep read access only if a published contract requires it

### `public.candidate_capabilities`

- Sensitivity: derived candidate intelligence
- anon: deny all
- authenticated candidate: self-only if exposed at all
- authorised recruiter/admin: read
- service-role: full
- ACL correction: remove anonymous exposure
- compatibility risk: search view depends on this data
- rollback: keep through trusted internal paths only

### `public.evidence_signals`

- Sensitivity: internal enrichment
- anon: deny all
- authenticated candidate: no direct table access
- authorised recruiter/admin: read
- service-role: full
- ACL correction: revoke anonymous access
- compatibility risk: none known in current browser code
- rollback: internal-only access only

### `public.job_candidate_matches`

- Sensitivity: internal matching outputs
- anon: deny all
- authenticated candidate: no direct table access unless later productized
- authorised recruiter/admin: read/write
- service-role: full
- ACL correction: remove anonymous exposure
- compatibility risk: low
- rollback: keep internal-only

### `public.match_interactions`

- Sensitivity: workflow feedback
- anon: deny all
- authenticated candidate: no direct table access
- authorised recruiter/admin: read/write
- service-role: full
- ACL correction: revoke anonymous access
- compatibility risk: none known
- rollback: internal-only

### `public.outreach_log`

- Sensitivity: outreach history and contact context
- anon: deny all
- authenticated candidate: no direct table access
- authorised recruiter/admin: read/write
- service-role: full
- ACL correction: revoke anonymous access
- compatibility risk: none known
- rollback: internal-only

### `public.target_companies`

- Sensitivity: planning data
- anon: deny all
- authenticated candidate: no direct table access
- authorised recruiter/admin: read/write
- service-role: full
- ACL correction: revoke anonymous access
- compatibility risk: none known
- rollback: internal-only

### `public.terrer_candidates`

- Sensitivity: legacy parallel data
- anon: deny all
- authenticated candidate: deny all
- authorised recruiter/admin: internal read only if still needed
- service-role: full
- ACL correction: revoke browser roles
- compatibility risk: low because no active consumer was found
- rollback: move out of exposed schema when safe

### `public.terrer_companies`

- Sensitivity: legacy parallel data
- anon: deny all
- authenticated candidate: deny all
- authorised recruiter/admin: internal read only if still needed
- service-role: full
- ACL correction: revoke browser roles
- compatibility risk: low
- rollback: move out of exposed schema when safe

### `public.terrer_company_contacts`

- Sensitivity: legacy parallel PII
- anon: deny all
- authenticated candidate: deny all
- authorised recruiter/admin: internal read only if still needed
- service-role: full
- ACL correction: revoke browser roles
- compatibility risk: low
- rollback: move out of exposed schema when safe

### `public.terrer_jobs`

- Sensitivity: legacy parallel job data
- anon: deny all
- authenticated candidate: deny all
- authorised recruiter/admin: internal read only if still needed
- service-role: full
- ACL correction: revoke browser roles
- compatibility risk: low
- rollback: move out of exposed schema when safe

### `public.terrer_pipeline`

- Sensitivity: legacy pipeline state
- anon: deny all
- authenticated candidate: deny all
- authorised recruiter/admin: internal read only if still needed
- service-role: full
- ACL correction: revoke browser roles
- compatibility risk: low
- rollback: move out of exposed schema when safe

### `public.terrer_skills`

- Sensitivity: legacy parallel taxonomy
- anon: deny all
- authenticated candidate: deny all
- authorised recruiter/admin: internal read only if still needed
- service-role: full
- ACL correction: revoke browser roles
- compatibility risk: low
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

These are read-model candidates because they are either public-safe job discovery or source-health/reporting projections that can inherit table-level policy.

### Revoke browser roles and retain trusted internal access

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
- `vw_company_pipeline_summary`
- `vw_followup_queue`
- `vw_job_shortlist`
- `vw_live_work_queue`
- `vw_outcomes_summary`
- `vw_pipeline_summary`
- `vw_recruiter_dashboard`
- `vw_submissions_enriched`

These are internal reporting or pipeline projections and should not remain browser-facing unless a deliberate product requirement is proven.

### Move outside the exposed schema when safe

- `terrer_jobs_view`

This is a legacy parallel view with no active repository consumer. It is the strongest candidate for schema relocation or retirement after dependency confirmation.

### Re-check before final lock-down

- `vw_candidate_search`

This view directly exposes candidate PII through the search stack. The safest path is likely internal-only access or a narrower invoker contract after the candidate ownership model is in place.

## Migration Sequence

1. Candidate ownership support.
2. RLS enablement and policies.
3. ACL corrections.
4. View-security hardening.
5. Validation assertions.

## Test Plan

Create transaction-safe tests for:

- anonymous candidate-data denial
- candidate self-profile access
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

