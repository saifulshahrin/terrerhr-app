-- Security hardening sprint 2026-07
-- ACL corrections for Advisor tables and publication contracts.

begin;

revoke all on public.candidates from public, anon, authenticated;
grant select, insert, update, delete on public.candidates to authenticated;
grant all privileges on public.candidates to service_role;

revoke all on public.web_job_interest from public, anon, authenticated;
grant select, insert, update on public.web_job_interest to authenticated;
grant all privileges on public.web_job_interest to service_role;

revoke all on public.jobs from public, anon, authenticated;
grant select, insert, update on public.jobs to authenticated;
grant all privileges on public.jobs to service_role;

revoke all on public.candidate_web_jobs from public, anon, authenticated;
grant select on public.candidate_web_jobs to anon, authenticated;
grant insert, update, delete on public.candidate_web_jobs to authenticated;
grant all privileges on public.candidate_web_jobs to service_role;

revoke all on public.employer_job_intake from public, anon, authenticated;
revoke all on public.employer_intake_actions from public, anon, authenticated;
grant all privileges on public.employer_job_intake to service_role;
grant all privileges on public.employer_intake_actions to service_role;

revoke all on public.source_profiles from public, anon, authenticated;
grant select, insert, update, delete on public.source_profiles to authenticated;
grant all privileges on public.source_profiles to service_role;

revoke all on public.evidence_signals from public, anon, authenticated;
grant select on public.evidence_signals to authenticated;
grant all privileges on public.evidence_signals to service_role;

revoke all on public.skills from public, anon, authenticated;
grant select on public.skills to authenticated;
grant all privileges on public.skills to service_role;

revoke all on public.candidate_capabilities from public, anon, authenticated;
grant select on public.candidate_capabilities to authenticated;
grant all privileges on public.candidate_capabilities to service_role;

revoke all on public.candidate_scores from public, anon, authenticated;
grant select, insert, update, delete on public.candidate_scores to authenticated;
grant all privileges on public.candidate_scores to service_role;

revoke all on public.terrer_companies from public, anon, authenticated;
revoke all on public.terrer_company_contacts from public, anon, authenticated;
revoke all on public.terrer_jobs from public, anon, authenticated;
revoke all on public.terrer_candidates from public, anon, authenticated;
revoke all on public.terrer_skills from public, anon, authenticated;
revoke all on public.terrer_pipeline from public, anon, authenticated;
grant all privileges on public.terrer_companies to service_role;
grant all privileges on public.terrer_company_contacts to service_role;
grant all privileges on public.terrer_jobs to service_role;
grant all privileges on public.terrer_candidates to service_role;
grant all privileges on public.terrer_skills to service_role;
grant all privileges on public.terrer_pipeline to service_role;

revoke all on public.job_candidate_matches from public, anon, authenticated;
grant select on public.job_candidate_matches to authenticated;
grant all privileges on public.job_candidate_matches to service_role;

revoke all on public.outreach_log from public, anon, authenticated;
grant select on public.outreach_log to authenticated;
grant all privileges on public.outreach_log to service_role;

commit;
