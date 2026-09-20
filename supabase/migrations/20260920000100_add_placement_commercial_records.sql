-- Block 3: offer, start, invoice and cleared-payment record.
-- One controlled commercial record is retained for each candidate submission.

create table if not exists public.placement_commercial_records (
  id uuid primary key default gen_random_uuid(),
  placement_reference text not null unique default (
    'TPL-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  submission_id uuid not null unique references public.submissions(id) on delete restrict,
  commercial_status text not null default 'offer_pending'
    check (commercial_status in ('offer_pending', 'offer_accepted', 'started', 'invoiced', 'payment_cleared')),
  offer_made_at date,
  offer_accepted_at date,
  offer_evidence_ref text,
  start_date date,
  start_confirmed_at date,
  start_evidence_ref text,
  invoice_number text,
  invoice_issued_at date,
  invoice_due_date date,
  invoice_amount numeric(12,2) check (invoice_amount is null or invoice_amount > 0),
  invoice_evidence_ref text,
  payment_received_at date,
  payment_cleared_at date,
  payment_amount numeric(12,2) check (payment_amount is null or payment_amount > 0),
  payment_evidence_ref text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.placement_commercial_records enable row level security;
grant select, insert, update on public.placement_commercial_records to authenticated;

create policy "placement_commercial_records_select_staff"
  on public.placement_commercial_records for select to authenticated
  using ((select private.is_current_user_active_staff()));

create policy "placement_commercial_records_insert_staff"
  on public.placement_commercial_records for insert to authenticated
  with check ((select private.is_current_user_active_staff()));

create policy "placement_commercial_records_update_staff"
  on public.placement_commercial_records for update to authenticated
  using ((select private.is_current_user_active_staff()))
  with check ((select private.is_current_user_active_staff()));

create or replace function private.guard_placement_commercial_record()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.offer_accepted_at is not null
     and coalesce(length(trim(new.offer_evidence_ref)), 0) = 0 then
    raise exception 'Offer evidence is required when an offer is accepted';
  end if;

  if new.start_confirmed_at is not null
     and (new.start_date is null or coalesce(length(trim(new.start_evidence_ref)), 0) = 0) then
    raise exception 'Start date and start evidence are required when a start is confirmed';
  end if;

  if new.invoice_number is not null
     or new.invoice_issued_at is not null
     or new.invoice_amount is not null
     or new.invoice_evidence_ref is not null then
    if coalesce(length(trim(new.invoice_number)), 0) = 0
       or new.invoice_issued_at is null
       or new.invoice_amount is null
       or coalesce(length(trim(new.invoice_evidence_ref)), 0) = 0 then
      raise exception 'Invoice number, issue date, amount and evidence are required for an invoice record';
    end if;
  end if;

  if new.payment_cleared_at is not null
     or new.payment_amount is not null
     or new.payment_evidence_ref is not null then
    if new.invoice_number is null
       or new.payment_received_at is null
       or new.payment_cleared_at is null
       or new.payment_amount is null
       or coalesce(length(trim(new.payment_evidence_ref)), 0) = 0 then
      raise exception 'Invoice, payment received date, cleared date, amount and evidence are required for cleared payment';
    end if;
  end if;

  new.commercial_status := case
    when new.payment_cleared_at is not null then 'payment_cleared'
    when new.invoice_number is not null then 'invoiced'
    when new.start_confirmed_at is not null then 'started'
    when new.offer_accepted_at is not null then 'offer_accepted'
    else 'offer_pending'
  end;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_placement_commercial_record on public.placement_commercial_records;
create trigger guard_placement_commercial_record
before insert or update on public.placement_commercial_records
for each row execute function private.guard_placement_commercial_record();

create or replace function private.require_confirmed_start_before_hired()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.submission_stage = 'hired'
     and (tg_op = 'INSERT' or old.submission_stage is distinct from 'hired')
     and not exists (
       select 1
       from public.placement_commercial_records r
       where r.submission_id = new.id
         and r.start_confirmed_at is not null
     ) then
    raise exception 'A confirmed start record is required before marking a candidate as hired';
  end if;
  return new;
end;
$$;

drop trigger if exists require_confirmed_start_before_hired on public.submissions;
create trigger require_confirmed_start_before_hired
before insert or update of submission_stage on public.submissions
for each row execute function private.require_confirmed_start_before_hired();

revoke all on function private.guard_placement_commercial_record() from public;
revoke all on function private.require_confirmed_start_before_hired() from public;
