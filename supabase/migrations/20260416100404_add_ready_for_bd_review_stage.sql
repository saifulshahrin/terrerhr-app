/*
  # Add ready_for_bd_review Submission Stage

  This version is defensive for environments where multiple views depend on
  submissions.submission_stage. The dependent views are dropped before the
  column type change and recreated afterward with the same definitions.
*/

DROP VIEW IF EXISTS public.vw_recruiter_dashboard;
DROP VIEW IF EXISTS public.vw_job_shortlist;
DROP VIEW IF EXISTS public.vw_followup_queue;
DROP VIEW IF EXISTS public.vw_live_work_queue;
DROP VIEW IF EXISTS public.vw_outcomes_summary;
DROP VIEW IF EXISTS public.vw_pipeline_summary;
DROP VIEW IF EXISTS public.vw_activity_log_enriched;
DROP VIEW IF EXISTS public.vw_candidate_pipeline_summary;
DROP VIEW IF EXISTS public.vw_company_pipeline_summary;
DROP VIEW IF EXISTS public.vw_submissions_enriched;
DROP VIEW IF EXISTS public.recruiter_active_submissions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
      AND column_name = 'submission_stage'
  ) THEN
    ALTER TABLE public.submissions
      ALTER COLUMN submission_stage TYPE text
      USING submission_stage::text;
  END IF;
END $$;

CREATE VIEW public.vw_submissions_enriched AS
 SELECT s.id AS submission_id,
    s.job_id,
    s.candidate_id,
    s.company_id,
    s.submission_stage,
    s.stage_updated_at,
    s.match_score,
    s.shortlist_rank,
    s.submitted_to_client_at,
    s.owner_name,
    s.decision_reason,
    s.outcome,
    s.notes,
    s.created_at,
    s.updated_at,
    j.job_title,
    j.company_name,
    c.display_name,
    c.full_name,
    c.primary_role,
    c.city,
    c.country,
    c.email,
    c.phone,
    c.linkedin_url,
    c.github_url,
    c.score_total,
    c.tier_label,
    c.contactability_status,
    c.source_type AS candidate_source_type
   FROM submissions s
     LEFT JOIN jobs j ON s.job_id = j.id
     LEFT JOIN candidates c ON s.candidate_id = c.candidate_id;

CREATE VIEW public.recruiter_active_submissions AS
 SELECT s.id AS submission_id,
    c.display_name,
    j.company_name,
    j.job_title,
    s.submission_stage,
    s.next_action_date,
    s.stage_updated_at
   FROM submissions s
     LEFT JOIN candidates c ON c.candidate_id = s.candidate_id
     LEFT JOIN jobs j ON j.id = s.job_id
  WHERE s.submission_stage <> ALL (ARRAY['hired'::text, 'rejected'::text, 'withdrew'::text])
  ORDER BY s.next_action_date, s.stage_updated_at DESC;

CREATE VIEW public.vw_company_pipeline_summary AS
 SELECT j.company_id,
    j.company_name,
    s.submission_stage,
    count(*) AS submission_count
   FROM submissions s
     LEFT JOIN jobs j ON s.job_id = j.id
  GROUP BY j.company_id, j.company_name, s.submission_stage
  ORDER BY j.company_name, s.submission_stage;

CREATE VIEW public.vw_candidate_pipeline_summary AS
 SELECT c.candidate_id,
    c.display_name,
    c.full_name,
    s.submission_stage,
    count(*) AS submission_count
   FROM submissions s
     LEFT JOIN candidates c ON s.candidate_id = c.candidate_id
  GROUP BY c.candidate_id, c.display_name, c.full_name, s.submission_stage
  ORDER BY c.display_name, s.submission_stage;

CREATE VIEW public.vw_activity_log_enriched AS
 SELECT a.id AS activity_id,
    a.submission_id,
    a.entity_type,
    a.entity_id,
    a.activity_type,
    a.activity_channel,
    a.activity_direction,
    a.subject_line,
    a.message_summary,
    a.occurred_at,
    a.next_action_at,
    a.created_by,
    a.created_at,
    s.submission_stage,
    s.match_score,
    s.owner_name,
    j.job_title,
    j.company_name,
    c.display_name,
    c.full_name,
    c.email,
    c.phone,
    c.linkedin_url,
    c.github_url
   FROM activity_log a
     LEFT JOIN submissions s ON a.submission_id = s.id
     LEFT JOIN jobs j ON s.job_id = j.id
     LEFT JOIN candidates c ON s.candidate_id = c.candidate_id;

CREATE VIEW public.vw_pipeline_summary AS
 SELECT submission_stage,
    count(*) AS submission_count
   FROM submissions
  GROUP BY submission_stage
  ORDER BY submission_stage;

CREATE VIEW public.vw_outcomes_summary AS
 SELECT submission_stage,
    count(*) AS outcome_count
   FROM submissions
  WHERE submission_stage = ANY (ARRAY['hired'::text, 'rejected'::text, 'withdrew'::text])
  GROUP BY submission_stage
  ORDER BY submission_stage;

CREATE VIEW public.vw_live_work_queue AS
 SELECT id AS submission_id,
    job_id,
    candidate_id,
    company_id,
    submission_stage,
    next_action_date,
        CASE
            WHEN next_action_date < CURRENT_DATE THEN 'overdue'::text
            WHEN next_action_date = CURRENT_DATE THEN 'due_today'::text
            WHEN next_action_date = (CURRENT_DATE + 1) THEN 'due_tomorrow'::text
            ELSE 'upcoming'::text
        END AS urgency,
    owner_name,
    created_at,
    updated_at
   FROM submissions s
  WHERE submission_stage <> ALL (ARRAY['hired'::text, 'rejected'::text, 'withdrew'::text]);

CREATE VIEW public.vw_followup_queue AS
 SELECT a.id AS activity_id,
    a.submission_id,
    a.activity_type,
    a.activity_channel,
    a.subject_line,
    a.message_summary,
    a.occurred_at,
    a.next_action_at,
    a.created_by,
    s.submission_stage,
    s.owner_name,
    s.match_score,
    s.shortlist_rank,
    j.job_title,
    j.company_name,
    c.display_name,
    c.full_name,
    c.email,
    c.phone,
    c.contactability_status,
    c.tier_label,
    c.score_total
   FROM activity_log a
     LEFT JOIN submissions s ON a.submission_id = s.id
     LEFT JOIN jobs j ON s.job_id = j.id
     LEFT JOIN candidates c ON s.candidate_id = c.candidate_id
  WHERE a.next_action_at IS NOT NULL
    AND (s.submission_stage = ANY (ARRAY['submitted_to_client'::text, 'client_review'::text, 'interview'::text, 'offer'::text]))
  ORDER BY a.next_action_at;

CREATE VIEW public.vw_job_shortlist AS
 SELECT submission_id,
    job_id,
    company_id,
    company_name,
    job_title,
    candidate_id,
    display_name,
    full_name,
    primary_role,
    city,
    country,
    email,
    phone,
    linkedin_url,
    github_url,
    match_score,
    score_total,
    tier_label,
    contactability_status,
    shortlist_rank,
    submission_stage,
    stage_updated_at,
    owner_name,
    created_at
   FROM vw_submissions_enriched s
  WHERE submission_stage = ANY (ARRAY['identified'::text, 'shortlisted'::text, 'approached'::text, 'replied'::text, 'qualified'::text])
  ORDER BY job_title, shortlist_rank, match_score DESC NULLS LAST, score_total DESC NULLS LAST, created_at DESC;

CREATE VIEW public.vw_recruiter_dashboard AS
 WITH latest_activity AS (
         SELECT DISTINCT ON (a.submission_id) a.submission_id,
            a.activity_type,
            a.activity_channel,
            a.subject_line,
            a.message_summary,
            a.occurred_at,
            a.next_action_at,
            a.created_by
           FROM activity_log a
          ORDER BY a.submission_id, a.occurred_at DESC, a.id DESC
        )
 SELECT s.submission_id,
    s.company_name,
    s.job_title,
    s.display_name,
    s.full_name,
    s.email,
    s.phone,
    s.match_score,
    s.score_total,
    s.tier_label,
    s.contactability_status,
    s.submission_stage,
    s.stage_updated_at,
    s.owner_name,
    la.next_action_at,
    s.created_at
   FROM vw_submissions_enriched s
     LEFT JOIN latest_activity la ON s.submission_id = la.submission_id
  WHERE s.submission_stage = ANY (ARRAY['approached'::text, 'replied'::text, 'qualified'::text, 'submitted_to_client'::text, 'client_review'::text, 'interview'::text, 'offer'::text, 'placed'::text])
  ORDER BY (
        CASE
            WHEN la.next_action_at IS NULL THEN 1
            ELSE 0
        END), la.next_action_at, s.stage_updated_at DESC, s.created_at DESC;
