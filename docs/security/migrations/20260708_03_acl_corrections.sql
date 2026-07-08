-- REVIEW ONLY
-- ACL corrections draft
-- Do not apply to production yet.

begin;

revoke all on public.candidates from anon;
revoke all on public.web_job_interest from anon;
revoke all on public.jobs from anon;
revoke all on public.employer_job_intake from anon;
revoke all on public.employer_intake_actions from anon;

revoke all on public.candidates from authenticated;
revoke all on public.web_job_interest from authenticated;
revoke all on public.jobs from authenticated;
revoke all on public.employer_job_intake from authenticated;
revoke all on public.employer_intake_actions from authenticated;

grant select on public.candidate_web_jobs to anon, authenticated;

commit;

