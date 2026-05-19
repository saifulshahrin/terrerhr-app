import { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, Plus, Search, Users, Clock3, Activity } from 'lucide-react';
import JobWorkQueue from '../components/JobWorkQueue';
import { MetricTile, PageHeader, Panel } from '../components/visualSystem';
import {
  fetchAllJobs,
  updateJobOperationalStatus,
  type JobListRow,
  type JobOperationalStatus,
} from '../lib/jobs';
import {
  buildJobMetricsMap,
  getJobUrgency,
  normalizeText,
  sortJobsForQueue,
  type JobMetrics,
  type SubmissionMetricRow,
} from '../lib/jobQueue';
import { supabase } from '../lib/supabase';

type Job = JobListRow;

interface Props {
  onViewTopMatches: (jobId: string) => void;
  onNewJobIntake: () => void;
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
  const [search, setSearch] = useState('');

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

  const searchQuery = normalizeText(search);
  const filteredJobs = searchQuery
    ? jobs.filter(job => {
        const anyJob = job as unknown as {
          role_family?: string | null;
          seniority?: string | null;
        };

        const haystack = [
          job.job_title,
          job.company_name,
          job.location,
          job.source,
          anyJob.role_family,
          anyJob.seniority,
        ]
          .map(normalizeText)
          .join(' ');

        return haystack.includes(searchQuery);
      })
    : jobs;

  const sortedJobs = useMemo(
    () => sortJobsForQueue(filteredJobs, jobMetricsMap),
    [filteredJobs, jobMetricsMap]
  );

  const activeJobs = jobs.filter(job => job.operational_status === 'active').length;
  const jobsWithCandidates = jobs.filter(job => (jobMetricsMap.get(job.id)?.candidates ?? 0) > 0).length;
  const jobsNeedingAction = jobs.filter(job => {
    const urgency = getJobUrgency(jobMetricsMap.get(job.id)?.nextActionDate ?? null);
    return urgency === 'overdue' || urgency === 'due_today';
  }).length;

  return (
    <div>
      <PageHeader
        eyebrow="Recruiter Work Queue"
        title="Jobs"
        description={`${jobs.length} jobs from Supabase, sorted for recruiter execution`}
        actions={
          <button
            type="button"
            onClick={onNewJobIntake}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            <Plus size={15} />
            New Job Intake
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricTile label="Total Jobs" value={jobs.length} detail="All Supabase jobs" icon={<Briefcase size={14} />} tone="blue" />
        <MetricTile label="Active Jobs" value={activeJobs} detail="Operational status active" icon={<Activity size={14} />} tone="emerald" />
        <MetricTile label="With Candidates" value={jobsWithCandidates} detail="Has submission records" icon={<Users size={14} />} tone="teal" />
        <MetricTile label="Due / Overdue" value={jobsNeedingAction} detail="Needs recruiter action" icon={<Clock3 size={14} />} tone="amber" />
      </div>

      <Panel className="mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block min-w-0 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by role, company, location, source, or skill area"
            className="w-full rounded-xl border border-slate-200 bg-white/90 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <p className="shrink-0 text-xs font-medium text-slate-500">
          Showing {sortedJobs.length} of {jobs.length} jobs
        </p>
      </Panel>

      <JobWorkQueue
        jobs={sortedJobs}
        metricsMap={jobMetricsMap}
        loading={loading}
        emptyMessage="No jobs found in Supabase yet."
        emptySearchMessage="No jobs match your search."
        totalCount={jobs.length}
        visibleCount={sortedJobs.length}
        onViewTopMatches={onViewTopMatches}
        onOperationalStatusChange={handleOperationalStatusChange}
        updatingJobId={updatingJobId}
        statusLabel="Editable status"
      />
    </div>
  );
}
