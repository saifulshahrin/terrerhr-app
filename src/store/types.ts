export type SubmissionStage = 'new' | 'shortlisted' | 'ready_for_bd_review' | 'submitted_to_client' | 'interview' | 'offer' | 'rejected' | 'hold' | 'hired';

export interface Candidate {
  id: string;
  name: string;
  role: string;
  company: string;
  location: string;
  skills: string[];
  score: number;
  applied: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
}

export interface Submission {
  id: string;
  job_id: string;
  candidate_id: string;
  submission_stage: SubmissionStage;
  next_action_date: string | null;
  stage_updated_at: string;
  created_at: string;
  submission_summary: string | null;
  submission_strengths: string[] | null;
  submission_concerns: string[] | null;
  submission_full_text: string | null;
  submission_generated_at: string | null;
  notes: string | null;
}
