-- Security hardening sprint 2026-07
-- Candidate verified-email compatibility, public publication, and job-interest ownership.

begin;

alter table public.candidates enable row level security;
alter table public.web_job_interest enable row level security;
alter table public.jobs enable row level security;
alter table public.candidate_web_jobs enable row level security;
alter table public.employer_job_intake enable row level security;
alter table public.employer_intake_actions enable row level security;

drop policy if exists "candidates_select_own_verified_email" on public.candidates;
create policy "candidates_select_own_verified_email"
  on public.candidates
  for select
  to authenticated
  using (
    lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "candidates_select_staff" on public.candidates;
create policy "candidates_select_staff"
  on public.candidates
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'recruiter', 'bd')
    )
  );

drop policy if exists "candidates_insert_staff" on public.candidates;
create policy "candidates_insert_staff"
  on public.candidates
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'recruiter', 'bd')
    )
  );

drop policy if exists "candidates_update_staff" on public.candidates;
create policy "candidates_update_staff"
  on public.candidates
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'recruiter', 'bd')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'recruiter', 'bd')
    )
  );

drop policy if exists "candidates_delete_staff" on public.candidates;
create policy "candidates_delete_staff"
  on public.candidates
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'recruiter', 'bd')
    )
  );

drop policy if exists "web_job_interest_select_own_verified_email" on public.web_job_interest;
create policy "web_job_interest_select_own_verified_email"
  on public.web_job_interest
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.candidates c
      where c.candidate_id = web_job_interest.candidate_id
        and lower(coalesce(c.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

drop policy if exists "web_job_interest_select_staff" on public.web_job_interest;
create policy "web_job_interest_select_staff"
  on public.web_job_interest
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'recruiter', 'bd')
    )
  );

drop policy if exists "web_job_interest_insert_own_verified_email" on public.web_job_interest;
create policy "web_job_interest_insert_own_verified_email"
  on public.web_job_interest
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.candidates c
      where c.candidate_id = web_job_interest.candidate_id
        and lower(coalesce(c.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    and exists (
      select 1
      from public.candidate_web_jobs cw
      where cw.job_id = web_job_interest.job_id
        and cw.status = 'published'
    )
  );

drop policy if exists "web_job_interest_update_own_verified_email" on public.web_job_interest;
create policy "web_job_interest_update_own_verified_email"
  on public.web_job_interest
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.candidates c
      where c.candidate_id = web_job_interest.candidate_id
        and lower(coalesce(c.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  with check (
    exists (
      select 1
      from public.candidates c
      where c.candidate_id = web_job_interest.candidate_id
        and lower(coalesce(c.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    and exists (
      select 1
      from public.candidate_web_jobs cw
      where cw.job_id = web_job_interest.job_id
        and cw.status = 'published'
    )
  );

drop policy if exists "web_job_interest_update_staff" on public.web_job_interest;
create policy "web_job_interest_update_staff"
  on public.web_job_interest
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'recruiter', 'bd')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'recruiter', 'bd')
    )
  );

drop policy if exists "jobs_select_staff" on public.jobs;
create policy "jobs_select_staff"
  on public.jobs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'recruiter', 'bd')
    )
  );

drop policy if exists "jobs_insert_staff" on public.jobs;
create policy "jobs_insert_staff"
  on public.jobs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'recruiter', 'bd')
    )
  );

drop policy if exists "jobs_update_staff" on public.jobs;
create policy "jobs_update_staff"
  on public.jobs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'recruiter', 'bd')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'recruiter', 'bd')
    )
  );

drop policy if exists "public_can_read_published_candidate_web_jobs" on public.candidate_web_jobs;
create policy "public_can_read_published_candidate_web_jobs"
  on public.candidate_web_jobs
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "admins_can_manage_candidate_web_jobs" on public.candidate_web_jobs;
create policy "admins_can_manage_candidate_web_jobs"
  on public.candidate_web_jobs
  for all
  to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

commit;
