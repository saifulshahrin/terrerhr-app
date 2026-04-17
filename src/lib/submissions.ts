import { supabase } from './supabase';

export type SubmissionStage =
  | 'new'
  | 'shortlisted'
  | 'ready_for_bd_review'
  | 'submitted_to_client';

export interface SubmissionRow {
  id: string;
  job_id: string;
  candidate_id: string;
  submission_stage: SubmissionStage;
  stage_updated_at?: string | null;

  submission_summary?: string | null;
  submission_strengths?: string[] | null;
  submission_concerns?: string[] | null;
  submission_full_text?: string | null;
  submission_generated_at?: string | null;

  notes?: string | null;
}

export interface UpsertSubmissionParams {
  job_id: string;
  candidate_id: string;
  submission_stage: SubmissionStage;

  submission_summary?: string | null;
  submission_strengths?: string[] | null;
  submission_concerns?: string[] | null;
  submission_full_text?: string | null;
  submission_generated_at?: string | null;

  notes?: string | null;
}

export async function fetchSubmissions(): Promise<SubmissionRow[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*');

  if (error) throw error;
  return (data || []) as SubmissionRow[];
}

export async function upsertSubmission(
  params: UpsertSubmissionParams
): Promise<SubmissionRow> {
  const now = new Date().toISOString();

  const payload = {
    ...params,
    stage_updated_at: now,
  };

  const { data, error } = await supabase
    .from('submissions')
    .upsert(payload, { onConflict: 'job_id,candidate_id' })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as SubmissionRow;
}