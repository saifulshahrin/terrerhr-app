-- V0.6: Recruiter confidence + sourcing signal fields
-- Additive, nullable, safe for existing rows.

alter table public.autonomous_recruiter_runs
  add column if not exists recruiter_confidence_level text,
  add column if not exists recruiter_confidence_score integer,
  add column if not exists sourcing_signal_summary text,
  add column if not exists sourcing_signal_flags jsonb,
  add column if not exists sourcing_risk_flags jsonb;

