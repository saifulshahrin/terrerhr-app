-- Staging validation fix, 2026-07.
-- Assert no broad public/anonymous SELECT policy remains on sensitive Advisor tables.

begin;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('candidates', 'web_job_interest', 'jobs', 'employer_job_intake', 'employer_intake_actions')
      and cmd = 'SELECT'
      and (
        roles @> array['anon']::name[]
        or roles @> array['public']::name[]
      )
  ) then
    raise exception 'anonymous/public SELECT policy still exists on a sensitive Advisor table';
  end if;
end $$;

commit;
