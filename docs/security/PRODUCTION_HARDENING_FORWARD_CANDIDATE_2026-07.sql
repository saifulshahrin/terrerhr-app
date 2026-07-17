-- FORWARD CANDIDATE ONLY
-- DO NOT RUN UNTIL FINAL APPROVAL
-- PRODUCTION SQL - REVIEW REQUIRED

BEGIN;

CREATE TABLE IF NOT EXISTS public.candidate_web_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'published',
  is_featured boolean NOT NULL DEFAULT false,
  display_order integer,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidate_web_jobs_status_check
    CHECK (status IN ('published', 'hidden')),
  CONSTRAINT candidate_web_jobs_job_id_key
    UNIQUE (job_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_web_jobs_public_listing
  ON public.candidate_web_jobs (
    status,
    is_featured DESC,
    display_order,
    published_at DESC
  );

ALTER TABLE public.candidate_web_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.candidate_web_jobs FROM public, anon, authenticated;
GRANT SELECT ON public.candidate_web_jobs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.candidate_web_jobs TO authenticated;
GRANT ALL PRIVILEGES ON public.candidate_web_jobs TO service_role;

DROP POLICY IF EXISTS "public_can_read_published_candidate_web_jobs"
  ON public.candidate_web_jobs;
CREATE POLICY "public_can_read_published_candidate_web_jobs"
  ON public.candidate_web_jobs
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "admins_can_manage_candidate_web_jobs"
  ON public.candidate_web_jobs;
CREATE POLICY "admins_can_manage_candidate_web_jobs"
  ON public.candidate_web_jobs
  FOR ALL
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "candidates_select_own_verified_email" ON public.candidates;
CREATE POLICY "candidates_select_own_verified_email"
  ON public.candidates
  FOR SELECT
  TO authenticated
  USING (
    lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "candidates_select_staff" ON public.candidates;
CREATE POLICY "candidates_select_staff"
  ON public.candidates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

DROP POLICY IF EXISTS "candidates_insert_staff" ON public.candidates;
CREATE POLICY "candidates_insert_staff"
  ON public.candidates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

DROP POLICY IF EXISTS "candidates_update_staff" ON public.candidates;
CREATE POLICY "candidates_update_staff"
  ON public.candidates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

DROP POLICY IF EXISTS "candidates_delete_staff" ON public.candidates;
CREATE POLICY "candidates_delete_staff"
  ON public.candidates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

REVOKE ALL ON public.candidates FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL PRIVILEGES ON public.candidates TO service_role;

ALTER TABLE public.web_job_interest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow read all for now" ON public.web_job_interest;
DROP POLICY IF EXISTS "allow anon update web_job_interest for now" ON public.web_job_interest;
DROP POLICY IF EXISTS "web_job_interest_select_own_verified_email" ON public.web_job_interest;
CREATE POLICY "web_job_interest_select_own_verified_email"
  ON public.web_job_interest
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.candidates c
      WHERE c.candidate_id = web_job_interest.candidate_id
        AND lower(coalesce(c.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

DROP POLICY IF EXISTS "web_job_interest_select_staff" ON public.web_job_interest;
CREATE POLICY "web_job_interest_select_staff"
  ON public.web_job_interest
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

DROP POLICY IF EXISTS "web_job_interest_insert_own_verified_email" ON public.web_job_interest;
CREATE POLICY "web_job_interest_insert_own_verified_email"
  ON public.web_job_interest
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.candidates c
      WHERE c.candidate_id = web_job_interest.candidate_id
        AND lower(coalesce(c.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    AND EXISTS (
      SELECT 1
      FROM public.candidate_web_jobs cw
      WHERE cw.job_id = web_job_interest.job_id
        AND cw.status = 'published'
    )
  );

DROP POLICY IF EXISTS "web_job_interest_update_own_verified_email" ON public.web_job_interest;
CREATE POLICY "web_job_interest_update_own_verified_email"
  ON public.web_job_interest
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.candidates c
      WHERE c.candidate_id = web_job_interest.candidate_id
        AND lower(coalesce(c.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.candidates c
      WHERE c.candidate_id = web_job_interest.candidate_id
        AND lower(coalesce(c.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    AND EXISTS (
      SELECT 1
      FROM public.candidate_web_jobs cw
      WHERE cw.job_id = web_job_interest.job_id
        AND cw.status = 'published'
    )
  );

DROP POLICY IF EXISTS "web_job_interest_update_staff" ON public.web_job_interest;
CREATE POLICY "web_job_interest_update_staff"
  ON public.web_job_interest
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

REVOKE ALL ON public.web_job_interest FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.web_job_interest TO authenticated;
GRANT ALL PRIVILEGES ON public.web_job_interest TO service_role;

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon users can read jobs" ON public.jobs;
DROP POLICY IF EXISTS "Anon users can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Anon users can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can read jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "jobs_select_staff" ON public.jobs;
CREATE POLICY "jobs_select_staff"
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

DROP POLICY IF EXISTS "jobs_insert_staff" ON public.jobs;
CREATE POLICY "jobs_insert_staff"
  ON public.jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

DROP POLICY IF EXISTS "jobs_update_staff" ON public.jobs;
CREATE POLICY "jobs_update_staff"
  ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

REVOKE ALL ON public.jobs FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.jobs TO authenticated;
GRANT ALL PRIVILEGES ON public.jobs TO service_role;

ALTER TABLE public.employer_job_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_intake_actions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.employer_job_intake FROM public, anon, authenticated;
REVOKE ALL ON public.employer_intake_actions FROM public, anon, authenticated;
GRANT ALL PRIVILEGES ON public.employer_job_intake TO service_role;
GRANT ALL PRIVILEGES ON public.employer_intake_actions TO service_role;

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staging_bullhorn_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staging_bullhorn_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_log_insert_anon" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_select_anon" ON public.activity_log;

REVOKE ALL ON public.activity_log FROM public, anon, authenticated;
REVOKE ALL ON public.staging_bullhorn_companies FROM public, anon, authenticated;
REVOKE ALL ON public.staging_bullhorn_contacts FROM public, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staging_bullhorn_companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staging_bullhorn_contacts TO authenticated;

GRANT ALL PRIVILEGES ON public.activity_log TO service_role;
GRANT ALL PRIVILEGES ON public.staging_bullhorn_companies TO service_role;
GRANT ALL PRIVILEGES ON public.staging_bullhorn_contacts TO service_role;

DROP POLICY IF EXISTS "activity_log_select_staff" ON public.activity_log;
CREATE POLICY "activity_log_select_staff"
  ON public.activity_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

DROP POLICY IF EXISTS "activity_log_insert_staff" ON public.activity_log;
CREATE POLICY "activity_log_insert_staff"
  ON public.activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

DROP POLICY IF EXISTS "activity_log_update_staff" ON public.activity_log;
CREATE POLICY "activity_log_update_staff"
  ON public.activity_log
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

DROP POLICY IF EXISTS "activity_log_delete_staff" ON public.activity_log;
CREATE POLICY "activity_log_delete_staff"
  ON public.activity_log
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

DROP POLICY IF EXISTS "staging_bullhorn_companies_admin_manage" ON public.staging_bullhorn_companies;
CREATE POLICY "staging_bullhorn_companies_admin_manage"
  ON public.staging_bullhorn_companies
  FOR ALL
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "staging_bullhorn_contacts_admin_manage" ON public.staging_bullhorn_contacts;
CREATE POLICY "staging_bullhorn_contacts_admin_manage"
  ON public.staging_bullhorn_contacts
  FOR ALL
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

ALTER TABLE public.source_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terrer_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terrer_company_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terrer_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terrer_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terrer_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terrer_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_candidate_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "source_profiles_select_staff" ON public.source_profiles;
DROP POLICY IF EXISTS "source_profiles_insert_staff" ON public.source_profiles;
DROP POLICY IF EXISTS "source_profiles_update_staff" ON public.source_profiles;
DROP POLICY IF EXISTS "source_profiles_delete_staff" ON public.source_profiles;
CREATE POLICY "source_profiles_select_staff"
  ON public.source_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );
CREATE POLICY "source_profiles_insert_staff"
  ON public.source_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );
CREATE POLICY "source_profiles_update_staff"
  ON public.source_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );
CREATE POLICY "source_profiles_delete_staff"
  ON public.source_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

DROP POLICY IF EXISTS "candidate_scores_select_staff" ON public.candidate_scores;
DROP POLICY IF EXISTS "candidate_scores_insert_staff" ON public.candidate_scores;
DROP POLICY IF EXISTS "candidate_scores_update_staff" ON public.candidate_scores;
DROP POLICY IF EXISTS "candidate_scores_delete_staff" ON public.candidate_scores;
CREATE POLICY "candidate_scores_select_staff"
  ON public.candidate_scores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );
CREATE POLICY "candidate_scores_insert_staff"
  ON public.candidate_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );
CREATE POLICY "candidate_scores_update_staff"
  ON public.candidate_scores
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );
CREATE POLICY "candidate_scores_delete_staff"
  ON public.candidate_scores
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

DROP POLICY IF EXISTS "skills_select_staff" ON public.skills;
CREATE POLICY "skills_select_staff"
  ON public.skills
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

DROP POLICY IF EXISTS "candidate_capabilities_select_staff" ON public.candidate_capabilities;
CREATE POLICY "candidate_capabilities_select_staff"
  ON public.candidate_capabilities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

DROP POLICY IF EXISTS "evidence_signals_select_staff" ON public.evidence_signals;
CREATE POLICY "evidence_signals_select_staff"
  ON public.evidence_signals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

DROP POLICY IF EXISTS "job_candidate_matches_select_staff" ON public.job_candidate_matches;
CREATE POLICY "job_candidate_matches_select_staff"
  ON public.job_candidate_matches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

DROP POLICY IF EXISTS "outreach_log_select_staff" ON public.outreach_log;
CREATE POLICY "outreach_log_select_staff"
  ON public.outreach_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('admin', 'recruiter', 'bd')
    )
  );

REVOKE ALL ON public.source_profiles FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.source_profiles TO authenticated;
GRANT ALL PRIVILEGES ON public.source_profiles TO service_role;

REVOKE ALL ON public.evidence_signals FROM public, anon, authenticated;
GRANT SELECT ON public.evidence_signals TO authenticated;
GRANT ALL PRIVILEGES ON public.evidence_signals TO service_role;

REVOKE ALL ON public.skills FROM public, anon, authenticated;
GRANT SELECT ON public.skills TO authenticated;
GRANT ALL PRIVILEGES ON public.skills TO service_role;

REVOKE ALL ON public.candidate_capabilities FROM public, anon, authenticated;
GRANT SELECT ON public.candidate_capabilities TO authenticated;
GRANT ALL PRIVILEGES ON public.candidate_capabilities TO service_role;

REVOKE ALL ON public.candidate_scores FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_scores TO authenticated;
GRANT ALL PRIVILEGES ON public.candidate_scores TO service_role;

REVOKE ALL ON public.terrer_companies FROM public, anon, authenticated;
REVOKE ALL ON public.terrer_company_contacts FROM public, anon, authenticated;
REVOKE ALL ON public.terrer_jobs FROM public, anon, authenticated;
REVOKE ALL ON public.terrer_candidates FROM public, anon, authenticated;
REVOKE ALL ON public.terrer_skills FROM public, anon, authenticated;
REVOKE ALL ON public.terrer_pipeline FROM public, anon, authenticated;
GRANT ALL PRIVILEGES ON public.terrer_companies TO service_role;
GRANT ALL PRIVILEGES ON public.terrer_company_contacts TO service_role;
GRANT ALL PRIVILEGES ON public.terrer_jobs TO service_role;
GRANT ALL PRIVILEGES ON public.terrer_candidates TO service_role;
GRANT ALL PRIVILEGES ON public.terrer_skills TO service_role;
GRANT ALL PRIVILEGES ON public.terrer_pipeline TO service_role;

REVOKE ALL ON public.job_candidate_matches FROM public, anon, authenticated;
GRANT SELECT ON public.job_candidate_matches TO authenticated;
GRANT ALL PRIVILEGES ON public.job_candidate_matches TO service_role;

REVOKE ALL ON public.outreach_log FROM public, anon, authenticated;
GRANT SELECT ON public.outreach_log TO authenticated;
GRANT ALL PRIVILEGES ON public.outreach_log TO service_role;

REVOKE ALL ON public.profiles FROM public, anon;
REVOKE DELETE, INSERT, TRUNCATE, REFERENCES, TRIGGER ON public.profiles FROM authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL PRIVILEGES ON public.profiles TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO postgres;

ALTER VIEW public.vw_candidate_search_clean SET (security_invoker = true);
ALTER VIEW public.vw_jobs_tier1_malaysia SET (security_invoker = true);
ALTER VIEW public.vw_market_signals SET (security_invoker = true);
ALTER VIEW public.vw_market_signals_active SET (security_invoker = true);
ALTER VIEW public.vw_market_signals_realtime SET (security_invoker = true);
ALTER VIEW public.vw_market_signals_recent SET (security_invoker = true);
ALTER VIEW public.vw_tier1_source_diagnostics SET (security_invoker = true);
ALTER VIEW public.vw_tier1_source_health SET (security_invoker = true);
ALTER VIEW public.vw_tier1_source_health_summary SET (security_invoker = true);
ALTER VIEW public.vw_tier1_source_health_v2 SET (security_invoker = true);
ALTER VIEW public.hiring_leaderboard_malaysia SET (security_invoker = true);
ALTER VIEW public.jobs_latest SET (security_invoker = true);
ALTER VIEW public.jobs_latest_practical SET (security_invoker = true);
ALTER VIEW public.jobs_reporting SET (security_invoker = true);
ALTER VIEW public.recruiter_active_submissions SET (security_invoker = true);
ALTER VIEW public.terrer_hiring_now SET (security_invoker = true);
ALTER VIEW public.v_match_shortlist SET (security_invoker = true);
ALTER VIEW public.v_outreach_due SET (security_invoker = true);
ALTER VIEW public.vw_activity_log_enriched SET (security_invoker = true);
ALTER VIEW public.vw_candidate_pipeline_summary SET (security_invoker = true);
ALTER VIEW public.vw_candidate_search SET (security_invoker = true);
ALTER VIEW public.vw_company_pipeline_summary SET (security_invoker = true);
ALTER VIEW public.vw_followup_queue SET (security_invoker = true);
ALTER VIEW public.vw_job_shortlist SET (security_invoker = true);
ALTER VIEW public.vw_live_work_queue SET (security_invoker = true);
ALTER VIEW public.vw_outcomes_summary SET (security_invoker = true);
ALTER VIEW public.vw_pipeline_summary SET (security_invoker = true);
ALTER VIEW public.vw_recruiter_dashboard SET (security_invoker = true);
ALTER VIEW public.vw_submissions_enriched SET (security_invoker = true);
ALTER VIEW public.terrer_jobs_view SET (security_invoker = true);

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
