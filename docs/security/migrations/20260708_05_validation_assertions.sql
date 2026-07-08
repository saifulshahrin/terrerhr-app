-- REVIEW ONLY
-- Validation assertions draft
-- Do not apply to production yet.

begin;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'candidates'
      and roles @> array['anon']::name[]
      and lower(coalesce(qual, '')) like '%true%'
  ) then
    raise exception 'anon access still exists on public.candidates';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'web_job_interest'
      and roles @> array['anon']::name[]
      and lower(coalesce(cmd, '')) in ('update', 'delete')
  ) then
    raise exception 'anon update/delete still exists on public.web_job_interest';
  end if;
end $$;

commit;

