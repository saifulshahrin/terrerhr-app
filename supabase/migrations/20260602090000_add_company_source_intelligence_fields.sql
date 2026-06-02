/*
  # Company Source Intelligence foundation (V2A)

  Purpose:
  - Extend public.companies with lightweight source intelligence fields.
  - Support manual company intelligence review before future hiring checks.

  Notes:
  - Additive only.
  - Does not create source registry, hiring signal, opportunity, or client requirement tables.
  - Does not add scraper or enrichment automation behavior.
*/

alter table public.companies
  add column if not exists career_url text,
  add column if not exists ats_family text,
  add column if not exists source_confidence integer,
  add column if not exists source_status text,
  add column if not exists source_notes text,
  add column if not exists last_enriched_at timestamptz,
  add column if not exists last_checked_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_source_status_check'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_source_status_check
      check (
        source_status is null
        or source_status in ('missing', 'queued', 'partial', 'ready', 'blocked')
      );
  end if;
end $$;

