-- ROLLBACK CANDIDATE ONLY
-- DO NOT RUN UNLESS FORWARD EXECUTION CAUSES A PROBLEM

BEGIN;

DROP POLICY IF EXISTS "public_can_read_published_candidate_web_jobs"
  ON public.candidate_web_jobs;
DROP POLICY IF EXISTS "admins_can_manage_candidate_web_jobs"
  ON public.candidate_web_jobs;
ALTER TABLE public.candidate_web_jobs DISABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON public.candidate_web_jobs FROM public, anon, authenticated, service_role;
DROP TABLE IF EXISTS public.candidate_web_jobs;

DROP POLICY IF EXISTS "candidates_select_own_verified_email" ON public.candidates;
DROP POLICY IF EXISTS "candidates_select_staff" ON public.candidates;
DROP POLICY IF EXISTS "candidates_insert_staff" ON public.candidates;
DROP POLICY IF EXISTS "candidates_update_staff" ON public.candidates;
DROP POLICY IF EXISTS "candidates_delete_staff" ON public.candidates;
ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.candidates FROM authenticated;
GRANT ALL PRIVILEGES ON public.candidates TO service_role;

DROP POLICY IF EXISTS "web_job_interest_select_own_verified_email" ON public.web_job_interest;
DROP POLICY IF EXISTS "web_job_interest_select_staff" ON public.web_job_interest;
DROP POLICY IF EXISTS "web_job_interest_insert_own_verified_email" ON public.web_job_interest;
DROP POLICY IF EXISTS "web_job_interest_update_own_verified_email" ON public.web_job_interest;
DROP POLICY IF EXISTS "web_job_interest_update_staff" ON public.web_job_interest;
ALTER TABLE public.web_job_interest DISABLE ROW LEVEL SECURITY;
REVOKE SELECT, INSERT, UPDATE ON public.web_job_interest FROM authenticated;
GRANT ALL PRIVILEGES ON public.web_job_interest TO service_role;

DROP POLICY IF EXISTS "jobs_select_staff" ON public.jobs;
DROP POLICY IF EXISTS "jobs_insert_staff" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_staff" ON public.jobs;
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
REVOKE SELECT, INSERT, UPDATE ON public.jobs FROM authenticated;
GRANT ALL PRIVILEGES ON public.jobs TO service_role;

ALTER TABLE public.employer_job_intake DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_intake_actions DISABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON public.employer_job_intake FROM service_role;
REVOKE ALL PRIVILEGES ON public.employer_intake_actions FROM service_role;

DROP POLICY IF EXISTS "activity_log_select_staff" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_insert_staff" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_update_staff" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_delete_staff" ON public.activity_log;
ALTER TABLE public.activity_log DISABLE ROW LEVEL SECURITY;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.activity_log FROM authenticated;
GRANT ALL PRIVILEGES ON public.activity_log TO service_role;

DROP POLICY IF EXISTS "staging_bullhorn_companies_admin_manage" ON public.staging_bullhorn_companies;
DROP POLICY IF EXISTS "staging_bullhorn_contacts_admin_manage" ON public.staging_bullhorn_contacts;
ALTER TABLE public.staging_bullhorn_companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staging_bullhorn_contacts DISABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON public.staging_bullhorn_companies FROM authenticated;
REVOKE ALL PRIVILEGES ON public.staging_bullhorn_contacts FROM authenticated;
GRANT ALL PRIVILEGES ON public.staging_bullhorn_companies TO service_role;
GRANT ALL PRIVILEGES ON public.staging_bullhorn_contacts TO service_role;

DROP POLICY IF EXISTS "source_profiles_select_staff" ON public.source_profiles;
DROP POLICY IF EXISTS "source_profiles_insert_staff" ON public.source_profiles;
DROP POLICY IF EXISTS "source_profiles_update_staff" ON public.source_profiles;
DROP POLICY IF EXISTS "source_profiles_delete_staff" ON public.source_profiles;
DROP POLICY IF EXISTS "candidate_scores_select_staff" ON public.candidate_scores;
DROP POLICY IF EXISTS "candidate_scores_insert_staff" ON public.candidate_scores;
DROP POLICY IF EXISTS "candidate_scores_update_staff" ON public.candidate_scores;
DROP POLICY IF EXISTS "candidate_scores_delete_staff" ON public.candidate_scores;
DROP POLICY IF EXISTS "skills_select_staff" ON public.skills;
DROP POLICY IF EXISTS "candidate_capabilities_select_staff" ON public.candidate_capabilities;
DROP POLICY IF EXISTS "evidence_signals_select_staff" ON public.evidence_signals;
DROP POLICY IF EXISTS "job_candidate_matches_select_staff" ON public.job_candidate_matches;
DROP POLICY IF EXISTS "outreach_log_select_staff" ON public.outreach_log;
ALTER TABLE public.source_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_signals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_capabilities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.terrer_companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.terrer_company_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.terrer_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.terrer_candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.terrer_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.terrer_pipeline DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_candidate_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_log DISABLE ROW LEVEL SECURITY;

REVOKE SELECT, UPDATE ON public.profiles FROM authenticated;
GRANT DELETE, INSERT, TRUNCATE, REFERENCES, TRIGGER ON public.profiles TO authenticated;
GRANT ALL PRIVILEGES ON public.profiles TO public, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO public, anon, authenticated, service_role, postgres;

ALTER VIEW public.vw_candidate_search_clean SET (security_invoker = false);
ALTER VIEW public.vw_jobs_tier1_malaysia SET (security_invoker = false);
ALTER VIEW public.vw_market_signals SET (security_invoker = false);
ALTER VIEW public.vw_market_signals_active SET (security_invoker = false);
ALTER VIEW public.vw_market_signals_realtime SET (security_invoker = false);
ALTER VIEW public.vw_market_signals_recent SET (security_invoker = false);
ALTER VIEW public.vw_tier1_source_diagnostics SET (security_invoker = false);
ALTER VIEW public.vw_tier1_source_health SET (security_invoker = false);
ALTER VIEW public.vw_tier1_source_health_summary SET (security_invoker = false);
ALTER VIEW public.vw_tier1_source_health_v2 SET (security_invoker = false);
ALTER VIEW public.hiring_leaderboard_malaysia SET (security_invoker = false);
ALTER VIEW public.jobs_latest SET (security_invoker = false);
ALTER VIEW public.jobs_latest_practical SET (security_invoker = false);
ALTER VIEW public.jobs_reporting SET (security_invoker = false);
ALTER VIEW public.recruiter_active_submissions SET (security_invoker = false);
ALTER VIEW public.terrer_hiring_now SET (security_invoker = false);
ALTER VIEW public.v_match_shortlist SET (security_invoker = false);
ALTER VIEW public.v_outreach_due SET (security_invoker = false);
ALTER VIEW public.vw_activity_log_enriched SET (security_invoker = false);
ALTER VIEW public.vw_candidate_pipeline_summary SET (security_invoker = false);
ALTER VIEW public.vw_candidate_search SET (security_invoker = false);
ALTER VIEW public.vw_company_pipeline_summary SET (security_invoker = false);
ALTER VIEW public.vw_followup_queue SET (security_invoker = false);
ALTER VIEW public.vw_job_shortlist SET (security_invoker = false);
ALTER VIEW public.vw_live_work_queue SET (security_invoker = false);
ALTER VIEW public.vw_outcomes_summary SET (security_invoker = false);
ALTER VIEW public.vw_pipeline_summary SET (security_invoker = false);
ALTER VIEW public.vw_recruiter_dashboard SET (security_invoker = false);
ALTER VIEW public.vw_submissions_enriched SET (security_invoker = false);
ALTER VIEW public.terrer_jobs_view SET (security_invoker = false);

REVOKE ALL ON
  public.vw_candidate_search_clean,
  public.vw_jobs_tier1_malaysia,
  public.vw_market_signals,
  public.vw_market_signals_active,
  public.vw_market_signals_realtime,
  public.vw_market_signals_recent,
  public.vw_tier1_source_diagnostics,
  public.vw_tier1_source_health,
  public.vw_tier1_source_health_summary,
  public.vw_tier1_source_health_v2,
  public.hiring_leaderboard_malaysia,
  public.jobs_latest,
  public.jobs_latest_practical,
  public.jobs_reporting,
  public.recruiter_active_submissions,
  public.terrer_hiring_now,
  public.v_match_shortlist,
  public.v_outreach_due,
  public.vw_activity_log_enriched,
  public.vw_candidate_pipeline_summary,
  public.vw_candidate_search,
  public.vw_company_pipeline_summary,
  public.vw_followup_queue,
  public.vw_job_shortlist,
  public.vw_live_work_queue,
  public.vw_outcomes_summary,
  public.vw_pipeline_summary,
  public.vw_recruiter_dashboard,
  public.vw_submissions_enriched,
  public.terrer_jobs_view
FROM public, anon, authenticated;

GRANT SELECT ON
  public.vw_candidate_search_clean,
  public.vw_jobs_tier1_malaysia,
  public.vw_market_signals,
  public.vw_market_signals_active,
  public.vw_market_signals_realtime,
  public.vw_market_signals_recent,
  public.vw_tier1_source_diagnostics,
  public.vw_tier1_source_health,
  public.vw_tier1_source_health_summary,
  public.vw_tier1_source_health_v2,
  public.hiring_leaderboard_malaysia,
  public.jobs_latest,
  public.jobs_latest_practical,
  public.jobs_reporting,
  public.recruiter_active_submissions,
  public.terrer_hiring_now,
  public.v_match_shortlist,
  public.v_outreach_due,
  public.vw_activity_log_enriched,
  public.vw_candidate_pipeline_summary,
  public.vw_candidate_search,
  public.vw_company_pipeline_summary,
  public.vw_followup_queue,
  public.vw_job_shortlist,
  public.vw_live_work_queue,
  public.vw_outcomes_summary,
  public.vw_pipeline_summary,
  public.vw_recruiter_dashboard,
  public.vw_submissions_enriched,
  public.terrer_jobs_view
TO authenticated;

GRANT SELECT ON
  public.vw_candidate_search_clean,
  public.vw_jobs_tier1_malaysia,
  public.vw_market_signals,
  public.vw_market_signals_active,
  public.vw_market_signals_realtime,
  public.vw_market_signals_recent,
  public.vw_tier1_source_diagnostics,
  public.vw_tier1_source_health,
  public.vw_tier1_source_health_summary,
  public.vw_tier1_source_health_v2,
  public.hiring_leaderboard_malaysia,
  public.jobs_latest,
  public.jobs_latest_practical,
  public.jobs_reporting,
  public.recruiter_active_submissions,
  public.terrer_hiring_now,
  public.v_match_shortlist,
  public.v_outreach_due,
  public.vw_activity_log_enriched,
  public.vw_candidate_pipeline_summary,
  public.vw_candidate_search,
  public.vw_company_pipeline_summary,
  public.vw_followup_queue,
  public.vw_job_shortlist,
  public.vw_live_work_queue,
  public.vw_outcomes_summary,
  public.vw_pipeline_summary,
  public.vw_recruiter_dashboard,
  public.vw_submissions_enriched,
  public.terrer_jobs_view
TO service_role;

COMMIT;
