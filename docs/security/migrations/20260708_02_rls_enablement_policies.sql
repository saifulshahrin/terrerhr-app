-- REVIEW ONLY
-- RLS enablement and policy draft
-- Do not apply to production yet.

begin;

alter table public.candidate_auth_links enable row level security;
alter table public.candidates enable row level security;
alter table public.web_job_interest enable row level security;
alter table public.jobs enable row level security;
alter table public.candidate_web_jobs enable row level security;
alter table public.employer_job_intake enable row level security;
alter table public.employer_intake_actions enable row level security;

-- Draft intent:
-- - no anonymous candidate PII access
-- - self-only candidate access through auth link
-- - public publication only through candidate_web_jobs
-- - server-only employer intake tables

commit;

