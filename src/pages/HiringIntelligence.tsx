import { useEffect, useMemo, useState } from 'react';
import { BarChart2, MapPin, Search, X } from 'lucide-react';
import { fetchAllJobs, type JobListRow } from '../lib/jobs';
import { normalizeJobTitles } from '../lib/roleNormalization';
import { Badge, PageHeader, Panel, SectionHeader } from '../components/visualSystem';

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

const PRIORITY_TONE: Record<PriorityLabel, 'emerald' | 'blue' | 'slate'> = {
  High: 'emerald',
  Medium: 'blue',
  Low: 'slate',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function normalizeText(value: unknown): string {
  return String(value ?? '').toLowerCase().trim();
}

function SummaryCard({ title, items, activeValue, onSelect }: SummaryCardProps) {
  return (
    <Panel className="p-3.5">
      <p className="mb-2.5 text-sm font-semibold tracking-tight text-slate-950">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">No signals yet</p>
      ) : (
        <div className="space-y-1">
          {items.map(item => (
            <button
              key={item.label}
              onClick={() => onSelect(item.label)}
              className={`w-full flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                activeValue === item.label
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 text-xs font-semibold text-slate-500">{item.count}</span>
            </button>
          ))}
        </div>
      )}
    </Panel>
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
  const [search, setSearch] = useState('');
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
  const operationalJobCount = jobs.length - intelligenceJobs.length;
  const normalizedJobs = useMemo(() => normalizeJobTitles(intelligenceJobs), [intelligenceJobs]);
  const normalizedSearch = search.trim().toLowerCase();

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

  const visibleJobs = useMemo(() => {
    if (!normalizedSearch) return filteredJobs;

    return filteredJobs.filter(job => {
      const haystack = [
        job.job_title,
        job.company_name,
        job.location,
        job.normalized_job_title,
        job.role_family,
        job.seniority,
      ]
        .map(normalizeText)
        .join(' ');

      return haystack.includes(normalizedSearch);
    });
  }, [filteredJobs, normalizedSearch]);

  return (
    <div>
      <PageHeader
        eyebrow="Market Signal"
        title="Hiring Intelligence"
        description={`${intelligenceJobs.length} discovered market-demand jobs${
          operationalJobCount > 0 ? ` (${operationalJobCount} operational manual-intake jobs live in Jobs/Active Jobs)` : ''
        }`}
      />

      {loading ? (
        <Panel className="flex items-center justify-center py-16">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </Panel>
      ) : intelligenceJobs.length === 0 ? (
        <Panel className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="text-sm font-semibold text-slate-700">No hiring intelligence jobs found yet.</p>
          <p className="max-w-[420px] text-sm text-slate-400">
            Once Terrer starts collecting market-demand roles, you&apos;ll see hiring hotspots and company targets here.
          </p>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-4">
              <Panel padded={false} className="overflow-hidden">
                <SectionHeader
                  title="Priority Targets"
                  description="Companies with demand overlapping Terrer's current tech/digital supply."
                  icon={<BarChart2 size={16} className="text-emerald-600" />}
                  meta={<Badge>Rule-based</Badge>}
                />
                <div className="border-t border-slate-200/70 p-3">
                  <div className="grid grid-cols-1 gap-2">
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
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          filter?.type === 'company' && filter.value === target.companyName
                            ? 'border-blue-200 bg-blue-50/70'
                            : 'border-slate-200/70 bg-white/70 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">{target.companyName}</p>
                            <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                              {target.activeJobCount} scraped job{target.activeJobCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <Badge tone={PRIORITY_TONE[target.priorityLabel]} className="shrink-0">
                            {target.priorityLabel} priority
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-slate-600">
                          <p className="truncate">
                            <span className="text-slate-400">Roles:</span> {target.dominantRoles.join(', ')}
                          </p>
                          <p className="truncate">
                            <span className="text-slate-400">Families:</span> {target.dominantFamilies.join(', ')}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </Panel>

              <SummaryCard
                title="Top Hiring Companies"
                items={topHiringCompanies}
                activeValue={filter?.type === 'company' ? filter.value : null}
                onSelect={(value) =>
                  setFilter(filter?.type === 'company' && filter.value === value ? null : { type: 'company', value })
                }
              />
              <SummaryCard
                title="Top Roles in Demand"
                items={topRolesInDemand}
                activeValue={filter?.type === 'role' ? filter.value : null}
                onSelect={(value) =>
                  setFilter(filter?.type === 'role' && filter.value === value ? null : { type: 'role', value })
                }
              />
              <SummaryCard
                title="Role Families"
                items={topRoleFamilies}
                activeValue={filter?.type === 'family' ? filter.value : null}
                onSelect={(value) =>
                  setFilter(filter?.type === 'family' && filter.value === value ? null : { type: 'family', value })
                }
              />
            </div>

            <Panel padded={false} className="overflow-hidden">
              <SectionHeader
                title="Scraped Jobs Drilldown"
                description={`${visibleJobs.length} of ${intelligenceJobs.length} scraped jobs shown${
                  filter ? ` for ${filter.value}` : ''
                }`}
                icon={<MapPin size={16} className="text-slate-500" />}
                meta={
                  <div className="flex items-center gap-2">
                    {filter ? (
                      <button
                        type="button"
                        onClick={() => setFilter(null)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200/70 transition-colors hover:bg-slate-100"
                      >
                        <X size={12} />
                        Clear filter
                      </button>
                    ) : (
                      <Badge>All signals</Badge>
                    )}
                  </div>
                }
              />

              <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="relative block w-full sm:max-w-[420px]">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search scraped jobs (title, company, role, family, location)"
                    className="w-full rounded-xl border border-slate-200/70 bg-white/90 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="tabular-nums">{intelligenceJobs.length} market jobs</span>
                  {operationalJobCount > 0 ? (
                    <span className="tabular-nums">{operationalJobCount} operational jobs excluded</span>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-slate-200/70">
                {visibleJobs.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-slate-700">No matches for your filters.</p>
                    <p className="mt-1 text-sm text-slate-400">Try clearing the filter or broadening the search query.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed divide-y divide-slate-200/80 text-left text-sm">
                      <colgroup>
                        <col className="w-[38%]" />
                        <col className="w-[28%]" />
                        <col className="w-[16%]" />
                        <col className="w-[10%]" />
                        <col className="w-[8%]" />
                      </colgroup>
                      <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Job</th>
                          <th className="px-3 py-3">Signal</th>
                          <th className="px-3 py-3">Location</th>
                          <th className="px-3 py-3">Updated</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white/60">
                        {visibleJobs.map(job => (
                          <tr key={job.id} className="transition-colors hover:bg-slate-50">
                            <td className="px-4 py-3 align-top">
                              <p className="truncate text-sm font-semibold text-slate-950" title={job.job_title}>
                                {job.job_title}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-slate-600">{job.company_name}</p>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="flex flex-wrap gap-1.5">
                                <Badge tone="blue">{job.normalized_job_title}</Badge>
                                <Badge>{job.role_family}</Badge>
                                <Badge tone="amber">{job.seniority}</Badge>
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                <MapPin size={14} className="text-slate-400" />
                                <span className="truncate">{job.location || '-'}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top text-xs text-slate-500 tabular-nums">{timeAgo(job.updated_at)}</td>
                            <td className="px-4 py-3 align-top text-right">
                              <button
                                onClick={() => onViewTopMatches(job.id)}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                              >
                                <BarChart2 size={12} />
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
