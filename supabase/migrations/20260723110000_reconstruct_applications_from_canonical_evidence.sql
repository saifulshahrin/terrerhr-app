-- Candidate Engine repair: reconstruct the canonical applications base table.
-- Staff access policies remain in 20260723110554_candidate_engine_applications_staff_access.sql.

begin;

do $$
declare
  applications_kind "char";
begin
  select c.relkind
  into applications_kind
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'applications';

  if applications_kind is not null then
    raise exception 'cannot reconstruct public.applications: relation already exists with relkind %', applications_kind;
  end if;

  if not exists (
    select 1
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'jobs'
      and a.attname = 'id' and not a.attisdropped
      and a.atttypid = 'uuid'::regtype
  ) then
    raise exception 'cannot reconstruct public.applications: public.jobs(id uuid) is required';
  end if;

  if not exists (
    select 1
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'candidates'
      and a.attname = 'candidate_id' and not a.attisdropped
      and a.atttypid = 'uuid'::regtype
  ) then
    raise exception 'cannot reconstruct public.applications: public.candidates(candidate_id uuid) is required';
  end if;
end
$$;

create table public.applications (
  id uuid default gen_random_uuid() not null,
  job_id uuid not null,
  candidate_id uuid not null,
  source text,
  source_details text,
  application_status text default 'new'::text,
  raw_application_data jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint applications_pkey primary key (id),
  constraint applications_job_id_candidate_id_key unique (job_id, candidate_id),
  constraint applications_job_id_fkey foreign key (job_id)
    references public.jobs(id) on delete cascade,
  constraint applications_candidate_id_fkey foreign key (candidate_id)
    references public.candidates(candidate_id) on delete cascade
);

alter table public.applications owner to postgres;

alter table public.applications enable row level security;

grant delete, insert, maintain, references, select, trigger, truncate, update
  on table public.applications to anon;

grant delete, insert, maintain, references, select, trigger, truncate, update
  on table public.applications to authenticated;

grant delete, insert, maintain, references, select, trigger, truncate, update
  on table public.applications to postgres;

grant delete, insert, maintain, references, select, trigger, truncate, update
  on table public.applications to service_role;

do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'applications'
      and c.relkind = 'r' and c.relrowsecurity and not c.relforcerowsecurity
  ) then
    raise exception 'public.applications was not reconstructed as an RLS-enabled base table';
  end if;

  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'applications') <> 0 then
    raise exception 'public.applications base reconstruction must remain fail-closed with zero policies';
  end if;
end
$$;

commit;
