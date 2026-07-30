-- Candidate Engine repair: evaluate active staff membership without exposing profiles.

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
end
$$;

create schema if not exists private authorization postgres;

alter schema private owner to postgres;

revoke all on schema private from public, anon, authenticated, service_role;

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

commit;
