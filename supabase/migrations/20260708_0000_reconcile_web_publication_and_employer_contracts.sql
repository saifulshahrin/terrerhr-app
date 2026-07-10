-- Security hardening prerequisite, 2026-07.
-- Reconciles web-owned database contracts that the app security migrations harden.

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

create table if not exists public.employer_job_intake (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  contact_email text not null,
  contact_phone text,
  job_title text not null,
  location text,
  employment_type text,
  salary_min numeric,
  salary_max numeric,
  currency text default 'MYR',
  job_description text,
  required_skills text[] default '{}'::text[],
  nice_to_have_skills text[] default '{}'::text[],
  seniority text,
  source text default 'web_employer_intake',
  submission_fingerprint text,
  status text default 'new',
  created_at timestamptz default now(),
  company_industry text,
  company_size text,
  company_website text,
  salary_currency text default 'MYR',
  workplace_type text,
  hiring_urgency text,
  replacement_or_new_role text,
  number_of_openings integer,
  benefits text,
  notes text,
  updated_at timestamptz default now()
);

alter table public.employer_job_intake
  add column if not exists submission_fingerprint text,
  add column if not exists status text default 'new',
  add column if not exists updated_at timestamptz default now(),
  add column if not exists company_industry text,
  add column if not exists company_size text,
  add column if not exists company_website text,
  add column if not exists salary_currency text default 'MYR',
  add column if not exists workplace_type text,
  add column if not exists hiring_urgency text,
  add column if not exists replacement_or_new_role text,
  add column if not exists number_of_openings integer,
  add column if not exists benefits text,
  add column if not exists notes text;

create unique index if not exists idx_employer_job_intake_fingerprint
  on public.employer_job_intake (submission_fingerprint);

alter table public.employer_job_intake enable row level security;

create table if not exists public.employer_intake_actions (
  id uuid primary key default gen_random_uuid(),
  employer_job_intake_id uuid references public.employer_job_intake(id) on delete cascade,
  action_type text not null,
  employer_note text,
  status text default 'new',
  created_at timestamptz default now()
);

alter table public.employer_intake_actions
  add column if not exists employer_job_intake_id uuid,
  add column if not exists action_type text,
  add column if not exists employer_note text,
  add column if not exists status text default 'new',
  add column if not exists created_at timestamptz default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employer_intake_actions_employer_job_intake_id_fkey'
      and conrelid = 'public.employer_intake_actions'::regclass
  ) then
    alter table public.employer_intake_actions
      add constraint employer_intake_actions_employer_job_intake_id_fkey
      foreign key (employer_job_intake_id)
      references public.employer_job_intake(id)
      on delete cascade;
  end if;
end $$;

alter table public.employer_intake_actions enable row level security;
