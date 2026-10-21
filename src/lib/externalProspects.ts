import { supabase } from './supabase';
import { normalizeProfileUrl } from './candidateIdentity';

export type RecruiterDecision = 'unreviewed' | 'good' | 'maybe' | 'reject';
export type EngagementStatus = 'discovered' | 'reviewed' | 'contacted' | 'responded' | 'promoted';

export interface ExternalProspect {
  prospect_id: string;
  full_name: string;
  linkedin_url: string | null;
  source_platform: string;
  source_profile_url: string | null;
  current_title: string | null;
  current_company: string | null;
  location: string | null;
  headline: string | null;
  skills: string[];
  languages: string[];
  engagement_status: EngagementStatus;
  recruiter_status: RecruiterDecision;
  first_discovered_at: string;
  last_verified_at: string | null;
  notes: string | null;
  promoted_candidate_id?: string | null;
}

export async function fetchExternalProspects(): Promise<ExternalProspect[]> {
  const { data, error } = await supabase
    .from('external_prospects')
    .select('prospect_id,full_name,linkedin_url,source_platform,source_profile_url,current_title,current_company,location,headline,skills,languages,engagement_status,recruiter_status,first_discovered_at,last_verified_at,notes,promoted_candidate_id')
    .order('first_discovered_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as ExternalProspect[];
}

export async function setProspectDecision(prospectId: string, decision: RecruiterDecision) {
  const { error } = await supabase
    .from('external_prospects')
    .update({
      recruiter_status: decision,
      updated_at: new Date().toISOString(),
    })
    .eq('prospect_id', prospectId);
  if (error) throw error;
}


export async function markProspectResponded(prospectId: string, evidence: string) {
  if (!evidence.trim()) throw new Error('Response evidence is required.');
  const { error } = await supabase
    .from('external_prospects')
    .update({ engagement_status: 'responded', response_evidence: evidence.trim(), updated_at: new Date().toISOString() })
    .eq('prospect_id', prospectId).neq('engagement_status', 'promoted');
  if (error) throw error;
}

export async function promoteProspectToCandidate(prospectId: string, consentEvidence: string): Promise<string> {
  const { data, error } = await supabase.rpc('promote_external_prospect_to_candidate', {
    p_prospect_id: prospectId,
    p_consent_evidence: consentEvidence,
  });
  if (error) throw error;
  return data as string;
}

export async function importExternalProspect(input: { full_name: string; source_profile_url: string; current_title: string; skills: string[] }) {
  const url = normalizeProfileUrl(input.source_profile_url);
  if (!input.full_name.trim() || !url) throw new Error('Name and source profile URL are required.');
  const host = new URL(url).hostname;
  const { error } = await supabase.from('external_prospects').insert({
    ...input, full_name: input.full_name.trim(), source_profile_url: url,
    source_platform: host === 'github.com' ? 'GitHub' : host === 'linkedin.com' ? 'LinkedIn' : 'Other',
  });
  if (error) throw error;
}
