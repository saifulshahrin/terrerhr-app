-- V0.7A: iteration-aware autonomous recruiter runs
-- Adds nullable iteration session fields without modifying existing data.

alter table public.autonomous_recruiter_runs
  add column if not exists iteration_mode boolean default false;

alter table public.autonomous_recruiter_runs
  add column if not exists iteration_count integer;

alter table public.autonomous_recruiter_runs
  add column if not exists best_iteration integer;

alter table public.autonomous_recruiter_runs
  add column if not exists stopping_reason text;

alter table public.autonomous_recruiter_runs
  add column if not exists iteration_summary jsonb;

