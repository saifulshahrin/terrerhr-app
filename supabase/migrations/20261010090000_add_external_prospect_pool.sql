-- Candidate Engine: external prospects are sourced people who have not yet become Terrer Candidates.
-- Keep person-level facts separate from job-specific fit and recruiter judgement.

create table if not exists public.external_prospects (
  prospect_id uuid primary key default gen_random_uuid(),
  full_name text not null,
  linkedin_url text,
  source_platform text not null,
  source_profile_url text,
  current_title text,
  current_company text,
  location text,
  headline text,
  skills text[] not null default '{}',
  languages text[] not null default '{}',
  years_experience numeric,
  work_history jsonb,
  education jsonb,
  certifications jsonb,
  email text,
  phone text,
  contact_source text,
  first_discovered_at timestamptz not null default now(),
  last_verified_at timestamptz,
  first_source_job_id uuid references public.jobs(id) on delete set null,
  first_source_search_id text,
  engagement_status text not null default 'discovered' check (engagement_status in ('discovered','reviewed','contacted','responded','promoted')),
  recruiter_status text not null default 'unreviewed' check (recruiter_status in ('unreviewed','good','maybe','reject')),
  promotion_status text not null default 'prospect' check (promotion_status in ('prospect','candidate')),
  notes text,
  source_payload_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists external_prospects_linkedin_unique
  on public.external_prospects (lower(linkedin_url)) where linkedin_url is not null;
create unique index if not exists external_prospects_email_unique
  on public.external_prospects (lower(email)) where email is not null;
create index if not exists external_prospects_recruiter_status_idx on public.external_prospects (recruiter_status);
create index if not exists external_prospects_engagement_status_idx on public.external_prospects (engagement_status);

create table if not exists public.prospect_job_matches (
  match_id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.external_prospects(prospect_id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  source_search_id text,
  source_fit_score numeric,
  source_fit_reason text,
  terrer_fit_score numeric,
  recruiter_decision text not null default 'unreviewed' check (recruiter_decision in ('unreviewed','good','maybe','reject')),
  match_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prospect_id, job_id)
);

alter table public.external_prospects enable row level security;
alter table public.prospect_job_matches enable row level security;

create policy "external_prospects_staff_read" on public.external_prospects for select to authenticated
  using ((select private.is_current_user_active_staff()));
create policy "external_prospects_staff_write" on public.external_prospects for all to authenticated
  using ((select private.is_current_user_active_staff()))
  with check ((select private.is_current_user_active_staff()));

create policy "prospect_job_matches_staff_read" on public.prospect_job_matches for select to authenticated
  using ((select private.is_current_user_active_staff()));
create policy "prospect_job_matches_staff_write" on public.prospect_job_matches for all to authenticated
  using ((select private.is_current_user_active_staff()))
  with check ((select private.is_current_user_active_staff()));
