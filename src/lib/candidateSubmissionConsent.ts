import { supabase } from './supabase';

export type ConsentChannel = 'email' | 'whatsapp' | 'phone' | 'in_person' | 'other';

export interface CandidateSubmissionConsent {
  id: string;
  submission_id: string;
  job_id: string;
  candidate_id: string;
  client_company_name: string;
  job_title: string;
  consent_channel: ConsentChannel;
  consent_evidence_ref: string;
  consented_at: string;
  consent_recorded_at: string;
  protection_expires_at: string;
}

export interface RecordCandidateSubmissionConsentInput {
  submission_id: string;
  job_id: string;
  candidate_id: string;
  client_company_name: string;
  job_title: string;
  consent_channel: ConsentChannel;
  consent_evidence_ref: string;
}

const fields = 'id,submission_id,job_id,candidate_id,client_company_name,job_title,consent_channel,consent_evidence_ref,consented_at,consent_recorded_at,protection_expires_at';

export async function fetchCandidateSubmissionConsents(submissionIds: string[]): Promise<CandidateSubmissionConsent[]> {
  const ids = [...new Set(submissionIds)];
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('candidate_submission_consents')
    .select(fields)
    .in('submission_id', ids);

  if (error) throw error;
  return (data ?? []) as CandidateSubmissionConsent[];
}

export async function recordCandidateSubmissionConsent(
  input: RecordCandidateSubmissionConsentInput
): Promise<CandidateSubmissionConsent> {
  const { data, error } = await supabase
    .from('candidate_submission_consents')
    .upsert(
      {
        ...input,
        consented_at: new Date().toISOString(),
      },
      { onConflict: 'submission_id' }
    )
    .select(fields)
    .single();

  if (error) throw error;
  return data as CandidateSubmissionConsent;
}
