import { supabase } from './supabase';

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
}

export async function fetchExternalProspects(): Promise<ExternalProspect[]> {
  const { data, error } = await supabase
    .from('external_prospects')
    .select('prospect_id,full_name,linkedin_url,source_platform,source_profile_url,current_title,current_company,location,headline,skills,languages,engagement_status,recruiter_status,first_discovered_at,last_verified_at,notes')
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
      engagement_status: decision === 'unreviewed' ? 'discovered' : 'reviewed',
      updated_at: new Date().toISOString(),
    })
    .eq('prospect_id', prospectId);
  if (error) throw error;
}
