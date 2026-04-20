import { supabase } from './supabase';
import { createFallbackCandidate, fetchCandidateMapByIds } from './candidates';

export interface DashboardJob {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  status: string;
  created_at: string;
}

export interface DashboardSubmission {
  id: string;
  job_id: string;
  candidate_id: string;
  submission_stage: string;
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

export interface DashboardAssessment {
  candidate_id: string;
  job_id: string;
  ai_score: number;
  overall_recommendation: string;
  submission_ready: boolean;
}

export interface ActionQueueItem {
  id: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  location: string;
  nextActionDate: string;
  urgency: 'overdue' | 'today' | 'upcoming';
  stage: string;
  jobId: string;
}

export interface AttentionJob {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  submissionCount: number;
  reason: string;
  status: 'No Submissions' | 'Stale' | 'Low Coverage';
  daysSinceActivity: number | null;
}

export interface OpportunityItem {
  candidateId: string;
  candidateName: string;
  candidateRole: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  location: string;
  stage: string;
  aiScore: number;
  recommendation: string;
  submissionReady: boolean;
}

export interface DashboardStats {
  activeJobs: number;
  totalCandidatesInPipeline: number;
  totalSubmissions: number;
  advancedStageCount: number;
}

export interface BdQueueItem {
  submissionId: string;
  candidateId: string;
  candidateName: string;
  candidateRole: string;
  candidateScore: number;
  jobId: string;
  jobTitle: string;
  companyName: string;
  location: string;
  submissionSummary: string | null;
  submissionStrengths: string[] | null;
  submissionConcerns: string[] | null;
  submissionFullText: string | null;
  recruiterNotes: string | null;
  sentAt: string;
  aiRecommendation: string | null;
  aiScore: number | null;
}

const KL_SELANGOR_KEYWORDS = ['kuala lumpur', 'kl', 'selangor', 'petaling jaya', 'pj', 'subang', 'shah alam', 'cyberjaya', 'putrajaya', 'cheras', 'bangsar', 'mont kiara', 'damansara'];

function isKlSelangor(location: string): boolean {
  const loc = location.toLowerCase();
  return KL_SELANGOR_KEYWORDS.some(kw => loc.includes(kw));
}

function isoToDate(iso: string): Date {
  return new Date(iso.split('T')[0]);
}

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(iso: string): number {
  const then = new Date(iso);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

export async function fetchDashboardData(): Promise<{
  stats: DashboardStats;
  actionQueue: ActionQueueItem[];
  attentionJobs: AttentionJob[];
  opportunities: OpportunityItem[];
  bdQueue: BdQueueItem[];
}> {
  const [jobsResult, submissionsResult, assessmentsResult] = await Promise.all([
    supabase
      .from('jobs')
.select('id, job_title, company_name, location, created_at'),
    supabase
      .from('submissions')
      .select('id, job_id, candidate_id, submission_stage, next_action_date, stage_updated_at, created_at, submission_summary, submission_strengths, submission_concerns, submission_full_text, submission_generated_at, notes'),
    supabase
      .from('ai_assessments')
      .select('candidate_id, job_id, ai_score, overall_recommendation, submission_ready'),
  ]);

  const jobs: DashboardJob[] = (jobsResult.data ?? []) as DashboardJob[];
  const submissions: DashboardSubmission[] = (submissionsResult.data ?? []) as DashboardSubmission[];
  const assessments: DashboardAssessment[] = (assessmentsResult.data ?? []) as DashboardAssessment[];
  const candidateMap = await fetchCandidateMapByIds(submissions.map(sub => sub.candidate_id));

  const jobMap = new Map(jobs.map(j => [j.id, j]));
  const assessmentMap = new Map(assessments.map(a => [`${a.candidate_id}-${a.job_id}`, a]));

  const today = todayDate();

  const actionQueue: ActionQueueItem[] = [];

  for (const sub of submissions) {
    if (!sub.next_action_date) continue;
    const actionDate = isoToDate(sub.next_action_date);
    actionDate.setHours(0, 0, 0, 0);

    const candidate = candidateMap.get(sub.candidate_id) ?? createFallbackCandidate(sub.candidate_id);
    const job = jobMap.get(sub.job_id);
    if (!job) continue;

    const diff = Math.floor((actionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let urgency: ActionQueueItem['urgency'];
    if (diff < 0) urgency = 'overdue';
    else if (diff === 0) urgency = 'today';
    else urgency = 'upcoming';

    actionQueue.push({
      id: sub.id,
      candidateName: candidate.name,
      jobTitle: job.job_title,
      companyName: job.company_name,
      location: job.location,
      nextActionDate: sub.next_action_date,
      urgency,
      stage: sub.submission_stage,
      jobId: sub.job_id,
    });
  }

  actionQueue.sort((a, b) => {
    const urgencyOrder = { overdue: 0, today: 1, upcoming: 2 };
    const urgDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgDiff !== 0) return urgDiff;
    return new Date(a.nextActionDate).getTime() - new Date(b.nextActionDate).getTime();
  });

  const submissionsByJob = new Map<string, DashboardSubmission[]>();
  for (const sub of submissions) {
    if (!submissionsByJob.has(sub.job_id)) submissionsByJob.set(sub.job_id, []);
    submissionsByJob.get(sub.job_id)!.push(sub);
  }

  const attentionJobs: AttentionJob[] = [];
  const STALE_DAYS = 10;
  const LOW_COVERAGE = 3;

  for (const job of jobs) {
    const subs = submissionsByJob.get(job.id) ?? [];

    if (subs.length === 0) {
      attentionJobs.push({
        id: job.id,
        job_title: job.job_title,
        company_name: job.company_name,
        location: job.location,
        submissionCount: 0,
        reason: 'No candidates in pipeline yet',
        status: 'No Submissions',
        daysSinceActivity: null,
      });
      continue;
    }

    const latestActivity = subs.reduce((latest, s) => {
      return s.stage_updated_at > latest ? s.stage_updated_at : latest;
    }, subs[0].stage_updated_at);
    const staleDays = daysAgo(latestActivity);

    if (staleDays >= STALE_DAYS) {
      attentionJobs.push({
        id: job.id,
        job_title: job.job_title,
        company_name: job.company_name,
        location: job.location,
        submissionCount: subs.length,
        reason: `No activity in ${staleDays} days`,
        status: 'Stale',
        daysSinceActivity: staleDays,
      });
      continue;
    }

    if (subs.length <= LOW_COVERAGE) {
      attentionJobs.push({
        id: job.id,
        job_title: job.job_title,
        company_name: job.company_name,
        location: job.location,
        submissionCount: subs.length,
        reason: `Only ${subs.length} candidate${subs.length === 1 ? '' : 's'} in pipeline`,
        status: 'Low Coverage',
        daysSinceActivity: staleDays,
      });
    }
  }

  attentionJobs.sort((a, b) => {
    const statusOrder: Record<string, number> = { 'No Submissions': 0, 'Stale': 1, 'Low Coverage': 2 };
    const sd = statusOrder[a.status] - statusOrder[b.status];
    if (sd !== 0) return sd;
    const klA = isKlSelangor(a.location) ? -1 : 0;
    const klB = isKlSelangor(b.location) ? -1 : 0;
    if (klA !== klB) return klA - klB;
    return (b.daysSinceActivity ?? 0) - (a.daysSinceActivity ?? 0);
  });

  const EARLY_STAGES = new Set(['new', 'shortlisted']);
  const HIGH_SCORE_THRESHOLD = 80;
  const opportunities: OpportunityItem[] = [];

  for (const sub of submissions) {
    if (!EARLY_STAGES.has(sub.submission_stage)) continue;
    const assessment = assessmentMap.get(`${sub.candidate_id}-${sub.job_id}`);
    if (!assessment) continue;

    const isHighScore = assessment.ai_score >= HIGH_SCORE_THRESHOLD;
    const isStrongFit = assessment.overall_recommendation === 'Strong Fit';
    if (!isHighScore && !isStrongFit) continue;

    const candidate = candidateMap.get(sub.candidate_id) ?? createFallbackCandidate(sub.candidate_id);
    const job = jobMap.get(sub.job_id);
    if (!job) continue;

    opportunities.push({
      candidateId: sub.candidate_id,
      candidateName: candidate.name,
      candidateRole: candidate.role,
      jobId: sub.job_id,
      jobTitle: job.job_title,
      companyName: job.company_name,
      location: job.location,
      stage: sub.submission_stage,
      aiScore: assessment.ai_score,
      recommendation: assessment.overall_recommendation,
      submissionReady: assessment.submission_ready,
    });
  }

  opportunities.sort((a, b) => {
    const klA = isKlSelangor(a.location) ? -1 : 0;
    const klB = isKlSelangor(b.location) ? -1 : 0;
    if (klA !== klB) return klA - klB;
    const readyDiff = (b.submissionReady ? 1 : 0) - (a.submissionReady ? 1 : 0);
    if (readyDiff !== 0) return readyDiff;
    return b.aiScore - a.aiScore;
  });

  const advancedStages = new Set(['interview', 'offer', 'hired']);
  const advancedCandidates = new Set(
    submissions
      .filter(s => advancedStages.has(s.submission_stage))
      .map(s => s.candidate_id)
  );

  const stats: DashboardStats = {
    activeJobs: jobs.length,
    totalCandidatesInPipeline: new Set(submissions.map(s => s.candidate_id)).size,
    totalSubmissions: submissions.length,
    advancedStageCount: advancedCandidates.size,
  };

  const bdQueue: BdQueueItem[] = [];
  for (const sub of submissions) {
    if (sub.submission_stage !== 'ready_for_bd_review') continue;
    const candidate = candidateMap.get(sub.candidate_id) ?? createFallbackCandidate(sub.candidate_id);
    const job = jobMap.get(sub.job_id);
    if (!job) continue;
    const assessment = assessmentMap.get(`${sub.candidate_id}-${sub.job_id}`);
    bdQueue.push({
      submissionId: sub.id,
      candidateId: sub.candidate_id,
      candidateName: candidate.name,
      candidateRole: candidate.role,
      candidateScore: candidate.score,
      jobId: sub.job_id,
      jobTitle: job.job_title,
      companyName: job.company_name,
      location: job.location,
      submissionSummary: sub.submission_summary,
      submissionStrengths: sub.submission_strengths,
      submissionConcerns: sub.submission_concerns,
      submissionFullText: sub.submission_full_text,
      recruiterNotes: sub.notes,
      sentAt: sub.submission_generated_at ?? sub.stage_updated_at,
      aiRecommendation: assessment?.overall_recommendation ?? null,
      aiScore: assessment?.ai_score ?? null,
    });
  }
  bdQueue.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

  return { stats, actionQueue, attentionJobs, opportunities, bdQueue };
}
