-- Validation lints for staging Security Advisor warning cleanup.
-- Safe to run in migration order; assertions raise only if broad mutation
-- policies or anonymous direct mutation privileges remain on sensitive tables.

begin;

do $$
declare
  sensitive_table text;
  sensitive_tables text[] := array[
    'ai_assessments',
    'autonomous_recruiter_memory',
    'autonomous_recruiter_runs',
    'bd_contacts',
    'candidate_skills',
    'companies',
    'job_requirements',
    'submissions'
  ];
begin
  foreach sensitive_table in array sensitive_tables loop
    if has_table_privilege('anon', format('public.%I', sensitive_table), 'insert')
       or has_table_privilege('anon', format('public.%I', sensitive_table), 'update')
       or has_table_privilege('anon', format('public.%I', sensitive_table), 'delete') then
      raise exception 'anon still has direct mutation privilege on public.%', sensitive_table;
    end if;

    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = sensitive_table
        and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
        and ('anon' = any(roles) or 'public' = any(roles))
    ) then
      raise exception 'public/anon mutating policy remains on public.%', sensitive_table;
    end if;

    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = sensitive_table
        and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
        and (
          regexp_replace(coalesce(qual, ''), '\s+', '', 'g') in ('true', '(true)')
          or regexp_replace(coalesce(with_check, ''), '\s+', '', 'g') in ('true', '(true)')
        )
    ) then
      raise exception 'broad mutating policy remains on public.%', sensitive_table;
    end if;
  end loop;
end $$;

do $$
begin
  if not has_table_privilege('anon', 'public.candidate_intent_events', 'insert') then
    raise exception 'candidate_intent_events anon insert contract is unexpectedly unavailable';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policy policy
    join pg_catalog.pg_class relation
      on relation.oid = policy.polrelid
    join pg_catalog.pg_namespace namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'candidate_intent_events'
      and policy.polcmd in ('a', '*')
      and (
        pg_catalog.to_regrole('anon')::oid = any(policy.polroles)
        or 0::oid = any(policy.polroles)
      )
      and regexp_replace(
        coalesce(pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid), ''),
        '\s+',
        '',
        'g'
      ) in ('true', '(true)')
  ) then
    raise exception 'candidate_intent_events still has broad anonymous insert check';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policy policy
    join pg_catalog.pg_class relation
      on relation.oid = policy.polrelid
    join pg_catalog.pg_namespace namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'candidate_intent_events'
      and policy.polname = 'allow constrained write candidate intent events'
      and policy.polcmd = 'a'
      and policy.polpermissive = true
      and policy.polqual is null
      and policy.polwithcheck is not null
      and pg_catalog.to_regrole('anon')::oid = any(policy.polroles)
      and pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid) ilike '%action_type%'
      and pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid) ilike '%candidate_id%'
      and pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid) ilike '%job_id%'
      and pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid) ilike '%matches_viewed%'
      and pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid) ilike '%interest_clicked%'
      and pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid) ilike '%job_saved%'
  ) then
    raise exception 'candidate_intent_events constrained insert policy is missing';
  end if;
end $$;

do $$
declare
  staff_policy record;
  expected_staff_policies text[] := array[
    'ai_assessments_insert_staff',
    'ai_assessments_update_staff',
    'autonomous_recruiter_memory_insert_staff',
    'autonomous_recruiter_runs_insert_staff',
    'bd_contacts_insert_staff',
    'bd_contacts_update_staff',
    'candidate_skills_insert_staff',
    'candidate_skills_update_staff',
    'candidate_skills_delete_staff',
    'companies_insert_staff',
    'companies_update_staff',
    'job_requirements_insert_staff',
    'job_requirements_update_staff',
    'submissions_insert_staff',
    'submissions_update_staff',
    'submissions_delete_staff'
  ];
begin
  for staff_policy in
    select unnest(expected_staff_policies) as policyname
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and policyname = staff_policy.policyname
        and 'authenticated' = any(roles)
        and (
          coalesce(qual, '') ilike '%profiles%'
          or coalesce(with_check, '') ilike '%profiles%'
        )
        and (
          coalesce(qual, '') ilike '%role%'
          or coalesce(with_check, '') ilike '%role%'
        )
    ) then
      raise exception 'expected staff policy % is missing or does not use profiles role contract', staff_policy.policyname;
    end if;
  end loop;
end $$;

do $$
begin
  if has_function_privilege('anon', 'public.is_current_user_admin()', 'execute') then
    raise exception 'anon can still execute public.is_current_user_admin()';
  end if;

  if not has_function_privilege('authenticated', 'public.is_current_user_admin()', 'execute') then
    raise exception 'authenticated cannot execute public.is_current_user_admin(); RLS helper compatibility may break';
  end if;
end $$;

commit;
