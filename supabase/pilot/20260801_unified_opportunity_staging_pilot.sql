-- Controlled staging-only pilot for project nulpvbirlhauukccunqg.
-- Execute only through scripts/applyUnifiedOpportunityStagingPilot.mjs.
-- Re-running is safe: normalized source URLs reconcile to the existing row, and
-- the assertions fail closed if an existing row does not exactly match approval.

\set ON_ERROR_STOP on
\if :{?target_project_ref}
\else
  \set target_project_ref '__MISSING__'
\endif

begin;

select set_config(
  'terrer.target_project_ref',
  :'target_project_ref',
  false
);

do $$
begin
  if current_setting('terrer.target_project_ref', true)
     is distinct from 'nulpvbirlhauukccunqg' then
    raise exception 'Pilot target project is not the approved staging project';
  end if;

  if not exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260801085404'
  ) then
    raise exception 'Pilot requires migration 20260801085404';
  end if;
end
$$;

insert into public.external_opportunities (
  id,
  job_title,
  company_name,
  location,
  role_family,
  source_name,
  source_type,
  source_url,
  source_reference_id,
  posted_at,
  discovered_at,
  last_verified_at,
  verification_status,
  publication_status
)
values
  (
    'pilot:finance-advisory:accenture:r00314590',
    'Management Consulting - Financial Services: Capital Markets (Analyst/Consultant/Manager) S&C GN MY',
    'Accenture',
    'Kuala Lumpur, Exchange 106',
    'finance-advisory',
    'Accenture Workday',
    'employer_ats',
    'https://accenture.wd103.myworkdayjobs.com/en-US/AccentureCareers/job/Management-Consulting---Financial-Services--Capital-Markets--Analyst-Consultant-Manager--S-C-GN-MY_R00314590',
    'R00314590',
    null,
    transaction_timestamp(),
    transaction_timestamp(),
    'verified_active',
    'published'
  ),
  (
    'pilot:software:dassault-systemes:548642',
    'Software Engineer (Platform Development)',
    'Dassault Systèmes',
    'Petaling Jaya, Selangor',
    'software',
    'Dassault Systèmes Careers',
    'employer_job_detail',
    'https://www.3ds.com/careers/jobs/software-engineer-platform-development-548642',
    '548642',
    '2026-06-15T00:00:00Z'::timestamptz,
    transaction_timestamp(),
    transaction_timestamp(),
    'verified_active',
    'published'
  ),
  (
    'pilot:data:ntt-data:r-143823',
    'Data Analyst',
    'NTT DATA',
    'Petaling Jaya, Malaysia',
    'data',
    'NTT DATA Workday',
    'employer_ats',
    'https://nttlimited.wd3.myworkdayjobs.com/en-US/NTT_Careers/job/Data-Analyst_R-143823',
    'R-143823',
    null,
    transaction_timestamp(),
    transaction_timestamp(),
    'verified_active',
    'published'
  ),
  (
    'pilot:fresh-graduate:shell:r207428',
    'R&A FAC Analyst',
    'Shell',
    'Shell Centre Kuala Lumpur, Selangor',
    'fresh-graduate',
    'Shell Workday',
    'employer_ats',
    'https://shell.wd3.myworkdayjobs.com/en-US/shellcareers/job/Shell-Centre-Kuala-Lumpur/R-A-FAC-Analyst_R207428',
    'R207428',
    null,
    transaction_timestamp(),
    transaction_timestamp(),
    'verified_active',
    'published'
  )
on conflict (normalized_source_url) do nothing;

do $$
declare
  v_matching_count integer;
begin
  select count(*)
  into v_matching_count
  from public.external_opportunities eo
  join (
    values
      (
        'pilot:finance-advisory:accenture:r00314590',
        'Management Consulting - Financial Services: Capital Markets (Analyst/Consultant/Manager) S&C GN MY',
        'Accenture', 'Kuala Lumpur, Exchange 106', 'finance-advisory',
        'Accenture Workday', 'employer_ats',
        'https://accenture.wd103.myworkdayjobs.com/en-US/AccentureCareers/job/Management-Consulting---Financial-Services--Capital-Markets--Analyst-Consultant-Manager--S-C-GN-MY_R00314590',
        'R00314590', null::timestamptz
      ),
      (
        'pilot:software:dassault-systemes:548642',
        'Software Engineer (Platform Development)',
        'Dassault Systèmes', 'Petaling Jaya, Selangor', 'software',
        'Dassault Systèmes Careers', 'employer_job_detail',
        'https://www.3ds.com/careers/jobs/software-engineer-platform-development-548642',
        '548642', '2026-06-15T00:00:00Z'::timestamptz
      ),
      (
        'pilot:data:ntt-data:r-143823', 'Data Analyst', 'NTT DATA',
        'Petaling Jaya, Malaysia', 'data', 'NTT DATA Workday', 'employer_ats',
        'https://nttlimited.wd3.myworkdayjobs.com/en-US/NTT_Careers/job/Data-Analyst_R-143823',
        'R-143823', null::timestamptz
      ),
      (
        'pilot:fresh-graduate:shell:r207428', 'R&A FAC Analyst', 'Shell',
        'Shell Centre Kuala Lumpur, Selangor', 'fresh-graduate', 'Shell Workday',
        'employer_ats',
        'https://shell.wd3.myworkdayjobs.com/en-US/shellcareers/job/Shell-Centre-Kuala-Lumpur/R-A-FAC-Analyst_R207428',
        'R207428', null::timestamptz
      )
  ) approved(
    id, job_title, company_name, location, role_family, source_name,
    source_type, source_url, source_reference_id, posted_at
  )
    on eo.id = approved.id
   and eo.job_title = approved.job_title
   and eo.company_name = approved.company_name
   and eo.location = approved.location
   and eo.role_family = approved.role_family
   and eo.source_name = approved.source_name
   and eo.source_type = approved.source_type
   and eo.source_url = approved.source_url
   and eo.source_reference_id = approved.source_reference_id
   and eo.posted_at is not distinct from approved.posted_at
  where eo.verification_status = 'verified_active'
    and eo.publication_status = 'published';

  if v_matching_count <> 4 then
    raise exception 'Pilot reconciliation failed: expected 4 exact approved rows, found %',
      v_matching_count;
  end if;
end
$$;

commit;
