-- Security hardening sprint 2026-07
-- Triage staging Security Advisor warning policies after critical errors cleared.
--
-- This migration removes broad mutating policies from internal tables and
-- replaces necessary authenticated app writes with the existing staff profile
-- contract. Candidate intent events keep anonymous insert support, but no
-- longer use an unrestricted WITH CHECK (true) policy.

begin;

revoke insert, update, delete on public.ai_assessments from anon;
revoke insert, update, delete on public.bd_contacts from anon;
revoke insert, update, delete on public.candidate_skills from anon;
revoke insert, update, delete on public.job_requirements from anon;
revoke insert, update, delete on public.companies from anon;
revoke insert, update, delete on public.submissions from anon;
revoke insert, update, delete on public.autonomous_recruiter_runs from anon;
revoke insert, update, delete on public.autonomous_recruiter_memory from anon;

grant select, insert, update, delete on public.ai_assessments to authenticated;
grant select, insert, update, delete on public.bd_contacts to authenticated;
grant select, insert, update, delete on public.candidate_skills to authenticated;
grant select, insert, update, delete on public.job_requirements to authenticated;
grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.submissions to authenticated;
grant select, insert, update, delete on public.autonomous_recruiter_runs to authenticated;
grant select, insert, update, delete on public.autonomous_recruiter_memory to authenticated;

grant all privileges on public.ai_assessments to service_role;
grant all privileges on public.bd_contacts to service_role;
grant all privileges on public.candidate_skills to service_role;
grant all privileges on public.job_requirements to service_role;
grant all privileges on public.companies to service_role;
grant all privileges on public.submissions to service_role;
grant all privileges on public.autonomous_recruiter_runs to service_role;
grant all privileges on public.autonomous_recruiter_memory to service_role;
grant all privileges on public.candidate_intent_events to service_role;

drop policy if exists "Anon users can insert ai_assessments" on public.ai_assessments;
drop policy if exists "Anon users can update ai_assessments" on public.ai_assessments;
drop policy if exists "ai_assessments_insert_staff" on public.ai_assessments;
create policy "ai_assessments_insert_staff"
  on public.ai_assessments
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

drop policy if exists "ai_assessments_update_staff" on public.ai_assessments;
create policy "ai_assessments_update_staff"
  on public.ai_assessments
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

drop policy if exists "autonomous_recruiter_memory_insert_authenticated" on public.autonomous_recruiter_memory;
drop policy if exists "autonomous_recruiter_memory_insert_staff" on public.autonomous_recruiter_memory;
create policy "autonomous_recruiter_memory_insert_staff"
  on public.autonomous_recruiter_memory
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

drop policy if exists "autonomous_recruiter_runs_insert_authenticated" on public.autonomous_recruiter_runs;
drop policy if exists "autonomous_recruiter_runs_insert_staff" on public.autonomous_recruiter_runs;
create policy "autonomous_recruiter_runs_insert_staff"
  on public.autonomous_recruiter_runs
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

drop policy if exists "Anon users can update bd_contacts" on public.bd_contacts;
drop policy if exists "Authenticated users can insert bd_contacts" on public.bd_contacts;
drop policy if exists "Authenticated users can update bd_contacts" on public.bd_contacts;
drop policy if exists "bd_contacts_insert_staff" on public.bd_contacts;
create policy "bd_contacts_insert_staff"
  on public.bd_contacts
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

drop policy if exists "bd_contacts_update_staff" on public.bd_contacts;
create policy "bd_contacts_update_staff"
  on public.bd_contacts
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

drop policy if exists "allow write candidate intent events" on public.candidate_intent_events;
create policy "allow constrained write candidate intent events"
  on public.candidate_intent_events
  for insert
  to anon, authenticated
  with check (
    candidate_id is not null
    and length(btrim(candidate_id)) > 0
    and job_id is not null
    and action_type in ('matches_viewed', 'interest_clicked', 'job_saved')
  );

drop policy if exists "Anon can insert candidate_skills" on public.candidate_skills;
drop policy if exists "Anon can update candidate_skills" on public.candidate_skills;
drop policy if exists "candidate_skills_insert_staff" on public.candidate_skills;
create policy "candidate_skills_insert_staff"
  on public.candidate_skills
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

drop policy if exists "candidate_skills_update_staff" on public.candidate_skills;
create policy "candidate_skills_update_staff"
  on public.candidate_skills
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

drop policy if exists "candidate_skills_delete_staff" on public.candidate_skills;
create policy "candidate_skills_delete_staff"
  on public.candidate_skills
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

drop policy if exists "Authenticated users can insert companies" on public.companies;
drop policy if exists "Authenticated users can update companies" on public.companies;
drop policy if exists "companies_insert_staff" on public.companies;
create policy "companies_insert_staff"
  on public.companies
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

drop policy if exists "companies_update_staff" on public.companies;
create policy "companies_update_staff"
  on public.companies
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

drop policy if exists "Anon can insert job_requirements" on public.job_requirements;
drop policy if exists "Anon can update job_requirements" on public.job_requirements;
drop policy if exists "job_requirements_insert_staff" on public.job_requirements;
create policy "job_requirements_insert_staff"
  on public.job_requirements
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

drop policy if exists "job_requirements_update_staff" on public.job_requirements;
create policy "job_requirements_update_staff"
  on public.job_requirements
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

drop policy if exists "Anon users can delete submissions" on public.submissions;
drop policy if exists "Anon users can insert submissions" on public.submissions;
drop policy if exists "Anon users can update submissions" on public.submissions;
drop policy if exists "allow anon insert submissions" on public.submissions;
drop policy if exists "demo_allow_anon_delete_submissions" on public.submissions;
drop policy if exists "demo_allow_anon_update_submissions" on public.submissions;
drop policy if exists "Authenticated users can delete submissions" on public.submissions;
drop policy if exists "Authenticated users can insert submissions" on public.submissions;
drop policy if exists "Authenticated users can update submissions" on public.submissions;

drop policy if exists "submissions_insert_staff" on public.submissions;
create policy "submissions_insert_staff"
  on public.submissions
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

drop policy if exists "submissions_update_staff" on public.submissions;
create policy "submissions_update_staff"
  on public.submissions
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

drop policy if exists "submissions_delete_staff" on public.submissions;
create policy "submissions_delete_staff"
  on public.submissions
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

revoke all on function public.is_current_user_admin() from public, anon;
grant execute on function public.is_current_user_admin() to authenticated, service_role;

commit;
