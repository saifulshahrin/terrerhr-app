begin transaction read only;

select
  sm.*
from supabase_migrations.schema_migrations as sm
order by sm.version;

with targets(object_name, ordinal) as (
  values
    ('candidates', 1),
    ('web_job_interest', 2),
    ('candidate_web_jobs', 3),
    ('jobs', 4),
    ('employer_job_intake', 5),
    ('employer_intake_actions', 6),
    ('activity_log', 7),
    ('staging_bullhorn_companies', 8),
    ('staging_bullhorn_contacts', 9),
    ('source_profiles', 10),
    ('evidence_signals', 11),
    ('skills', 12),
    ('candidate_capabilities', 13),
    ('candidate_scores', 14),
    ('terrer_companies', 15),
    ('terrer_company_contacts', 16),
    ('terrer_jobs', 17),
    ('terrer_candidates', 18),
    ('terrer_skills', 19),
    ('terrer_pipeline', 20),
    ('job_candidate_matches', 21),
    ('outreach_log', 22)
),
table_catalog as (
  select
    t.object_name,
    t.ordinal,
    c.oid,
    n.nspname as schema_name,
    c.relname,
    c.relkind,
    c.relrowsecurity,
    c.relforcerowsecurity,
    c.relowner
  from targets as t
  left join pg_class as c
    on c.oid = to_regclass('public.' || t.object_name)
  left join pg_namespace as n
    on n.oid = c.relnamespace
)
select
  tc.object_name,
  tc.schema_name,
  (tc.oid is not null) as exists,
  tc.relkind,
  tc.relrowsecurity as rls_enabled,
  tc.relforcerowsecurity as rls_forced,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'ordinal_position', cols.ordinal_position,
        'column_name', cols.column_name,
        'data_type', cols.data_type,
        'udt_name', cols.udt_name,
        'is_nullable', cols.is_nullable,
        'column_default', cols.column_default,
        'identity_generation', cols.identity_generation,
        'is_generated', cols.is_generated
      )
      order by cols.ordinal_position
    ) filter (where cols.column_name is not null),
    '[]'::jsonb
  ) as columns
from table_catalog as tc
left join information_schema.columns as cols
  on cols.table_schema = tc.schema_name
 and cols.table_name = tc.relname
group by
  tc.object_name,
  tc.ordinal,
  tc.schema_name,
  tc.oid,
  tc.relkind,
  tc.relrowsecurity,
  tc.relforcerowsecurity
order by tc.ordinal;

select
  p.schemaname,
  p.tablename,
  p.policyname,
  p.permissive,
  p.roles,
  p.cmd,
  p.qual,
  p.with_check
from pg_policies as p
where p.schemaname = 'public'
  and p.tablename in (
    'candidates',
    'web_job_interest',
    'candidate_web_jobs',
    'jobs',
    'employer_job_intake',
    'employer_intake_actions',
    'activity_log',
    'staging_bullhorn_companies',
    'staging_bullhorn_contacts'
  )
order by p.tablename, p.cmd, p.policyname;

with targets(object_name, ordinal) as (
  values
    ('candidates', 1),
    ('web_job_interest', 2),
    ('candidate_web_jobs', 3),
    ('jobs', 4),
    ('employer_job_intake', 5),
    ('employer_intake_actions', 6),
    ('activity_log', 7),
    ('staging_bullhorn_companies', 8),
    ('staging_bullhorn_contacts', 9),
    ('jobs_latest_practical', 10),
    ('vw_candidate_search', 11),
    ('jobs_reporting', 12),
    ('terrer_hiring_now', 13),
    ('jobs_latest', 14),
    ('terrer_jobs_view', 15),
    ('v_match_shortlist', 16),
    ('v_outreach_due', 17),
    ('hiring_leaderboard_malaysia', 18),
    ('vw_company_pipeline_summary', 19),
    ('vw_candidate_pipeline_summary', 20),
    ('vw_market_signals_active', 21),
    ('vw_market_signals', 22),
    ('vw_market_signals_realtime', 23),
    ('vw_activity_log_enriched', 24),
    ('vw_market_signals_recent', 25),
    ('vw_pipeline_summary', 26),
    ('vw_outcomes_summary', 27),
    ('vw_live_work_queue', 28),
    ('vw_submissions_enriched', 29),
    ('recruiter_active_submissions', 30),
    ('vw_followup_queue', 31),
    ('vw_job_shortlist', 32),
    ('vw_recruiter_dashboard', 33),
    ('vw_tier1_source_diagnostics', 34),
    ('vw_jobs_tier1_malaysia', 35),
    ('vw_tier1_source_health', 36),
    ('vw_tier1_source_health_v2', 37),
    ('vw_tier1_source_health_summary', 38)
),
relation_catalog as (
  select
    t.object_name,
    t.ordinal,
    c.oid,
    n.nspname as schema_name,
    c.relname,
    c.relkind,
    c.relrowsecurity,
    c.relforcerowsecurity,
    c.relowner,
    c.reloptions
  from targets as t
  left join pg_class as c
    on c.oid = to_regclass('public.' || t.object_name)
  left join pg_namespace as n
    on n.oid = c.relnamespace
)
select
  rc.object_name,
  rc.schema_name,
  (rc.oid is not null) as exists,
  rc.relkind,
  rc.reloptions,
  rc.relrowsecurity as rls_enabled,
  rc.relforcerowsecurity as rls_forced,
  case
    when rc.relkind = 'v' then pg_get_viewdef(rc.oid, true)
    else null
  end as view_definition,
  case
    when rc.relkind = 'v' then v.check_option
    else null
  end as check_option,
  case
    when rc.relkind = 'v' then v.is_updatable
    else null
  end as is_updatable,
  case
    when rc.relkind = 'v' then v.is_insertable_into
    else null
  end as is_insertable_into
from relation_catalog as rc
left join information_schema.views as v
  on v.table_schema = rc.schema_name
 and v.table_name = rc.relname
order by rc.ordinal;

with targets(object_name, ordinal) as (
  values
    ('candidates', 1),
    ('web_job_interest', 2),
    ('candidate_web_jobs', 3),
    ('jobs', 4),
    ('employer_job_intake', 5),
    ('employer_intake_actions', 6),
    ('activity_log', 7),
    ('staging_bullhorn_companies', 8),
    ('staging_bullhorn_contacts', 9),
    ('jobs_latest_practical', 10),
    ('vw_candidate_search', 11),
    ('jobs_reporting', 12),
    ('terrer_hiring_now', 13),
    ('jobs_latest', 14),
    ('terrer_jobs_view', 15),
    ('v_match_shortlist', 16),
    ('v_outreach_due', 17),
    ('hiring_leaderboard_malaysia', 18),
    ('vw_company_pipeline_summary', 19),
    ('vw_candidate_pipeline_summary', 20),
    ('vw_market_signals_active', 21),
    ('vw_market_signals', 22),
    ('vw_market_signals_realtime', 23),
    ('vw_activity_log_enriched', 24),
    ('vw_market_signals_recent', 25),
    ('vw_pipeline_summary', 26),
    ('vw_outcomes_summary', 27),
    ('vw_live_work_queue', 28),
    ('vw_submissions_enriched', 29),
    ('recruiter_active_submissions', 30),
    ('vw_followup_queue', 31),
    ('vw_job_shortlist', 32),
    ('vw_recruiter_dashboard', 33),
    ('vw_tier1_source_diagnostics', 34),
    ('vw_jobs_tier1_malaysia', 35),
    ('vw_tier1_source_health', 36),
    ('vw_tier1_source_health_v2', 37),
    ('vw_tier1_source_health_summary', 38)
),
relation_catalog as (
  select
    t.object_name,
    t.ordinal,
    c.oid,
    n.nspname as schema_name,
    c.relname,
    c.relkind,
    c.relowner
  from targets as t
  left join pg_class as c
    on c.oid = to_regclass('public.' || t.object_name)
  left join pg_namespace as n
    on n.oid = c.relnamespace
)
select
  rc.object_name,
  rc.schema_name,
  rc.relkind,
  case
    when a.grantee = 0 then 'public'
    else grantee_role.rolname
  end as grantee_role,
  case
    when a.grantor = 0 then null
    else grantor_role.rolname
  end as grantor_role,
  a.privilege_type,
  a.is_grantable
from relation_catalog as rc
cross join lateral aclexplode(coalesce(
  case
    when rc.relkind in ('v', 'm') then acldefault('v', rc.relowner)
    when rc.relkind in ('r', 'p') then acldefault('r', rc.relowner)
    when rc.relkind = 'S' then acldefault('S', rc.relowner)
    else acldefault('r', rc.relowner)
  end,
  acldefault('r', rc.relowner)
)) as a
left join pg_roles as grantee_role
  on grantee_role.oid = a.grantee
left join pg_roles as grantor_role
  on grantor_role.oid = a.grantor
where rc.oid is not null
order by rc.ordinal, a.privilege_type, grantee_role.rolname, grantor_role.rolname;

select
  p.pronamespace::regnamespace::text as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_function_result(p.oid) as return_type,
  p.prokind,
  p.prosecdef as security_definer,
  p.provolatile,
  p.proleakproof,
  p.proparallel,
  p.prorettype::regtype::text as return_type_regtype,
  p.proowner::regrole::text as owner_role,
  p.proacl
from pg_proc as p
where p.pronamespace = 'public'::regnamespace
  and p.proname = 'is_current_user_admin';

select
  case
    when a.grantee = 0 then 'public'
    else grantee_role.rolname
  end as grantee_role,
  case
    when a.grantor = 0 then null
    else grantor_role.rolname
  end as grantor_role,
  a.privilege_type,
  a.is_grantable
from pg_proc as p
cross join lateral aclexplode(coalesce(
  p.proacl,
  acldefault('f', p.proowner)
)) as a
left join pg_roles as grantee_role
  on grantee_role.oid = a.grantee
left join pg_roles as grantor_role
  on grantor_role.oid = a.grantor
where p.pronamespace = 'public'::regnamespace
  and p.proname = 'is_current_user_admin'
order by a.privilege_type, grantee_role.rolname, grantor_role.rolname;

rollback;
