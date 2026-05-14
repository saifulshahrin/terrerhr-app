-- Terrer Autonomous Recruiter V0.8
-- Persistent recruiter memory across sourcing runs (strategy + signal learning)

create table if not exists public.autonomous_recruiter_memory (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Core
  memory_type text,
  role_family text,
  job_title text,
  skills text,
  location text,

  -- Strategy learning
  successful_strategy text,
  failed_strategy text,
  recommended_query_pattern text,
  recommended_next_move text,

  -- Signal learning
  recruiter_confidence_level text,
  recruiter_confidence_score integer,
  sourcing_signal_flags jsonb,
  sourcing_risk_flags jsonb,

  -- Statistics
  total_candidates integer,
  successful_run boolean,
  source_run_id uuid,

  -- Metadata
  notes text,
  memory_payload jsonb
);

create index if not exists autonomous_recruiter_memory_created_at_idx
  on public.autonomous_recruiter_memory (created_at desc);

create index if not exists autonomous_recruiter_memory_role_family_idx
  on public.autonomous_recruiter_memory (role_family);

create index if not exists autonomous_recruiter_memory_confidence_level_idx
  on public.autonomous_recruiter_memory (recruiter_confidence_level);

alter table public.autonomous_recruiter_memory enable row level security;

-- Authenticated users can read recruiter memory (internal app usage).
drop policy if exists "autonomous_recruiter_memory_select_authenticated" on public.autonomous_recruiter_memory;
create policy "autonomous_recruiter_memory_select_authenticated"
  on public.autonomous_recruiter_memory
  for select
  to authenticated
  using (true);

-- Authenticated users can insert memory entries (will be tightened later).
drop policy if exists "autonomous_recruiter_memory_insert_authenticated" on public.autonomous_recruiter_memory;
create policy "autonomous_recruiter_memory_insert_authenticated"
  on public.autonomous_recruiter_memory
  for insert
  to authenticated
  with check (true);

