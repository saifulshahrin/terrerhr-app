create or replace function public.provision_authenticated_candidate_v1()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_email text;
  v_normalized_email text;
  v_candidate_id uuid;
  v_matches integer;
  v_provenance text;
  v_candidate public.candidates%rowtype;
begin
  if v_auth_user_id is null then
    raise exception using errcode = '28000', message = 'A valid authenticated session is required';
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = v_auth_user_id
    and u.email_confirmed_at is not null
    and coalesce(u.banned_until, '-infinity'::timestamptz) <= now();

  v_normalized_email := lower(btrim(coalesce(v_email, '')));
  if v_normalized_email = '' then
    raise exception using errcode = '28000', message = 'A confirmed email is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_auth_user_id::text, 0));

  select m.candidate_id into v_candidate_id
  from private.candidate_auth_mappings m
  where m.auth_user_id = v_auth_user_id;

  if v_candidate_id is not null then
    select * into strict v_candidate
    from public.candidates c
    where c.candidate_id = v_candidate_id
      and lower(btrim(coalesce(c.email, ''))) = v_normalized_email;
  else
    select count(*) into v_matches
    from public.candidates c
    where lower(btrim(coalesce(c.email, ''))) = v_normalized_email;

    if v_matches > 1 then
      raise exception using errcode = '21000', message = 'Candidate email mapping is ambiguous';
    end if;

    if v_matches = 1 then
      select c.candidate_id into strict v_candidate_id
      from public.candidates c
      where lower(btrim(coalesce(c.email, ''))) = v_normalized_email;
      v_provenance := 'existing_candidate_linked';
    else
      v_candidate_id := gen_random_uuid();
      insert into public.candidates (
        candidate_id, email, source_type, candidate_status, profile_capture_mode,
        profile_completeness_status, created_at, updated_at
      ) values (
        v_candidate_id, v_normalized_email, 'authenticated_web_signup', 'active',
        'candidate_self_service', 'partial', now(), now()
      );
      v_provenance := 'candidate_self_provisioned';
    end if;

    insert into private.candidate_auth_mappings (auth_user_id, candidate_id, normalized_email, provenance)
    values (v_auth_user_id, v_candidate_id, v_normalized_email, v_provenance);

    insert into private.candidate_profile_audit (auth_user_id, candidate_id, event_type, provenance)
    values (
      v_auth_user_id, v_candidate_id,
      case when v_provenance = 'existing_candidate_linked' then 'existing_candidate_linked' else 'candidate_provisioned' end,
      jsonb_build_object('version', 1, 'source', 'authenticated_web')
    );

    select * into strict v_candidate from public.candidates c where c.candidate_id = v_candidate_id;
  end if;

  return jsonb_build_object(
    'candidateId', v_candidate.candidate_id,
    'email', v_candidate.email,
    'name', coalesce(v_candidate.full_name, v_candidate.display_name),
    'currentRole', v_candidate.current_role,
    'targetRole', v_candidate.target_role,
    'city', v_candidate.city,
    'locationPreference', v_candidate.location_preference,
    'yearsExperience', v_candidate.years_experience,
    'keySkills', coalesce(to_jsonb(v_candidate.key_skills), '[]'::jsonb),
    'resumeUrl', v_candidate.resume_url,
    'onboardingComplete', v_candidate.profile_completeness_status = 'complete'
  );
end;
$$;

revoke all on function public.provision_authenticated_candidate_v1() from public, anon;
grant execute on function public.provision_authenticated_candidate_v1() to authenticated;

comment on function public.provision_authenticated_candidate_v1() is
  'v1 authenticated, idempotent candidate provisioning. Identity and confirmed email are derived server-side. UUID lookup repaired without aggregate assumptions.';
