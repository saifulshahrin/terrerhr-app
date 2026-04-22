import { useEffect, useMemo, useState } from 'react';
import { BarChart2, MapPin } from 'lucide-react';
import { fetchAllJobs, type JobListRow } from '../lib/jobs';
import { normalizeJobTitles } from '../lib/roleNormalization';

type Job = JobListRow;

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

interface SummaryCardProps {
  title: string;
  items: AggregationItem[];
  activeValue: string | null;
  onSelect: (value: string) => void;
}

interface Props {
  onViewTopMatches: (jobId: string) => void;
}

const PRIORITY_STYLE: Record<PriorityLabel, string> = {
  High: 'text-green-700 bg-green-50 border-green-200',
  Medium: 'text-blue-700 bg-blue-50 border-blue-200',
  Low: 'text-gray-600 bg-gray-100 border-gray-200',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function SummaryCard({ title, items, activeValue, onSelect }: SummaryCardProps) {
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

export default function HiringIntelligence({ onViewTopMatches }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    type: 'company' | 'role' | 'family';
    value: string;
  } | null>(null);

  useEffect(() => {
    async function loadJobs() {
      try {
        setJobs(await fetchAllJobs());
      } catch (error) {
        console.error('[HiringIntelligence] loadJobs error:', error);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

  const intelligenceJobs = jobs.filter(job => job.source !== 'manual_intake');
  const normalizedJobs = useMemo(() => normalizeJobTitles(intelligenceJobs), [intelligenceJobs]);

  const topHiringCompanies = useMemo(
    () => aggregateBy(normalizedJobs.map(job => job.company_name), 6),
    [normalizedJobs]
  );

  const topRolesInDemand = useMemo(
    () => aggregateBy(normalizedJobs.map(job => job.normalized_job_title), 6),
    [normalizedJobs]
  );

  const topRoleFamilies = useMemo(
    () => aggregateBy(normalizedJobs.map(job => job.role_family), 6),
    [normalizedJobs]
  );

  const priorityTargets = useMemo(
    () => buildPriorityTargets(normalizedJobs),
    [normalizedJobs]
  );

  const filteredJobs = useMemo(() => {
    if (!filter) return normalizedJobs;

    return normalizedJobs.filter(job => {
      if (filter.type === 'company') return (job.company_name || 'Unknown') === filter.value;
      if (filter.type === 'role') return job.normalized_job_title === filter.value;
      return job.role_family === filter.value;
    });
  }, [filter, normalizedJobs]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Hiring Intelligence</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {intelligenceJobs.length} discovered market-demand jobs
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : intelligenceJobs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-gray-400">No hiring intelligence jobs found yet.</p>
        </div>
      ) : (
        <>
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
                      setFilter(
                        filter?.type === 'company' && filter.value === target.companyName
                          ? null
                          : { type: 'company', value: target.companyName }
                      )
                    }
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      filter?.type === 'company' && filter.value === target.companyName
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
              <SummaryCard
                title="Top Hiring Companies"
                items={topHiringCompanies}
                activeValue={filter?.type === 'company' ? filter.value : null}
                onSelect={(value) =>
                  setFilter(
                    filter?.type === 'company' && filter.value === value
                      ? null
                      : { type: 'company', value }
                  )
                }
              />
              <SummaryCard
                title="Top Roles in Demand"
                items={topRolesInDemand}
                activeValue={filter?.type === 'role' ? filter.value : null}
                onSelect={(value) =>
                  setFilter(
                    filter?.type === 'role' && filter.value === value
                      ? null
                      : { type: 'role', value }
                  )
                }
              />
              <SummaryCard
                title="Role Families"
                items={topRoleFamilies}
                activeValue={filter?.type === 'family' ? filter.value : null}
                onSelect={(value) =>
                  setFilter(
                    filter?.type === 'family' && filter.value === value
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
                  {filteredJobs.length} of {intelligenceJobs.length} scraped jobs shown
                  {filter ? ` for ${filter.value}` : ''}
                </p>
              </div>
              {filter && (
                <button
                  onClick={() => setFilter(null)}
                  className="self-start sm:self-auto px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {filteredJobs.map(job => (
              <div
                key={job.id}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate" title={job.job_title}>
                      {job.job_title}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">{job.company_name}</p>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                        {job.normalized_job_title}
                      </span>
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                        {job.role_family}
                      </span>
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                        {job.seniority}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-2">
                      <MapPin size={14} className="text-gray-400" />
                      <span>{job.location || '-'}</span>
                    </div>

                    <p className="text-xs text-gray-400 mt-2">Updated: {timeAgo(job.updated_at)}</p>
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
            ))}
          </div>
        </>
      )}
    </div>
  );
}
