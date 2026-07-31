-- Security hardening prerequisite, 2026-07.
-- Reconciles app migration history with live candidate marketplace contracts.

create table if not exists public.candidates (
  candidate_id uuid primary key default gen_random_uuid(),
  display_name text,
  full_name text,
  country text,
  city text,
  primary_role text,
  dedup_hash text,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now(),
  email text,
  phone text,
  linkedin_url text,
  github_url text,
  score_total numeric,
  tier_label text,
  contactability_status text,
  candidate_status text default 'active',
  source_type text,
  notes text,
  resume_url text
);

alter table public.candidates
  add column if not exists email text,
  add column if not exists candidate_status text default 'active';

create table if not exists public.web_job_interest (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(candidate_id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  job_title text,
  company_name text,
  interest_source text default 'matched_jobs_modal',
  interest_status text default 'interested',
  created_at timestamp without time zone default now(),
  status text default 'new',
  next_action text,
  last_updated_at timestamp without time zone default now()
);

alter table public.web_job_interest
  add column if not exists candidate_id uuid,
  add column if not exists job_id uuid,
  add column if not exists interest_source text default 'matched_jobs_modal',
  add column if not exists interest_status text default 'interested',
  add column if not exists status text default 'new',
  add column if not exists next_action text,
  add column if not exists last_updated_at timestamp without time zone default now();
