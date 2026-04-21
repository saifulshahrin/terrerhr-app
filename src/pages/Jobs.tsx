import { useEffect, useMemo, useState } from 'react';
import { MapPin, BarChart2 } from 'lucide-react';
import { fetchAllJobs, type JobListRow } from '../lib/jobs';
import { supabase } from '../lib/supabase';
import { normalizeJobTitles } from '../lib/roleNormalization';

type Job = JobListRow;

type JobView = 'active' | 'intelligence';

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

interface AggregationItem {
  label: string;
  count: number;
}

type PriorityLabel = 'High' | 'Medium' | 'Low';

interface PriorityTarget {
  companyName: string;
  activeJobCount: number;
  dominantRoles: string[];
  dominantFamilies: string[];
  priorityLabel: PriorityLabel;
  priorityScore: number;
}

interface NormalizedJobForPriority {
  company_name: string;
  normalized_job_title: string;
  role_family: string;
}

type JobUrgency = 'overdue' | 'due_today' | 'upcoming' | 'none';

interface IntelligenceSummaryCardProps {
  title: string;
  items: AggregationItem[];
  activeValue: string | null;
  onSelect: (value: string) => void;
}

interface Props {
  onViewTopMatches: (jobId: string) => void;
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

const PRIORITY_STYLE: Record<PriorityLabel, string> = {
  High: 'text-green-700 bg-green-50 border-green-200',
  Medium: 'text-blue-700 bg-blue-50 border-blue-200',
  Low: 'text-gray-600 bg-gray-100 border-gray-200',
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

function IntelligenceSummaryCard({
  title,
  items,
  activeValue,
  onSelect,
}: IntelligenceSummaryCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-900 mb-3">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">No signals yet</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <button
              key={item.label}
              onClick={() => onSelect(item.label)}
              className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                activeValue === item.label
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 text-xs font-semibold text-gray-500">{item.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function aggregateBy(values: string[], limit = 5): AggregationItem[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    const label = value?.trim() || 'Unknown';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function getSupplyFitWeight(job: NormalizedJobForPriority): number {
  const role = job.normalized_job_title.toLowerCase();
  const family = job.role_family.toLowerCase();

  if (
    role.includes('software') ||
    role.includes('frontend') ||
    role.includes('data') ||
    role.includes('product') ||
    role.includes('technical program') ||
    family.includes('technology') ||
    family.includes('data') ||
    family.includes('product')
  ) {
    return 2;
  }

  if (
    family.includes('legal') ||
    family.includes('medical') ||
    family.includes('banking / branch') ||
    family.includes('operations')
  ) {
    return 0;
  }

  return 1;
}

function getPriorityLabel(priorityScore: number, highFitJobCount: number): PriorityLabel {
  if (highFitJobCount >= 2 || priorityScore >= 5) return 'High';
  if (highFitJobCount >= 1 || priorityScore >= 3) return 'Medium';
  return 'Low';
}

function buildPriorityTargets(jobs: NormalizedJobForPriority[]): PriorityTarget[] {
  const grouped = new Map<
    string,
    {
      jobs: NormalizedJobForPriority[];
      supplyFitScore: number;
      highFitJobCount: number;
    }
  >();

  for (const job of jobs) {
    const companyName = job.company_name?.trim() || 'Unknown Company';
    const supplyFitWeight = getSupplyFitWeight(job);
    const existing = grouped.get(companyName) ?? {
      jobs: [],
      supplyFitScore: 0,
      highFitJobCount: 0,
    };

    existing.jobs.push(job);
    existing.supplyFitScore += supplyFitWeight;
    if (supplyFitWeight === 2) {
      existing.highFitJobCount += 1;
    }

    grouped.set(companyName, existing);
  }

  return Array.from(grouped.entries())
    .map(([companyName, value]) => {
      const activeJobCount = value.jobs.length;
      const priorityScore = activeJobCount + value.supplyFitScore;

      return {
        companyName,
        activeJobCount,
        dominantRoles: aggregateBy(value.jobs.map(job => job.normalized_job_title), 3).map(
          item => item.label
        ),
        dominantFamilies: aggregateBy(value.jobs.map(job => job.role_family), 2).map(
          item => item.label
        ),
        priorityLabel: getPriorityLabel(priorityScore, value.highFitJobCount),
        priorityScore,
      };
    })
    .sort(
      (a, b) =>
        b.priorityScore - a.priorityScore ||
        b.activeJobCount - a.activeJobCount ||
        a.companyName.localeCompare(b.companyName)
    )
    .slice(0, 6);
}

export default function Jobs({ onViewTopMatches }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobMetricsMap, setJobMetricsMap] = useState<Map<string, JobMetrics>>(new Map());
  const [loading, setLoading] = useState(true);
  const [jobView, setJobView] = useState<JobView>('active');
  const [intelligenceFilter, setIntelligenceFilter] = useState<{
    type: 'company' | 'role' | 'family';
    value: string;
  } | null>(null);

  useEffect(() => {
    async function loadJobs() {
      try {
        const [jobsData, submissionsResult] = await Promise.all([
          fetchAllJobs(),
          supabase
            .from('submissions')
            .select('job_id, submission_stage, next_action_date'),
        ]);

        if (submissionsResult.error) throw submissionsResult.error;

        const submissions = (submissionsResult.data ?? []) as SubmissionMetricRow[];
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

        setJobs(jobsData as Job[]);
        setJobMetricsMap(nextMetricsMap);
      } catch (error) {
        console.error('[Jobs] loadJobs error:', error);
        setJobs([]);
        setJobMetricsMap(new Map());
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

  const activeJobs = jobs.filter(job => job.source === 'manual_intake');
  const intelligenceJobs = jobs.filter(job => job.source !== 'manual_intake');
  const normalizedIntelligenceJobs = useMemo(
    () => normalizeJobTitles(intelligenceJobs),
    [intelligenceJobs]
  );

  const topHiringCompanies = useMemo(
    () => aggregateBy(normalizedIntelligenceJobs.map(job => job.company_name), 6),
    [normalizedIntelligenceJobs]
  );

  const topRolesInDemand = useMemo(
    () => aggregateBy(normalizedIntelligenceJobs.map(job => job.normalized_job_title), 6),
    [normalizedIntelligenceJobs]
  );

  const topRoleFamilies = useMemo(
    () => aggregateBy(normalizedIntelligenceJobs.map(job => job.role_family), 6),
    [normalizedIntelligenceJobs]
  );

  const priorityTargets = useMemo(
    () => buildPriorityTargets(normalizedIntelligenceJobs),
    [normalizedIntelligenceJobs]
  );

  const filteredIntelligenceJobs = useMemo(() => {
    if (!intelligenceFilter) return normalizedIntelligenceJobs;

    return normalizedIntelligenceJobs.filter(job => {
      if (intelligenceFilter.type === 'company') {
        return (job.company_name || 'Unknown') === intelligenceFilter.value;
      }
      if (intelligenceFilter.type === 'role') {
        return job.normalized_job_title === intelligenceFilter.value;
      }
      return job.role_family === intelligenceFilter.value;
    });
  }, [intelligenceFilter, normalizedIntelligenceJobs]);

  const visibleJobs = jobView === 'active' ? activeJobs : filteredIntelligenceJobs;

  const sortedJobs = [...visibleJobs].sort((a, b) => {
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

  const pageTitle = jobView === 'active' ? 'Active Jobs' : 'Hiring Intelligence';
  const emptyMessage =
    jobView === 'active'
      ? 'No active recruiter jobs yet. Use Job Intake to add one.'
      : 'No hiring intelligence jobs found yet.';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">{pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {visibleJobs.length} {jobView === 'active' ? 'active jobs' : 'intelligence jobs'}
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
          + New Job
        </button>
      </div>

      <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 mb-5">
        <button
          onClick={() => {
            setJobView('active');
            setIntelligenceFilter(null);
          }}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            jobView === 'active'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Active Jobs ({activeJobs.length})
        </button>
        <button
          onClick={() => setJobView('intelligence')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            jobView === 'intelligence'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Hiring Intelligence ({intelligenceJobs.length})
        </button>
      </div>

      {!loading && jobView === 'intelligence' && intelligenceJobs.length > 0 && (
        <div className="space-y-5 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Priority Targets</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Companies with demand that best overlaps Terrer&apos;s current tech/digital candidate supply.
                </p>
              </div>
              <p className="text-xs text-gray-400">Rule-based signal, not AI scoring</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              {priorityTargets.map(target => (
                <button
                  key={target.companyName}
                  onClick={() =>
                    setIntelligenceFilter(
                      intelligenceFilter?.type === 'company' &&
                        intelligenceFilter.value === target.companyName
                        ? null
                        : { type: 'company', value: target.companyName }
                    )
                  }
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    intelligenceFilter?.type === 'company' &&
                    intelligenceFilter.value === target.companyName
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {target.companyName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {target.activeJobCount} active scraped jobs
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_STYLE[target.priorityLabel]}`}
                    >
                      {target.priorityLabel}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                    <p>
                      <span className="text-gray-400">Roles:</span>{' '}
                      {target.dominantRoles.join(', ')}
                    </p>
                    <p>
                      <span className="text-gray-400">Families:</span>{' '}
                      {target.dominantFamilies.join(', ')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <IntelligenceSummaryCard
              title="Top Hiring Companies"
              items={topHiringCompanies}
              activeValue={intelligenceFilter?.type === 'company' ? intelligenceFilter.value : null}
              onSelect={(value) =>
                setIntelligenceFilter(
                  intelligenceFilter?.type === 'company' && intelligenceFilter.value === value
                    ? null
                    : { type: 'company', value }
                )
              }
            />
            <IntelligenceSummaryCard
              title="Top Roles in Demand"
              items={topRolesInDemand}
              activeValue={intelligenceFilter?.type === 'role' ? intelligenceFilter.value : null}
              onSelect={(value) =>
                setIntelligenceFilter(
                  intelligenceFilter?.type === 'role' && intelligenceFilter.value === value
                    ? null
                    : { type: 'role', value }
                )
              }
            />
            <IntelligenceSummaryCard
              title="Role Families"
              items={topRoleFamilies}
              activeValue={intelligenceFilter?.type === 'family' ? intelligenceFilter.value : null}
              onSelect={(value) =>
                setIntelligenceFilter(
                  intelligenceFilter?.type === 'family' && intelligenceFilter.value === value
                    ? null
                    : { type: 'family', value }
                )
              }
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Raw scraped jobs drill-down</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {filteredIntelligenceJobs.length} of {intelligenceJobs.length} scraped jobs shown
                {intelligenceFilter ? ` for ${intelligenceFilter.value}` : ''}
              </p>
            </div>
            {intelligenceFilter && (
              <button
                onClick={() => setIntelligenceFilter(null)}
                className="self-start sm:self-auto px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visibleJobs.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-400">{emptyMessage}</p>
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
            const normalizedJob =
              jobView === 'intelligence' ? normalizeJobTitles([job])[0] : null;

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

                    {normalizedJob && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                          {normalizedJob.normalized_job_title}
                        </span>
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                          {normalizedJob.role_family}
                        </span>
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                          {normalizedJob.seniority}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-2">
                      <MapPin size={14} className="text-gray-400" />
                      <span>{job.location || '-'}</span>
                    </div>

                    <p className="text-xs text-gray-400 mt-2">Updated: {timeAgo(job.updated_at)}</p>
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
                        <span className="text-gray-400">
                          {jobView === 'active' ? 'Recommended:' : 'Next Action:'}
                        </span>{' '}
                        {jobView === 'active' ? recommendedNextStep : nextActionText}{' '}
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${urgencyStyle}`}>
                          {urgencyLabel}
                        </span>
                        {jobView === 'active' && metrics?.nextActionDate && (
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
