-- Candidate Engine repair: allow only active Terrer staff to operate applications.
-- Grants are intentionally unchanged. Existing service-role behavior is unchanged.

begin;

drop policy if exists "applications_select_staff" on public.applications;

drop policy if exists "applications_insert_staff" on public.applications;

drop policy if exists "applications_update_staff" on public.applications;

create policy "applications_select_staff"
on public.applications
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

create policy "applications_insert_staff"
on public.applications
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

create policy "applications_update_staff"
on public.applications
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter', 'bd')
  )
);

do $$
declare
  policy_count integer;
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'applications'
      and c.relrowsecurity
  ) then
    raise exception 'applications must have row level security enabled';
  end if;

  select count(*)
  into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'applications';

  if policy_count <> 3 then
    raise exception 'applications must have exactly three RLS policies; found %', policy_count;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'applications'
      and policyname = 'applications_select_staff'
      and cmd = 'SELECT'
      and roles = array['authenticated']::name[]
      and qual ilike '%profiles%'
      and qual ilike '%auth.uid%'
      and qual ilike '%is_active%'
      and qual ilike '%admin%'
      and qual ilike '%recruiter%'
      and qual ilike '%bd%'
  ) then
    raise exception 'applications SELECT policy is missing or not restricted to active staff';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'applications'
      and policyname = 'applications_insert_staff'
      and cmd = 'INSERT'
      and roles = array['authenticated']::name[]
      and with_check ilike '%profiles%'
      and with_check ilike '%auth.uid%'
      and with_check ilike '%is_active%'
      and with_check ilike '%admin%'
      and with_check ilike '%recruiter%'
      and with_check ilike '%bd%'
  ) then
    raise exception 'applications INSERT policy is missing or not restricted to active staff';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'applications'
      and policyname = 'applications_update_staff'
      and cmd = 'UPDATE'
      and roles = array['authenticated']::name[]
      and qual ilike '%profiles%'
      and qual ilike '%auth.uid%'
      and qual ilike '%is_active%'
      and with_check ilike '%profiles%'
      and with_check ilike '%auth.uid%'
      and with_check ilike '%is_active%'
      and qual ilike '%admin%'
      and qual ilike '%recruiter%'
      and qual ilike '%bd%'
      and with_check ilike '%admin%'
      and with_check ilike '%recruiter%'
      and with_check ilike '%bd%'
  ) then
    raise exception 'applications UPDATE policy is missing or not restricted to active staff';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'applications'
      and (
        cmd in ('ALL', 'DELETE')
        or roles && array['anon', 'public']::name[]
        or policyname ilike '%candidate%'
        or policyname ilike '%employer%'
        or coalesce(qual, '') in ('true', '(true)')
        or coalesce(with_check, '') in ('true', '(true)')
      )
  ) then
    raise exception 'applications contains a broad, delete, candidate, employer, anon, or public policy';
  end if;
end
$$;

commit;
