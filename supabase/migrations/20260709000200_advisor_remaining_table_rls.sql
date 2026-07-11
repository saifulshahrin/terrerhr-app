-- Security hardening sprint 2026-07
-- Remaining Advisor table RLS lock-down.

begin;

alter table public.source_profiles enable row level security;
alter table public.evidence_signals enable row level security;
alter table public.skills enable row level security;
alter table public.candidate_capabilities enable row level security;
alter table public.candidate_scores enable row level security;
alter table public.terrer_companies enable row level security;
alter table public.terrer_company_contacts enable row level security;
alter table public.terrer_jobs enable row level security;
alter table public.terrer_candidates enable row level security;
alter table public.terrer_skills enable row level security;
alter table public.terrer_pipeline enable row level security;
alter table public.job_candidate_matches enable row level security;
alter table public.outreach_log enable row level security;

drop policy if exists "source_profiles_select_staff" on public.source_profiles;
create policy "source_profiles_select_staff"
  on public.source_profiles
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

drop policy if exists "source_profiles_insert_staff" on public.source_profiles;
create policy "source_profiles_insert_staff"
  on public.source_profiles
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

drop policy if exists "source_profiles_update_staff" on public.source_profiles;
create policy "source_profiles_update_staff"
  on public.source_profiles
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

drop policy if exists "source_profiles_delete_staff" on public.source_profiles;
create policy "source_profiles_delete_staff"
  on public.source_profiles
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

drop policy if exists "candidate_scores_select_staff" on public.candidate_scores;
create policy "candidate_scores_select_staff"
  on public.candidate_scores
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

drop policy if exists "candidate_scores_insert_staff" on public.candidate_scores;
create policy "candidate_scores_insert_staff"
  on public.candidate_scores
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

drop policy if exists "candidate_scores_update_staff" on public.candidate_scores;
create policy "candidate_scores_update_staff"
  on public.candidate_scores
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

drop policy if exists "candidate_scores_delete_staff" on public.candidate_scores;
create policy "candidate_scores_delete_staff"
  on public.candidate_scores
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

drop policy if exists "skills_select_staff" on public.skills;
create policy "skills_select_staff"
  on public.skills
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

drop policy if exists "candidate_capabilities_select_staff" on public.candidate_capabilities;
create policy "candidate_capabilities_select_staff"
  on public.candidate_capabilities
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

drop policy if exists "evidence_signals_select_staff" on public.evidence_signals;
create policy "evidence_signals_select_staff"
  on public.evidence_signals
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

drop policy if exists "job_candidate_matches_select_staff" on public.job_candidate_matches;
create policy "job_candidate_matches_select_staff"
  on public.job_candidate_matches
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

drop policy if exists "outreach_log_select_staff" on public.outreach_log;
create policy "outreach_log_select_staff"
  on public.outreach_log
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

commit;
