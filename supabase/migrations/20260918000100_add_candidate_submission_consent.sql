-- Block 2: exact candidate consent, auditable submission reference and introduction protection.
-- Consent is specific to one candidate, one role and one client. A submission cannot move
-- to submitted_to_client without it.

create table if not exists public.candidate_submission_consents (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete restrict,
  job_id uuid not null references public.jobs(id) on delete restrict,
  candidate_id uuid not null references public.candidates(candidate_id) on delete restrict,
  client_company_name text not null,
  job_title text not null,
  consent_channel text not null check (consent_channel in ('email', 'whatsapp', 'phone', 'in_person', 'other')),
  consent_evidence_ref text not null check (length(trim(consent_evidence_ref)) > 0),
  consented_at timestamptz not null default now(),
  consent_recorded_by uuid references auth.users(id) on delete set null default auth.uid(),
  consent_recorded_at timestamptz not null default now(),
  protection_expires_at timestamptz not null default (now() + interval '12 months'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.candidate_submission_consents enable row level security;
grant select, insert, update on public.candidate_submission_consents to authenticated;

create policy "candidate_submission_consents_select_staff"
  on public.candidate_submission_consents for select to authenticated
  using ((select private.is_current_user_active_staff()));

create policy "candidate_submission_consents_insert_staff"
  on public.candidate_submission_consents for insert to authenticated
  with check ((select private.is_current_user_active_staff()));

create policy "candidate_submission_consents_update_staff"
  on public.candidate_submission_consents for update to authenticated
  using ((select private.is_current_user_active_staff()))
  with check ((select private.is_current_user_active_staff()));

alter table public.submissions
  add column if not exists submission_reference text,
  add column if not exists introduction_protection_start_at timestamptz,
  add column if not exists introduction_protection_expires_at timestamptz;

create unique index if not exists submissions_submission_reference_unique
  on public.submissions(submission_reference)
  where submission_reference is not null;

create or replace function private.guard_candidate_submission_consent()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  consent_record public.candidate_submission_consents;
begin
  if new.submission_stage = 'submitted_to_client'
     and (tg_op = 'INSERT' or old.submission_stage is distinct from 'submitted_to_client') then
    select *
      into consent_record
      from public.candidate_submission_consents
     where submission_id = new.id;

    if consent_record.id is null then
      raise exception 'Candidate consent tied to this exact client and role is required before client submission';
    end if;

    if consent_record.job_id is distinct from new.job_id
       or consent_record.candidate_id is distinct from new.candidate_id then
      raise exception 'Candidate consent does not match this submission';
    end if;

    new.submission_reference := coalesce(
      new.submission_reference,
      'TS-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 8))
    );
    new.submitted_to_client_at := coalesce(new.submitted_to_client_at, now());
    new.introduction_protection_start_at := coalesce(new.introduction_protection_start_at, now());
    new.introduction_protection_expires_at := coalesce(
      new.introduction_protection_expires_at,
      new.introduction_protection_start_at + interval '12 months'
    );
  end if;

  if tg_op = 'UPDATE'
     and old.submission_reference is not null
     and new.submission_reference is distinct from old.submission_reference then
    raise exception 'Submission reference is immutable once issued';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_candidate_submission_consent on public.submissions;
create trigger guard_candidate_submission_consent
before insert or update of submission_stage, submission_reference on public.submissions
for each row execute function private.guard_candidate_submission_consent();

revoke all on function private.guard_candidate_submission_consent() from public;
