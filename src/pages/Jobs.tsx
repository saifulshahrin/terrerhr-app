import { useCallback, useEffect, useState } from 'react';
import { MapPin, BarChart2 } from 'lucide-react';
import {
  fetchAllJobs,
  updateJobOperationalStatus,
  type JobListRow,
  type JobOperationalStatus,
} from '../lib/jobs';
import { supabase } from '../lib/supabase';

type Job = JobListRow;

interface SubmissionMetricRow {
  job_id: string;
  submission_stage: string | null;
  next_action_date: string | null;
}

interface JobMetrics {
  candidates: number;
  shortlisted: number;
  nextActionDate: Date | null;
}

type JobUrgency = 'overdue' | 'due_today' | 'upcoming' | 'none';

const OPERATIONAL_STATUS_OPTIONS: JobOperationalStatus[] = [
  'not_started',
  'active',
  'paused',
  'closed',
];

interface Props {
  onViewTopMatches: (jobId: string) => void;
  onNewJobIntake: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

const URGENCY_LABEL: Record<JobUrgency, string> = {
  overdue: 'Overdue',
  due_today: 'Due today',
  upcoming: 'Upcoming',
  none: 'No action',
};

const URGENCY_STYLE: Record<JobUrgency, string> = {
  overdue: 'text-red-600 bg-red-50',
  due_today: 'text-orange-600 bg-orange-50',
  upcoming: 'text-blue-600 bg-blue-50',
  none: 'text-gray-500 bg-gray-100',
};

const CARD_BORDER_STYLE: Record<JobUrgency, string> = {
  overdue: 'border-red-300',
  due_today: 'border-orange-300',
  upcoming: 'border-gray-200',
  none: 'border-gray-200',
};

const URGENCY_PRIORITY: Record<JobUrgency, number> = {
  overdue: 0,
  due_today: 1,
  upcoming: 2,
  none: 3,
};

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getJobUrgency(nextActionDate: Date | null): JobUrgency {
  if (!nextActionDate) return 'none';

  const now = new Date();

  if (nextActionDate < now) return 'overdue';
  if (isSameCalendarDay(nextActionDate, now)) return 'due_today';
  return 'upcoming';
}

function getUpdatedAtTime(job: Job): number {
  const time = new Date(job.updated_at).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getRecommendedNextStep(
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

function buildJobMetricsMap(submissions: SubmissionMetricRow[]): Map<string, JobMetrics> {
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

async function loadJobsData(): Promise<{ jobs: Job[]; metrics: Map<string, JobMetrics> }> {
  const [jobsData, submissionsResult] = await Promise.all([
    fetchAllJobs(),
    supabase
      .from('submissions')
      .select('job_id, submission_stage, next_action_date'),
  ]);

  if (submissionsResult.error) {
    console.warn('[Jobs] submissions metrics unavailable:', submissionsResult.error);
  }

  const submissions = submissionsResult.error
    ? []
    : ((submissionsResult.data ?? []) as SubmissionMetricRow[]);

  return {
    jobs: jobsData as Job[],
    metrics: buildJobMetricsMap(submissions),
  };
}

export default function Jobs({ onViewTopMatches, onNewJobIntake }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobMetricsMap, setJobMetricsMap] = useState<Map<string, JobMetrics>>(new Map());
  const [loading, setLoading] = useState(true);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);

  const refreshJobs = useCallback(async () => {
    try {
      const data = await loadJobsData();
      setJobs(data.jobs);
      setJobMetricsMap(data.metrics);
    } catch (error) {
      console.error('[Jobs] loadJobs error:', error);
      setJobs([]);
      setJobMetricsMap(new Map());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshJobs();
  }, [refreshJobs]);

  const handleOperationalStatusChange = async (
    jobId: string,
    operationalStatus: JobOperationalStatus
  ) => {
    setUpdatingJobId(jobId);

    try {
      await updateJobOperationalStatus(jobId, operationalStatus);
      await refreshJobs();
    } catch (error) {
      console.error('[Jobs] update operational status error', {
        jobId,
        attemptedOperationalStatus: operationalStatus,
        error,
      });
      window.alert('Could not update operational status. Please try again.');
    } finally {
      setUpdatingJobId(null);
    }
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    const metricsA = jobMetricsMap.get(a.id);
    const metricsB = jobMetricsMap.get(b.id);
    const nextActionDateA = metricsA?.nextActionDate ?? null;
    const nextActionDateB = metricsB?.nextActionDate ?? null;
    const urgencyA = getJobUrgency(nextActionDateA);
    const urgencyB = getJobUrgency(nextActionDateB);
    const urgencyPriorityDiff = URGENCY_PRIORITY[urgencyA] - URGENCY_PRIORITY[urgencyB];

    if (urgencyPriorityDiff !== 0) {
      return urgencyPriorityDiff;
    }

    if (nextActionDateA && nextActionDateB) {
      const nextActionDiff = nextActionDateA.getTime() - nextActionDateB.getTime();
      if (nextActionDiff !== 0) {
        return nextActionDiff;
      }
    }

    if (nextActionDateA && !nextActionDateB) {
      return -1;
    }

    if (!nextActionDateA && nextActionDateB) {
      return 1;
    }

    const updatedAtDiff = getUpdatedAtTime(b) - getUpdatedAtTime(a);
    if (updatedAtDiff !== 0) {
      return updatedAtDiff;
    }

    return (a.job_title ?? '').localeCompare(b.job_title ?? '');
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {jobs.length} jobs from Supabase
          </p>
        </div>
        <button
          onClick={onNewJobIntake}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          + New Job Intake
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-400">No jobs found in Supabase yet.</p>
          </div>
        ) : (
          sortedJobs.map(job => {
            const metrics = jobMetricsMap.get(job.id);
            const urgency = getJobUrgency(metrics?.nextActionDate ?? null);
            const urgencyLabel = URGENCY_LABEL[urgency];
            const urgencyStyle = URGENCY_STYLE[urgency];
            const cardBorderStyle = CARD_BORDER_STYLE[urgency];
            const candidatesCount = metrics?.candidates ?? 0;
            const shortlistedCount = metrics?.shortlisted ?? 0;
            const nextActionText = metrics?.nextActionDate
              ? timeAgo(metrics.nextActionDate.toISOString())
              : 'No action';
            const recommendedNextStep = getRecommendedNextStep(
              urgency,
              candidatesCount,
              shortlistedCount
            );

            return (
              <div
                key={job.id}
                className={`bg-white rounded-lg border p-5 hover:bg-gray-50 transition-colors ${cardBorderStyle}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate" title={job.job_title}>
                      {job.job_title}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">{job.company_name}</p>

                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-2">
                      <MapPin size={14} className="text-gray-400" />
                      <span>{job.location || '-'}</span>
                    </div>

                    <p className="text-xs text-gray-400 mt-2">Updated: {timeAgo(job.updated_at)}</p>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Operational:</span>
                      <select
                        value={job.operational_status}
                        disabled={updatingJobId === job.id}
                        onChange={(event) =>
                          handleOperationalStatusChange(
                            job.id,
                            event.target.value as JobOperationalStatus
                          )
                        }
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-200 disabled:opacity-60"
                      >
                        {OPERATIONAL_STATUS_OPTIONS.map(status => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:items-end lg:text-right">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600">
                      <div>
                        <span className="text-gray-400">Candidates:</span> {candidatesCount}
                      </div>
                      <div>
                        <span className="text-gray-400">Shortlisted:</span> {shortlistedCount}
                      </div>
                      <div>
                        <span className="text-gray-400">Stage:</span> Active
                      </div>
                      <div>
                        <span className="text-gray-400">Recommended:</span>{' '}
                        {recommendedNextStep}{' '}
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${urgencyStyle}`}>
                          {urgencyLabel}
                        </span>
                        {metrics?.nextActionDate && (
                          <span className="block text-xs text-gray-400 mt-1">
                            Next action date: {nextActionText}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onViewTopMatches(job.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <BarChart2 size={12} />
                      View Top Matches
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
