-- Remove direct unauthenticated reachability from the Candidate Engine tables.
-- RLS and the existing authenticated active-staff policies remain unchanged.

begin;

revoke all privileges on table public.applications from anon, public;
revoke all privileges on table public.submissions from anon, public;

do $$
declare
  target_table text;
begin
  foreach target_table in array array['applications', 'submissions'] loop
    if not exists (
      select 1
      from pg_class as relation
      join pg_namespace as namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = target_table
        and relation.relkind = 'r'
        and relation.relrowsecurity
    ) then
      raise exception 'public.% must remain an RLS-enabled base table', target_table;
    end if;

    if exists (
      select 1
      from pg_class as relation
      join pg_namespace as namespace on namespace.oid = relation.relnamespace
      cross join lateral aclexplode(
        coalesce(relation.relacl, acldefault('r', relation.relowner))
      ) as privilege
      where namespace.nspname = 'public'
        and relation.relname = target_table
        and privilege.grantee in (0, to_regrole('anon')::oid)
    ) then
      raise exception 'anon/PUBLIC table privileges remain on public.%', target_table;
    end if;

    if not has_table_privilege('authenticated', format('public.%I', target_table), 'SELECT')
       or not has_table_privilege('authenticated', format('public.%I', target_table), 'INSERT')
       or not has_table_privilege('authenticated', format('public.%I', target_table), 'UPDATE') then
      raise exception 'authenticated staff table privileges were weakened on public.%', target_table;
    end if;

    if (
      select count(*)
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and policyname in (
          target_table || '_select_staff',
          target_table || '_insert_staff',
          target_table || '_update_staff'
        )
        and roles = array['authenticated']::name[]
        and coalesce(qual, with_check, '') ilike '%private.is_current_user_active_staff%'
    ) <> 3 then
      raise exception 'active-staff policy boundary changed on public.%', target_table;
    end if;

    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and cmd in ('DELETE', 'ALL')
    ) then
      raise exception 'DELETE/ALL policy remains on public.%', target_table;
    end if;
  end loop;
end
$$;

commit;
