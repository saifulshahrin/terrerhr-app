/*
  # Create BD working notes table

  Purpose:
  - Store user-facing BD working notes separately from legacy/import notes.
  - Keep ownership fields nullable for current app compatibility.
  - Prepare for future multi-BD ownership and visibility rules.

  TODO:
  - Add proper owner/visibility rules when BD account ownership is implemented.
  - Connect created_by to authenticated profile/user everywhere notes are created.
  - Restrict notes by assigned account/client when the BD ownership model exists.
*/

create table if not exists public.bd_notes (
  id uuid primary key default gen_random_uuid(),
  company_id bigint not null references public.companies(id) on delete cascade,
  contact_id uuid null references public.bd_contacts(id) on delete set null,
  note_body text not null,
  note_type text not null default 'general',
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bd_notes_company_id_created_at_idx
  on public.bd_notes using btree (company_id, created_at desc);

create index if not exists bd_notes_contact_id_idx
  on public.bd_notes using btree (contact_id);

create index if not exists bd_notes_created_by_idx
  on public.bd_notes using btree (created_by);

alter table public.bd_notes enable row level security;

drop policy if exists "Authenticated users can read bd_notes" on public.bd_notes;
create policy "Authenticated users can read bd_notes"
  on public.bd_notes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'recruiter', 'bd')
    )
  );

drop policy if exists "Authenticated users can insert bd_notes" on public.bd_notes;
create policy "Authenticated users can insert bd_notes"
  on public.bd_notes
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'recruiter', 'bd')
    )
  );

drop policy if exists "Authenticated users can update own bd_notes" on public.bd_notes;
create policy "Authenticated users can update own bd_notes"
  on public.bd_notes
  for update
  to authenticated
  using (
    created_by = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'recruiter', 'bd')
    )
  )
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'recruiter', 'bd')
    )
  );
