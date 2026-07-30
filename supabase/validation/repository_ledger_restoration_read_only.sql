-- READ-ONLY VALIDATION MATERIAL.
-- Do not run until separately authorized.

with expected(version, name, normalized_sql_md5, expected_in_staging, expected_in_production) as (
  values
    ('20260416100300', 'reconcile_pipeline_view_dependencies', 'ad276935abf4b515a7a8a52fca1e0134', true, true),
    ('20260425000000', 'create_candidate_marketplace_contracts', '8284f4c13d8dd51c59c10f14c1723619', true, true),
    ('20260604090000', 'reconcile_profiles_contract', 'af7c39bacf442931a877c185757b16b4', true, true),
    ('20260708000000', 'reconcile_web_publication_and_employer_contracts', '4699f060a127cf15071385126544c819', true, true),
    ('20260708000100', 'reconcile_advisor_remaining_table_contracts', '5257fb4e717505eb0a28c23493f9e938', true, true),
    ('20260708000200', 'reconcile_advisor_view_contracts', '2a8d3edb5f690ed5dc139b21984c5184', true, true),
    ('20260709000100', 'candidate_email_and_interest_rls', '18217a043d87f5301f9f1f6cf5f6cabe', true, true),
    ('20260709000200', 'advisor_remaining_table_rls', '28e3accee9c323e07f2672214df9489f', true, true),
    ('20260709000300', 'acl_corrections', '8bfa723d02bafd3581d4dabb81b877f0', true, true),
    ('20260709000400', 'view_security_hardening', 'd544cc0b9c89ce3b40172e580981bdb6', true, true),
    ('20260709000500', 'validation_assertions', '5f1d4614a8fb226076504244449c93f7', true, true),
    ('20260711000100', 'drop_legacy_web_job_interest_public_read', 'aea0d08ec7cda85f8beeae5c21d0e0ac', true, true),
    ('20260711000200', 'validation_public_select_assertions', '926f0b27ee23f110ffcda1bd1965edd1', true, true),
    ('20260711000300', 'harden_remaining_staging_advisor_tables', '6fd98ee6c1b62ea2e0d837e5074cae96', true, true),
    ('20260711000400', 'triage_staging_advisor_warnings', '6591fe857e04e419344fbc586f5cd192', true, true),
    ('20260711000500', 'validation_warning_lints', '29d605c0855cdb46cef3e521509c91f3', true, true),
    ('20260723110000', 'reconstruct_applications_from_canonical_evidence', '0cd63ca821eef75023b643705c359ab6', true, true),
    ('20260723110554', 'candidate_engine_applications_staff_access', 'e9b541e4afff1f47f8098a2d826df74d', true, true),
    ('20260723133303', 'active_staff_authorization_helper', '4fb11326568c18968cd45d85011481ff', true, true),
    ('20260723134205', 'restore_active_staff_authorization_effects', 'ebb379a9f87d237862f0675f05563d40', true, true),
    ('20260723135237', 'repair_submissions_active_staff_authorization', 'f3c7b793564b5f2e75ec69018743790a', true, true),
    ('20260723140703', 'repair_activity_log_active_staff_authorization', 'd3c45bf4062db1c6a0c3091f15b77657', true, true),
    ('20260723143425', 'reconcile_candidate_engine_production_authorization', 'f07c7ee2e1eaf811f0337b108bdc6e12', false, true)
),
actual as (
  select
    version,
    name,
    md5(
      regexp_replace(
        array_to_string(statements, ';') || ';',
        '\s+',
        '',
        'g'
      )
    ) as normalized_sql_md5
  from supabase_migrations.schema_migrations
  where version between '20260416100300' and '20260723143425'
)
select
  expected.version,
  expected.name as expected_name,
  actual.name as actual_name,
  expected.normalized_sql_md5 as expected_hash,
  actual.normalized_sql_md5 as actual_hash,
  case
    when actual.version is null then 'ABSENT'
    when actual.name <> expected.name then 'NAME_MISMATCH'
    when actual.normalized_sql_md5 <> expected.normalized_sql_md5 then 'HASH_MISMATCH'
    else 'MATCH'
  end as comparison
from expected
left join actual using (version)
order by expected.version;

select version, count(*) as row_count
from supabase_migrations.schema_migrations
group by version
having count(*) > 1
order by version;

select
  to_regprocedure('private.is_current_user_active_staff()') is not null
    as active_staff_helper_exists,
  has_schema_privilege('authenticated', 'private', 'USAGE')
    as authenticated_private_usage,
  has_function_privilege(
    'authenticated',
    'private.is_current_user_active_staff()',
    'EXECUTE'
  ) as authenticated_helper_execute,
  has_function_privilege(
    'anon',
    'private.is_current_user_active_staff()',
    'EXECUTE'
  ) as anon_helper_execute,
  has_function_privilege(
    'service_role',
    'private.is_current_user_active_staff()',
    'EXECUTE'
  ) as service_role_helper_execute;

select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('applications', 'submissions', 'activity_log')
order by tablename, policyname;
