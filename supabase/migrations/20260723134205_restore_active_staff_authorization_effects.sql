-- Forward repair for staging state where 20260723133303 is ledger-applied
-- but its helper/policy effects are absent. Do not modify migration history.

begin;

do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'profiles'
      and c.relkind = 'r' and c.relrowsecurity and not c.relforcerowsecurity
  ) then
    raise exception 'public.profiles must be an RLS-enabled, non-FORCE-RLS base table';
  end if;
  if to_regclass('public.applications') is null then
    raise exception 'public.applications must exist before active-staff authorization repair';
  end if;
end
$$;

create schema if not exists private authorization postgres;

alter schema private owner to postgres;

revoke all on schema private from public, anon, authenticated, service_role;

grant usage on schema private to authenticated;

create or replace function private.is_current_user_active_staff()
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog'
as $function$
  select auth.uid() is not null
    and exists (
      select 1
      from public.profiles as p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin'::text, 'recruiter'::text, 'bd'::text)
    );
$function$;

alter function private.is_current_user_active_staff() owner to postgres;

revoke all on function private.is_current_user_active_staff() from public, anon, authenticated, service_role;

grant execute on function private.is_current_user_active_staff() to authenticated;

drop policy if exists "applications_select_staff" on public.applications;

drop policy if exists "applications_insert_staff" on public.applications;

drop policy if exists "applications_update_staff" on public.applications;

create policy "applications_select_staff"
on public.applications for select to authenticated
using ((select private.is_current_user_active_staff()));

create policy "applications_insert_staff"
on public.applications for insert to authenticated
with check ((select private.is_current_user_active_staff()));

create policy "applications_update_staff"
on public.applications for update to authenticated
using ((select private.is_current_user_active_staff()))
with check ((select private.is_current_user_active_staff()));

do $$
declare
  helper_oid oid := to_regprocedure('private.is_current_user_active_staff()');
begin
  if helper_oid is null
     or not has_function_privilege('authenticated', helper_oid, 'execute')
     or has_function_privilege('anon', helper_oid, 'execute')
     or has_function_privilege('service_role', helper_oid, 'execute') then
    raise exception 'active-staff helper execution boundary is invalid';
  end if;
  if not has_schema_privilege('authenticated', 'private', 'USAGE')
     or has_schema_privilege('anon', 'private', 'USAGE')
     or has_schema_privilege('service_role', 'private', 'USAGE') then
    raise exception 'private schema usage boundary is invalid';
  end if;
  if (select count(*) from pg_policies where schemaname='public' and tablename='profiles') <> 0 then
    raise exception 'profiles policies must remain absent';
  end if;
  if (select count(*) from pg_policies where schemaname='public' and tablename='applications') <> 3 then
    raise exception 'Applications must have exactly three staff policies';
  end if;
end
$$;

commit;
