-- Read-only acceptance for the controlled four-row pilot, except for one
-- transaction-local reconciliation probe that is always rolled back.

begin;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.external_opportunities
  where id like 'pilot:%';
  if v_count <> 4 then
    raise exception 'Expected exactly 4 controlled pilot rows, found %', v_count;
  end if;

  select count(*) into v_count
  from public.external_opportunities
  where id like 'pilot:%'
    and opportunity_summary is null
    and verification_status = 'verified_active'
    and publication_status = 'published';
  if v_count <> 4 then
    raise exception 'Pilot freshness/publication state is not exact';
  end if;

  if (
    select count(*)
    from public.external_opportunities
    where id like 'pilot:%'
      and posted_at is not null
  ) <> 1 or not exists (
    select 1
    from public.external_opportunities
    where id = 'pilot:software:dassault-systemes:548642'
      and posted_at = '2026-06-15T00:00:00Z'::timestamptz
  ) then
    raise exception 'Only the explicitly published Dassault date may be recorded';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'external_opportunities'
      and indexname = 'external_opportunities_normalized_source_url_uq'
      and indexdef ilike 'create unique index%'
  ) then
    raise exception 'Normalized source URL uniqueness is missing';
  end if;
end
$$;

-- A repeated source reference from a different company must remain a distinct
-- opportunity. This probe proves the reconciliation index is non-unique.
insert into public.external_opportunities (
  id,
  job_title,
  company_name,
  location,
  source_name,
  source_type,
  source_url,
  source_reference_id,
  last_verified_at
)
values (
  'acceptance:source-reference-collision',
  'Acceptance probe',
  'Different Company',
  'Malaysia',
  'Acceptance only',
  'employer_job_detail',
  'https://example.com/acceptance/source-reference-collision',
  '548642',
  transaction_timestamp()
);

do $$
begin
  if (
    select count(*)
    from public.external_opportunities
    where source_reference_id = '548642'
  ) <> 2 then
    raise exception 'Source reference collision merged unrelated companies';
  end if;

  if exists (
    select 1
    from public.external_opportunity_reviews
    where external_opportunity_id like 'pilot:%'
  ) then
    raise exception 'Pilot unexpectedly created external review rows';
  end if;
end
$$;

rollback;
