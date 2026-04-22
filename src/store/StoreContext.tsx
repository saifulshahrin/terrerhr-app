import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Candidate, Submission, SubmissionStage } from './types';
import type { SubmissionOutput } from '../lib/submissionOutput';
import { ALL_CANDIDATES } from './mockData';
import {
  fetchSubmissions,
  upsertSubmission as upsertSubmissionDB,
  updateSubmissionStage,
  sendSubmissionToBdReview,
  deleteSubmission,
  bulkResetSubmissionsForJob,
  bulkDeleteSubmissionsForJob,
} from '../lib/submissions';

interface AppStore {
  candidates: Candidate[];
  submissions: Submission[];
  loading: boolean;
  getStage: (candidateId: string, jobId?: string) => SubmissionStage;
  getSubmission: (candidateId: string, jobId?: string) => Submission | undefined;
  shortlist: (candidateId: string, jobId: string) => Promise<void>;
  resetSubmissionToStage: (submissionId: string, stage: SubmissionStage) => Promise<Submission | null>;
  deleteSubmissionById: (submissionId: string) => Promise<boolean>;
  resetSubmissionsForJob: (jobId: string, stage: SubmissionStage) => Promise<Submission[]>;
  deleteSubmissionsForJob: (jobId: string) => Promise<number>;
  moveSubmissionStage: (submissionId: string, stage: SubmissionStage) => Promise<Submission | null>;
  updateSubmissionInStore: (submissionId: string, stage: SubmissionStage) => Promise<Submission | null>;
  sendSubmissionToBdReviewInStore: (
    submissionId: string,
    notes?: string,
    existingNotes?: string | null
  ) => Promise<Submission | null>;
  sendToBdReviewWithOutput: (
    candidateId: string,
    jobId: string,
    output: SubmissionOutput,
    notes?: string
  ) => Promise<Submission | null>;
  approveAndSubmitToClient: (candidateId: string, jobId: string) => Promise<void>;
  submitToClient: (candidateId: string, jobId: string) => Promise<void>;
  submitToClientWithOutput: (
    candidateId: string,
    jobId: string,
    output: SubmissionOutput,
    notes?: string
  ) => Promise<Submission | null>;
}

const StoreContext = createContext<AppStore | null>(null);

function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

function mergeRecruiterNotesIntoOutput(
  output: SubmissionOutput,
  notes?: string
): SubmissionOutput {
  const trimmedNotes = notes?.trim() ?? '';
  if (!trimmedNotes) return output;

  return {
    ...output,
    submission_full_text: `${output.submission_full_text}\n\nRECRUITER NOTES\n${trimmedNotes}`,
  };
}

async function upsertSubmission(
  candidateId: string,
  jobId: string,
  stage: SubmissionStage
): Promise<Submission | null> {
  try {
    const data = await upsertSubmissionDB({
      candidate_id: candidateId,
      job_id: jobId,
      submission_stage: stage as 'new' | 'shortlisted' | 'ready_for_bd_review' | 'submitted_to_client',
      next_action_date: getTodayIsoDate(),
    });

    return data as Submission;
  } catch (error) {
    console.error('[upsertSubmission] error:', error);
    return null;
  }
}

function mergeSubmission(
  prev: Submission[],
  result: Submission,
  candidateId: string,
  jobId: string
) {
  const exists = prev.find(
    s => s.candidate_id === candidateId && s.job_id === jobId
  );

  if (exists) {
    return prev.map(s =>
      s.candidate_id === candidateId && s.job_id === jobId ? result : s
    );
  }

  return [...prev, result];
}

function removeSubmission(prev: Submission[], submissionId: string) {
  return prev.filter(s => s.id !== submissionId);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubmissions() {
      try {
        const data = await fetchSubmissions();
        setSubmissions(data as Submission[]);
      } catch (error) {
        console.error('Error loading submissions:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSubmissions();
  }, []);

  const getSubmission = useCallback(
    (candidateId: string, jobId?: string): Submission | undefined => {
      if (!jobId) return undefined;
      return submissions.find(
        s => s.candidate_id === candidateId && s.job_id === jobId
      );
    },
    [submissions]
  );

  const getStage = useCallback(
    (candidateId: string, jobId?: string): SubmissionStage => {
      if (!jobId) return 'new';
      const sub = submissions.find(
        s => s.candidate_id === candidateId && s.job_id === jobId
      );
      return (sub?.submission_stage as SubmissionStage) ?? 'new';
    },
    [submissions]
  );

  const shortlist = useCallback(async (candidateId: string, jobId: string) => {
    console.log('[StoreContext][shortlist:start]', { candidateId, jobId });
    const result = await upsertSubmission(candidateId, jobId, 'shortlisted');
    console.log('[StoreContext][shortlist:result]', { candidateId, jobId, result });
    if (result) {
      setSubmissions(prev => mergeSubmission(prev, result, candidateId, jobId));
      console.log('[StoreContext][shortlist:merged]', { candidateId, jobId, submissionId: result.id });
    }
  }, []);

  const submitToClient = useCallback(async (candidateId: string, jobId: string) => {
    const result = await upsertSubmission(candidateId, jobId, 'submitted_to_client');
    if (result) {
      setSubmissions(prev => mergeSubmission(prev, result, candidateId, jobId));
    }
  }, []);

  const submitToClientWithOutput = useCallback(
    async (
      candidateId: string,
      jobId: string,
      output: SubmissionOutput,
      notes?: string
    ): Promise<Submission | null> => {
      try {
        const finalOutput = mergeRecruiterNotesIntoOutput(output, notes);

        console.log('[StoreContext][submitToClientWithOutput:start]', {
          candidateId,
          jobId,
          notes,
          output: finalOutput,
        });
        const result = await upsertSubmissionDB({
          candidate_id: candidateId,
          job_id: jobId,
          submission_stage: 'submitted_to_client',
          next_action_date: getTodayIsoDate(),
          submission_summary: finalOutput.submission_summary,
          submission_strengths: finalOutput.submission_strengths,
          submission_concerns: finalOutput.submission_concerns,
          submission_full_text: finalOutput.submission_full_text,
          submission_generated_at: finalOutput.submission_generated_at,
          notes: notes ?? null,
        });

        console.log('[StoreContext][submitToClientWithOutput:result]', {
          candidateId,
          jobId,
          result,
        });

        setSubmissions(prev =>
          mergeSubmission(prev, result as Submission, candidateId, jobId)
        );

        console.log('[StoreContext][submitToClientWithOutput:merged]', {
          candidateId,
          jobId,
          submissionId: (result as Submission).id,
        });

        return result as Submission;
      } catch (error) {
        console.error('[submitToClientWithOutput] error:', error);
        console.log('[StoreContext][submitToClientWithOutput:error]', {
          candidateId,
          jobId,
          error,
        });
        return null;
      }
    },
    []
  );

  const approveAndSubmitToClient = useCallback(async (candidateId: string, jobId: string) => {
    const result = await upsertSubmission(candidateId, jobId, 'submitted_to_client');
    if (result) {
      setSubmissions(prev => mergeSubmission(prev, result, candidateId, jobId));
    }
  }, []);

  const sendSubmissionToBdReviewInStore = useCallback(async (
    submissionId: string,
    notes?: string,
    existingNotes?: string | null
  ): Promise<Submission | null> => {
    try {
      const result = await sendSubmissionToBdReview(submissionId, notes, existingNotes);
      const submission = result as Submission;

      setSubmissions(prev =>
        mergeSubmission(prev, submission, submission.candidate_id, submission.job_id)
      );

      return submission;
    } catch (error) {
      console.error('[sendSubmissionToBdReviewInStore] error:', error);
      return null;
    }
  }, []);

  const sendToBdReviewWithOutput = useCallback(
    async (
      candidateId: string,
      jobId: string,
      output: SubmissionOutput,
      notes?: string
    ): Promise<Submission | null> => {
      try {
        const finalOutput = mergeRecruiterNotesIntoOutput(output, notes);

        const result = await upsertSubmissionDB({
          candidate_id: candidateId,
          job_id: jobId,
          submission_stage: 'ready_for_bd_review',
          next_action_date: getTodayIsoDate(),
          submission_summary: finalOutput.submission_summary,
          submission_strengths: finalOutput.submission_strengths,
          submission_concerns: finalOutput.submission_concerns,
          submission_full_text: finalOutput.submission_full_text,
          submission_generated_at: finalOutput.submission_generated_at,
          notes: notes ?? null,
        });

        setSubmissions(prev =>
          mergeSubmission(prev, result as Submission, candidateId, jobId)
        );

        return result as Submission;
      } catch (error) {
        console.error('[sendToBdReviewWithOutput] error:', error);
        return null;
      }
    },
    []
  );

  const resetSubmissionToStage = useCallback(async (
    submissionId: string,
    stage: SubmissionStage
  ): Promise<Submission | null> => {
    try {
      const result = await updateSubmissionStage(submissionId, stage);
      const submission = result as Submission;

      setSubmissions(prev =>
        mergeSubmission(prev, submission, submission.candidate_id, submission.job_id)
      );

      return submission;
    } catch (error) {
      console.error('[resetSubmissionToStage] error:', error);
      return null;
    }
  }, []);

  const deleteSubmissionById = useCallback(async (submissionId: string): Promise<boolean> => {
    try {
      await deleteSubmission(submissionId);
      setSubmissions(prev => removeSubmission(prev, submissionId));
      return true;
    } catch (error) {
      console.error('[deleteSubmissionById] error:', error);
      return false;
    }
  }, []);

  const resetSubmissionsForJob = useCallback(async (
    jobId: string,
    stage: SubmissionStage
  ): Promise<Submission[]> => {
    try {
      const result = await bulkResetSubmissionsForJob(jobId, stage);
      const updated = result as Submission[];

      setSubmissions(prev => {
        let next = prev;
        for (const submission of updated) {
          next = mergeSubmission(next, submission, submission.candidate_id, submission.job_id);
        }
        return next;
      });

      return updated;
    } catch (error) {
      console.error('[resetSubmissionsForJob] error:', error);
      return [];
    }
  }, []);

  const deleteSubmissionsForJob = useCallback(async (jobId: string): Promise<number> => {
    try {
      const deletedCount = submissions.filter(s => s.job_id === jobId).length;
      await bulkDeleteSubmissionsForJob(jobId);
      setSubmissions(prev => prev.filter(s => s.job_id !== jobId));

      return deletedCount;
    } catch (error) {
      console.error('[deleteSubmissionsForJob] error:', error);
      return 0;
    }
  }, [submissions]);

  const moveSubmissionStage = useCallback(async (
    submissionId: string,
    stage: SubmissionStage
  ): Promise<Submission | null> => {
    try {
      const result = await updateSubmissionStage(submissionId, stage);
      const submission = result as Submission;

      setSubmissions(prev =>
        mergeSubmission(prev, submission, submission.candidate_id, submission.job_id)
      );

      return submission;
    } catch (error) {
      console.error('[moveSubmissionStage] error:', error);
      return null;
    }
  }, []);

  const updateSubmissionInStore = useCallback(async (
    submissionId: string,
    stage: SubmissionStage
  ): Promise<Submission | null> => {
    try {
      const result = await updateSubmissionStage(submissionId, stage);
      const submission = result as Submission;

      setSubmissions(prev =>
        mergeSubmission(prev, submission, submission.candidate_id, submission.job_id)
      );

      return submission;
    } catch (error) {
      console.error('[updateSubmissionInStore] error:', error);
      return null;
    }
  }, []);

  return (
    <StoreContext.Provider
      value={{
        candidates: ALL_CANDIDATES,
        submissions,
        loading,
        getStage,
        getSubmission,
        shortlist,
        resetSubmissionToStage,
        deleteSubmissionById,
        resetSubmissionsForJob,
        deleteSubmissionsForJob,
        moveSubmissionStage,
        updateSubmissionInStore,
        sendSubmissionToBdReviewInStore,
        sendToBdReviewWithOutput,
        approveAndSubmitToClient,
        submitToClient,
        submitToClientWithOutput,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): AppStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
