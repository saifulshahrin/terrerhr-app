-- Run after the migration inside a transaction, then ROLLBACK. No fixture persists.
select set_config('request.jwt.claim.sub', (select id::text from public.profiles where is_active and role='admin' limit 1), true);
set local role authenticated;
do $$
declare p uuid; c uuid; second_c uuid;
begin
  insert into public.external_prospects(full_name,source_platform,source_profile_url,recruiter_status)
  values ('Transaction-only test','Other','https://example.com/terrer-transaction-test','good') returning prospect_id into p;
  begin
    perform public.promote_external_prospect_to_candidate(p,'test consent');
    raise exception 'Missing response was accepted';
  exception when raise_exception then
    if sqlerrm='Missing response was accepted' then raise; end if;
  end;
  update public.external_prospects set engagement_status='responded',response_evidence='Transaction-only response evidence' where prospect_id=p;
  begin
    perform public.promote_external_prospect_to_candidate(p,'');
    raise exception 'Missing consent was accepted';
  exception when raise_exception then
    if sqlerrm='Missing consent was accepted' then raise; end if;
  end;
  c := public.promote_external_prospect_to_candidate(p,'Transaction-only processing consent');
  second_c := public.promote_external_prospect_to_candidate(p,'Transaction-only processing consent');
  if c is null or c<>second_c then raise exception 'Promotion is not idempotent'; end if;
  if not exists(select 1 from public.candidates where candidate_id=c and candidate_consent_given) then raise exception 'Candidate or consent missing'; end if;
  if not exists(select 1 from public.source_profiles where candidate_id=c) then raise exception 'Provenance missing'; end if;
end $$;
reset role;
