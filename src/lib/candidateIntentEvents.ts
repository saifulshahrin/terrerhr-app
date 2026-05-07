import { supabase } from './supabase';

export type CandidateIntentActionType = 'matches_viewed' | 'interest_clicked' | 'job_saved';

interface TrackCandidateIntentInput {
  candidate_id: string;
  job_id: string;
  action_type: CandidateIntentActionType;
}

export async function trackCandidateIntent(input: TrackCandidateIntentInput): Promise<void> {
  const { error } = await supabase
    .from('candidate_intent_events')
    .insert({
      candidate_id: input.candidate_id,
      job_id: input.job_id,
      action_type: input.action_type,
    });

  if (error) {
    console.warn('[candidateIntentEvents.trackCandidateIntent] failed', {
      candidateId: input.candidate_id,
      jobId: input.job_id,
      actionType: input.action_type,
      error,
    });
  }
}
