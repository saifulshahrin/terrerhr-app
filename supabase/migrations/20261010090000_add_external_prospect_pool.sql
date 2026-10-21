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


-- Paid sourcing/enrichment actions are explicit so Terrer can measure sourcing economics.
create table if not exists public.prospect_source_actions (
  action_id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.external_prospects(prospect_id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  action text not null check (action in ('export','email_reveal','phone_reveal','outreach','other')),
  credit_type text,
  credits_used integer not null default 0 check (credits_used >= 0),
  reason text,
  result text,
  source_platform text not null,
  performed_at timestamptz not null default now(),
  performed_by uuid references auth.users(id) on delete set null
);
alter table public.prospect_source_actions enable row level security;
create policy "prospect_source_actions_staff_read" on public.prospect_source_actions for select to authenticated
  using ((select private.is_current_user_active_staff()));
create policy "prospect_source_actions_staff_write" on public.prospect_source_actions for all to authenticated
  using ((select private.is_current_user_active_staff()))
  with check ((select private.is_current_user_active_staff()));

-- Promotion is explicit and idempotent: a prospect becomes a Candidate only after response/qualification.
alter table public.external_prospects add column if not exists promoted_candidate_id uuid references public.candidates(candidate_id) on delete set null;

create or replace function public.promote_external_prospect_to_candidate(p_prospect_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  p public.external_prospects%rowtype;
  v_candidate_id uuid;
  v_profile_id uuid;
begin
  select * into p from public.external_prospects where prospect_id = p_prospect_id for update;
  if not found then raise exception 'External prospect not found'; end if;
  if p.promoted_candidate_id is not null then return p.promoted_candidate_id; end if;
  if p.engagement_status <> 'responded' then
    raise exception 'Prospect must have responded before promotion to Terrer Candidate';
  end if;

  v_candidate_id := gen_random_uuid();
  v_profile_id := gen_random_uuid();

  insert into public.candidates (
    candidate_id, display_name, full_name, city, primary_role, "current_role",
    linkedin_url, email, phone, source_type, notes, candidate_status,
    key_skills, years_experience, created_at, updated_at
  ) values (
    v_candidate_id, p.full_name, p.full_name, p.location, p.current_title, p.current_title,
    p.linkedin_url, p.email, p.phone, p.source_platform, p.notes, 'active',
    p.skills, p.years_experience, now(), now()
  );

  insert into public.source_profiles (
    profile_id, candidate_id, source_name, source_profile_url, source_handle, scraped_at
  ) values (
    v_profile_id, v_candidate_id, p.source_platform, coalesce(p.source_profile_url,p.linkedin_url),
    null, now()
  );

  insert into public.candidate_scores (
    candidate_id, display_name, full_name, city, primary_role, capabilities, score, score_reason, scored_at
  ) values (
    v_candidate_id, p.full_name, p.full_name, p.location, p.current_title,
    array_to_string(p.skills, ', '), 0, 'Promoted from External Prospect Pool', now()
  );

  update public.external_prospects
  set promotion_status='candidate', engagement_status='promoted',
      promoted_candidate_id=v_candidate_id, updated_at=now()
  where prospect_id=p_prospect_id;

  return v_candidate_id;
end;
$$;
