/*
  # BD Photo Intake: metadata fields + authenticated write policies

  Purpose:
  - Support manual-review-first photo intake imports into `public.bd_contacts`.
  - Store legacy/source metadata and the raw extracted payload for traceability.

  Notes:
  - Additive only: nullable columns and safe defaults.
  - Does NOT grant anon any new INSERT privileges.
  - Adds authenticated INSERT policy for bd_contacts and authenticated INSERT/UPDATE
    policies for companies so the internal app (Supabase Auth) can create records.
*/

alter table public.bd_contacts
  add column if not exists legacy_source_id text,
  add column if not exists legacy_source_system text,
  add column if not exists legacy_created_by text,
  add column if not exists legacy_date_added timestamptz,
  add column if not exists source_photo_url text,
  add column if not exists source_import_type text default 'photo_intake',
  add column if not exists extraction_status text,
  add column if not exists extraction_confidence numeric,
  add column if not exists raw_extracted_json jsonb;

alter table public.bd_contacts enable row level security;

drop policy if exists "Authenticated users can insert bd_contacts" on public.bd_contacts;
create policy "Authenticated users can insert bd_contacts"
  on public.bd_contacts
  for insert
  to authenticated
  with check (true);

-- Companies: allow authenticated users to create/update relationship stubs from the internal app.
alter table public.companies enable row level security;

drop policy if exists "Authenticated users can insert companies" on public.companies;
create policy "Authenticated users can insert companies"
  on public.companies
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update companies" on public.companies;
create policy "Authenticated users can update companies"
  on public.companies
  for update
  to authenticated
  using (true)
  with check (true);

