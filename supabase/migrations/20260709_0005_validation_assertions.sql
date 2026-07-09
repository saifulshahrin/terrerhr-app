-- REVIEW ONLY
-- Transaction-safe validation assertions for the 2026-07 security hardening sprint.
-- If a local Supabase runtime is available, run this inside a transaction on a disposable database.

begin;

do $$
begin
  if exists (
    select 1
    from (
      values
        ('source_profiles'),
        ('evidence_signals'),
        ('skills'),
        ('candidate_capabilities'),
        ('candidate_scores'),
        ('terrer_companies'),
        ('terrer_company_contacts'),
        ('terrer_jobs'),
        ('terrer_candidates'),
        ('terrer_skills'),
        ('terrer_pipeline'),
        ('job_candidate_matches'),
        ('outreach_log'),
        ('candidates')
    ) as required(tablename)
    left join pg_class c
      on c.relname = required.tablename
    left join pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname <> 'public'
       or c.relrowsecurity is distinct from true
  ) then
    raise exception 'one or more Advisor tables still lack RLS';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('candidates', 'web_job_interest', 'jobs', 'employer_job_intake', 'employer_intake_actions')
      and roles @> array['anon']::name[]
      and cmd in ('UPDATE', 'DELETE')
  ) then
    raise exception 'anonymous UPDATE/DELETE still exists on a sensitive Advisor table';
  end if;
end $$;

do $$
begin
  if has_table_privilege('anon', 'public.candidates', 'SELECT') then
    raise exception 'anon can still SELECT public.candidates';
  end if;

  if has_table_privilege('anon', 'public.web_job_interest', 'SELECT')
     or has_table_privilege('anon', 'public.web_job_interest', 'INSERT')
     or has_table_privilege('anon', 'public.web_job_interest', 'UPDATE')
     or has_table_privilege('anon', 'public.web_job_interest', 'DELETE') then
    raise exception 'anon still has access to public.web_job_interest';
  end if;

  if not has_table_privilege('anon', 'public.candidate_web_jobs', 'SELECT') then
    raise exception 'anon cannot read public candidate publication rows';
  end if;

  if has_table_privilege('anon', 'public.jobs', 'SELECT')
     or has_table_privilege('anon', 'public.jobs', 'INSERT')
     or has_table_privilege('anon', 'public.jobs', 'UPDATE')
     or has_table_privilege('anon', 'public.jobs', 'DELETE') then
    raise exception 'anon still has access to public.jobs';
  end if;

  if has_table_privilege('anon', 'public.employer_job_intake', 'SELECT')
     or has_table_privilege('anon', 'public.employer_job_intake', 'INSERT')
     or has_table_privilege('anon', 'public.employer_job_intake', 'UPDATE')
     or has_table_privilege('anon', 'public.employer_job_intake', 'DELETE') then
    raise exception 'anon still has access to public.employer_job_intake';
  end if;

  if has_table_privilege('anon', 'public.employer_intake_actions', 'SELECT')
     or has_table_privilege('anon', 'public.employer_intake_actions', 'INSERT')
     or has_table_privilege('anon', 'public.employer_intake_actions', 'UPDATE')
     or has_table_privilege('anon', 'public.employer_intake_actions', 'DELETE') then
    raise exception 'anon still has access to public.employer_intake_actions';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'candidates'
      and cmd = 'SELECT'
      and roles @> array['authenticated']::name[]
      and lower(coalesce(qual::text, '')) like '%lower(coalesce(email%'
  ) then
    raise exception 'candidate verified-email select policy is missing';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'web_job_interest'
      and cmd in ('SELECT', 'INSERT', 'UPDATE')
      and roles @> array['authenticated']::name[]
  ) then
    raise exception 'web_job_interest authenticated ownership policies are missing';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'candidate_web_jobs'
      and cmd = 'SELECT'
      and roles @> array['anon']::name[]
      and lower(coalesce(qual::text, '')) like '%published%'
  ) then
    raise exception 'candidate_web_jobs published-read policy is missing';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'v'
      and c.relname in (
        'vw_candidate_search_clean',
        'vw_jobs_tier1_malaysia',
        'vw_market_signals',
        'vw_market_signals_active',
        'vw_market_signals_realtime',
        'vw_market_signals_recent',
        'vw_tier1_source_diagnostics',
        'vw_tier1_source_health',
        'vw_tier1_source_health_summary',
        'vw_tier1_source_health_v2',
        'hiring_leaderboard_malaysia',
        'jobs_latest',
        'jobs_latest_practical',
        'jobs_reporting',
        'recruiter_active_submissions',
        'terrer_hiring_now',
        'v_match_shortlist',
        'v_outreach_due',
        'vw_activity_log_enriched',
        'vw_candidate_pipeline_summary',
        'vw_candidate_search',
        'vw_company_pipeline_summary',
        'vw_followup_queue',
        'vw_job_shortlist',
        'vw_live_work_queue',
        'vw_outcomes_summary',
        'vw_pipeline_summary',
        'vw_recruiter_dashboard',
        'vw_submissions_enriched',
        'terrer_jobs_view'
      )
      and (reloptions is null or array_to_string(reloptions, ',') not like '%security_invoker=true%')
  ) then
    raise exception 'one or more Advisor views are not security_invoker';
  end if;
end $$;

do $$
begin
  if not has_table_privilege('authenticated', 'public.vw_candidate_search_clean', 'SELECT')
     or not has_table_privilege('authenticated', 'public.vw_candidate_search', 'SELECT')
     or not has_table_privilege('authenticated', 'public.vw_submissions_enriched', 'SELECT')
     or not has_table_privilege('authenticated', 'public.jobs_latest_practical', 'SELECT') then
    raise exception 'authenticated select grants are missing on one or more Advisor views';
  end if;
end $$;

rollback;
