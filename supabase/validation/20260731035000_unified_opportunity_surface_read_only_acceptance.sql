-- Terrer Unified Opportunity Surface — non-executing read-only acceptance specification.
-- Generated from approved design SHA-256:
-- 04b5db0c12489b1dc6dff832c0c572f6ea3a51ddd755a53242da64de222f0297
--
-- This file was not executed during migration reconciliation. It contains only
-- read-only catalog/data checks. Run it only in an explicitly approved local
-- or staging validation phase after applying the schema migration there.

-- 1. Required dependency contract.
select
  current_setting('server_version_num')::integer >= 150000
    as supported_postgresql_version,
  to_regnamespace('private') is not null
    as private_schema_exists,
  to_regclass('public.candidates') is not null
    as candidates_exists,
  to_regclass('public.profiles') is not null
    as profiles_exists,
  to_regprocedure('private.is_current_user_active_staff()') is not null
    as active_staff_helper_exists,
  to_regprocedure('auth.uid()') is not null
    as auth_uid_exists;

select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'candidates' and column_name in ('candidate_id', 'email'))
    or
    (
      table_name = 'profiles'
      and column_name in ('id', 'role', 'is_active')
    )
  )
order by table_name, ordinal_position;

select
  rolname,
  rolbypassrls
from pg_roles
where rolname in ('anon', 'authenticated', 'service_role')
order by rolname;

-- 2. Generated-column and normalizer contract.
select
  p.proname,
  p.provolatile = 'i' as is_immutable,
  not p.prosecdef as is_security_invoker,
  pg_get_function_identity_arguments(p.oid) as identity_arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'normalize_external_source_url';

select
  a.attname,
  a.attgenerated,
  pg_get_expr(d.adbin, d.adrelid) as generation_expression
from pg_attribute a
join pg_attrdef d
  on d.adrelid = a.attrelid
 and d.adnum = a.attnum
where a.attrelid = 'public.external_opportunities'::regclass
  and a.attname = 'normalized_source_url';

select
  public.normalize_external_source_url(
    'HTTPS://Jobs.Sample.invalid/role/123/?utm_source=campaign#apply'
  ) = 'https://jobs.sample.invalid/role/123'
    as normalizes_scheme_host_trailing_slash_fragment_tracking,
  public.normalize_external_source_url(
    'https://jobs.sample.invalid/role/123?job=7&utm_campaign=x&lang=en'
  ) = 'https://jobs.sample.invalid/role/123?job=7&lang=en'
    as removes_known_tracking_and_sorts_remaining,
  public.normalize_external_source_url(
    'https://jobs.sample.invalid/role/123?tenant=a'
  ) <>
  public.normalize_external_source_url(
    'https://jobs.sample.invalid/role/123?tenant=b'
  ) as preserves_unknown_identity_parameters;

-- 3. Source identity and reconciliation-index contract.
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'external_opportunities'
  and indexname in (
    'external_opportunities_normalized_source_url_uq',
    'external_opportunities_source_reference_reconciliation_idx'
  )
order by indexname;

-- Expected:
-- - normalized_source_url has the only external-opportunity source-identity
--   UNIQUE index, so a normalized URL collision fails closed.
-- - source_type/lower(source_name)/source_reference_id is indexed only for
--   non-unique reconciliation lookup and diagnostics.

-- Must return zero rows: no source-reference uniqueness constraint or unique
-- index may be present.
select
  i.relname as index_name,
  pg_get_indexdef(i.oid) as index_definition
from pg_index x
join pg_class i on i.oid = x.indexrelid
join pg_class t on t.oid = x.indrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'external_opportunities'
  and x.indisunique
  and lower(pg_get_indexdef(i.oid)) ~
    'source_type.*source_name.*source_reference_id';

-- 4. Trigger inventory and deterministic execution order.
-- PostgreSQL fires same-kind triggers in alphabetical trigger-name order.
select
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and n.nspname = 'public'
  and c.relname in (
    'external_opportunities',
    'external_opportunity_reviews'
  )
order by c.relname, t.tgname;

-- Expected opportunity UPDATE order:
-- 1. external_opportunities_guard_immutable_fields
-- 2. external_opportunities_set_updated_at
-- The guard does not write updated_at; the timestamp trigger sets transaction
-- time through now(), producing deterministic per-transaction behavior.

-- 5. Table RLS and policy matrix.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'external_opportunities',
    'external_opportunity_reviews'
  )
order by c.relname;

select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'external_opportunities',
    'external_opportunity_reviews'
  )
order by tablename, policyname;

-- 6. Candidate-safe review column exposure.
select
  grantee,
  privilege_type,
  column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'external_opportunity_reviews'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type, column_name;

-- Must return zero rows.
select
  grantee,
  privilege_type,
  column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'external_opportunity_reviews'
  and grantee in ('anon', 'authenticated')
  and privilege_type = 'SELECT'
  and column_name in ('review_notes', 'reviewed_by');

-- Must return zero direct candidate INSERT/DELETE grants and no broad table
-- UPDATE grant. The only authenticated direct column UPDATE grant is
-- review_status, and it remains staff-gated by RLS and the transition trigger.
select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'external_opportunity_reviews'
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('INSERT', 'DELETE', 'TRUNCATE');

select
  grantee,
  privilege_type,
  column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'external_opportunity_reviews'
  and grantee = 'authenticated'
  and privilege_type = 'UPDATE'
order by column_name;

-- Expected: exactly one row, for review_status.

select
  coalesce(
    array_agg(column_name::text order by column_name)
      filter (where column_name is not null),
    '{}'::text[]
  ) = array['review_status']::text[]
    as authenticated_update_is_review_status_only
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'external_opportunity_reviews'
  and grantee = 'authenticated'
  and privilege_type = 'UPDATE';

-- Must return zero rows: review_notes is mutable only through the guarded RPC.
select
  grantee,
  privilege_type,
  column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'external_opportunity_reviews'
  and grantee = 'authenticated'
  and privilege_type = 'UPDATE'
  and column_name = 'review_notes';

-- 7. Trusted review-creation RPC execution ACL.
select
  p.oid::regprocedure as routine,
  pg_get_userbyid(p.proowner) as owner_name,
  p.prosecdef as security_definer,
  coalesce(
    array_agg(
      distinct case
        when acl.grantee = 0 then 'PUBLIC'
        else pg_get_userbyid(acl.grantee)
      end
    ) filter (where acl.privilege_type = 'EXECUTE'),
    '{}'::text[]
  ) as execute_grantees
from pg_proc p
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
where p.oid =
  'public.create_external_opportunity_review_trusted(uuid,text,smallint,text[])'
  ::regprocedure
group by p.oid, p.proowner, p.prosecdef;

-- Expected API-role result: service_role only. The function owner and database
-- superusers retain PostgreSQL owner/superuser authority by design.

-- 8. Guarded internal-note RPC contract and execution ACL.
select
  to_regprocedure(
    'public.update_external_opportunity_review_note(uuid,text)'
  ) is not null as internal_note_rpc_exists;

select
  p.oid::regprocedure as routine,
  p.prosecdef as security_definer,
  p.proconfig as fixed_configuration,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_function_result(p.oid) as result_type,
  coalesce(
    array_agg(
      distinct case
        when acl.grantee = 0 then 'PUBLIC'
        else pg_get_userbyid(acl.grantee)
      end
    ) filter (
      where acl.privilege_type = 'EXECUTE'
        and (
          acl.grantee = 0
          or pg_get_userbyid(acl.grantee) in (
            'anon',
            'authenticated',
            'service_role'
          )
        )
    ),
    '{}'::text[]
  ) as api_execute_grantees
from pg_proc p
cross join lateral aclexplode(
  coalesce(p.proacl, acldefault('f', p.proowner))
) acl
where p.oid =
  'public.update_external_opportunity_review_note(uuid,text)'::regprocedure
group by p.oid, p.prosecdef, p.proconfig;

-- Expected:
-- - routine exists with identity arguments p_review_id uuid, p_review_notes text
-- - security_definer is true
-- - fixed_configuration contains search_path=pg_catalog, pg_temp
-- - authenticated is the only API execution grantee

select
  has_function_privilege(
    'authenticated',
    'public.update_external_opportunity_review_note(uuid,text)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'anon',
    'public.update_external_opportunity_review_note(uuid,text)',
    'EXECUTE'
  ) is false as anon_cannot_execute,
  has_function_privilege(
    'service_role',
    'public.update_external_opportunity_review_note(uuid,text)',
    'EXECUTE'
  ) is false as service_role_cannot_execute,
  not exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(
      coalesce(p.proacl, acldefault('f', p.proowner))
    ) acl
    where p.oid =
      'public.update_external_opportunity_review_note(uuid,text)'::regprocedure
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) as public_cannot_execute;

-- Static definition proof for identity authorization and mutation scope.
-- The first five columns must be true and forbidden_fields_referenced must be
-- false. Candidate and BD callers share authenticated EXECUTE at the API ACL
-- layer but cannot pass both runtime authorization gates; only an active
-- admin/recruiter profile can reach the UPDATE statement.
with note_rpc as (
  select lower(pg_get_functiondef(
    'public.update_external_opportunity_review_note(uuid,text)'::regprocedure
  )) as definition
)
select
  definition ~ 'v_actor_id[[:space:]]+uuid[[:space:]]*:=[[:space:]]*auth\.uid\(\)'
    and definition ~
      'if[[:space:]]+v_actor_id[[:space:]]+is[[:space:]]+null'
    as requires_non_null_auth_identity,
  definition ~ 'private\.is_current_user_active_staff\(\)'
    as requires_active_staff,
  definition ~
    'role[[:space:]]+in[[:space:]]*\(''admin'',[[:space:]]*''recruiter''\)'
    as requires_admin_or_recruiter,
  definition ~
    'role[[:space:]]+in[[:space:]]*\(''admin'',[[:space:]]*''recruiter''\)'
    and definition !~
      'role[[:space:]]+in[[:space:]]*\([^)]*''(candidate|bd)'''
    as candidate_and_bd_cannot_pass_role_gate,
  regexp_count(definition, 'errcode[[:space:]]*=[[:space:]]*''42501''') >= 3
    as unauthorized_paths_raise_42501,
  definition ~ 'external opportunity review not found'
    and definition ~ 'errcode[[:space:]]*=[[:space:]]*''p0002'''
    as clear_not_found_error,
  definition ~
    'update[[:space:]]+public\.external_opportunity_reviews'
    as updates_review_table,
  definition ~
    'set[[:space:]]+review_notes[[:space:]]*='
    as updates_review_notes,
  definition ~
    '\m(review_status|match_score|match_reasons|candidate_id|external_opportunity_id|requested_at|created_at|under_review_at|completed_at|closed_at|reviewed_at|reviewed_by|updated_at)\M'
    as forbidden_fields_referenced
from note_rpc;

-- 9. BD mutation denial and approved staff mutation policies.
select
  policyname,
  cmd,
  with_check,
  qual
from pg_policies
where schemaname = 'public'
  and tablename in (
    'external_opportunities',
    'external_opportunity_reviews'
  )
  and cmd in ('INSERT', 'UPDATE', 'DELETE')
order by tablename, policyname;

-- Inspect policy text above: every INSERT/UPDATE path must require an active
-- profile role in ('admin','recruiter'); no DELETE policy may exist.

-- 10. Canonical lifecycle isolation: generated routines/triggers must not
-- reference or write canonical recruitment objects.
-- Must return zero rows.
with generated_routines as (
  select
    p.oid::regprocedure as routine,
    lower(pg_get_functiondef(p.oid)) as definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where (n.nspname, p.proname) in (
    ('private', 'set_row_updated_at'),
    ('public', 'normalize_external_source_url'),
    ('private', 'guard_external_opportunity_immutable_fields'),
    ('private', 'guard_external_review_transition'),
    ('public', 'create_external_opportunity_review_trusted'),
    ('public', 'update_external_opportunity_review_note'),
    ('public', 'list_external_reviews_for_staff')
  )
)
select routine
from generated_routines
where definition ~
  '\m(web_job_interest|applications|submissions|representation)\M';

-- 11. Review identity, idempotency, and FK contract.
select
  conname,
  contype,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.external_opportunity_reviews'::regclass
order by conname;

-- Expected:
-- - UNIQUE(candidate_id, external_opportunity_id)
-- - candidate FK
-- - external opportunity FK with ON UPDATE NO ACTION / ON DELETE RESTRICT
-- - no candidate UPDATE/DELETE path

-- 12. Source-reference reconciliation diagnostics.
-- Rows returned here share internal source metadata across more than one
-- company. The metadata is intentionally non-unique and must never override
-- normalized_source_url as the enforced external-opportunity identity.
select
  source_type,
  lower(source_name) as normalized_source_name,
  source_reference_id,
  count(*) as row_count,
  count(distinct lower(company_name)) as company_count,
  array_agg(distinct company_name order by company_name) as companies
from public.external_opportunities
where source_reference_id is not null
group by source_type, lower(source_name), source_reference_id
having count(distinct lower(company_name)) > 1
order by source_type, normalized_source_name, source_reference_id;

-- 13. Production-facing data hygiene. Must return zero rows.
select id, source_url
from public.external_opportunities
where lower(id) ~ '(fixture|validation|test)'
   or lower(source_url) ~ '^https?://([^/]+\.)?example\.com([/:]|$)';

-- 14. Confirm schema migration contains no data/backfill by reviewing the
-- migration source itself. The approved four-record backfill remains a
-- separately gated design artifact and is not part of this migration.
