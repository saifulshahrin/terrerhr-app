-- Local reconstruction prerequisite for the pipeline views created in
-- 20260416100404_add_ready_for_bd_review_stage.sql.
--
-- Source of truth: docs/schema-evidence/live_schema_catalog_ddl.sql. This
-- backfilled compatibility migration exists so local reset can compile the
-- historical views before later 2026-07 security hardening runs.

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

alter table public.jobs add column if not exists company_id bigint;

alter table public.submissions
  add column if not exists company_id bigint,
  add column if not exists match_score numeric,
  add column if not exists shortlist_rank integer,
  add column if not exists submitted_to_client_at timestamp with time zone,
  add column if not exists owner_name text,
  add column if not exists decision_reason text,
  add column if not exists outcome text,
  add column if not exists notes text,
  add column if not exists updated_at timestamp with time zone default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'submissions'
      and column_name = 'job_id'
      and data_type <> 'uuid'
  ) then
    alter table public.submissions
      alter column job_id drop default,
      alter column job_id type uuid using nullif(job_id, '')::uuid;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'submissions'
      and column_name = 'candidate_id'
      and data_type <> 'uuid'
  ) then
    alter table public.submissions
      alter column candidate_id type uuid using candidate_id::uuid;
  end if;
end $$;

create table if not exists public.activity_log (
  id uuid default gen_random_uuid() not null,
  submission_id uuid,
  entity_type text,
  entity_id text,
  activity_type text,
  activity_channel text,
  activity_direction text,
  subject_line text,
  message_summary text,
  occurred_at timestamp with time zone default now(),
  next_action_at timestamp with time zone,
  created_by text,
  created_at timestamp with time zone default now(),
  constraint activity_log_pkey primary key (id)
);
