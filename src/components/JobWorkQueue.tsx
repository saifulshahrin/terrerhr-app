import { useEffect, useMemo, useState } from 'react';
import { BarChart2, Briefcase, CalendarClock, MapPin, Users } from 'lucide-react';
import type { JobListRow, JobOperationalStatus } from '../lib/jobs';
import {
  getJobUrgency,
  getRecommendedNextStep,
  timeAgo,
  type JobMetrics,
  URGENCY_LABEL,
  type JobUrgency,
} from '../lib/jobQueue';
import { Badge, Panel, SectionHeader } from './visualSystem';

const OPERATIONAL_STATUS_OPTIONS: JobOperationalStatus[] = [
  'not_started',
  'active',
  'paused',
  'closed',
];

const urgencyTone: Record<JobUrgency, 'slate' | 'blue' | 'amber' | 'red'> = {
  overdue: 'red',
  due_today: 'amber',
  upcoming: 'blue',
  none: 'slate',
};

const statusTone: Record<JobOperationalStatus, 'slate' | 'blue' | 'amber' | 'emerald'> = {
  not_started: 'slate',
  active: 'emerald',
  paused: 'amber',
  closed: 'slate',
};

interface JobWorkQueueProps {
  jobs: JobListRow[];
  metricsMap: Map<string, JobMetrics>;
  loading: boolean;
  emptyMessage: string;
  emptySearchMessage: string;
  totalCount: number;
  visibleCount: number;
  onViewTopMatches: (jobId: string) => void;
  onOperationalStatusChange?: (jobId: string, operationalStatus: JobOperationalStatus) => void;
  updatingJobId?: string | null;
  statusLabel?: string;
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

function getMetrics(metricsMap: Map<string, JobMetrics>, jobId: string): JobMetrics {
  return metricsMap.get(jobId) ?? {
    candidates: 0,
    shortlisted: 0,
    nextActionDate: null,
  };
}

export default function JobWorkQueue({
  jobs,
  metricsMap,
  loading,
  emptyMessage,
  emptySearchMessage,
  totalCount,
  visibleCount,
  onViewTopMatches,
  onOperationalStatusChange,
  updatingJobId,
  statusLabel = 'Operational status',
}: JobWorkQueueProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    if (jobs.length === 0) {
      setSelectedJobId(null);
      return;
    }

    if (!selectedJobId || !jobs.some(job => job.id === selectedJobId)) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  const selectedJob = useMemo(
    () => jobs.find(job => job.id === selectedJobId) ?? jobs[0] ?? null,
    [jobs, selectedJobId]
  );

  if (loading) {
    return (
      <Panel className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </Panel>
    );
  }

  if (totalCount === 0) {
    return (
      <Panel className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-slate-400">{emptyMessage}</p>
      </Panel>
    );
  }

  if (visibleCount === 0) {
    return (
      <Panel className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-slate-400">{emptySearchMessage}</p>
      </Panel>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel padded={false} className="overflow-hidden">
        <SectionHeader
          icon={<Briefcase size={15} />}
          title="Recruiter Job Queue"
          description={`${visibleCount} visible jobs sorted by urgency, next action, and recent update`}
          meta={<Badge>{statusLabel}</Badge>}
        />

        <div className="border-t border-slate-200/80">
          <table className="w-full table-fixed divide-y divide-slate-200/80 text-left text-sm">
            <colgroup>
              <col className="w-[38%]" />
              <col className="w-[21%]" />
              <col className="w-[12%]" />
              <col className="w-[15%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Job</th>
                <th className="px-3 py-3">Signal</th>
                <th className="px-3 py-3">Pipeline</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/60">
              {jobs.map(job => {
                const metrics = getMetrics(metricsMap, job.id);
                const urgency = getJobUrgency(metrics.nextActionDate);
                const recommendedNextStep = getRecommendedNextStep(
                  urgency,
                  metrics.candidates,
                  metrics.shortlisted
                );
                const isSelected = selectedJob?.id === job.id;
                const nextActionText = metrics.nextActionDate
                  ? timeAgo(metrics.nextActionDate.toISOString())
                  : 'No action date';

                return (
                  <tr
                    key={job.id}
                    className={`transition-colors hover:bg-slate-50 ${
                      isSelected ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <td className="max-w-[360px] px-4 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => setSelectedJobId(job.id)}
                        className="block w-full min-w-0 text-left"
                      >
                        <span className="block truncate text-sm font-semibold text-slate-950" title={job.job_title}>
                          {job.job_title}
                        </span>
                        <span className="mt-1 block truncate text-xs text-slate-600">{job.company_name}</span>
                        <span className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
                          <MapPin size={13} className="shrink-0 text-slate-400" />
                          {job.location || '-'}
                        </span>
                      </button>
                    </td>

                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col gap-1.5">
                        <Badge tone={urgencyTone[urgency]}>{URGENCY_LABEL[urgency]}</Badge>
                        <span className="max-w-[180px] truncate text-xs font-medium text-slate-700">
                          {recommendedNextStep}
                        </span>
                        <span className="text-xs text-slate-400">{nextActionText}</span>
                      </div>
                    </td>

                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="font-semibold text-slate-900">
                          <span className="mr-1 text-[10px] uppercase tracking-wide text-slate-400">C</span>
                          {metrics.candidates}
                        </span>
                        <span className="font-semibold text-slate-900">
                          <span className="mr-1 text-[10px] uppercase tracking-wide text-slate-400">S</span>
                          {metrics.shortlisted}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-3 align-top">
                      {onOperationalStatusChange ? (
                        <select
                          value={job.operational_status}
                          disabled={updatingJobId === job.id}
                          onChange={event =>
                            onOperationalStatusChange(job.id, event.target.value as JobOperationalStatus)
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                        >
                          {OPERATIONAL_STATUS_OPTIONS.map(status => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge tone={statusTone[job.operational_status]}>
                          {formatStatus(job.operational_status)}
                        </Badge>
                      )}
                      <p className="mt-1 text-xs text-slate-400">Updated {timeAgo(job.updated_at)}</p>
                    </td>

                    <td className="px-4 py-3 text-right align-top">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => onViewTopMatches(job.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                        >
                          <BarChart2 size={13} />
                          Matches
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {selectedJob ? (
        <JobDetailPanel
          job={selectedJob}
          metrics={getMetrics(metricsMap, selectedJob.id)}
          onViewTopMatches={onViewTopMatches}
          onOperationalStatusChange={onOperationalStatusChange}
          updatingJobId={updatingJobId}
        />
      ) : null}
    </div>
  );
}

function JobDetailPanel({
  job,
  metrics,
  onViewTopMatches,
  onOperationalStatusChange,
  updatingJobId,
}: {
  job: JobListRow;
  metrics: JobMetrics;
  onViewTopMatches: (jobId: string) => void;
  onOperationalStatusChange?: (jobId: string, operationalStatus: JobOperationalStatus) => void;
  updatingJobId?: string | null;
}) {
  const urgency = getJobUrgency(metrics.nextActionDate);
  const recommendedNextStep = getRecommendedNextStep(urgency, metrics.candidates, metrics.shortlisted);
  const nextActionText = metrics.nextActionDate
    ? timeAgo(metrics.nextActionDate.toISOString())
    : 'No action date';

  return (
    <Panel className="xl:sticky xl:top-6 xl:self-start">
      <div className="border-b border-slate-200/80 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Selected Job</p>
        <h2 className="mt-2 text-base font-semibold leading-snug text-slate-950">{job.job_title}</h2>
        <p className="mt-1 text-sm text-slate-600">{job.company_name}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin size={13} />
          {job.location || '-'}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Candidates</p>
          <p className="mt-1 text-xl font-semibold text-slate-950">{metrics.candidates}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Shortlisted</p>
          <p className="mt-1 text-xl font-semibold text-slate-950">{metrics.shortlisted}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-3">
          <div className="mb-2 flex items-center gap-2">
            <CalendarClock size={14} className="text-slate-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next Signal</p>
          </div>
          <Badge tone={urgencyTone[urgency]}>{URGENCY_LABEL[urgency]}</Badge>
          <p className="mt-2 text-sm font-medium text-slate-900">{recommendedNextStep}</p>
          <p className="mt-0.5 text-xs text-slate-500">{nextActionText}</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-3">
          <div className="mb-2 flex items-center gap-2">
            <Users size={14} className="text-slate-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operational Status</p>
          </div>
          {onOperationalStatusChange ? (
            <select
              value={job.operational_status}
              disabled={updatingJobId === job.id}
              onChange={event => onOperationalStatusChange(job.id, event.target.value as JobOperationalStatus)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            >
              {OPERATIONAL_STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          ) : (
            <Badge tone={statusTone[job.operational_status]}>{formatStatus(job.operational_status)}</Badge>
          )}
          <p className="mt-2 text-xs text-slate-500">Updated {timeAgo(job.updated_at)}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onViewTopMatches(job.id)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
      >
        <BarChart2 size={15} />
        View Top Matches
      </button>
    </Panel>
  );
}
