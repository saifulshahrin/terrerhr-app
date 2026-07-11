-- Security hardening sprint 2026-07
-- View security hardening for the 29 Advisor views.

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
alter view public.hiring_leaderboard_malaysia set (security_invoker = true);
alter view public.jobs_latest set (security_invoker = true);
alter view public.jobs_latest_practical set (security_invoker = true);
alter view public.jobs_reporting set (security_invoker = true);
alter view public.recruiter_active_submissions set (security_invoker = true);
alter view public.terrer_hiring_now set (security_invoker = true);
alter view public.v_match_shortlist set (security_invoker = true);
alter view public.v_outreach_due set (security_invoker = true);
alter view public.vw_activity_log_enriched set (security_invoker = true);
alter view public.vw_candidate_pipeline_summary set (security_invoker = true);
alter view public.vw_candidate_search set (security_invoker = true);
alter view public.vw_company_pipeline_summary set (security_invoker = true);
alter view public.vw_followup_queue set (security_invoker = true);
alter view public.vw_job_shortlist set (security_invoker = true);
alter view public.vw_live_work_queue set (security_invoker = true);
alter view public.vw_outcomes_summary set (security_invoker = true);
alter view public.vw_pipeline_summary set (security_invoker = true);
alter view public.vw_recruiter_dashboard set (security_invoker = true);
alter view public.vw_submissions_enriched set (security_invoker = true);
alter view public.terrer_jobs_view set (security_invoker = true);

revoke all on public.vw_candidate_search_clean from public, anon, authenticated;
grant select on public.vw_candidate_search_clean to authenticated;

revoke all on public.vw_jobs_tier1_malaysia from public, anon, authenticated;
grant select on public.vw_jobs_tier1_malaysia to authenticated;

revoke all on public.vw_market_signals from public, anon, authenticated;
grant select on public.vw_market_signals to authenticated;

revoke all on public.vw_market_signals_active from public, anon, authenticated;
grant select on public.vw_market_signals_active to authenticated;

revoke all on public.vw_market_signals_realtime from public, anon, authenticated;
grant select on public.vw_market_signals_realtime to authenticated;

revoke all on public.vw_market_signals_recent from public, anon, authenticated;
grant select on public.vw_market_signals_recent to authenticated;

revoke all on public.vw_tier1_source_diagnostics from public, anon, authenticated;
grant select on public.vw_tier1_source_diagnostics to authenticated;

revoke all on public.vw_tier1_source_health from public, anon, authenticated;
grant select on public.vw_tier1_source_health to authenticated;

revoke all on public.vw_tier1_source_health_summary from public, anon, authenticated;
grant select on public.vw_tier1_source_health_summary to authenticated;

revoke all on public.vw_tier1_source_health_v2 from public, anon, authenticated;
grant select on public.vw_tier1_source_health_v2 to authenticated;

revoke all on public.hiring_leaderboard_malaysia from public, anon, authenticated;
grant select on public.hiring_leaderboard_malaysia to authenticated;

revoke all on public.jobs_latest from public, anon, authenticated;
grant select on public.jobs_latest to authenticated;

revoke all on public.jobs_latest_practical from public, anon, authenticated;
grant select on public.jobs_latest_practical to authenticated;

revoke all on public.jobs_reporting from public, anon, authenticated;
grant select on public.jobs_reporting to authenticated;

revoke all on public.recruiter_active_submissions from public, anon, authenticated;
grant select on public.recruiter_active_submissions to authenticated;

revoke all on public.terrer_hiring_now from public, anon, authenticated;
grant select on public.terrer_hiring_now to authenticated;

revoke all on public.v_match_shortlist from public, anon, authenticated;
grant select on public.v_match_shortlist to authenticated;

revoke all on public.v_outreach_due from public, anon, authenticated;
grant select on public.v_outreach_due to authenticated;

revoke all on public.vw_activity_log_enriched from public, anon, authenticated;
grant select on public.vw_activity_log_enriched to authenticated;

revoke all on public.vw_candidate_pipeline_summary from public, anon, authenticated;
grant select on public.vw_candidate_pipeline_summary to authenticated;

revoke all on public.vw_candidate_search from public, anon, authenticated;
grant select on public.vw_candidate_search to authenticated;

revoke all on public.vw_company_pipeline_summary from public, anon, authenticated;
grant select on public.vw_company_pipeline_summary to authenticated;

revoke all on public.vw_followup_queue from public, anon, authenticated;
grant select on public.vw_followup_queue to authenticated;

revoke all on public.vw_job_shortlist from public, anon, authenticated;
grant select on public.vw_job_shortlist to authenticated;

revoke all on public.vw_live_work_queue from public, anon, authenticated;
grant select on public.vw_live_work_queue to authenticated;

revoke all on public.vw_outcomes_summary from public, anon, authenticated;
grant select on public.vw_outcomes_summary to authenticated;

revoke all on public.vw_pipeline_summary from public, anon, authenticated;
grant select on public.vw_pipeline_summary to authenticated;

revoke all on public.vw_recruiter_dashboard from public, anon, authenticated;
grant select on public.vw_recruiter_dashboard to authenticated;

revoke all on public.vw_submissions_enriched from public, anon, authenticated;
grant select on public.vw_submissions_enriched to authenticated;

revoke all on public.terrer_jobs_view from public, anon, authenticated;
grant select on public.vw_candidate_search_clean, public.vw_jobs_tier1_malaysia, public.vw_market_signals,
  public.vw_market_signals_active, public.vw_market_signals_realtime, public.vw_market_signals_recent,
  public.vw_tier1_source_diagnostics, public.vw_tier1_source_health, public.vw_tier1_source_health_summary,
  public.vw_tier1_source_health_v2, public.hiring_leaderboard_malaysia, public.jobs_latest,
  public.jobs_latest_practical, public.jobs_reporting, public.recruiter_active_submissions,
  public.terrer_hiring_now, public.v_match_shortlist, public.v_outreach_due, public.vw_activity_log_enriched,
  public.vw_candidate_pipeline_summary, public.vw_candidate_search, public.vw_company_pipeline_summary,
  public.vw_followup_queue, public.vw_job_shortlist, public.vw_live_work_queue, public.vw_outcomes_summary,
  public.vw_pipeline_summary, public.vw_recruiter_dashboard, public.vw_submissions_enriched,
  public.terrer_jobs_view
  to service_role;

commit;
