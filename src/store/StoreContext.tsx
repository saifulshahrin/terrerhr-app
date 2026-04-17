import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Candidate, Submission, SubmissionStage } from './types';
import type { SubmissionOutput } from '../lib/submissionOutput';
import { ALL_CANDIDATES } from './mockData';
import { supabase } from '../lib/supabase';

interface AppStore {
  candidates: Candidate[];
  submissions: Submission[];
  loading: boolean;
  getStage: (candidateId: string, jobId?: string) => SubmissionStage;
  getSubmission: (candidateId: string, jobId?: string) => Submission | undefined;
  shortlist: (candidateId: string, jobId: string) => Promise<void>;
  sendToBdReview: (candidateId: string, jobId: string, output: SubmissionOutput, notes?: string) => Promise<Submission | null>;
  approveAndSubmitToClient: (candidateId: string, jobId: string) => Promise<void>;
  submitToClient: (candidateId: string, jobId: string) => Promise<void>;
  submitToClientWithOutput: (candidateId: string, jobId: string, output: SubmissionOutput) => Promise<Submission | null>;
}

const StoreContext = createContext<AppStore | null>(null);

async function upsertSubmission(
  candidateId: string,
  jobId: string,
  stage: SubmissionStage
): Promise<Submission | null> {
  const now = new Date().toISOString();
  console.log('[upsertSubmission] attempting:', { candidateId, jobId, stage });
  const { data, error } = await supabase
    .from('submissions')
    .upsert(
      {
        candidate_id: candidateId,
        job_id: jobId,
        submission_stage: stage,
        stage_updated_at: now,
      },
      { onConflict: 'job_id,candidate_id' }
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error('[upsertSubmission] error:', error);
    return null;
  }
  console.log('[upsertSubmission] success:', data);
  return data as Submission;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubmissions() {
      const { data, error } = await supabase
        .from('submissions')
        .select('*');
      if (!error && data) {
        setSubmissions(data as Submission[]);
      }
      setLoading(false);
    }
    loadSubmissions();
  }, []);

  const getSubmission = useCallback(
    (candidateId: string, jobId?: string): Submission | undefined => {
      if (!jobId) return undefined;
      return submissions.find(s => s.candidate_id === candidateId && s.job_id === jobId);
    },
    [submissions]
  );

  const getStage = useCallback(
    (candidateId: string, jobId?: string): SubmissionStage => {
      if (!jobId) return 'new';
      const sub = submissions.find(s => s.candidate_id === candidateId && s.job_id === jobId);
      return (sub?.submission_stage as SubmissionStage) ?? 'new';
    },
    [submissions]
  );

  const shortlist = useCallback(async (candidateId: string, jobId: string) => {
    const result = await upsertSubmission(candidateId, jobId, 'shortlisted');
    if (result) {
      setSubmissions(prev => {
        const exists = prev.find(s => s.candidate_id === candidateId && s.job_id === jobId);
        if (exists) {
          return prev.map(s =>
            s.candidate_id === candidateId && s.job_id === jobId ? result : s
          );
        }
        return [...prev, result];
      });
    }
  }, []);

  const submitToClient = useCallback(async (candidateId: string, jobId: string) => {
    const result = await upsertSubmission(candidateId, jobId, 'submitted_to_client');
    if (result) {
      setSubmissions(prev => {
        const exists = prev.find(s => s.candidate_id === candidateId && s.job_id === jobId);
        if (exists) {
          return prev.map(s =>
            s.candidate_id === candidateId && s.job_id === jobId ? result : s
          );
        }
        return [...prev, result];
      });
    }
  }, []);

  const sendToBdReview = useCallback(async (
    candidateId: string,
    jobId: string,
    output: SubmissionOutput,
    notes?: string
  ): Promise<Submission | null> => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('submissions')
      .upsert(
        {
          candidate_id: candidateId,
          job_id: jobId,
          submission_stage: 'ready_for_bd_review',
          stage_updated_at: now,
          submission_summary: output.submission_summary,
          submission_strengths: output.submission_strengths,
          submission_concerns: output.submission_concerns,
          submission_full_text: output.submission_full_text,
          submission_generated_at: output.submission_generated_at,
          notes: notes ?? null,
        },
        { onConflict: 'job_id,candidate_id' }
      )
      .select()
      .maybeSingle();

    if (error) {
      console.error('[sendToBdReview] error:', error);
      return null;
    }

    const result = data as Submission;
    if (result) {
      setSubmissions(prev => {
        const exists = prev.find(s => s.candidate_id === candidateId && s.job_id === jobId);
        if (exists) {
          return prev.map(s =>
            s.candidate_id === candidateId && s.job_id === jobId ? result : s
          );
        }
        return [...prev, result];
      });
    }
    return result;
  }, []);

  const approveAndSubmitToClient = useCallback(async (candidateId: string, jobId: string) => {
    const result = await upsertSubmission(candidateId, jobId, 'submitted_to_client');
    if (result) {
      setSubmissions(prev => {
        const exists = prev.find(s => s.candidate_id === candidateId && s.job_id === jobId);
        if (exists) {
          return prev.map(s =>
            s.candidate_id === candidateId && s.job_id === jobId ? result : s
          );
        }
        return [...prev, result];
      });
    }
  }, []);

  const submitToClientWithOutput = useCallback(async (
    candidateId: string,
    jobId: string,
    output: SubmissionOutput
  ): Promise<Submission | null> => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('submissions')
      .upsert(
        {
          candidate_id: candidateId,
          job_id: jobId,
          submission_stage: 'submitted_to_client',
          stage_updated_at: now,
          submission_summary: output.submission_summary,
          submission_strengths: output.submission_strengths,
          submission_concerns: output.submission_concerns,
          submission_full_text: output.submission_full_text,
          submission_generated_at: output.submission_generated_at,
        },
        { onConflict: 'job_id,candidate_id' }
      )
      .select()
      .maybeSingle();

    if (error) {
      console.error('[submitToClientWithOutput] error:', error);
      return null;
    }

    const result = data as Submission;
    if (result) {
      setSubmissions(prev => {
        const exists = prev.find(s => s.candidate_id === candidateId && s.job_id === jobId);
        if (exists) {
          return prev.map(s =>
            s.candidate_id === candidateId && s.job_id === jobId ? result : s
          );
        }
        return [...prev, result];
      });
    }
    return result;
  }, []);

  return (
    <StoreContext.Provider value={{
      candidates: ALL_CANDIDATES,
      submissions,
      loading,
      getStage,
      getSubmission,
      shortlist,
      sendToBdReview,
      approveAndSubmitToClient,
      submitToClient,
      submitToClientWithOutput,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): AppStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
