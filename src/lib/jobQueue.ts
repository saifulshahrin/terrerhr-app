import type { JobListRow } from './jobs';

export interface SubmissionMetricRow {
  job_id: string;
  submission_stage: string | null;
  next_action_date: string | null;
}

export interface JobMetrics {
  candidates: number;
  shortlisted: number;
  nextActionDate: Date | null;
}

export type JobUrgency = 'overdue' | 'due_today' | 'upcoming' | 'none';

export const URGENCY_LABEL: Record<JobUrgency, string> = {
  overdue: 'Overdue',
  due_today: 'Due today',
  upcoming: 'Upcoming',
  none: 'No action',
};

export const URGENCY_PRIORITY: Record<JobUrgency, number> = {
  overdue: 0,
  due_today: 1,
  upcoming: 2,
  none: 3,
};

export function normalizeText(value: unknown): string {
  return String(value ?? '').toLowerCase().trim();
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getJobUrgency(nextActionDate: Date | null): JobUrgency {
  if (!nextActionDate) return 'none';

  const now = new Date();

  if (nextActionDate < now) return 'overdue';
  if (isSameCalendarDay(nextActionDate, now)) return 'due_today';
  return 'upcoming';
}

export function getUpdatedAtTime(job: JobListRow): number {
  const time = new Date(job.updated_at).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function getRecommendedNextStep(
  urgency: JobUrgency,
  candidates: number,
  shortlisted: number
): string {
  if (urgency === 'overdue') return 'Follow up overdue';
  if (urgency === 'due_today') return 'Follow up today';
  if (candidates === 0) return 'Review matches';
  if (shortlisted === 0 && candidates > 0) return 'Shortlist candidates';
  if (candidates > 0 && shortlisted > 0) return 'Progress pipeline';
  return 'Review matches';
}

export function buildJobMetricsMap(submissions: SubmissionMetricRow[]): Map<string, JobMetrics> {
  const now = new Date();
  const metricsAccumulator = new Map<
    string,
    {
      candidates: number;
      shortlisted: number;
      nextActionDates: Date[];
    }
  >();

  for (const submission of submissions) {
    const existing = metricsAccumulator.get(submission.job_id) ?? {
      candidates: 0,
      shortlisted: 0,
      nextActionDates: [],
    };

    existing.candidates += 1;

    if (submission.submission_stage?.toLowerCase() === 'shortlisted') {
      existing.shortlisted += 1;
    }

    if (submission.next_action_date) {
      const nextActionDate = new Date(submission.next_action_date);
      if (!Number.isNaN(nextActionDate.getTime())) {
        existing.nextActionDates.push(nextActionDate);
      }
    }

    metricsAccumulator.set(submission.job_id, existing);
  }

  const nextMetricsMap = new Map<string, JobMetrics>();

  for (const [jobId, metrics] of metricsAccumulator.entries()) {
    const futureDates = metrics.nextActionDates
      .filter(date => date >= now)
      .sort((a, b) => a.getTime() - b.getTime());
    const pastDates = metrics.nextActionDates
      .filter(date => date < now)
      .sort((a, b) => b.getTime() - a.getTime());

    nextMetricsMap.set(jobId, {
      candidates: metrics.candidates,
      shortlisted: metrics.shortlisted,
      nextActionDate: futureDates[0] ?? pastDates[0] ?? null,
    });
  }

  return nextMetricsMap;
}

export function sortJobsForQueue(jobs: JobListRow[], jobMetricsMap: Map<string, JobMetrics>): JobListRow[] {
  return [...jobs].sort((a, b) => {
    const metricsA = jobMetricsMap.get(a.id);
    const metricsB = jobMetricsMap.get(b.id);
    const nextActionDateA = metricsA?.nextActionDate ?? null;
    const nextActionDateB = metricsB?.nextActionDate ?? null;
    const urgencyA = getJobUrgency(nextActionDateA);
    const urgencyB = getJobUrgency(nextActionDateB);
    const urgencyPriorityDiff = URGENCY_PRIORITY[urgencyA] - URGENCY_PRIORITY[urgencyB];

    if (urgencyPriorityDiff !== 0) return urgencyPriorityDiff;

    if (nextActionDateA && nextActionDateB) {
      const nextActionDiff = nextActionDateA.getTime() - nextActionDateB.getTime();
      if (nextActionDiff !== 0) return nextActionDiff;
    }

    if (nextActionDateA && !nextActionDateB) return -1;
    if (!nextActionDateA && nextActionDateB) return 1;

    const updatedAtDiff = getUpdatedAtTime(b) - getUpdatedAtTime(a);
    if (updatedAtDiff !== 0) return updatedAtDiff;

    return (a.job_title ?? '').localeCompare(b.job_title ?? '');
  });
}
