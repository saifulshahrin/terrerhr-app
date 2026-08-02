alter table public.jobs
  add column if not exists compensation_text text;

comment on column public.jobs.compensation_text is
  'Authoritative employer- or Terrer-supplied candidate-facing compensation text. Nullable when compensation is not disclosed. Must not contain generated or inferred market estimates.';
