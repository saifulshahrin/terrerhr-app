begin transaction read only;

-- Expected: every target table reports `rls_enabled = true`.
select 'rls_enabled_check' as check_name,
       count(*) = 0 as pass
from (
  select required.tablename
  from (
    values
      ('candidates'),
      ('web_job_interest'),
      ('candidate_web_jobs'),
      ('jobs'),
      ('employer_job_intake'),
      ('employer_intake_actions'),
      ('activity_log'),
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
      ('outreach_log')
  ) as required(tablename)
  left join pg_class c
    on c.relname = required.tablename
  left join pg_namespace n
    on n.oid = c.relnamespace
  where c.oid is null
     or n.nspname <> 'public'
     or c.relrowsecurity is distinct from true
) failing;

-- Expected: anon has no direct SELECT/INSERT/UPDATE/DELETE on sensitive tables.
select 'anon_access_check' as check_name,
       count(*) = 0 as pass
from (
  select 1
  where has_table_privilege('anon', 'public.candidates', 'SELECT')
     or has_table_privilege('anon', 'public.web_job_interest', 'SELECT')
     or has_table_privilege('anon', 'public.web_job_interest', 'INSERT')
     or has_table_privilege('anon', 'public.web_job_interest', 'UPDATE')
     or has_table_privilege('anon', 'public.web_job_interest', 'DELETE')
     or has_table_privilege('anon', 'public.jobs', 'SELECT')
     or has_table_privilege('anon', 'public.jobs', 'INSERT')
     or has_table_privilege('anon', 'public.jobs', 'UPDATE')
     or has_table_privilege('anon', 'public.jobs', 'DELETE')
     or has_table_privilege('anon', 'public.employer_job_intake', 'SELECT')
     or has_table_privilege('anon', 'public.employer_job_intake', 'INSERT')
     or has_table_privilege('anon', 'public.employer_job_intake', 'UPDATE')
     or has_table_privilege('anon', 'public.employer_job_intake', 'DELETE')
     or has_table_privilege('anon', 'public.employer_intake_actions', 'SELECT')
     or has_table_privilege('anon', 'public.employer_intake_actions', 'INSERT')
     or has_table_privilege('anon', 'public.employer_intake_actions', 'UPDATE')
     or has_table_privilege('anon', 'public.employer_intake_actions', 'DELETE')
) failing;

-- Expected: candidate_web_jobs is readable by anon for published rows and writable only by authenticated/service_role.
select 'candidate_web_jobs_policy_check' as check_name,
       count(*) = 0 as pass
from (
  select 1
  from pg_policies
  where schemaname = 'public'
    and tablename = 'candidate_web_jobs'
    and (
      (cmd = 'SELECT' and not (roles @> array['anon']::name[] and lower(coalesce(qual, '')) like '%published%'))
      or (cmd = 'ALL' and not (roles @> array['authenticated']::name[]))
    )
) failing;

-- Expected: candidates has verified-email and staff policies.
select 'candidates_policy_check' as check_name,
       count(*) = 0 as pass
from (
  select 1
  where not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'candidates'
      and policyname = 'candidates_select_own_verified_email'
  )
     or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'candidates'
      and policyname = 'candidates_select_staff'
  )
) failing;

-- Expected: web_job_interest ownership and staff policies exist, and no broad public read remains.
select 'web_job_interest_policy_check' as check_name,
       count(*) = 0 as pass
from (
  select 1
  where exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'web_job_interest'
      and cmd = 'SELECT'
      and ('public' = any(roles) or 'anon' = any(roles))
      and lower(coalesce(qual, '')) like '%true%'
  )
     or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'web_job_interest'
      and policyname = 'web_job_interest_select_own_verified_email'
  )
     or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'web_job_interest'
      and policyname = 'web_job_interest_select_staff'
  )
) failing;

-- Expected: jobs only has staff policies.
select 'jobs_policy_check' as check_name,
       count(*) = 0 as pass
from (
  select 1
  where not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'jobs'
      and policyname = 'jobs_select_staff'
  )
     or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'jobs'
      and policyname = 'jobs_insert_staff'
  )
     or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'jobs'
      and policyname = 'jobs_update_staff'
  )
) failing;

-- Expected: profiles keeps authenticated SELECT and UPDATE only, while service_role retains full access.
select 'profiles_acl_check' as check_name,
       count(*) = 0 as pass
from (
  select 1
  where has_table_privilege('authenticated', 'public.profiles', 'INSERT')
     or has_table_privilege('authenticated', 'public.profiles', 'DELETE')
     or not has_table_privilege('authenticated', 'public.profiles', 'SELECT')
     or not has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
) failing;

-- Expected: public/anon cannot EXECUTE is_current_user_admin, authenticated can.
select 'helper_execute_check' as check_name,
       count(*) = 0 as pass
from (
  select 1
  where has_function_privilege('anon', 'public.is_current_user_admin()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.is_current_user_admin()', 'EXECUTE')
) failing;

-- Expected: every finalized view reports security_invoker = true.
select 'view_security_invoker_check' as check_name,
       count(*) = 0 as pass
from (
  select relname
  from (
    values
      ('vw_candidate_search_clean'),
      ('vw_jobs_tier1_malaysia'),
      ('vw_market_signals'),
      ('vw_market_signals_active'),
      ('vw_market_signals_realtime'),
      ('vw_market_signals_recent'),
      ('vw_tier1_source_diagnostics'),
      ('vw_tier1_source_health'),
      ('vw_tier1_source_health_summary'),
      ('vw_tier1_source_health_v2'),
      ('hiring_leaderboard_malaysia'),
      ('jobs_latest'),
      ('jobs_latest_practical'),
      ('jobs_reporting'),
      ('recruiter_active_submissions'),
      ('terrer_hiring_now'),
      ('v_match_shortlist'),
      ('v_outreach_due'),
      ('vw_activity_log_enriched'),
      ('vw_candidate_pipeline_summary'),
      ('vw_candidate_search'),
      ('vw_company_pipeline_summary'),
      ('vw_followup_queue'),
      ('vw_job_shortlist'),
      ('vw_live_work_queue'),
      ('vw_outcomes_summary'),
      ('vw_pipeline_summary'),
      ('vw_recruiter_dashboard'),
      ('vw_submissions_enriched'),
      ('terrer_jobs_view')
  ) as required(relname)
  left join pg_class c
    on c.relname = required.relname
   and c.relkind = 'v'
  left join pg_namespace n
    on n.oid = c.relnamespace
  where c.oid is null
     or n.nspname <> 'public'
     or c.reloptions is null
     or array_to_string(c.reloptions, ',') not like '%security_invoker=true%'
) failing;

-- Expected: authenticated can still read the main candidate and view contracts.
select 'authenticated_select_check' as check_name,
       count(*) = 0 as pass
from (
  select 1
  where not has_table_privilege('authenticated', 'public.vw_candidate_search_clean', 'SELECT')
     or not has_table_privilege('authenticated', 'public.vw_submissions_enriched', 'SELECT')
     or not has_table_privilege('authenticated', 'public.jobs_latest_practical', 'SELECT')
) failing;

rollback;
