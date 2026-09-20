-- Block 4: guarantee check-ins and replacement claims.
-- A tracker is created automatically from a confirmed start and the agreed job-order guarantee.

create table if not exists public.placement_guarantee_trackers (
  id uuid primary key default gen_random_uuid(),
  guarantee_reference text not null unique default (
    'TGT-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  submission_id uuid not null unique references public.submissions(id) on delete restrict,
  commercial_record_id uuid not null unique references public.placement_commercial_records(id) on delete restrict,
  guarantee_days integer not null check (guarantee_days between 1 and 180),
  start_date date not null,
  guarantee_end_date date not null,
  day7_due_on date not null,
  day30_due_on date not null,
  day45_due_on date not null,
  day7_completed_on date,
  day7_evidence_ref text,
  day7_outcome text,
  day30_completed_on date,
  day30_evidence_ref text,
  day30_outcome text,
  day45_completed_on date,
  day45_evidence_ref text,
  day45_outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.placement_replacement_claims (
  id uuid primary key default gen_random_uuid(),
  claim_reference text not null unique default (
    'TRC-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  guarantee_tracker_id uuid not null unique references public.placement_guarantee_trackers(id) on delete restrict,
  claim_status text not null default 'reported'
    check (claim_status in ('reported', 'accepted', 'declined', 'replacement_in_progress', 'resolved', 'withdrawn')),
  reported_at date not null default current_date,
  reason text not null check (length(trim(reason)) > 0),
  client_evidence_ref text not null check (length(trim(client_evidence_ref)) > 0),
  decision_at date,
  decision_evidence_ref text,
  resolution_evidence_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.placement_guarantee_trackers enable row level security;
alter table public.placement_replacement_claims enable row level security;
grant select, insert, update on public.placement_guarantee_trackers to authenticated;
grant select, insert, update on public.placement_replacement_claims to authenticated;

create policy "placement_guarantee_trackers_select_staff" on public.placement_guarantee_trackers for select to authenticated using ((select private.is_current_user_active_staff()));
create policy "placement_guarantee_trackers_insert_staff" on public.placement_guarantee_trackers for insert to authenticated with check ((select private.is_current_user_active_staff()));
create policy "placement_guarantee_trackers_update_staff" on public.placement_guarantee_trackers for update to authenticated using ((select private.is_current_user_active_staff())) with check ((select private.is_current_user_active_staff()));
create policy "placement_replacement_claims_select_staff" on public.placement_replacement_claims for select to authenticated using ((select private.is_current_user_active_staff()));
create policy "placement_replacement_claims_insert_staff" on public.placement_replacement_claims for insert to authenticated with check ((select private.is_current_user_active_staff()));
create policy "placement_replacement_claims_update_staff" on public.placement_replacement_claims for update to authenticated using ((select private.is_current_user_active_staff())) with check ((select private.is_current_user_active_staff()));

create or replace function private.guard_placement_guarantee_tracker()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$
begin
  if new.day7_completed_on is not null and coalesce(length(trim(new.day7_evidence_ref)), 0) = 0 then raise exception 'Day 7 evidence is required when the check-in is recorded'; end if;
  if new.day30_completed_on is not null and coalesce(length(trim(new.day30_evidence_ref)), 0) = 0 then raise exception 'Day 30 evidence is required when the check-in is recorded'; end if;
  if new.day45_completed_on is not null and coalesce(length(trim(new.day45_evidence_ref)), 0) = 0 then raise exception 'Day 45 evidence is required when the check-in is recorded'; end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.guard_placement_replacement_claim()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$
begin
  if new.claim_status in ('accepted', 'declined', 'replacement_in_progress', 'resolved')
     and (new.decision_at is null or coalesce(length(trim(new.decision_evidence_ref)), 0) = 0) then
    raise exception 'Decision date and evidence are required once a replacement claim is decided';
  end if;
  if new.claim_status = 'resolved' and coalesce(length(trim(new.resolution_evidence_ref)), 0) = 0 then
    raise exception 'Resolution evidence is required for a resolved replacement claim';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.create_guarantee_tracker_after_confirmed_start()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare
  days integer;
begin
  if new.start_confirmed_at is not null and new.start_date is not null
     and (tg_op = 'INSERT' or old.start_confirmed_at is null) then
    select coalesce((
      select o.guarantee_days
      from public.submissions s
      join public.placement_job_orders o on o.job_id = s.job_id and o.approval_status = 'approved'
      where s.id = new.submission_id
      order by o.founder_approved_at desc nulls last
      limit 1
    ), 60) into days;

    insert into public.placement_guarantee_trackers (
      submission_id, commercial_record_id, guarantee_days, start_date, guarantee_end_date,
      day7_due_on, day30_due_on, day45_due_on
    ) values (
      new.submission_id, new.id, days, new.start_date, new.start_date + days,
      new.start_date + 7, new.start_date + 30, new.start_date + 45
    ) on conflict (submission_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_placement_guarantee_tracker on public.placement_guarantee_trackers;
create trigger guard_placement_guarantee_tracker before insert or update on public.placement_guarantee_trackers for each row execute function private.guard_placement_guarantee_tracker();
drop trigger if exists guard_placement_replacement_claim on public.placement_replacement_claims;
create trigger guard_placement_replacement_claim before insert or update on public.placement_replacement_claims for each row execute function private.guard_placement_replacement_claim();
drop trigger if exists create_guarantee_tracker_after_confirmed_start on public.placement_commercial_records;
create trigger create_guarantee_tracker_after_confirmed_start after insert or update of start_confirmed_at on public.placement_commercial_records for each row execute function private.create_guarantee_tracker_after_confirmed_start();

insert into public.placement_guarantee_trackers (
  submission_id, commercial_record_id, guarantee_days, start_date, guarantee_end_date, day7_due_on, day30_due_on, day45_due_on
)
select p.submission_id, p.id,
  coalesce((select o.guarantee_days from public.submissions s join public.placement_job_orders o on o.job_id=s.job_id and o.approval_status='approved' where s.id=p.submission_id order by o.founder_approved_at desc nulls last limit 1), 60),
  p.start_date,
  p.start_date + coalesce((select o.guarantee_days from public.submissions s join public.placement_job_orders o on o.job_id=s.job_id and o.approval_status='approved' where s.id=p.submission_id order by o.founder_approved_at desc nulls last limit 1), 60),
  p.start_date + 7, p.start_date + 30, p.start_date + 45
from public.placement_commercial_records p
where p.start_confirmed_at is not null and p.start_date is not null
on conflict (submission_id) do nothing;

revoke all on function private.guard_placement_guarantee_tracker() from public;
revoke all on function private.guard_placement_replacement_claim() from public;
revoke all on function private.create_guarantee_tracker_after_confirmed_start() from public;
