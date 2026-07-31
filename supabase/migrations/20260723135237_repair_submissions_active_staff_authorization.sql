-- Candidate Engine repair: authorize submissions through the private staff helper.
-- Remove legacy public/unconditional reads and DELETE access; preserve the table contract.

begin;

do $$
begin
  if to_regclass('public.submissions') is null then
    raise exception 'public.submissions must exist';
  end if;
  if to_regprocedure('private.is_current_user_active_staff()') is null then
    raise exception 'private.is_current_user_active_staff() must exist';
  end if;
end
$$;

drop policy if exists "Anon users can read submissions" on public.submissions;

drop policy if exists "Authenticated users can read submissions" on public.submissions;

drop policy if exists "submissions_delete_staff" on public.submissions;

drop policy if exists "submissions_select_staff" on public.submissions;

drop policy if exists "submissions_insert_staff" on public.submissions;

drop policy if exists "submissions_update_staff" on public.submissions;

create policy "submissions_select_staff"
on public.submissions for select to authenticated
using ((select private.is_current_user_active_staff()));

create policy "submissions_insert_staff"
on public.submissions for insert to authenticated
with check ((select private.is_current_user_active_staff()));

create policy "submissions_update_staff"
on public.submissions for update to authenticated
using ((select private.is_current_user_active_staff()))
with check ((select private.is_current_user_active_staff()));

do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='submissions'
      and c.relkind='r' and c.relrowsecurity
  ) then raise exception 'submissions RLS is not enabled'; end if;

  if (select count(*) from pg_policies where schemaname='public' and tablename='submissions') <> 3 then
    raise exception 'submissions must have exactly three staff policies';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='submissions'
      and (coalesce(qual,'') ilike '%profiles%'
        or coalesce(with_check,'') ilike '%profiles%'
        or cmd in ('ALL','DELETE')
        or roles && array['anon','public']::name[]
        or coalesce(qual,'') in ('true','(true)')
        or coalesce(with_check,'') in ('true','(true)'))
  ) then raise exception 'submissions contains direct-profile, broad, anon, or DELETE access'; end if;

  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='submissions'
      and (coalesce(qual,'') not ilike '%private.is_current_user_active_staff%'
        and coalesce(with_check,'') not ilike '%private.is_current_user_active_staff%')
  ) then raise exception 'submissions contains a policy not bound to active staff helper'; end if;
end
$$;

commit;
