-- Block 1: authorised job orders and commercial terms.
-- A client submission is blocked unless its job has an approved order.

create table if not exists public.placement_job_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default (
    'TJO-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
  job_id uuid not null references public.jobs(id) on delete restrict,
  company_id bigint references public.companies(id) on delete restrict,
  client_company_name text not null,
  authorised_contact_name text not null,
  authorised_contact_title text not null,
  authorised_contact_email text,
  authorisation_channel text not null check (authorisation_channel in ('signed_agreement', 'email', 'whatsapp', 'other')),
  authorisation_evidence_ref text not null,
  fee_model text not null check (fee_model in ('percentage_of_annual_base_salary', 'fixed_fee', 'retained', 'other')),
  fee_value numeric(12,2) not null check (fee_value > 0),
  payment_terms_days integer not null default 30 check (payment_terms_days between 0 and 180),
  guarantee_days integer not null default 60 check (guarantee_days between 0 and 180),
  terms_evidence_ref text not null,
  terms_confirmed_at timestamptz,
  approval_status text not null default 'draft' check (approval_status in ('draft', 'pending_founder_approval', 'approved', 'rejected', 'cancelled')),
  founder_approved_by uuid references auth.users(id) on delete set null,
  founder_approved_at timestamptz,
  founder_approval_notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists placement_job_orders_one_live_order_per_job
  on public.placement_job_orders(job_id)
  where approval_status in ('draft', 'pending_founder_approval', 'approved');

alter table public.placement_job_orders enable row level security;
grant select, insert, update on public.placement_job_orders to authenticated;

create policy "placement_job_orders_select_staff"
  on public.placement_job_orders for select to authenticated
  using ((select private.is_current_user_active_staff()));

create policy "placement_job_orders_insert_staff"
  on public.placement_job_orders for insert to authenticated
  with check ((select private.is_current_user_active_staff()));

create policy "placement_job_orders_update_staff"
  on public.placement_job_orders for update to authenticated
  using ((select private.is_current_user_active_staff()))
  with check ((select private.is_current_user_active_staff()));

create or replace function private.guard_placement_job_order()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.approval_status in ('pending_founder_approval', 'approved') then
    if new.terms_confirmed_at is null then
      raise exception 'Confirmed terms date is required before founder approval';
    end if;
  end if;

  if tg_op = 'UPDATE' and new.approval_status = 'approved' and old.approval_status <> 'approved' then
    if not private.is_current_user_admin() then
      raise exception 'Founder approval requires an active Admin account';
    end if;
    new.founder_approved_by := auth.uid();
    new.founder_approved_at := now();
  end if;

  if tg_op = 'UPDATE' and old.approval_status = 'approved' and
    row(new.authorised_contact_name, new.authorised_contact_title, new.authorised_contact_email,
        new.authorisation_channel, new.authorisation_evidence_ref, new.fee_model, new.fee_value,
        new.payment_terms_days, new.guarantee_days, new.terms_evidence_ref)
    is distinct from
    row(old.authorised_contact_name, old.authorised_contact_title, old.authorised_contact_email,
        old.authorisation_channel, old.authorisation_evidence_ref, old.fee_model, old.fee_value,
        old.payment_terms_days, old.guarantee_days, old.terms_evidence_ref) then
    raise exception 'Approved job-order terms cannot be changed; cancel and create a fresh order';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_placement_job_order on public.placement_job_orders;
create trigger guard_placement_job_order
before insert or update on public.placement_job_orders
for each row execute function private.guard_placement_job_order();

create or replace function private.require_approved_job_order_for_submission()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.submission_stage = 'submitted_to_client'
     and (tg_op = 'INSERT' or old.submission_stage is distinct from 'submitted_to_client')
     and not exists (
       select 1 from public.placement_job_orders o
       where o.job_id = new.job_id and o.approval_status = 'approved'
     ) then
    raise exception 'An approved Placement Order is required before client submission';
  end if;
  return new;
end;
$$;

drop trigger if exists require_approved_job_order_for_submission on public.submissions;
create trigger require_approved_job_order_for_submission
before insert or update of submission_stage on public.submissions
for each row execute function private.require_approved_job_order_for_submission();

revoke all on function private.guard_placement_job_order() from public;
revoke all on function private.require_approved_job_order_for_submission() from public;
