-- Security hardening sprint 2026-07
-- Patch remaining staging Advisor RLS-disabled public-table errors.
--
-- Scope:
-- - public.activity_log
-- - public.staging_bullhorn_companies
-- - public.staging_bullhorn_contacts
--
-- Evidence:
-- - docs/schema-evidence/live_schema_catalog_ddl.sql confirms these tables exist.
-- - activity_log feeds internal recruiter/pipeline views.
-- - Bullhorn staging tables are import/QA landing tables and include contact/company data.

begin;

alter table public.activity_log enable row level security;
alter table public.staging_bullhorn_companies enable row level security;
alter table public.staging_bullhorn_contacts enable row level security;

drop policy if exists "activity_log_insert_anon" on public.activity_log;
drop policy if exists "activity_log_select_anon" on public.activity_log;

revoke all on public.activity_log from public, anon, authenticated;
revoke all on public.staging_bullhorn_companies from public, anon, authenticated;
revoke all on public.staging_bullhorn_contacts from public, anon, authenticated;

grant select, insert, update, delete on public.activity_log to authenticated;
grant select, insert, update, delete on public.staging_bullhorn_companies to authenticated;
grant select, insert, update, delete on public.staging_bullhorn_contacts to authenticated;

grant all privileges on public.activity_log to service_role;
grant all privileges on public.staging_bullhorn_companies to service_role;
grant all privileges on public.staging_bullhorn_contacts to service_role;

drop policy if exists "activity_log_select_staff" on public.activity_log;
create policy "activity_log_select_staff"
  on public.activity_log
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

drop policy if exists "activity_log_insert_staff" on public.activity_log;
create policy "activity_log_insert_staff"
  on public.activity_log
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

drop policy if exists "activity_log_update_staff" on public.activity_log;
create policy "activity_log_update_staff"
  on public.activity_log
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

drop policy if exists "activity_log_delete_staff" on public.activity_log;
create policy "activity_log_delete_staff"
  on public.activity_log
  for delete
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

drop policy if exists "staging_bullhorn_companies_admin_manage" on public.staging_bullhorn_companies;
create policy "staging_bullhorn_companies_admin_manage"
  on public.staging_bullhorn_companies
  for all
  to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

drop policy if exists "staging_bullhorn_contacts_admin_manage" on public.staging_bullhorn_contacts;
create policy "staging_bullhorn_contacts_admin_manage"
  on public.staging_bullhorn_contacts
  for all
  to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

do $$
declare
  target_table text;
  target_tables text[] := array[
    'activity_log',
    'staging_bullhorn_companies',
    'staging_bullhorn_contacts'
  ];
begin
  foreach target_table in array target_tables loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target_table
        and c.relrowsecurity = true
    ) then
      raise exception 'RLS is not enabled on public.%', target_table;
    end if;

    if has_table_privilege('anon', format('public.%I', target_table), 'select')
       or has_table_privilege('anon', format('public.%I', target_table), 'insert')
       or has_table_privilege('anon', format('public.%I', target_table), 'update')
       or has_table_privilege('anon', format('public.%I', target_table), 'delete') then
      raise exception 'anon still has direct DML privilege on public.%', target_table;
    end if;

    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and cmd = 'SELECT'
        and ('anon' = any(roles) or 'public' = any(roles))
    ) then
      raise exception 'public/anon SELECT policy remains on public.%', target_table;
    end if;

    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and cmd = 'SELECT'
        and regexp_replace(coalesce(qual, ''), '\s+', '', 'g') in ('true', '(true)')
    ) then
      raise exception 'broad SELECT policy remains on public.%', target_table;
    end if;
  end loop;
end $$;

commit;
