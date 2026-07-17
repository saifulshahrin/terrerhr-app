# Production Hardening SQL Component Review

Date: 2026-07-17

Status: review / planning only

This document extracts the exact SQL components that would be used to draft a
future executable production wrapper.
It is intentionally non-runnable and does not modify production.

## 1. `candidate_web_jobs`

### Exact object type

- Table / compatibility object

### Exact source SQL

REVIEW ONLY / DO NOT RUN:

```sql
create table if not exists public.candidate_web_jobs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  status text not null default 'published',
  is_featured boolean not null default false,
  display_order integer,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidate_web_jobs_status_check
    check (status in ('published', 'hidden')),
  constraint candidate_web_jobs_job_id_key
    unique (job_id)
);

create index if not exists idx_candidate_web_jobs_public_listing
  on public.candidate_web_jobs (
    status,
    is_featured desc,
    display_order,
    published_at desc
  );

alter table public.candidate_web_jobs enable row level security;

grant select on public.candidate_web_jobs to anon, authenticated;

drop policy if exists "public_can_read_published_candidate_web_jobs"
  on public.candidate_web_jobs;

create policy "public_can_read_published_candidate_web_jobs"
  on public.candidate_web_jobs
  for select
  to anon, authenticated
  using (status = 'published');
```

### Safety decision

- Safe for the production wrapper only if the live production shape matches the
  compatibility contract above.
- It is a structural compatibility object, not a blind backfill.

### Rollback SQL

REVIEW ONLY / DO NOT RUN:

```sql
drop policy if exists "public_can_read_published_candidate_web_jobs"
  on public.candidate_web_jobs;
drop policy if exists "admins_can_manage_candidate_web_jobs"
  on public.candidate_web_jobs;
alter table public.candidate_web_jobs disable row level security;
revoke all privileges on public.candidate_web_jobs from public, anon, authenticated, service_role;
drop table if exists public.candidate_web_jobs;
```

## 2. `candidates` RLS

### Exact source SQL

REVIEW ONLY / DO NOT RUN:

```sql
alter table public.candidates enable row level security;

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
```

### Exact ACL / grant text from source

REVIEW ONLY / DO NOT RUN:

```sql
revoke all on public.candidates from public, anon, authenticated;
grant select, insert, update, delete on public.candidates to authenticated;
grant all privileges on public.candidates to service_role;
```

### Rollback SQL

REVIEW ONLY / DO NOT RUN:

```sql
drop policy if exists "candidates_select_own_verified_email" on public.candidates;
drop policy if exists "candidates_select_staff" on public.candidates;
drop policy if exists "candidates_insert_staff" on public.candidates;
drop policy if exists "candidates_update_staff" on public.candidates;
drop policy if exists "candidates_delete_staff" on public.candidates;
alter table public.candidates disable row level security;
revoke select, insert, update, delete on public.candidates from authenticated;
grant all privileges on public.candidates to service_role;
```

## 3. `web_job_interest`

### Exact source SQL

REVIEW ONLY / DO NOT RUN:

```sql
alter table public.web_job_interest enable row level security;

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
```

### Exact ACL / grant text from source

REVIEW ONLY / DO NOT RUN:

```sql
revoke all on public.web_job_interest from public, anon, authenticated;
grant select, insert, update on public.web_job_interest to authenticated;
grant all privileges on public.web_job_interest to service_role;
```

### Rollback SQL

REVIEW ONLY / DO NOT RUN:

```sql
drop policy if exists "web_job_interest_select_own_verified_email" on public.web_job_interest;
drop policy if exists "web_job_interest_select_staff" on public.web_job_interest;
drop policy if exists "web_job_interest_insert_own_verified_email" on public.web_job_interest;
drop policy if exists "web_job_interest_update_own_verified_email" on public.web_job_interest;
drop policy if exists "web_job_interest_update_staff" on public.web_job_interest;
alter table public.web_job_interest disable row level security;
revoke select, insert, update on public.web_job_interest from authenticated;
grant all privileges on public.web_job_interest to service_role;
```

## 4. `jobs`

### Exact source SQL

REVIEW ONLY / DO NOT RUN:

```sql
alter table public.jobs enable row level security;

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
```

### Exact ACL / grant text from source

REVIEW ONLY / DO NOT RUN:

```sql
revoke all on public.jobs from public, anon, authenticated;
grant select, insert, update on public.jobs to authenticated;
grant all privileges on public.jobs to service_role;
```

### Rollback SQL

REVIEW ONLY / DO NOT RUN:

```sql
drop policy if exists "jobs_select_staff" on public.jobs;
drop policy if exists "jobs_insert_staff" on public.jobs;
drop policy if exists "jobs_update_staff" on public.jobs;
alter table public.jobs disable row level security;
revoke select, insert, update on public.jobs from authenticated;
grant all privileges on public.jobs to service_role;
```

## 5. `employer_job_intake` and `employer_intake_actions`

### Exact source decision text

- The hardened staging contract does **not** add row policies for these tables.
- They are treated as service-role-only workflow tables via ACL.

### Exact ACL / grant text from source

REVIEW ONLY / DO NOT RUN:

```sql
alter table public.employer_job_intake enable row level security;
alter table public.employer_intake_actions enable row level security;

revoke all on public.employer_job_intake from public, anon, authenticated;
revoke all on public.employer_intake_actions from public, anon, authenticated;
grant all privileges on public.employer_job_intake to service_role;
grant all privileges on public.employer_intake_actions to service_role;
```

### Rollback SQL

REVIEW ONLY / DO NOT RUN:

```sql
alter table public.employer_job_intake disable row level security;
alter table public.employer_intake_actions disable row level security;
revoke all privileges on public.employer_job_intake from service_role;
revoke all privileges on public.employer_intake_actions from service_role;
-- Restore the prior production grant/policy state only if it was separately
-- captured; otherwise use backup restore for structural uncertainty.
```

## 6. `activity_log`

### Exact source SQL

REVIEW ONLY / DO NOT RUN:

```sql
alter table public.activity_log enable row level security;

drop policy if exists "activity_log_select_staff" on public.activity_log;
create policy "activity_log_select_staff"
  on public.activity_log
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

drop policy if exists "activity_log_insert_staff" on public.activity_log;
create policy "activity_log_insert_staff"
  on public.activity_log
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

drop policy if exists "activity_log_update_staff" on public.activity_log;
create policy "activity_log_update_staff"
  on public.activity_log
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

drop policy if exists "activity_log_delete_staff" on public.activity_log;
create policy "activity_log_delete_staff"
  on public.activity_log
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
```

### Exact ACL / grant text from source

REVIEW ONLY / DO NOT RUN:

```sql
drop policy if exists "activity_log_insert_anon" on public.activity_log;
drop policy if exists "activity_log_select_anon" on public.activity_log;

revoke all on public.activity_log from public, anon, authenticated;
grant select, insert, update, delete on public.activity_log to authenticated;
grant all privileges on public.activity_log to service_role;
```

### Rollback SQL

REVIEW ONLY / DO NOT RUN:

```sql
drop policy if exists "activity_log_select_staff" on public.activity_log;
drop policy if exists "activity_log_insert_staff" on public.activity_log;
drop policy if exists "activity_log_update_staff" on public.activity_log;
drop policy if exists "activity_log_delete_staff" on public.activity_log;
alter table public.activity_log disable row level security;
grant select, insert, update, delete on public.activity_log to authenticated;
grant all privileges on public.activity_log to service_role;
```

## 7. Advisor/internal tables

### Exact source SQL

REVIEW ONLY / DO NOT RUN:

```sql
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

```

The exact staff predicate used by every policy below is:

```sql
exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
    and p.role in ('admin', 'recruiter', 'bd')
)
```

REVIEW ONLY / DO NOT RUN:

```sql
drop policy if exists "source_profiles_select_staff" on public.source_profiles;
create policy "source_profiles_select_staff" on public.source_profiles for select to authenticated using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
);
drop policy if exists "source_profiles_insert_staff" on public.source_profiles;
create policy "source_profiles_insert_staff" on public.source_profiles for insert to authenticated with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
);
drop policy if exists "source_profiles_update_staff" on public.source_profiles;
create policy "source_profiles_update_staff" on public.source_profiles for update to authenticated using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
) with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
);
drop policy if exists "source_profiles_delete_staff" on public.source_profiles;
create policy "source_profiles_delete_staff" on public.source_profiles for delete to authenticated using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
);

drop policy if exists "candidate_scores_select_staff" on public.candidate_scores;
create policy "candidate_scores_select_staff" on public.candidate_scores for select to authenticated using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
);
drop policy if exists "candidate_scores_insert_staff" on public.candidate_scores;
create policy "candidate_scores_insert_staff" on public.candidate_scores for insert to authenticated with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
);
drop policy if exists "candidate_scores_update_staff" on public.candidate_scores;
create policy "candidate_scores_update_staff" on public.candidate_scores for update to authenticated using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
) with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
);
drop policy if exists "candidate_scores_delete_staff" on public.candidate_scores;
create policy "candidate_scores_delete_staff" on public.candidate_scores for delete to authenticated using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
);

drop policy if exists "skills_select_staff" on public.skills;
create policy "skills_select_staff" on public.skills for select to authenticated using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
);

drop policy if exists "candidate_capabilities_select_staff" on public.candidate_capabilities;
create policy "candidate_capabilities_select_staff" on public.candidate_capabilities for select to authenticated using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
);

drop policy if exists "evidence_signals_select_staff" on public.evidence_signals;
create policy "evidence_signals_select_staff" on public.evidence_signals for select to authenticated using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
);

drop policy if exists "job_candidate_matches_select_staff" on public.job_candidate_matches;
create policy "job_candidate_matches_select_staff" on public.job_candidate_matches for select to authenticated using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
);

drop policy if exists "outreach_log_select_staff" on public.outreach_log;
create policy "outreach_log_select_staff" on public.outreach_log for select to authenticated using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
);
```

### Exact ACL / grant text from source

REVIEW ONLY / DO NOT RUN:

```sql
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
```

### Rollback SQL

REVIEW ONLY / DO NOT RUN:

```sql
drop policy if exists "source_profiles_select_staff" on public.source_profiles;
drop policy if exists "source_profiles_insert_staff" on public.source_profiles;
drop policy if exists "source_profiles_update_staff" on public.source_profiles;
drop policy if exists "source_profiles_delete_staff" on public.source_profiles;
drop policy if exists "candidate_scores_select_staff" on public.candidate_scores;
drop policy if exists "candidate_scores_insert_staff" on public.candidate_scores;
drop policy if exists "candidate_scores_update_staff" on public.candidate_scores;
drop policy if exists "candidate_scores_delete_staff" on public.candidate_scores;
drop policy if exists "skills_select_staff" on public.skills;
drop policy if exists "candidate_capabilities_select_staff" on public.candidate_capabilities;
drop policy if exists "evidence_signals_select_staff" on public.evidence_signals;
drop policy if exists "job_candidate_matches_select_staff" on public.job_candidate_matches;
drop policy if exists "outreach_log_select_staff" on public.outreach_log;
drop policy if exists "staging_bullhorn_companies_admin_manage" on public.staging_bullhorn_companies;
drop policy if exists "staging_bullhorn_contacts_admin_manage" on public.staging_bullhorn_contacts;

alter table public.source_profiles disable row level security;
alter table public.evidence_signals disable row level security;
alter table public.skills disable row level security;
alter table public.candidate_capabilities disable row level security;
alter table public.candidate_scores disable row level security;
alter table public.terrer_companies disable row level security;
alter table public.terrer_company_contacts disable row level security;
alter table public.terrer_jobs disable row level security;
alter table public.terrer_candidates disable row level security;
alter table public.terrer_skills disable row level security;
alter table public.terrer_pipeline disable row level security;
alter table public.job_candidate_matches disable row level security;
alter table public.outreach_log disable row level security;
```

## 8. `profiles` ACL matrix

### Exact proposed review text

REVIEW ONLY / DO NOT RUN:

```sql
revoke all on public.profiles from public, anon;
revoke delete, insert, truncate, references, trigger on public.profiles from authenticated;
grant select, update on public.profiles to authenticated;
grant all privileges on public.profiles to service_role;
```

### Decision text

- Preserve admin-gated access through `public.is_current_user_admin()`.
- Keep authenticated `SELECT` and `UPDATE` because the profile policies depend on them.
- Remove unnecessary public/anon exposure.
- Do not grant authenticated `INSERT`/`DELETE` unless a later approved policy requires them.

### Rollback SQL

REVIEW ONLY / DO NOT RUN:

```sql
revoke select, update on public.profiles from authenticated;
grant delete, insert, truncate, references, trigger on public.profiles to authenticated;
grant all privileges on public.profiles to public, anon, authenticated, service_role;
```

## 9. `public.is_current_user_admin()`

### Exact proposed review text

REVIEW ONLY / DO NOT RUN:

```sql
revoke execute on function public.is_current_user_admin() from public, anon;
grant execute on function public.is_current_user_admin() to authenticated;
grant execute on function public.is_current_user_admin() to service_role;
grant execute on function public.is_current_user_admin() to postgres;
```

### Decision text

- Revoke `EXECUTE` from `public` and `anon`.
- Keep `authenticated` because the RLS helper policies depend on it.
- Keep `service_role` and `postgres` because the current contract expects them.

### Rollback SQL

REVIEW ONLY / DO NOT RUN:

```sql
grant execute on function public.is_current_user_admin() to public, anon, authenticated, service_role, postgres;
```

## 10. Views

### Finalized `security_invoker = true` list

REVIEW ONLY / DO NOT RUN:

```sql
alter view public.vw_candidate_search_clean set (security_invoker = true);
alter view public.vw_jobs_tier1_malaysia set (security_invoker = true);
alter view public.vw_market_signals set (security_invoker = true);
alter view public.vw_market_signals_active set (security_invoker = true);
alter view public.vw_market_signals_realtime set (security_invoker = true);
alter view public.vw_market_signals_recent set (security_invoker = true);
alter view public.vw_tier1_source_diagnostics set (security_invoker = true);
alter view public.vw_tier1_source_health set (security_invoker = true);
alter view public.vw_tier1_source_health_summary set (security_invoker = true);
alter view public.vw_tier1_source_health_v2 set (security_invoker = true);
alter view public.hiring_leaderboard_malaysia set (security_invoker = true);
alter view public.jobs_latest set (security_invoker = true);
alter view public.jobs_latest_practical set (security_invoker = true);
alter view public.jobs_reporting set (security_invoker = true);
alter view public.recruiter_active_submissions set (security_invoker = true);
alter view public.terrer_hiring_now set (security_invoker = true);
alter view public.v_match_shortlist set (security_invoker = true);
alter view public.v_outreach_due set (security_invoker = true);
alter view public.vw_activity_log_enriched set (security_invoker = true);
alter view public.vw_candidate_pipeline_summary set (security_invoker = true);
alter view public.vw_candidate_search set (security_invoker = true);
alter view public.vw_company_pipeline_summary set (security_invoker = true);
alter view public.vw_followup_queue set (security_invoker = true);
alter view public.vw_job_shortlist set (security_invoker = true);
alter view public.vw_live_work_queue set (security_invoker = true);
alter view public.vw_outcomes_summary set (security_invoker = true);
alter view public.vw_pipeline_summary set (security_invoker = true);
alter view public.vw_recruiter_dashboard set (security_invoker = true);
alter view public.vw_submissions_enriched set (security_invoker = true);
alter view public.terrer_jobs_view set (security_invoker = true);
```

### Views that still need more evidence

- None among the finalized hardening list.
- `vw_candidate_search_clean` is included because local code references it directly and the source migrations include it in the view hardening set.

### Exact grant posture from source

REVIEW ONLY / DO NOT RUN:

```sql
revoke all on public.vw_candidate_search_clean from public, anon, authenticated;
grant select on public.vw_candidate_search_clean to authenticated;
```

The same revoke/grant pattern applies to the remaining finalized views in the list above.

### Rollback SQL

REVIEW ONLY / DO NOT RUN:

```sql
alter view public.vw_candidate_search_clean set (security_invoker = false);
revoke all on public.vw_candidate_search_clean from public, anon, authenticated;
grant select on public.vw_candidate_search_clean to authenticated;
```

Apply the corresponding reverse `security_invoker = false` and grant set for each
view in the finalized list if rollback is needed.

## 11. Validation SQL

### Exact read-only post-change validation SQL

REVIEW ONLY / DO NOT RUN:

```sql
begin;

do $$
begin
  if exists (
    select 1
    from (
      values
        ('source_profiles'),
        ('evidence_signals'),
        ('skills'),
        ('candidate_capabilities'),
        ('candidate_scores'),
        ('terrer_companies'),
        ('terrer_company_contacts'),
        ('terrer_jobs'),
        ('terrer_candidates'),
        ('terrer_skills'),
        ('terrer_pipeline'),
        ('job_candidate_matches'),
        ('outreach_log'),
        ('candidates')
    ) as required(tablename)
    left join pg_class c
      on c.relname = required.tablename
    left join pg_namespace n
      on n.oid = c.relnamespace
    where c.oid is null
       or n.nspname <> 'public'
       or c.relrowsecurity is distinct from true
  ) then
    raise exception 'one or more Advisor tables still lack RLS';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('candidates', 'web_job_interest', 'jobs', 'employer_job_intake', 'employer_intake_actions')
      and roles @> array['anon']::name[]
      and cmd in ('UPDATE', 'DELETE')
  ) then
    raise exception 'anonymous UPDATE/DELETE still exists on a sensitive Advisor table';
  end if;
end $$;

do $$
begin
  if has_table_privilege('anon', 'public.candidates', 'SELECT') then
    raise exception 'anon can still SELECT public.candidates';
  end if;

  if has_table_privilege('anon', 'public.web_job_interest', 'SELECT')
     or has_table_privilege('anon', 'public.web_job_interest', 'INSERT')
     or has_table_privilege('anon', 'public.web_job_interest', 'UPDATE')
     or has_table_privilege('anon', 'public.web_job_interest', 'DELETE') then
    raise exception 'anon still has access to public.web_job_interest';
  end if;

  if not has_table_privilege('anon', 'public.candidate_web_jobs', 'SELECT') then
    raise exception 'anon cannot read public candidate publication rows';
  end if;

  if has_table_privilege('anon', 'public.jobs', 'SELECT')
     or has_table_privilege('anon', 'public.jobs', 'INSERT')
     or has_table_privilege('anon', 'public.jobs', 'UPDATE')
     or has_table_privilege('anon', 'public.jobs', 'DELETE') then
    raise exception 'anon still has access to public.jobs';
  end if;

  if has_table_privilege('anon', 'public.employer_job_intake', 'SELECT')
     or has_table_privilege('anon', 'public.employer_job_intake', 'INSERT')
     or has_table_privilege('anon', 'public.employer_job_intake', 'UPDATE')
     or has_table_privilege('anon', 'public.employer_job_intake', 'DELETE') then
    raise exception 'anon still has access to public.employer_job_intake';
  end if;

  if has_table_privilege('anon', 'public.employer_intake_actions', 'SELECT')
     or has_table_privilege('anon', 'public.employer_intake_actions', 'INSERT')
     or has_table_privilege('anon', 'public.employer_intake_actions', 'UPDATE')
     or has_table_privilege('anon', 'public.employer_intake_actions', 'DELETE') then
    raise exception 'anon still has access to public.employer_intake_actions';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'candidates'
      and cmd = 'SELECT'
      and roles @> array['authenticated']::name[]
      and lower(coalesce(qual::text, '')) like '%lower(coalesce(email%'
  ) then
    raise exception 'candidate verified-email select policy is missing';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'web_job_interest'
      and cmd in ('SELECT', 'INSERT', 'UPDATE')
      and roles @> array['authenticated']::name[]
  ) then
    raise exception 'web_job_interest authenticated ownership policies are missing';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'candidate_web_jobs'
      and cmd = 'SELECT'
      and roles @> array['anon']::name[]
      and lower(coalesce(qual::text, '')) like '%published%'
  ) then
    raise exception 'candidate_web_jobs published-read policy is missing';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from (
      values
        ('vw_candidate_search_clean'),
        ('vw_jobs_tier1_malaysia'),
        ('vw_market_signals'),
        ('vw_market_signals_active'),
        ('vw_market_signals_realtime'),
        ('vw_market_signals_recent'),
        ('vw_tier1_source_diagnostics'),
        ('vw_tier1_source_health'),
        ('vw_tier1_source_health_summary'),
        ('vw_tier1_source_health_v2'),
        ('hiring_leaderboard_malaysia'),
        ('jobs_latest'),
        ('jobs_latest_practical'),
        ('jobs_reporting'),
        ('recruiter_active_submissions'),
        ('terrer_hiring_now'),
        ('v_match_shortlist'),
        ('v_outreach_due'),
        ('vw_activity_log_enriched'),
        ('vw_candidate_pipeline_summary'),
        ('vw_candidate_search'),
        ('vw_company_pipeline_summary'),
        ('vw_followup_queue'),
        ('vw_job_shortlist'),
        ('vw_live_work_queue'),
        ('vw_outcomes_summary'),
        ('vw_pipeline_summary'),
        ('vw_recruiter_dashboard'),
        ('vw_submissions_enriched'),
        ('terrer_jobs_view')
    ) as required(relname)
    left join pg_class c
      on c.relname = required.relname
     and c.relkind = 'v'
    left join pg_namespace n
      on n.oid = c.relnamespace
    where c.oid is null
       or n.nspname <> 'public'
       or c.reloptions is null
       or array_to_string(c.reloptions, ',') not like '%security_invoker=true%'
  ) then
    raise exception 'one or more Advisor views are not security_invoker';
  end if;
end $$;

do $$
begin
  if not has_table_privilege('authenticated', 'public.vw_candidate_search_clean', 'SELECT')
     or not has_table_privilege('authenticated', 'public.vw_candidate_search', 'SELECT')
     or not has_table_privilege('authenticated', 'public.vw_submissions_enriched', 'SELECT')
     or not has_table_privilege('authenticated', 'public.jobs_latest_practical', 'SELECT') then
    raise exception 'authenticated select grants are missing on one or more Advisor views';
  end if;
end $$;

rollback;
```

### Expected pass/fail conditions

- Pass if all sensitive Advisor tables have RLS enabled, `anon` has no direct
  write access, candidate/public publication and ownership policies are present,
  and the finalized views are `security_invoker = true`.
- Fail if any broad anonymous SELECT/UPDATE/DELETE policy remains, if
  `candidate_web_jobs` is not readable by anon for published rows, or if any of
  the finalized views still lack `security_invoker = true`.

## 12. Rollback completeness

| Proposed production operation | Exact rollback |
| --- | --- |
| `candidate_web_jobs` create/repair | Drop candidate_web_jobs policies, disable RLS, revoke grants, and `drop table if exists public.candidate_web_jobs;` if the wrapper created it. |
| `candidates` RLS/policies | Drop the five policies, disable RLS, and restore the pre-wrapper grants. |
| `web_job_interest` policies | Drop the five policies, disable RLS, and restore the pre-wrapper grants. |
| `jobs` policies | Drop the three policies, disable RLS, and restore the pre-wrapper grants. |
| `employer_job_intake` / `employer_intake_actions` | Disable RLS, revoke service-role-only grants only if the wrapper added them, and restore the previous evidence-backed state. |
| `activity_log` policies | Drop the four staff policies, disable RLS, and restore the previous grant state. |
| Advisor/internal table RLS and policies | Drop the staff policies, disable RLS on all 13 tables, and restore the previous ACL state. |
| `profiles` ACL tightening | Reapply the broader ACLs only if the final approved wrapper grant set is reversed. |
| `public.is_current_user_admin()` EXECUTE tightening | Regrant to public/anon/authenticated/service_role/postgres as needed for the prior state. |
| View `security_invoker` flips | `alter view public.<view_name> set (security_invoker = false);` for each finalized view plus the prior grant state. |
| Validation assertions | No rollback needed; they are read-only. |

## 13. Final readiness assessment

**CONDITIONAL READY**

The exact SQL components are now sufficiently specified to draft an executable
production wrapper next, but the final draft still needs line-by-line assembly
review before it can be converted into a runnable migration.

Remaining approval items before executable SQL:

- confirm the final exact ACL posture for `public.profiles`
- confirm the final exact EXECUTE grant posture for `public.is_current_user_admin()`
- confirm the final view list for `security_invoker = true`
- confirm the exact rollback text to be embedded in the executable wrapper
