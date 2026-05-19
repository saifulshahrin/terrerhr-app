-- Terrer Stakeholder Demo Rollback Script
-- Marker: DEMO_SEED / source='demo_seed' / source_type='demo_seed' / model_used='demo_seed'
--
-- IMPORTANT
-- - Deletes ONLY demo rows created by demo_seed.sql
-- - Does NOT delete any non-demo data
--
-- Recommended execution:
--   1) rollback_demo_seed.sql
--   2) verify counts on key tables

begin;

-- AI assessments
delete from public.ai_assessments
where model_used = 'demo_seed'
   or reasoning_summary ilike '%DEMO_SEED%';

-- Submissions (pipeline)
delete from public.submissions
where notes ilike '%DEMO_SEED%';

-- Job requirements
delete from public.job_requirements
where notes ilike '%DEMO_SEED%';

-- Candidate scores
delete from public.candidate_scores
where score_reason ilike '%DEMO_SEED%';

-- Source profiles
delete from public.source_profiles
where source_name = 'demo_seed'
   or source_profile_url ilike '%DEMO_SEED%';

-- Candidates
delete from public.candidates
where source_type = 'demo_seed'
   or notes ilike '%DEMO_SEED%';

-- Jobs
delete from public.jobs
where source = 'demo_seed';

-- Job sources
delete from public.job_sources
where source_type = 'demo_seed'
   or notes ilike '%DEMO_SEED%';

-- BD contacts (delete before companies)
delete from public.bd_contacts
where source = 'demo_seed'
   or notes ilike '%DEMO_SEED%';

-- BD companies
delete from public.companies
where source_type = 'demo_seed'
   or notes ilike '%DEMO_SEED%';

-- Autonomous recruiter runs
delete from public.autonomous_recruiter_runs
where mode = 'demo_seed'
   or (app_demo_summary ? 'demo_seed' and app_demo_summary->>'demo_seed' = 'true');

commit;

