-- Block 5: placement audit trail and role-scoped placement write controls

create or replace function private.is_current_user_any_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true and p.role = any (allowed_roles)
  );
$$;

revoke all on function private.is_current_user_any_role(text[]) from public;

create table if not exists public.placement_activity_log (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions(id) on delete set null,
  entity_table text not null,
  entity_id uuid not null,
  event_type text not null check (event_type in ('created', 'updated')),
  occurred_at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  changed_fields text[] not null default '{}'::text[],
  before_state jsonb,
  after_state jsonb not null
);

create index if not exists placement_activity_log_submission_occurred_idx
  on public.placement_activity_log (submission_id, occurred_at desc);
create index if not exists placement_activity_log_entity_idx
  on public.placement_activity_log (entity_table, entity_id, occurred_at desc);

alter table public.placement_activity_log enable row level security;
revoke all on table public.placement_activity_log from anon, authenticated;
grant select on table public.placement_activity_log to authenticated;

drop policy if exists placement_activity_log_select_staff on public.placement_activity_log;
create policy placement_activity_log_select_staff
on public.placement_activity_log for select to authenticated
using ((select private.is_current_user_active_staff()));

create or replace function private.record_placement_activity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_after jsonb;
  v_before jsonb;
  v_submission_id uuid;
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_changed_fields text[];
begin
  if tg_op = 'INSERT' then
    v_after := to_jsonb(new);
    v_before := null;
  else
    v_after := to_jsonb(new);
    v_before := to_jsonb(old);
  end if;

  if tg_table_name = 'placement_replacement_claims' then
    select tracker.submission_id into v_submission_id
    from public.placement_guarantee_trackers tracker
    where tracker.id = (v_after ->> 'guarantee_tracker_id')::uuid;
  elsif nullif(v_after ->> 'submission_id', '') is not null then
    v_submission_id := (v_after ->> 'submission_id')::uuid;
  end if;

  if v_actor_id is not null then
    select p.role into v_actor_role from public.profiles p where p.id = v_actor_id;
  end if;

  if tg_op = 'INSERT' then
    select coalesce(array_agg(key order by key), '{}'::text[]) into v_changed_fields
    from jsonb_object_keys(v_after) as key;
  else
    select coalesce(array_agg(key order by key), '{}'::text[]) into v_changed_fields
    from jsonb_object_keys(v_after) as key
    where key not in ('updated_at') and (v_before -> key) is distinct from (v_after -> key);
    if cardinality(v_changed_fields) = 0 then return new; end if;
  end if;

  insert into public.placement_activity_log (
    submission_id, entity_table, entity_id, event_type, actor_id, actor_role,
    changed_fields, before_state, after_state
  ) values (
    v_submission_id, tg_table_name, new.id,
    case when tg_op = 'INSERT' then 'created' else 'updated' end,
    v_actor_id, v_actor_role, v_changed_fields, v_before, v_after
  );
  return new;
end;
$$;

revoke all on function private.record_placement_activity() from public;

drop trigger if exists placement_activity_submission on public.submissions;
create trigger placement_activity_submission after insert or update on public.submissions
for each row execute function private.record_placement_activity();

drop trigger if exists placement_activity_job_order on public.placement_job_orders;
create trigger placement_activity_job_order after insert or update on public.placement_job_orders
for each row execute function private.record_placement_activity();

drop trigger if exists placement_activity_consent on public.candidate_submission_consents;
create trigger placement_activity_consent after insert or update on public.candidate_submission_consents
for each row execute function private.record_placement_activity();

drop trigger if exists placement_activity_commercial_record on public.placement_commercial_records;
create trigger placement_activity_commercial_record after insert or update on public.placement_commercial_records
for each row execute function private.record_placement_activity();

drop trigger if exists placement_activity_guarantee_tracker on public.placement_guarantee_trackers;
create trigger placement_activity_guarantee_tracker after insert or update on public.placement_guarantee_trackers
for each row execute function private.record_placement_activity();

drop trigger if exists placement_activity_replacement_claim on public.placement_replacement_claims;
create trigger placement_activity_replacement_claim after insert or update on public.placement_replacement_claims
for each row execute function private.record_placement_activity();

drop policy if exists placement_job_orders_insert_staff on public.placement_job_orders;
drop policy if exists placement_job_orders_update_staff on public.placement_job_orders;
create policy placement_job_orders_insert_bd_admin on public.placement_job_orders
for insert to authenticated with check ((select private.is_current_user_any_role(array['admin','bd'])));
create policy placement_job_orders_update_bd_admin on public.placement_job_orders
for update to authenticated using ((select private.is_current_user_any_role(array['admin','bd'])))
with check ((select private.is_current_user_any_role(array['admin','bd'])));

drop policy if exists placement_commercial_records_insert_staff on public.placement_commercial_records;
drop policy if exists placement_commercial_records_update_staff on public.placement_commercial_records;
create policy placement_commercial_records_insert_bd_admin on public.placement_commercial_records
for insert to authenticated with check ((select private.is_current_user_any_role(array['admin','bd'])));
create policy placement_commercial_records_update_bd_admin on public.placement_commercial_records
for update to authenticated using ((select private.is_current_user_any_role(array['admin','bd'])))
with check ((select private.is_current_user_any_role(array['admin','bd'])));

drop policy if exists placement_guarantee_trackers_insert_staff on public.placement_guarantee_trackers;
drop policy if exists placement_guarantee_trackers_update_staff on public.placement_guarantee_trackers;
create policy placement_guarantee_trackers_insert_bd_admin on public.placement_guarantee_trackers
for insert to authenticated with check ((select private.is_current_user_any_role(array['admin','bd'])));
create policy placement_guarantee_trackers_update_bd_admin on public.placement_guarantee_trackers
for update to authenticated using ((select private.is_current_user_any_role(array['admin','bd'])))
with check ((select private.is_current_user_any_role(array['admin','bd'])));

drop policy if exists placement_replacement_claims_insert_staff on public.placement_replacement_claims;
drop policy if exists placement_replacement_claims_update_staff on public.placement_replacement_claims;
create policy placement_replacement_claims_insert_bd_admin on public.placement_replacement_claims
for insert to authenticated with check ((select private.is_current_user_any_role(array['admin','bd'])));
create policy placement_replacement_claims_update_bd_admin on public.placement_replacement_claims
for update to authenticated using ((select private.is_current_user_any_role(array['admin','bd'])))
with check ((select private.is_current_user_any_role(array['admin','bd'])));

drop policy if exists candidate_submission_consents_insert_staff on public.candidate_submission_consents;
drop policy if exists candidate_submission_consents_update_staff on public.candidate_submission_consents;
create policy candidate_submission_consents_insert_staff_roles on public.candidate_submission_consents
for insert to authenticated with check ((select private.is_current_user_any_role(array['admin','bd','recruiter'])));
create policy candidate_submission_consents_update_staff_roles on public.candidate_submission_consents
for update to authenticated using ((select private.is_current_user_any_role(array['admin','bd','recruiter'])))
with check ((select private.is_current_user_any_role(array['admin','bd','recruiter'])));
