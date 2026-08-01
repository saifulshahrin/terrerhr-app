-- The approved external-opportunity pilot includes a first-party employer job-detail
-- page that is neither an ATS nor a career-site index. Keep the source taxonomy
-- explicit rather than misclassifying that record.

alter table public.external_opportunities
  drop constraint external_opportunities_source_type_check;

alter table public.external_opportunities
  add constraint external_opportunities_source_type_check
  check (
    source_type in (
      'employer_career_site',
      'employer_job_detail',
      'employer_ats',
      'trusted_job_platform',
      'other_public_source'
    )
  );
