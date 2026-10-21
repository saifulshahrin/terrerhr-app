-- Harden the prospect pool already applied as 20261021112314.
alter table public.external_prospects add column if not exists response_evidence text;

create or replace function public.promote_external_prospect_to_candidate(p_prospect_id uuid, p_consent_evidence text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  p public.external_prospects%rowtype;
  v_candidate_id uuid;
  v_profile_id uuid;
begin
  select * into p from public.external_prospects where prospect_id = p_prospect_id for update;
  if not found then raise exception 'External prospect not found'; end if;
  if p.promoted_candidate_id is not null then return p.promoted_candidate_id; end if;
  if p.recruiter_status <> 'good' then raise exception 'Recruiter approval is required'; end if;
  if nullif(trim(p.response_evidence),'') is null then raise exception 'Response evidence is required'; end if;
  if nullif(trim(p_consent_evidence),'') is null then raise exception 'Consent evidence is required'; end if;
  if p.engagement_status <> 'responded' then
    raise exception 'Prospect must have responded before promotion to Terrer Candidate';
  end if;

  -- Serialize the same identity and fail closed rather than silently merging people.
  perform pg_advisory_xact_lock(hashtextextended(lower(coalesce(p.source_profile_url,p.linkedin_url,p.prospect_id::text)),0));
  if exists(select 1 from public.source_profiles sp where
    lower(rtrim(sp.source_profile_url,'/')) = lower(rtrim(coalesce(p.source_profile_url,p.linkedin_url),'/')))
  then raise exception 'Profile already exists as a candidate; review the existing record'; end if;

  v_candidate_id := gen_random_uuid();
  v_profile_id := gen_random_uuid();

  insert into public.candidates (
    candidate_id, display_name, full_name, city, primary_role, "current_role",
    linkedin_url, email, phone, source_type, notes, candidate_status,
    key_skills, years_experience, candidate_consent_given, candidate_consent_at, candidate_consent_text, candidate_consent_version, created_at, updated_at
  ) values (
    v_candidate_id, p.full_name, p.full_name, p.location, p.current_title, p.current_title,
    p.linkedin_url, p.email, p.phone, p.source_platform, p.notes, 'active',
    p.skills, p.years_experience, true, now(), p_consent_evidence, 'staff-evidence-v1', now(), now()
  );

  insert into public.source_profiles (
    profile_id, candidate_id, source_name, source_profile_url, source_handle, scraped_at
  ) values (
    v_profile_id, v_candidate_id, p.source_platform, coalesce(p.source_profile_url,p.linkedin_url),
    null, now()
  );

  insert into public.candidate_scores (
    candidate_id, display_name, full_name, city, primary_role, capabilities, score, score_reason, scored_at
  ) values (
    v_candidate_id, p.full_name, p.full_name, p.location, p.current_title,
    array_to_string(p.skills, ', '), 0, 'Promoted from External Prospect Pool', now()
  );

  update public.external_prospects
  set promotion_status='candidate', engagement_status='promoted',
      promoted_candidate_id=v_candidate_id, updated_at=now()
  where prospect_id=p_prospect_id;

  return v_candidate_id;
end;
$$;

-- Existing tables stay untouched. These additions are staff-only and never public.
create unique index external_prospects_source_url_unique on public.external_prospects
  (lower(rtrim(source_profile_url,'/'))) where source_profile_url is not null;
revoke all on public.external_prospects, public.prospect_job_matches, public.prospect_source_actions from anon, public, authenticated;
revoke all on function public.promote_external_prospect_to_candidate(uuid,text) from public, anon;
grant select, insert, update on public.external_prospects, public.prospect_job_matches, public.prospect_source_actions to authenticated;
grant execute on function public.promote_external_prospect_to_candidate(uuid,text) to authenticated;

-- Disable legacy promotion without recorded consent evidence.
revoke all on function public.promote_external_prospect_to_candidate(uuid) from public, anon, authenticated;
