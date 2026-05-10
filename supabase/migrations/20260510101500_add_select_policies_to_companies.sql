/*
  # Add SELECT policies to public.companies

  Context:
  - public.companies has RLS enabled remotely but no SELECT policies, causing the app to read 0 rows.
  - This migration is additive and read-only: it only grants SELECT to anon/authenticated.
*/

alter table public.companies enable row level security;

drop policy if exists "Anon users can read companies" on public.companies;
create policy "Anon users can read companies"
  on public.companies
  for select
  to anon
  using (true);

drop policy if exists "Authenticated users can read companies" on public.companies;
create policy "Authenticated users can read companies"
  on public.companies
  for select
  to authenticated
  using (true);

