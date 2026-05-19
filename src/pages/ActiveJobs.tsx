import { useEffect, useMemo, useState } from 'react';
import { Activity, Briefcase, Clock3, Search, Users } from 'lucide-react';
import JobWorkQueue from '../components/JobWorkQueue';
import { Badge, MetricTile, PageHeader, Panel } from '../components/visualSystem';
import { fetchAllJobs, type JobListRow } from '../lib/jobs';
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
}

export default function ActiveJobs({ onViewTopMatches }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobMetricsMap, setJobMetricsMap] = useState<Map<string, JobMetrics>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadJobs() {
      try {
        const [jobsData, submissionsResult] = await Promise.all([
          fetchAllJobs(),
          supabase
            .from('submissions')
            .select('job_id, submission_stage, next_action_date'),
        ]);

        if (submissionsResult.error) {
          console.warn('[ActiveJobs] submissions metrics unavailable:', submissionsResult.error);
        }

        const submissions = submissionsResult.error
          ? []
          : ((submissionsResult.data ?? []) as SubmissionMetricRow[]);
        setJobs(jobsData);
        setJobMetricsMap(buildJobMetricsMap(submissions));
      } catch (error) {
        console.error('[ActiveJobs] loadJobs error:', error);
        setJobs([]);
        setJobMetricsMap(new Map());
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

  const activeJobs = jobs.filter(job => job.operational_status === 'active');
  const searchQuery = normalizeText(search);

  const filteredActiveJobs = searchQuery
    ? activeJobs.filter(job => {
        const anyJob = job as unknown as {
          role_family?: string | null;
          seniority?: string | null;
        };
        const haystack = [
          job.job_title,
          job.company_name,
          job.location,
          anyJob.role_family,
          anyJob.seniority,
        ]
          .map(normalizeText)
          .join(' ');
        return haystack.includes(searchQuery);
      })
    : activeJobs;

  const sortedJobs = useMemo(
    () => sortJobsForQueue(filteredActiveJobs, jobMetricsMap),
    [filteredActiveJobs, jobMetricsMap]
  );

  const activeWithCandidates = activeJobs.filter(job => (jobMetricsMap.get(job.id)?.candidates ?? 0) > 0).length;
  const activeShortlisted = activeJobs.reduce(
    (total, job) => total + (jobMetricsMap.get(job.id)?.shortlisted ?? 0),
    0
  );
  const activeNeedingAction = activeJobs.filter(job => {
    const urgency = getJobUrgency(jobMetricsMap.get(job.id)?.nextActionDate ?? null);
    return urgency === 'overdue' || urgency === 'due_today';
  }).length;

  return (
    <div>
      <PageHeader
        eyebrow="Active Execution"
        title="Active Jobs"
        description="Search and prioritise jobs marked active for Terrer execution."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricTile label="Active Jobs" value={activeJobs.length} detail="Operational status active" icon={<Activity size={14} />} tone="emerald" />
        <MetricTile label="Visible Queue" value={sortedJobs.length} detail="After current search" icon={<Briefcase size={14} />} tone="blue" />
        <MetricTile label="With Candidates" value={activeWithCandidates} detail="Active jobs with pipeline" icon={<Users size={14} />} tone="teal" />
        <MetricTile label="Due / Overdue" value={activeNeedingAction} detail={`${activeShortlisted} shortlisted total`} icon={<Clock3 size={14} />} tone="amber" />
      </div>

      <Panel className="mb-4 flex flex-col gap-3 p-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Badge tone="blue" className="whitespace-nowrap">operational_status = active</Badge>
          <p className="text-xs leading-relaxed text-slate-500">
            This view keeps the existing active-only filter and focuses the queue on current recruiter execution.
          </p>
        </div>
        <label className="relative block min-w-0 xl:w-[420px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by role, company, location, or skill area"
            className="w-full rounded-xl border border-slate-200 bg-white/90 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </Panel>

      <JobWorkQueue
        jobs={sortedJobs}
        metricsMap={jobMetricsMap}
        loading={loading}
        emptyMessage="No active jobs found yet. Mark a job active for Terrer execution to show it here."
        emptySearchMessage="No active jobs match your search."
        totalCount={activeJobs.length}
        visibleCount={sortedJobs.length}
        onViewTopMatches={onViewTopMatches}
        statusLabel="Active-only"
      />
    </div>
  );
}
