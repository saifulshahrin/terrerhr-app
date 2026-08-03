create or replace function public.list_public_external_opportunities_v1()
returns table (
  id uuid,
  job_title text,
  company_name text,
  location text,
  role_family text,
  seniority text,
  skills text[],
  opportunity_summary text,
  source_name text,
  source_url text,
  posted_at timestamptz,
  last_verified_at timestamptz,
  salary_text text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    opportunity.id,
    opportunity.job_title,
    opportunity.company_name,
    opportunity.location,
    opportunity.role_family,
    opportunity.seniority,
    opportunity.skills,
    opportunity.opportunity_summary,
    opportunity.source_name,
    opportunity.source_url,
    opportunity.posted_at,
    opportunity.last_verified_at,
    null::text as salary_text
  from public.external_opportunities as opportunity
  where opportunity.publication_status = 'published'
    and opportunity.verification_status = 'verified_active'
    and opportunity.retired_at is null
    and opportunity.last_verified_at >= now() - interval '30 days'
  order by coalesce(opportunity.posted_at, opportunity.last_verified_at) desc,
    opportunity.id;
$function$;

revoke all on function public.list_public_external_opportunities_v1() from public;
grant execute on function public.list_public_external_opportunities_v1() to anon, authenticated;

comment on function public.list_public_external_opportunities_v1() is
  'Candidate-safe anonymous catalogue of published, active, recently verified external opportunities. Returns an explicit public field allowlist only.';
