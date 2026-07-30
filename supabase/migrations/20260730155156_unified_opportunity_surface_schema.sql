-- Terrer Unified Opportunity Surface — Phase 1 schema and RLS.
-- Generated from the approved design package:
-- SHA-256 04b5db0c12489b1dc6dff832c0c572f6ea3a51ddd755a53242da64de222f0297
--
-- Intentionally schema-only. The approved four-record pilot backfill is kept
-- outside the migration ledger pending separate execution approval.

create or replace function private.set_row_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_row_updated_at() from public;

create or replace function public.normalize_external_source_url(p_url text)
returns text
language plpgsql
immutable
strict
security invoker
set search_path = pg_catalog
as $$
declare
  v_url text := btrim(p_url);
  v_scheme text;
  v_authority text;
  v_remainder text;
  v_path text;
  v_query text;
  v_parameter text;
  v_key text;
  v_kept_parameters text[] := '{}'::text[];
begin
  v_url := split_part(v_url, '#', 1);

  if v_url !~ '^[A-Za-z][A-Za-z0-9+.-]*://[^/?#]+(?:[/?][^#]*)?$' then
    raise exception 'Invalid absolute source URL';
  end if;

  v_scheme := lower(
    substring(v_url from '^([A-Za-z][A-Za-z0-9+.-]*)://')
  );
  v_authority := lower(
    substring(v_url from '^[A-Za-z][A-Za-z0-9+.-]*://([^/?#]+)')
  );

  if v_authority like '%@%' then
    raise exception 'Source URL credentials are not allowed';
  end if;

  v_remainder := regexp_replace(
    v_url,
    '^[A-Za-z][A-Za-z0-9+.-]*://[^/?#]+',
    ''
  );
  v_path := split_part(v_remainder, '?', 1);
  v_path := regexp_replace(v_path, '/+$', '');

  if position('?' in v_remainder) > 0 then
    v_query := substring(v_remainder from position('?' in v_remainder) + 1);

    for v_parameter in
      select parameter
      from regexp_split_to_table(v_query, '&') as t(parameter)
      where parameter <> ''
    loop
      v_key := lower(split_part(v_parameter, '=', 1));

      if v_key !~ '^utm_'
         and v_key not in (
           'gclid',
           'dclid',
           'fbclid',
           'msclkid',
           'mc_cid',
           'mc_eid',
           '_ga',
           'igshid'
         ) then
        v_kept_parameters := array_append(v_kept_parameters, v_parameter);
      end if;
    end loop;
  end if;

  if cardinality(v_kept_parameters) > 0 then
    select string_agg(
      parameter,
      '&'
      order by lower(split_part(parameter, '=', 1)), parameter
    )
    into v_query
    from unnest(v_kept_parameters) as t(parameter);
  else
    v_query := null;
  end if;

  return
    v_scheme || '://' || v_authority || v_path
    || case when v_query is null then '' else '?' || v_query end;
end;
$$;

revoke all on function public.normalize_external_source_url(text)
  from public, anon;
grant execute on function public.normalize_external_source_url(text)
  to authenticated, service_role;

create table public.external_opportunities (
  id text primary key,

  job_title text not null,
  company_name text not null,
  location text not null,
  role_family text,
  seniority text,
  skills text[] not null default '{}'::text[],
  opportunity_summary text,

  source_name text not null,
  source_type text not null,
  source_url text not null,
  normalized_source_url text generated always as (
    public.normalize_external_source_url(source_url)
  ) stored,
  source_reference_id text,

  posted_at timestamptz,
  discovered_at timestamptz not null default now(),
  last_verified_at timestamptz not null,
  verification_status text not null default 'verification_due',
  publication_status text not null default 'draft',

  suppression_reason text,
  suppressed_at timestamptz,
  retired_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint external_opportunities_id_nonempty
    check (btrim(id) <> ''),
  constraint external_opportunities_job_title_nonempty
    check (btrim(job_title) <> ''),
  constraint external_opportunities_company_name_nonempty
    check (btrim(company_name) <> ''),
  constraint external_opportunities_location_nonempty
    check (btrim(location) <> ''),
  constraint external_opportunities_source_name_nonempty
    check (btrim(source_name) <> ''),
  constraint external_opportunities_source_url_https
    check (source_url ~* '^https://[^[:space:]]+$'),
  constraint external_opportunities_source_type_check
    check (
      source_type in (
        'employer_career_site',
        'employer_ats',
        'trusted_job_platform',
        'other_public_source'
      )
    ),
  constraint external_opportunities_verification_status_check
    check (
      verification_status in (
        'verified_active',
        'verification_due',
        'unavailable'
      )
    ),
  constraint external_opportunities_publication_status_check
    check (
      publication_status in (
        'draft',
        'published',
        'suppressed',
        'retired'
      )
    ),
  constraint external_opportunities_verification_order_check
    check (last_verified_at >= discovered_at),
  constraint external_opportunities_published_verified_check
    check (
      publication_status <> 'published'
      or verification_status = 'verified_active'
    ),
  constraint external_opportunities_suppression_state_check
    check (
      (
        publication_status = 'suppressed'
        and suppression_reason is not null
        and btrim(suppression_reason) <> ''
        and suppressed_at is not null
        and retired_at is null
      )
      or
      (
        publication_status <> 'suppressed'
        and suppression_reason is null
        and suppressed_at is null
      )
    ),
  constraint external_opportunities_retirement_state_check
    check (
      (
        publication_status = 'retired'
        and retired_at is not null
        and suppression_reason is null
        and suppressed_at is null
      )
      or
      (
        publication_status <> 'retired'
        and retired_at is null
      )
    )
);

comment on table public.external_opportunities is
  'Governed Layer 2 hiring-intelligence opportunities. These are not canonical Terrer client jobs.';

comment on column public.external_opportunities.id is
  'Stable deterministic external opportunity identifier.';

comment on column public.external_opportunities.normalized_source_url is
  'Database-derived exact source identity after conservative Phase 1 normalization.';

comment on column public.external_opportunities.opportunity_summary is
  'Terrer-owned summary; employer-written title, company, and external content remain unmodified.';

comment on column public.external_opportunities.publication_status is
  'Candidate catalogue governance state. Retirement is soft; records with review history are retained.';

create unique index external_opportunities_normalized_source_url_uq
  on public.external_opportunities (normalized_source_url);

create unique index external_opportunities_source_reference_uq
  on public.external_opportunities (
    source_type,
    lower(source_name),
    source_reference_id
  )
  where source_reference_id is not null;

create index external_opportunities_candidate_eligibility_idx
  on public.external_opportunities (
    publication_status,
    verification_status,
    last_verified_at desc
  );

create index external_opportunities_role_family_idx
  on public.external_opportunities (role_family)
  where publication_status = 'published';

create index external_opportunities_seniority_idx
  on public.external_opportunities (seniority)
  where publication_status = 'published';

create index external_opportunities_skills_gin_idx
  on public.external_opportunities using gin (skills);

create or replace function private.guard_external_opportunity_immutable_fields()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.id is distinct from old.id
     or new.created_at is distinct from old.created_at
     or new.discovered_at is distinct from old.discovered_at
     or new.source_name is distinct from old.source_name
     or new.source_type is distinct from old.source_type
     or new.source_url is distinct from old.source_url
     or new.source_reference_id is distinct from old.source_reference_id then
    raise exception 'External opportunity identity and original discovery fields are immutable';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_external_opportunity_immutable_fields()
  from public, anon, authenticated;

create trigger external_opportunities_guard_immutable_fields
before update on public.external_opportunities
for each row
execute function private.guard_external_opportunity_immutable_fields();

create trigger external_opportunities_set_updated_at
before update on public.external_opportunities
for each row
execute function private.set_row_updated_at();

create table public.external_opportunity_reviews (
  id uuid primary key default gen_random_uuid(),

  candidate_id uuid not null,
  external_opportunity_id text not null,

  review_status text not null default 'requested',
  match_score smallint not null,
  match_reasons text[] not null,

  requested_at timestamptz not null default now(),
  under_review_at timestamptz,
  completed_at timestamptz,
  closed_at timestamptz,
  reviewed_at timestamptz,

  reviewed_by uuid,
  review_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint external_opportunity_reviews_candidate_fk
    foreign key (candidate_id)
    references public.candidates(candidate_id)
    on delete cascade,

  constraint external_opportunity_reviews_opportunity_fk
    foreign key (external_opportunity_id)
    references public.external_opportunities(id)
    on update no action
    on delete restrict,

  constraint external_opportunity_reviews_reviewer_fk
    foreign key (reviewed_by)
    references public.profiles(id)
    on delete set null,

  constraint external_opportunity_reviews_candidate_opportunity_uq
    unique (candidate_id, external_opportunity_id),

  constraint external_opportunity_reviews_status_check
    check (
      review_status in (
        'requested',
        'under_review',
        'completed',
        'closed'
      )
    ),

  constraint external_opportunity_reviews_match_score_check
    check (match_score between 0 and 100),

  constraint external_opportunity_reviews_match_reasons_check
    check (
      cardinality(match_reasons) between 1 and 3
      and array_position(match_reasons, null) is null
    ),

  constraint external_opportunity_reviews_status_timestamps_check
    check (
      (
        review_status = 'requested'
        and under_review_at is null
        and completed_at is null
        and closed_at is null
        and reviewed_at is null
        and reviewed_by is null
      )
      or
      (
        review_status = 'under_review'
        and under_review_at is not null
        and completed_at is null
        and closed_at is null
        and reviewed_at is null
        and reviewed_by is not null
      )
      or
      (
        review_status = 'completed'
        and under_review_at is not null
        and completed_at is not null
        and closed_at is null
        and reviewed_at is not null
        and reviewed_by is not null
      )
      or
      (
        review_status = 'closed'
        and closed_at is not null
        and reviewed_at is not null
        and reviewed_by is not null
        and (
          completed_at is null
          or under_review_at is not null
        )
      )
    )
);

comment on table public.external_opportunity_reviews is
  'Candidate requests for Terrer to assess external opportunities. A row is not an application, submission, Confirm Interest, or representation request.';

comment on column public.external_opportunity_reviews.match_score is
  'Trusted server-generated deterministic match score captured at request time; not a hiring probability.';

comment on column public.external_opportunity_reviews.match_reasons is
  'One to three trusted server-generated Terrer fit reasons captured at request time.';

comment on column public.external_opportunity_reviews.review_notes is
  'Staff-internal notes. This column must not be included in ordinary candidate reads.';

create index external_opportunity_reviews_candidate_requested_idx
  on public.external_opportunity_reviews (candidate_id, requested_at desc);

create index external_opportunity_reviews_opportunity_idx
  on public.external_opportunity_reviews (external_opportunity_id);

create index external_opportunity_reviews_staff_queue_idx
  on public.external_opportunity_reviews (review_status, requested_at)
  where review_status in ('requested', 'under_review');

create or replace function private.guard_external_review_transition()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
begin
  if new.id is distinct from old.id
     or new.candidate_id is distinct from old.candidate_id
     or new.external_opportunity_id is distinct from old.external_opportunity_id
     or new.requested_at is distinct from old.requested_at
     or new.created_at is distinct from old.created_at
     or new.match_score is distinct from old.match_score
     or new.match_reasons is distinct from old.match_reasons then
    raise exception 'External review identity and request snapshot are immutable';
  end if;

  if new.review_status is distinct from old.review_status then
    if not (
      (old.review_status = 'requested'
        and new.review_status in ('under_review', 'closed'))
      or
      (old.review_status = 'under_review'
        and new.review_status in ('completed', 'closed'))
      or
      (old.review_status = 'completed'
        and new.review_status = 'closed')
    ) then
      raise exception 'Invalid external review transition: % to %',
        old.review_status, new.review_status;
    end if;

    if actor_id is null then
      raise exception 'Authenticated staff identity is required';
    end if;

    if new.review_status = 'under_review' then
      new.under_review_at := coalesce(old.under_review_at, now());
      new.completed_at := null;
      new.closed_at := null;
      new.reviewed_at := null;
      new.reviewed_by := actor_id;
    elsif new.review_status = 'completed' then
      new.under_review_at := old.under_review_at;
      new.completed_at := now();
      new.closed_at := null;
      new.reviewed_at := now();
      new.reviewed_by := actor_id;
    elsif new.review_status = 'closed' then
      new.closed_at := now();

      if old.review_status = 'completed' then
        new.under_review_at := old.under_review_at;
        new.completed_at := old.completed_at;
        new.reviewed_at := old.reviewed_at;
        new.reviewed_by := old.reviewed_by;
      else
        new.under_review_at := old.under_review_at;
        new.completed_at := null;
        new.reviewed_at := now();
        new.reviewed_by := actor_id;
      end if;
    end if;
  elsif new.under_review_at is distinct from old.under_review_at
     or new.completed_at is distinct from old.completed_at
     or new.closed_at is distinct from old.closed_at
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by then
    raise exception 'Review audit fields may change only through an approved status transition';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.guard_external_review_transition() from public;

create trigger external_opportunity_reviews_guard_transition
before update on public.external_opportunity_reviews
for each row
execute function private.guard_external_review_transition();

alter table public.external_opportunities enable row level security;
alter table public.external_opportunity_reviews enable row level security;

revoke all on public.external_opportunities from anon, authenticated;
revoke all on public.external_opportunity_reviews from anon, authenticated;

create policy external_opportunities_select_candidate_eligible
on public.external_opportunities
for select
to authenticated
using (
  publication_status = 'published'
  and verification_status = 'verified_active'
  and retired_at is null
  and last_verified_at >= now() - interval '30 days'
);

create policy external_opportunity_reviews_select_own_verified_email
on public.external_opportunity_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.candidates c
    where c.candidate_id = external_opportunity_reviews.candidate_id
      and lower(coalesce(c.email, '')) =
          lower(coalesce(auth.jwt() ->> 'email', ''))
      and coalesce(auth.jwt() ->> 'email', '') <> ''
  )
);

grant select on public.external_opportunities to authenticated;

grant select (
  id,
  candidate_id,
  external_opportunity_id,
  review_status,
  match_score,
  match_reasons,
  requested_at,
  under_review_at,
  completed_at,
  closed_at,
  reviewed_at,
  created_at,
  updated_at
) on public.external_opportunity_reviews to authenticated;

revoke insert, update, delete
  on public.external_opportunity_reviews
  from anon, authenticated;

create or replace function public.create_external_opportunity_review_trusted(
  p_candidate_id uuid,
  p_external_opportunity_id text,
  p_match_score smallint,
  p_match_reasons text[]
)
returns public.external_opportunity_reviews
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  v_review public.external_opportunity_reviews;
  v_reason text;
begin
  if p_match_score is null or p_match_score not between 0 and 100 then
    raise exception 'Trusted match score must be between 0 and 100';
  end if;

  if p_match_reasons is null
     or cardinality(p_match_reasons) not between 1 and 3
     or array_position(p_match_reasons, null) is not null then
    raise exception 'Trusted match reasons must contain one to three non-null values';
  end if;

  foreach v_reason in array p_match_reasons loop
    if btrim(v_reason) = '' then
      raise exception 'Trusted match reasons must be non-blank';
    end if;
  end loop;

  if not exists (
    select 1
    from public.external_opportunities eo
    where eo.id = p_external_opportunity_id
      and eo.publication_status = 'published'
      and eo.verification_status = 'verified_active'
      and eo.retired_at is null
      and eo.last_verified_at >= now() - interval '30 days'
  ) then
    raise exception 'External opportunity is not currently eligible'
      using errcode = '23514';
  end if;

  insert into public.external_opportunity_reviews (
    candidate_id,
    external_opportunity_id,
    match_score,
    match_reasons
  )
  values (
    p_candidate_id,
    p_external_opportunity_id,
    p_match_score,
    p_match_reasons
  )
  on conflict (candidate_id, external_opportunity_id) do nothing
  returning * into v_review;

  if v_review.id is null then
    select *
    into strict v_review
    from public.external_opportunity_reviews r
    where r.candidate_id = p_candidate_id
      and r.external_opportunity_id = p_external_opportunity_id;
  end if;

  return v_review;
end;
$$;

revoke all
  on function public.create_external_opportunity_review_trusted(
    uuid,
    text,
    smallint,
    text[]
  )
  from public, anon, authenticated;

grant select on public.external_opportunities to service_role;
grant select, insert on public.external_opportunity_reviews to service_role;
grant execute
  on function public.create_external_opportunity_review_trusted(
    uuid,
    text,
    smallint,
    text[]
  )
  to service_role;

create policy external_opportunities_select_staff
on public.external_opportunities
for select
to authenticated
using (
  (select private.is_current_user_active_staff())
);

create policy external_opportunities_insert_admin_recruiter
on public.external_opportunities
for insert
to authenticated
with check (
  (select private.is_current_user_active_staff())
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter')
  )
);

create policy external_opportunities_update_admin_recruiter
on public.external_opportunities
for update
to authenticated
using (
  (select private.is_current_user_active_staff())
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter')
  )
)
with check (
  (select private.is_current_user_active_staff())
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter')
  )
);

grant insert (
  id,
  job_title,
  company_name,
  location,
  role_family,
  seniority,
  skills,
  opportunity_summary,
  source_name,
  source_type,
  source_url,
  source_reference_id,
  posted_at,
  discovered_at,
  last_verified_at,
  verification_status,
  publication_status,
  suppression_reason,
  suppressed_at,
  retired_at
) on public.external_opportunities to authenticated;

grant update (
  job_title,
  company_name,
  location,
  role_family,
  seniority,
  skills,
  opportunity_summary,
  posted_at,
  last_verified_at,
  verification_status,
  publication_status,
  suppression_reason,
  suppressed_at,
  retired_at
) on public.external_opportunities to authenticated;

revoke delete on public.external_opportunities from anon, authenticated;

create policy external_opportunity_reviews_select_staff
on public.external_opportunity_reviews
for select
to authenticated
using (
  (select private.is_current_user_active_staff())
);

create policy external_opportunity_reviews_update_admin_recruiter
on public.external_opportunity_reviews
for update
to authenticated
using (
  (select private.is_current_user_active_staff())
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter')
  )
)
with check (
  (select private.is_current_user_active_staff())
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter')
  )
);

grant update (
  review_status,
  review_notes
) on public.external_opportunity_reviews to authenticated;

revoke delete on public.external_opportunity_reviews from anon, authenticated;

create or replace function public.list_external_reviews_for_staff()
returns setof public.external_opportunity_reviews
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not (select private.is_current_user_active_staff()) then
    raise exception 'Active staff authorization required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'recruiter')
  ) then
    raise exception 'Admin or recruiter authorization required'
      using errcode = '42501';
  end if;

  return query
  select *
  from public.external_opportunity_reviews
  order by requested_at asc;
end;
$$;

revoke all on function public.list_external_reviews_for_staff()
  from public, anon;
grant execute on function public.list_external_reviews_for_staff()
  to authenticated;
