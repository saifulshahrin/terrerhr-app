import { supabase } from './supabase';
import type { TerrerAIReview } from './terrerAI';

export interface AIAssessmentRow {
  id: string;
  candidate_id: string;
  job_id: string;
  layer1_score: number;
  ai_score: number;
  ranking_adjustment: number;
  overall_recommendation: string;
  confidence: string;
  strengths: string[];
  concerns: string[];
  reasoning_summary: string;
  verification_notes: string[];
  missing_information: string[];
  submission_ready: boolean;
  model_used: string;
  model_version: string;
  assessed_at: string;
  created_at: string;
  updated_at: string;
}

export interface AIAssessmentSummaryRow {
  candidate_id: string;
  job_id: string;
  ai_score: number;
  overall_recommendation: string;
}

function recommendationToConfidence(rec: TerrerAIReview['recommendation']): string {
  if (rec === 'Strong Fit') return 'High';
  if (rec === 'Potential Fit') return 'Medium';
  return 'Low';
}

function recommendationToSubmissionReady(rec: TerrerAIReview['recommendation']): boolean {
  return rec === 'Strong Fit';
}

function recommendationToDecision(rec: string): TerrerAIReview['decision'] {
  if (rec === 'Strong Fit') return 'Proceed';
  if (rec === 'Potential Fit') return 'Review';
  return 'Reject';
}

function normalizeRecommendation(rec: string): TerrerAIReview['recommendation'] {
  if (rec === 'Strong Fit') return 'Strong Fit';
  if (rec === 'Potential Fit') return 'Potential Fit';
  return 'Low Fit';
}

export async function fetchAssessmentsForJob(jobId: string): Promise<AIAssessmentRow[]> {
  const { data, error } = await supabase
    .from('ai_assessments')
    .select('*')
    .eq('job_id', jobId);

  if (error) {
    console.error('[aiAssessments] fetch error', error);
    return [];
  }
  return (data ?? []) as AIAssessmentRow[];
}

export async function upsertAssessment(
  candidateId: string,
  jobId: string,
  review: TerrerAIReview,
  layer1Score = 0,
  aiScore = 0
): Promise<void> {
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from('ai_assessments')
    .select('id')
    .eq('candidate_id', candidateId)
    .eq('job_id', jobId)
    .maybeSingle();

  const payload = {
    reasoning_summary: review.summary,
    strengths: review.strengths,
    concerns: review.concerns,
    overall_recommendation: review.recommendation,
    confidence: recommendationToConfidence(review.recommendation),
    ai_score: aiScore,
    layer1_score: layer1Score,
    ranking_adjustment: 0,
    verification_notes: [],
    missing_information: [],
    submission_ready: recommendationToSubmissionReady(review.recommendation),
    model_used: 'mock_terrer_ai_review',
    model_version: 'v1',
    assessed_at: now,
    updated_at: now,
  };

  if (existing) {
    const { error } = await supabase
      .from('ai_assessments')
      .update(payload)
      .eq('id', existing.id);

    if (error) console.error('[aiAssessments] update error', error);
  } else {
    const { error } = await supabase
      .from('ai_assessments')
      .insert({
        candidate_id: candidateId,
        job_id: jobId,
        ...payload,
        created_at: now,
      });

    if (error) console.error('[aiAssessments] insert error', error);
  }
}

export function rowToReview(row: AIAssessmentRow): TerrerAIReview {
  return {
    status: 'completed',
    summary: row.reasoning_summary,
    strengths: row.strengths,
    concerns: row.concerns,
    decision: recommendationToDecision(row.overall_recommendation),
    recommendation: normalizeRecommendation(row.overall_recommendation),
    confidence: row.confidence,
    submissionReady: row.submission_ready,
    generatedAt: row.assessed_at,
  };
}

export async function fetchAssessmentSummaries(): Promise<AIAssessmentSummaryRow[]> {
  const { data, error } = await supabase
    .from('ai_assessments')
    .select('candidate_id, job_id, ai_score, overall_recommendation');

  if (error) throw error;
  return (data ?? []) as AIAssessmentSummaryRow[];
}
export interface AIAssessmentSummaryRow {
  candidate_id: string;
  job_id: string;
  ai_score: number;
  overall_recommendation: string;
}
