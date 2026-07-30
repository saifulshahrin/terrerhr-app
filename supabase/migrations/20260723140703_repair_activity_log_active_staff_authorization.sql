begin;

do $$ begin
  if to_regclass('public.activity_log') is null then raise exception 'public.activity_log missing'; end if;
  if to_regprocedure('private.is_current_user_active_staff()') is null then raise exception 'helper missing'; end if;
end $$;

drop policy if exists activity_log_delete_staff on public.activity_log;

drop policy if exists activity_log_insert_staff on public.activity_log;

drop policy if exists activity_log_select_staff on public.activity_log;

drop policy if exists activity_log_update_staff on public.activity_log;

create policy activity_log_insert_staff on public.activity_log for insert to authenticated with check ((select private.is_current_user_active_staff()));

create policy activity_log_select_staff on public.activity_log for select to authenticated using ((select private.is_current_user_active_staff()));

create policy activity_log_update_staff on public.activity_log for update to authenticated using ((select private.is_current_user_active_staff())) with check ((select private.is_current_user_active_staff()));

do $$ begin
  if (select count(*) from pg_policy where polrelid='public.activity_log'::regclass) <> 3 then raise exception 'unexpected activity_log policy count'; end if;
end $$;

commit;
