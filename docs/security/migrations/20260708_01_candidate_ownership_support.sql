-- REVIEW ONLY
-- Candidate ownership support
-- Do not apply to production yet.

begin;

create table if not exists public.candidate_auth_links (
  candidate_id uuid primary key references public.candidates(candidate_id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  verified_email text null,
  claim_source text not null default 'manual',
  claim_status text not null default 'linked',
  claimed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  claimed_by uuid null references auth.users(id) on delete set null,
  claim_notes text null,
  constraint candidate_auth_links_claim_status_check
    check (claim_status in ('pending', 'linked', 'revoked'))
);

create index if not exists idx_candidate_auth_links_auth_user_id
  on public.candidate_auth_links (auth_user_id);

create index if not exists idx_candidate_auth_links_verified_email
  on public.candidate_auth_links (lower(verified_email))
  where verified_email is not null;

comment on table public.candidate_auth_links is
  'Authoritative candidate ownership mapping between auth.users and public.candidates.';

commit;

