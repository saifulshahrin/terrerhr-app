create schema if not exists private;

create table if not exists private.candidate_auth_mappings (
  auth_user_id uuid primary key references auth.users(id) on delete restrict,
  candidate_id uuid not null unique references public.candidates(candidate_id) on delete restrict,
  normalized_email text not null,
  provisioned_at timestamptz not null default now(),
  provenance text not null check (provenance in ('candidate_self_provisioned', 'existing_candidate_linked'))
);

create table if not exists private.candidate_profile_audit (
  audit_id bigint generated always as identity primary key,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  candidate_id uuid not null references public.candidates(candidate_id) on delete restrict,
  event_type text not null check (event_type in ('candidate_provisioned', 'existing_candidate_linked', 'candidate_onboarding_updated')),
  occurred_at timestamptz not null default now(),
  provenance jsonb not null default '{}'::jsonb
);

create or replace function private.reject_candidate_provenance_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception using errcode = '42501', message = 'Candidate provisioning provenance is immutable';
end;
$$;

drop trigger if exists candidate_auth_mappings_immutable on private.candidate_auth_mappings;
create trigger candidate_auth_mappings_immutable
before update or delete on private.candidate_auth_mappings
for each row execute function private.reject_candidate_provenance_mutation();

drop trigger if exists candidate_profile_audit_immutable on private.candidate_profile_audit;
create trigger candidate_profile_audit_immutable
before update or delete on private.candidate_profile_audit
for each row execute function private.reject_candidate_provenance_mutation();

revoke all on schema private from public, anon, authenticated;
revoke all on private.candidate_auth_mappings from public, anon, authenticated;
revoke all on private.candidate_profile_audit from public, anon, authenticated;

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

  select u.email
    into v_email
  from auth.users u
  where u.id = v_auth_user_id
    and u.email_confirmed_at is not null
    and coalesce(u.banned_until, '-infinity'::timestamptz) <= now();

  v_normalized_email := lower(btrim(coalesce(v_email, '')));
  if v_normalized_email = '' then
    raise exception using errcode = '28000', message = 'A confirmed email is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_auth_user_id::text, 0));

  select m.candidate_id
    into v_candidate_id
  from private.candidate_auth_mappings m
  where m.auth_user_id = v_auth_user_id;

  if v_candidate_id is not null then
    select * into strict v_candidate
    from public.candidates c
    where c.candidate_id = v_candidate_id
      and lower(btrim(coalesce(c.email, ''))) = v_normalized_email;
  else
    select count(*), min(c.candidate_id)
      into v_matches, v_candidate_id
    from public.candidates c
    where lower(btrim(coalesce(c.email, ''))) = v_normalized_email;

    if v_matches > 1 then
      raise exception using errcode = '21000', message = 'Candidate email mapping is ambiguous';
    end if;

    if v_matches = 0 then
      v_candidate_id := gen_random_uuid();
      insert into public.candidates (
        candidate_id, email, source_type, candidate_status, profile_capture_mode,
        profile_completeness_status, created_at, updated_at
      ) values (
        v_candidate_id, v_normalized_email, 'authenticated_web_signup', 'active',
        'candidate_self_service', 'partial', now(), now()
      );
      v_provenance := 'candidate_self_provisioned';
    else
      v_provenance := 'existing_candidate_linked';
    end if;

    insert into private.candidate_auth_mappings (
      auth_user_id, candidate_id, normalized_email, provenance
    ) values (
      v_auth_user_id, v_candidate_id, v_normalized_email, v_provenance
    );

    insert into private.candidate_profile_audit (
      auth_user_id, candidate_id, event_type, provenance
    ) values (
      v_auth_user_id,
      v_candidate_id,
      case when v_provenance = 'existing_candidate_linked' then 'existing_candidate_linked' else 'candidate_provisioned' end,
      jsonb_build_object('version', 1, 'source', 'authenticated_web')
    );

    select * into strict v_candidate
    from public.candidates c
    where c.candidate_id = v_candidate_id;
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

create or replace function public.update_authenticated_candidate_onboarding_v1(p_profile jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_candidate_id uuid;
  v_full_name text;
  v_current_role text;
  v_target_role text;
  v_city text;
  v_location_preference text;
  v_years_experience numeric;
  v_key_skills text[];
  v_complete boolean;
  v_candidate public.candidates%rowtype;
begin
  if v_auth_user_id is null then
    raise exception using errcode = '28000', message = 'A valid authenticated session is required';
  end if;

  if p_profile is null or jsonb_typeof(p_profile) <> 'object' then
    raise exception using errcode = '22023', message = 'Profile payload must be an object';
  end if;

  if exists (
    select 1 from jsonb_object_keys(p_profile) key
    where key not in ('fullName', 'currentRole', 'targetRole', 'city', 'locationPreference', 'yearsExperience', 'keySkills')
  ) then
    raise exception using errcode = '22023', message = 'Profile payload contains unsupported fields';
  end if;

  select m.candidate_id into v_candidate_id
  from private.candidate_auth_mappings m
  join auth.users u on u.id = m.auth_user_id
  join public.candidates c on c.candidate_id = m.candidate_id
  where m.auth_user_id = v_auth_user_id
    and u.email_confirmed_at is not null
    and lower(btrim(coalesce(u.email, ''))) = m.normalized_email
    and lower(btrim(coalesce(c.email, ''))) = m.normalized_email;

  if v_candidate_id is null then
    raise exception using errcode = 'P0002', message = 'Candidate profile has not been provisioned';
  end if;

  select * into strict v_candidate from public.candidates where candidate_id = v_candidate_id for update;

  v_full_name := case when p_profile ? 'fullName' then nullif(btrim(p_profile->>'fullName'), '') else v_candidate.full_name end;
  v_current_role := case when p_profile ? 'currentRole' then nullif(btrim(p_profile->>'currentRole'), '') else v_candidate.current_role end;
  v_target_role := case when p_profile ? 'targetRole' then nullif(btrim(p_profile->>'targetRole'), '') else v_candidate.target_role end;
  v_city := case when p_profile ? 'city' then nullif(btrim(p_profile->>'city'), '') else v_candidate.city end;
  v_location_preference := case when p_profile ? 'locationPreference' then nullif(btrim(p_profile->>'locationPreference'), '') else v_candidate.location_preference end;

  if p_profile ? 'yearsExperience' then
    begin
      v_years_experience := nullif(p_profile->>'yearsExperience', '')::numeric;
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'Years of experience must be numeric';
    end;
  else
    v_years_experience := v_candidate.years_experience;
  end if;

  if v_years_experience is not null and (v_years_experience < 0 or v_years_experience > 80) then
    raise exception using errcode = '22023', message = 'Years of experience is outside the accepted range';
  end if;

  if p_profile ? 'keySkills' then
    if jsonb_typeof(p_profile->'keySkills') <> 'array' then
      raise exception using errcode = '22023', message = 'Key skills must be an array';
    end if;
    select coalesce(array_agg(btrim(value)) filter (where btrim(value) <> ''), '{}'::text[])
      into v_key_skills
    from jsonb_array_elements_text(p_profile->'keySkills') value;
    if cardinality(v_key_skills) > 20 then
      raise exception using errcode = '22023', message = 'No more than 20 key skills are accepted';
    end if;
  else
    v_key_skills := v_candidate.key_skills;
  end if;

  if greatest(
    length(coalesce(v_full_name, '')), length(coalesce(v_current_role, '')),
    length(coalesce(v_target_role, '')), length(coalesce(v_city, '')),
    length(coalesce(v_location_preference, ''))
  ) > 200 then
    raise exception using errcode = '22023', message = 'Profile text fields must not exceed 200 characters';
  end if;

  v_complete := v_full_name is not null and coalesce(v_current_role, v_target_role) is not null;

  update public.candidates
  set full_name = v_full_name,
      display_name = coalesce(v_full_name, display_name),
      "current_role" = v_current_role,
      primary_role = coalesce(v_current_role, v_target_role, primary_role),
      target_role = v_target_role,
      city = v_city,
      location_preference = v_location_preference,
      years_experience = v_years_experience,
      key_skills = v_key_skills,
      profile_completeness_status = case when v_complete then 'complete' else 'partial' end,
      updated_at = now()
  where candidate_id = v_candidate_id
  returning * into strict v_candidate;

  insert into private.candidate_profile_audit (auth_user_id, candidate_id, event_type, provenance)
  values (v_auth_user_id, v_candidate_id, 'candidate_onboarding_updated', jsonb_build_object('version', 1, 'complete', v_complete));

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
revoke all on function public.update_authenticated_candidate_onboarding_v1(jsonb) from public, anon;
grant execute on function public.provision_authenticated_candidate_v1() to authenticated;
grant execute on function public.update_authenticated_candidate_onboarding_v1(jsonb) to authenticated;

comment on function public.provision_authenticated_candidate_v1() is
  'v1 authenticated, idempotent candidate provisioning. Identity and confirmed email are derived server-side.';
comment on function public.update_authenticated_candidate_onboarding_v1(jsonb) is
  'v1 candidate-owned onboarding update with a fixed candidate-safe field allowlist.';
