import { supabase } from './supabase';

export interface PlacementGuaranteeTracker {
  id: string;
  guarantee_reference: string;
  submission_id: string;
  guarantee_days: number;
  start_date: string;
  guarantee_end_date: string;
  day7_due_on: string;
  day30_due_on: string;
  day45_due_on: string;
  day7_completed_on: string | null;
  day7_evidence_ref: string | null;
  day7_outcome: string | null;
  day30_completed_on: string | null;
  day30_evidence_ref: string | null;
  day30_outcome: string | null;
  day45_completed_on: string | null;
  day45_evidence_ref: string | null;
  day45_outcome: string | null;
}

export interface ReplacementClaim {
  id: string;
  claim_reference: string;
  guarantee_tracker_id: string;
  claim_status: 'reported' | 'accepted' | 'declined' | 'replacement_in_progress' | 'resolved' | 'withdrawn';
  reported_at: string;
  reason: string;
  client_evidence_ref: string;
  decision_at: string | null;
  decision_evidence_ref: string | null;
  resolution_evidence_ref: string | null;
}

const trackerFields = 'id,guarantee_reference,submission_id,guarantee_days,start_date,guarantee_end_date,day7_due_on,day30_due_on,day45_due_on,day7_completed_on,day7_evidence_ref,day7_outcome,day30_completed_on,day30_evidence_ref,day30_outcome,day45_completed_on,day45_evidence_ref,day45_outcome';
const claimFields = 'id,claim_reference,guarantee_tracker_id,claim_status,reported_at,reason,client_evidence_ref,decision_at,decision_evidence_ref,resolution_evidence_ref';

export async function fetchPlacementGuaranteeTracker(submissionId: string): Promise<PlacementGuaranteeTracker | null> {
  const { data, error } = await supabase
    .from('placement_guarantee_trackers')
    .select(trackerFields)
    .eq('submission_id', submissionId)
    .maybeSingle();

  if (error) throw error;
  return data as PlacementGuaranteeTracker | null;
}

export async function savePlacementGuaranteeCheckins(
  trackerId: string,
  values: Pick<PlacementGuaranteeTracker,
    'day7_completed_on' | 'day7_evidence_ref' | 'day7_outcome' |
    'day30_completed_on' | 'day30_evidence_ref' | 'day30_outcome' |
    'day45_completed_on' | 'day45_evidence_ref' | 'day45_outcome'>
): Promise<PlacementGuaranteeTracker> {
  const { data, error } = await supabase
    .from('placement_guarantee_trackers')
    .update(values)
    .eq('id', trackerId)
    .select(trackerFields)
    .single();

  if (error) throw error;
  return data as PlacementGuaranteeTracker;
}

export async function fetchReplacementClaim(trackerId: string): Promise<ReplacementClaim | null> {
  const { data, error } = await supabase
    .from('placement_replacement_claims')
    .select(claimFields)
    .eq('guarantee_tracker_id', trackerId)
    .maybeSingle();

  if (error) throw error;
  return data as ReplacementClaim | null;
}

export async function saveReplacementClaim(
  values: Omit<ReplacementClaim, 'id' | 'claim_reference'>
): Promise<ReplacementClaim> {
  const { data, error } = await supabase
    .from('placement_replacement_claims')
    .upsert(values, { onConflict: 'guarantee_tracker_id' })
    .select(claimFields)
    .single();

  if (error) throw error;
  return data as ReplacementClaim;
}
