/*
  # Extend public.bd_contacts with BD execution fields (V1)

  Adds:
  - next_action (text)
  - next_action_date (date)
  - last_contacted_at (timestamptz)

  Also adds minimal UPDATE policies so the internal app (anon key) can write
  workflow fields. This is an internal ops tool; tighten later with auth.
*/

alter table public.bd_contacts
  add column if not exists next_action text,
  add column if not exists next_action_date date,
  add column if not exists last_contacted_at timestamptz;

-- Ensure RLS remains enabled.
alter table public.bd_contacts enable row level security;

-- Allow internal app to update contact workflow fields.
drop policy if exists "Anon users can update bd_contacts" on public.bd_contacts;
create policy "Anon users can update bd_contacts"
  on public.bd_contacts
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "Authenticated users can update bd_contacts" on public.bd_contacts;
create policy "Authenticated users can update bd_contacts"
  on public.bd_contacts
  for update
  to authenticated
  using (true)
  with check (true);

