-- TEMPORARY (demo / role-preview mode):
-- Allow anon users to SELECT autonomous recruiter runs so the internal app can
-- display demo data before full authentication is enabled.
-- NOTE: This does NOT grant anon any INSERT/UPDATE/DELETE permissions.

alter table public.autonomous_recruiter_runs enable row level security;

drop policy if exists "autonomous_recruiter_runs_select_anon_demo" on public.autonomous_recruiter_runs;
create policy "autonomous_recruiter_runs_select_anon_demo"
  on public.autonomous_recruiter_runs
  for select
  to anon
  using (true);

