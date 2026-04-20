import { supabase } from './supabase';

export type SubmissionStage =
  | 'new'
  | 'shortlisted'
  | 'ready_for_bd_review'
  | 'submitted_to_client'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'hold'
  | 'hired';

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

export interface BDQueueSubmissionRow {
  id: string;
  candidate_id: string;
  job_id: string;
  submission_summary: string | null;
  submission_strengths: string[] | null;
  submission_concerns: string[] | null;
  notes: string | null;
  submission_generated_at: string | null;
  stage_updated_at: string;
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

export async function fetchBDQueueSubmissions(): Promise<BDQueueSubmissionRow[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, candidate_id, job_id, submission_summary, submission_strengths, submission_concerns, notes, submission_generated_at, stage_updated_at')
    .eq('submission_stage', 'ready_for_bd_review');

  if (error) throw error;
  return (data ?? []) as BDQueueSubmissionRow[];
}

export async function updateSubmissionStage(
  submissionId: string,
  submissionStage: SubmissionStage
): Promise<SubmissionRow> {
  const { data, error } = await supabase
    .from('submissions')
    .update({
      submission_stage: submissionStage,
      stage_updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    .select('*')
    .single();

  if (error) throw error;
  return data as SubmissionRow;
}

export async function sendSubmissionToBdReview(
  submissionId: string,
  notes?: string,
  existingNotes?: string | null
): Promise<SubmissionRow> {
  const trimmedNotes = notes?.trim() ?? '';
  const resolvedNotes = trimmedNotes || existingNotes || null;

  const { data, error } = await supabase
    .from('submissions')
    .update({
      submission_stage: 'ready_for_bd_review',
      notes: resolvedNotes,
      stage_updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    .select('*')
    .single();

  if (error) throw error;
  return data as SubmissionRow;
}

export async function deleteSubmission(
  submissionId: string
): Promise<void> {
  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('id', submissionId);

  if (error) throw error;
}

export async function bulkResetSubmissionsForJob(
  jobId: string,
  submissionStage: SubmissionStage
): Promise<SubmissionRow[]> {
  const { data, error } = await supabase
    .from('submissions')
    .update({
      submission_stage: submissionStage,
      stage_updated_at: new Date().toISOString(),
    })
    .eq('job_id', jobId)
    .select('*');

  if (error) throw error;
  return (data ?? []) as SubmissionRow[];
}

export async function bulkDeleteSubmissionsForJob(
  jobId: string
): Promise<void> {
  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('job_id', jobId);

  if (error) throw error;
}
