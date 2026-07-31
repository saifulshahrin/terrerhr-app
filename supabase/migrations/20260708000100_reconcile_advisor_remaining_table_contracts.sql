-- Reconcile the remaining Supabase Advisor table contracts before the 20260709
-- security hardening migrations reference them.
--
-- Source of truth: docs/schema-evidence/live_schema_catalog_ddl.sql captured
-- from the live public schema. This migration is deliberately structural only:
-- it does not grant anon access, add permissive RLS policies, drop objects, or
-- redesign the frozen terrer_* tables.

create table if not exists public.skills (
  skill_id uuid not null,
  skill_name text,
  constraint skills_pkey primary key (skill_id)
);

create table if not exists public.source_profiles (
  profile_id uuid not null,
  candidate_id uuid references public.candidates(candidate_id),
  source_name text,
  source_profile_url text,
  source_handle text,
  source_user_id text,
  scraped_at timestamp without time zone,
  constraint source_profiles_pkey primary key (profile_id)
);

create table if not exists public.evidence_signals (
  evidence_id uuid not null,
  profile_id uuid references public.source_profiles(profile_id),
  signal_name text,
  signal_value text,
  signal_ts timestamp without time zone,
  constraint evidence_signals_pkey primary key (evidence_id)
);

create table if not exists public.candidate_capabilities (
  candidate_id uuid references public.candidates(candidate_id),
  capability text,
  created_at timestamp without time zone
);

create table if not exists public.candidate_scores (
  candidate_id uuid references public.candidates(candidate_id),
  display_name text,
  full_name text,
  city text,
  primary_role text,
  repos numeric,
  followers numeric,
  capabilities text,
  score numeric,
  score_reason text,
  scored_at timestamp without time zone
);

create table if not exists public.terrer_companies (
  id uuid default gen_random_uuid() not null,
  company_name text not null,
  company_slug text generated always as (
    lower(regexp_replace(coalesce(company_name, ''::text), '[^a-zA-Z0-9]+'::text, '-'::text, 'g'::text))
  ) stored,
  website_url text,
  linkedin_url text,
  industry text,
  company_size text,
  headquarters_city text,
  country text default 'Malaysia'::text,
  hiring_status text default 'active'::text,
  source_type text,
  source_url text,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint terrer_companies_pkey primary key (id)
);

create table if not exists public.terrer_company_contacts (
  id uuid default gen_random_uuid() not null,
  company_id uuid not null references public.terrer_companies(id) on delete cascade,
  full_name text,
  job_title text,
  email text,
  phone text,
  linkedin_url text,
  contact_type text,
  is_primary boolean default false not null,
  source_url text,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint terrer_company_contacts_pkey primary key (id)
);

create table if not exists public.terrer_jobs (
  id uuid default gen_random_uuid() not null,
  company_id uuid not null references public.terrer_companies(id) on delete restrict,
  external_job_id text,
  job_title text not null,
  normalized_job_title text,
  department text,
  employment_type text,
  seniority_level text,
  work_mode text,
  city text,
  state text,
  country text default 'Malaysia'::text,
  salary_min numeric(12,2),
  salary_max numeric(12,2),
  salary_currency text default 'MYR'::text,
  job_description_raw text,
  job_summary text,
  requirements_summary text,
  posted_date date,
  expiry_date date,
  status text default 'active'::text not null,
  source_type text,
  source_url text,
  first_seen_at timestamp with time zone,
  last_seen_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint terrer_jobs_pkey primary key (id)
);

create table if not exists public.terrer_candidates (
  id uuid default gen_random_uuid() not null,
  full_name text not null,
  current_title text,
  normalized_title text,
  city text,
  state text,
  country text default 'Malaysia'::text,
  email text,
  phone text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  years_experience numeric(4,1),
  seniority_level text,
  current_company text,
  notice_period text,
  preferred_work_mode text,
  candidate_status text default 'new'::text,
  source_origin text,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint terrer_candidates_pkey primary key (id)
);

create table if not exists public.terrer_skills (
  id uuid default gen_random_uuid() not null,
  skill_name text not null,
  skill_slug text generated always as (
    lower(regexp_replace(coalesce(skill_name, ''::text), '[^a-zA-Z0-9]+'::text, '-'::text, 'g'::text))
  ) stored,
  skill_category text,
  created_at timestamp with time zone default now() not null,
  constraint terrer_skills_pkey primary key (id)
);

create table if not exists public.terrer_pipeline (
  id uuid default gen_random_uuid() not null,
  job_id uuid not null references public.terrer_jobs(id) on delete cascade,
  candidate_id uuid not null references public.terrer_candidates(id) on delete cascade,
  company_contact_id uuid references public.terrer_company_contacts(id) on delete set null,
  match_score numeric(5,2),
  match_reason text,
  pipeline_stage text default 'matched'::text not null,
  outreach_status text default 'not_started'::text not null,
  outreach_date date,
  submission_date date,
  interview_stage text,
  employer_feedback text,
  candidate_interest_status text,
  placement_probability numeric(5,2),
  expected_fee numeric(12,2),
  actual_fee numeric(12,2),
  placed_date date,
  lost_reason text,
  owner text,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint terrer_pipeline_pkey primary key (id),
  constraint terrer_pipeline_job_id_candidate_id_key unique (job_id, candidate_id)
);

create table if not exists public.job_candidate_matches (
  match_id uuid default gen_random_uuid() not null,
  job_id uuid not null,
  candidate_id uuid not null,
  skill_match_score integer default 0,
  title_match_score integer default 0,
  seniority_match_score integer default 0,
  location_match_score integer default 0,
  manual_adjustment integer default 0,
  final_score integer generated always as (
    skill_match_score + title_match_score + seniority_match_score + location_match_score + manual_adjustment
  ) stored,
  match_reason text,
  match_status text default 'suggested'::text,
  reviewed_by text,
  reviewed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone default now(),
  constraint job_candidate_matches_pkey primary key (match_id),
  constraint job_candidate_matches_job_id_candidate_id_key unique (job_id, candidate_id)
);

create table if not exists public.outreach_log (
  outreach_id uuid default gen_random_uuid() not null,
  outreach_date timestamp with time zone default now(),
  job_id uuid,
  candidate_id uuid,
  company_id uuid,
  outreach_side text,
  contact_person text,
  channel text,
  message_type text,
  response_status text default 'no_reply'::text,
  next_action_date date,
  owner text,
  notes text,
  created_at timestamp with time zone default now(),
  constraint outreach_log_pkey primary key (outreach_id)
);

alter table public.skills add column if not exists skill_id uuid;
alter table public.skills add column if not exists skill_name text;

alter table public.source_profiles add column if not exists profile_id uuid;
alter table public.source_profiles add column if not exists candidate_id uuid;
alter table public.source_profiles add column if not exists source_name text;
alter table public.source_profiles add column if not exists source_profile_url text;
alter table public.source_profiles add column if not exists source_handle text;
alter table public.source_profiles add column if not exists source_user_id text;
alter table public.source_profiles add column if not exists scraped_at timestamp without time zone;

alter table public.evidence_signals add column if not exists evidence_id uuid;
alter table public.evidence_signals add column if not exists profile_id uuid;
alter table public.evidence_signals add column if not exists signal_name text;
alter table public.evidence_signals add column if not exists signal_value text;
alter table public.evidence_signals add column if not exists signal_ts timestamp without time zone;

alter table public.candidate_capabilities add column if not exists candidate_id uuid;
alter table public.candidate_capabilities add column if not exists capability text;
alter table public.candidate_capabilities add column if not exists created_at timestamp without time zone;

alter table public.candidate_scores add column if not exists candidate_id uuid;
alter table public.candidate_scores add column if not exists display_name text;
alter table public.candidate_scores add column if not exists full_name text;
alter table public.candidate_scores add column if not exists city text;
alter table public.candidate_scores add column if not exists primary_role text;
alter table public.candidate_scores add column if not exists repos numeric;
alter table public.candidate_scores add column if not exists followers numeric;
alter table public.candidate_scores add column if not exists capabilities text;
alter table public.candidate_scores add column if not exists score numeric;
alter table public.candidate_scores add column if not exists score_reason text;
alter table public.candidate_scores add column if not exists scored_at timestamp without time zone;

alter table public.terrer_companies add column if not exists id uuid;
alter table public.terrer_companies add column if not exists company_name text;
alter table public.terrer_companies add column if not exists company_slug text generated always as (
  lower(regexp_replace(coalesce(company_name, ''::text), '[^a-zA-Z0-9]+'::text, '-'::text, 'g'::text))
) stored;
alter table public.terrer_companies add column if not exists website_url text;
alter table public.terrer_companies add column if not exists linkedin_url text;
alter table public.terrer_companies add column if not exists industry text;
alter table public.terrer_companies add column if not exists company_size text;
alter table public.terrer_companies add column if not exists headquarters_city text;
alter table public.terrer_companies add column if not exists country text default 'Malaysia'::text;
alter table public.terrer_companies add column if not exists hiring_status text default 'active'::text;
alter table public.terrer_companies add column if not exists source_type text;
alter table public.terrer_companies add column if not exists source_url text;
alter table public.terrer_companies add column if not exists notes text;
alter table public.terrer_companies add column if not exists created_at timestamp with time zone default now();
alter table public.terrer_companies add column if not exists updated_at timestamp with time zone default now();

alter table public.terrer_company_contacts add column if not exists id uuid;
alter table public.terrer_company_contacts add column if not exists company_id uuid;
alter table public.terrer_company_contacts add column if not exists full_name text;
alter table public.terrer_company_contacts add column if not exists job_title text;
alter table public.terrer_company_contacts add column if not exists email text;
alter table public.terrer_company_contacts add column if not exists phone text;
alter table public.terrer_company_contacts add column if not exists linkedin_url text;
alter table public.terrer_company_contacts add column if not exists contact_type text;
alter table public.terrer_company_contacts add column if not exists is_primary boolean default false;
alter table public.terrer_company_contacts add column if not exists source_url text;
alter table public.terrer_company_contacts add column if not exists notes text;
alter table public.terrer_company_contacts add column if not exists created_at timestamp with time zone default now();
alter table public.terrer_company_contacts add column if not exists updated_at timestamp with time zone default now();

alter table public.terrer_jobs add column if not exists id uuid;
alter table public.terrer_jobs add column if not exists company_id uuid;
alter table public.terrer_jobs add column if not exists external_job_id text;
alter table public.terrer_jobs add column if not exists job_title text;
alter table public.terrer_jobs add column if not exists normalized_job_title text;
alter table public.terrer_jobs add column if not exists department text;
alter table public.terrer_jobs add column if not exists employment_type text;
alter table public.terrer_jobs add column if not exists seniority_level text;
alter table public.terrer_jobs add column if not exists work_mode text;
alter table public.terrer_jobs add column if not exists city text;
alter table public.terrer_jobs add column if not exists state text;
alter table public.terrer_jobs add column if not exists country text default 'Malaysia'::text;
alter table public.terrer_jobs add column if not exists salary_min numeric(12,2);
alter table public.terrer_jobs add column if not exists salary_max numeric(12,2);
alter table public.terrer_jobs add column if not exists salary_currency text default 'MYR'::text;
alter table public.terrer_jobs add column if not exists job_description_raw text;
alter table public.terrer_jobs add column if not exists job_summary text;
alter table public.terrer_jobs add column if not exists requirements_summary text;
alter table public.terrer_jobs add column if not exists posted_date date;
alter table public.terrer_jobs add column if not exists expiry_date date;
alter table public.terrer_jobs add column if not exists status text default 'active'::text;
alter table public.terrer_jobs add column if not exists source_type text;
alter table public.terrer_jobs add column if not exists source_url text;
alter table public.terrer_jobs add column if not exists first_seen_at timestamp with time zone;
alter table public.terrer_jobs add column if not exists last_seen_at timestamp with time zone;
alter table public.terrer_jobs add column if not exists created_at timestamp with time zone default now();
alter table public.terrer_jobs add column if not exists updated_at timestamp with time zone default now();

alter table public.terrer_candidates add column if not exists id uuid;
alter table public.terrer_candidates add column if not exists full_name text;
alter table public.terrer_candidates add column if not exists current_title text;
alter table public.terrer_candidates add column if not exists normalized_title text;
alter table public.terrer_candidates add column if not exists city text;
alter table public.terrer_candidates add column if not exists state text;
alter table public.terrer_candidates add column if not exists country text default 'Malaysia'::text;
alter table public.terrer_candidates add column if not exists email text;
alter table public.terrer_candidates add column if not exists phone text;
alter table public.terrer_candidates add column if not exists linkedin_url text;
alter table public.terrer_candidates add column if not exists github_url text;
alter table public.terrer_candidates add column if not exists portfolio_url text;
alter table public.terrer_candidates add column if not exists years_experience numeric(4,1);
alter table public.terrer_candidates add column if not exists seniority_level text;
alter table public.terrer_candidates add column if not exists current_company text;
alter table public.terrer_candidates add column if not exists notice_period text;
alter table public.terrer_candidates add column if not exists preferred_work_mode text;
alter table public.terrer_candidates add column if not exists candidate_status text default 'new'::text;
alter table public.terrer_candidates add column if not exists source_origin text;
alter table public.terrer_candidates add column if not exists notes text;
alter table public.terrer_candidates add column if not exists created_at timestamp with time zone default now();
alter table public.terrer_candidates add column if not exists updated_at timestamp with time zone default now();

alter table public.terrer_skills add column if not exists id uuid;
alter table public.terrer_skills add column if not exists skill_name text;
alter table public.terrer_skills add column if not exists skill_slug text generated always as (
  lower(regexp_replace(coalesce(skill_name, ''::text), '[^a-zA-Z0-9]+'::text, '-'::text, 'g'::text))
) stored;
alter table public.terrer_skills add column if not exists skill_category text;
alter table public.terrer_skills add column if not exists created_at timestamp with time zone default now();

alter table public.terrer_pipeline add column if not exists id uuid;
alter table public.terrer_pipeline add column if not exists job_id uuid;
alter table public.terrer_pipeline add column if not exists candidate_id uuid;
alter table public.terrer_pipeline add column if not exists company_contact_id uuid;
alter table public.terrer_pipeline add column if not exists match_score numeric(5,2);
alter table public.terrer_pipeline add column if not exists match_reason text;
alter table public.terrer_pipeline add column if not exists pipeline_stage text default 'matched'::text;
alter table public.terrer_pipeline add column if not exists outreach_status text default 'not_started'::text;
alter table public.terrer_pipeline add column if not exists outreach_date date;
alter table public.terrer_pipeline add column if not exists submission_date date;
alter table public.terrer_pipeline add column if not exists interview_stage text;
alter table public.terrer_pipeline add column if not exists employer_feedback text;
alter table public.terrer_pipeline add column if not exists candidate_interest_status text;
alter table public.terrer_pipeline add column if not exists placement_probability numeric(5,2);
alter table public.terrer_pipeline add column if not exists expected_fee numeric(12,2);
alter table public.terrer_pipeline add column if not exists actual_fee numeric(12,2);
alter table public.terrer_pipeline add column if not exists placed_date date;
alter table public.terrer_pipeline add column if not exists lost_reason text;
alter table public.terrer_pipeline add column if not exists owner text;
alter table public.terrer_pipeline add column if not exists notes text;
alter table public.terrer_pipeline add column if not exists created_at timestamp with time zone default now();
alter table public.terrer_pipeline add column if not exists updated_at timestamp with time zone default now();

alter table public.job_candidate_matches add column if not exists match_id uuid;
alter table public.job_candidate_matches add column if not exists job_id uuid;
alter table public.job_candidate_matches add column if not exists candidate_id uuid;
alter table public.job_candidate_matches add column if not exists skill_match_score integer default 0;
alter table public.job_candidate_matches add column if not exists title_match_score integer default 0;
alter table public.job_candidate_matches add column if not exists seniority_match_score integer default 0;
alter table public.job_candidate_matches add column if not exists location_match_score integer default 0;
alter table public.job_candidate_matches add column if not exists manual_adjustment integer default 0;
alter table public.job_candidate_matches add column if not exists final_score integer generated always as (
  skill_match_score + title_match_score + seniority_match_score + location_match_score + manual_adjustment
) stored;
alter table public.job_candidate_matches add column if not exists match_reason text;
alter table public.job_candidate_matches add column if not exists match_status text default 'suggested'::text;
alter table public.job_candidate_matches add column if not exists reviewed_by text;
alter table public.job_candidate_matches add column if not exists reviewed_at timestamp with time zone;
alter table public.job_candidate_matches add column if not exists notes text;
alter table public.job_candidate_matches add column if not exists created_at timestamp with time zone default now();

alter table public.outreach_log add column if not exists outreach_id uuid;
alter table public.outreach_log add column if not exists outreach_date timestamp with time zone default now();
alter table public.outreach_log add column if not exists job_id uuid;
alter table public.outreach_log add column if not exists candidate_id uuid;
alter table public.outreach_log add column if not exists company_id uuid;
alter table public.outreach_log add column if not exists outreach_side text;
alter table public.outreach_log add column if not exists contact_person text;
alter table public.outreach_log add column if not exists channel text;
alter table public.outreach_log add column if not exists message_type text;
alter table public.outreach_log add column if not exists response_status text default 'no_reply'::text;
alter table public.outreach_log add column if not exists next_action_date date;
alter table public.outreach_log add column if not exists owner text;
alter table public.outreach_log add column if not exists notes text;
alter table public.outreach_log add column if not exists created_at timestamp with time zone default now();

create index if not exists idx_matches_candidate on public.job_candidate_matches using btree (candidate_id);
create index if not exists idx_matches_job on public.job_candidate_matches using btree (job_id);
create index if not exists idx_matches_score on public.job_candidate_matches using btree (final_score desc);
create index if not exists idx_outreach_candidate on public.outreach_log using btree (candidate_id);
create index if not exists idx_outreach_next_action on public.outreach_log using btree (next_action_date);
create index if not exists idx_terrer_candidates_email on public.terrer_candidates using btree (email);
create index if not exists idx_terrer_candidates_name on public.terrer_candidates using btree (full_name);
create index if not exists idx_terrer_companies_name on public.terrer_companies using btree (company_name);
create unique index if not exists uq_terrer_companies_name_website on public.terrer_companies using btree (company_name, website_url);
create index if not exists idx_terrer_company_contacts_company_id on public.terrer_company_contacts using btree (company_id);
create index if not exists idx_terrer_jobs_company_id on public.terrer_jobs using btree (company_id);
create index if not exists idx_terrer_jobs_status on public.terrer_jobs using btree (status);
create index if not exists idx_terrer_jobs_title on public.terrer_jobs using btree (job_title);
create unique index if not exists uq_terrer_jobs_source_url on public.terrer_jobs using btree (source_url) where source_url is not null;
create index if not exists idx_terrer_pipeline_candidate_id on public.terrer_pipeline using btree (candidate_id);
create index if not exists idx_terrer_pipeline_job_id on public.terrer_pipeline using btree (job_id);
create index if not exists idx_terrer_pipeline_stage on public.terrer_pipeline using btree (pipeline_stage);
create unique index if not exists uq_terrer_skills_name on public.terrer_skills using btree (skill_name);
