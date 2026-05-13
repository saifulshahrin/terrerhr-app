-- Terrer Autonomous Recruiter demo runs
-- Stores app-demo summaries produced by the V0 agent for app-layer display.

create table if not exists public.autonomous_recruiter_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  run_timestamp timestamptz,
  mode text,

  job_title text,
  skills text,
  location text,
  seniority text,

  total_candidates integer,
  strategy_count integer,
  best_strategy text,
  weakest_strategy text,
  query_quality_label text,
  next_run_priority text,
  recommended_next_search_focus text,
  recommended_query_adjustments jsonb,

  winning_variant text,
  reason_winning_variant text,
  recommended_next_action text,
  run_status text,

  app_demo_summary jsonb,

  candidates_path text,
  recruiter_report_path text,
  agent_report_path text,
  strategy_refinement_path text,
  batch_summary_json_path text,
  batch_summary_md_path text
);

-- Indexes for app filtering/sorting
create index if not exists autonomous_recruiter_runs_created_at_idx
  on public.autonomous_recruiter_runs (created_at desc);

create index if not exists autonomous_recruiter_runs_job_title_idx
  on public.autonomous_recruiter_runs (job_title);

create index if not exists autonomous_recruiter_runs_mode_idx
  on public.autonomous_recruiter_runs (mode);

create index if not exists autonomous_recruiter_runs_run_status_idx
  on public.autonomous_recruiter_runs (run_status);

alter table public.autonomous_recruiter_runs enable row level security;

-- Authenticated users can read run history (internal app usage).
drop policy if exists "autonomous_recruiter_runs_select_authenticated" on public.autonomous_recruiter_runs;
create policy "autonomous_recruiter_runs_select_authenticated"
  on public.autonomous_recruiter_runs
  for select
  to authenticated
  using (true);

-- Authenticated users can insert new run records (will be tightened later).
drop policy if exists "autonomous_recruiter_runs_insert_authenticated" on public.autonomous_recruiter_runs;
create policy "autonomous_recruiter_runs_insert_authenticated"
  on public.autonomous_recruiter_runs
  for insert
  to authenticated
  with check (true);

