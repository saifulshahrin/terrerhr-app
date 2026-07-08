-- REVIEW ONLY
-- View-security hardening draft
-- Do not apply to production yet.

begin;

alter view public.vw_candidate_search_clean set (security_invoker = true);
alter view public.vw_jobs_tier1_malaysia set (security_invoker = true);
alter view public.vw_market_signals set (security_invoker = true);
alter view public.vw_market_signals_active set (security_invoker = true);
alter view public.vw_market_signals_realtime set (security_invoker = true);
alter view public.vw_market_signals_recent set (security_invoker = true);
alter view public.vw_tier1_source_diagnostics set (security_invoker = true);
alter view public.vw_tier1_source_health set (security_invoker = true);
alter view public.vw_tier1_source_health_summary set (security_invoker = true);
alter view public.vw_tier1_source_health_v2 set (security_invoker = true);

-- Internal-only views should be moved or browser-revoked in the final review set.

commit;

