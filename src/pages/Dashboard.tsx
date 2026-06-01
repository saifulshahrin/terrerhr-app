import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  MapPin,
  MessageSquare,
  PauseCircle,
  Plus,
  Search,
  Send,
  Star,
  TrendingUp,
  Users,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  fetchDashboardData,
  type ActionQueueItem,
  type AttentionJob,
  type BdQueueItem,
  type DashboardStageCounts,
  type DashboardStats,
  type OpportunityItem,
} from '../lib/dashboardData';
import { useStore } from '../store/StoreContext';
import { useRole } from '../store/RoleContext';
import { Badge, PageHeader, Panel, SectionHeader } from '../components/visualSystem';

const TODAY = new Date();
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const todayLabel = `${DAY_NAMES[TODAY.getDay()]}, ${TODAY.getDate()} ${MONTH_NAMES[TODAY.getMonth()]} ${TODAY.getFullYear()}`;

const attentionStatusStyle: Record<string, string> = {
  'No Submissions': 'bg-red-50 text-red-700 ring-red-200/60',
  Stale: 'bg-slate-50 text-slate-600 ring-slate-200/60',
  'Low Coverage': 'bg-amber-50 text-amber-800 ring-amber-200/60',
};

const funnelConfig: Array<{ key: keyof DashboardStageCounts; label: string; tone: string }> = [
  { key: 'new', label: 'New', tone: 'bg-slate-900' },
  { key: 'shortlisted', label: 'Shortlisted', tone: 'bg-sky-500' },
  { key: 'submitted_to_client', label: 'Submitted', tone: 'bg-violet-500' },
  { key: 'interview', label: 'Interview', tone: 'bg-amber-500' },
  { key: 'offer', label: 'Offer', tone: 'bg-emerald-500' },
];

const pipelineConfig: Array<{ key: keyof DashboardStageCounts; label: string; tone: string }> = [
  { key: 'new', label: 'New', tone: 'bg-slate-500' },
  { key: 'shortlisted', label: 'Shortlisted', tone: 'bg-sky-500' },
  { key: 'ready_for_bd_review', label: 'BD Review', tone: 'bg-indigo-500' },
  { key: 'submitted_to_client', label: 'Submitted', tone: 'bg-violet-500' },
  { key: 'interview', label: 'Interview', tone: 'bg-amber-500' },
  { key: 'offer', label: 'Offer', tone: 'bg-emerald-500' },
  { key: 'hold', label: 'Hold', tone: 'bg-gray-400' },
];

const EMPTY_STAGE_COUNTS: DashboardStageCounts = {
  new: 0,
  shortlisted: 0,
  ready_for_bd_review: 0,
  submitted_to_client: 0,
  interview: 0,
  offer: 0,
  hold: 0,
  rejected: 0,
  hired: 0,
};

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

type ActionFilter = 'all' | ActionQueueItem['urgency'];
type AttentionFilter = 'all' | AttentionJob['status'];

function formatActionDate(iso: string, urgency: ActionQueueItem['urgency']): string {
  if (urgency === 'today') return 'Today';
  const d = new Date(iso);
  const diff = Math.floor((d.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  if (urgency === 'overdue') {
    const days = Math.abs(diff);
    return `${days} day${days !== 1 ? 's' : ''} overdue`;
  }
  if (diff === 1) return 'Tomorrow';
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    new: 'New',
    shortlisted: 'Shortlisted',
    ready_for_bd_review: 'BD Review',
    submitted_to_client: 'Submitted',
    interview: 'Interview',
    offer: 'Offer',
    rejected: 'Rejected',
    hold: 'Hold',
    hired: 'Hired',
  };
  return map[stage] ?? stage;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { updateSubmissionInStore } = useStore();
  const { role } = useRole();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>('all');
  const [attentionQuery, setAttentionQuery] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [stageCounts, setStageCounts] = useState<DashboardStageCounts>(EMPTY_STAGE_COUNTS);
  const [actionQueue, setActionQueue] = useState<ActionQueueItem[]>([]);
  const [attentionJobs, setAttentionJobs] = useState<AttentionJob[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [bdQueue, setBdQueue] = useState<BdQueueItem[]>([]);
  const [expandedBd, setExpandedBd] = useState<string | null>(null);
  const [approvingBd, setApprovingBd] = useState<Record<string, boolean>>({});
  const [rejectingBd, setRejectingBd] = useState<Record<string, boolean>>({});
  const [holdingBd, setHoldingBd] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      setLoading(true);
      setLoadError(null);

      try {
        const data = await fetchDashboardData();
        if (cancelled) return;

        setStats(data.stats);
        setStageCounts(data.stageCounts);
        setActionQueue(data.actionQueue);
        setAttentionJobs(data.attentionJobs);
        setOpportunities(data.opportunities);
        setBdQueue(data.bdQueue);
      } catch (error) {
        console.error('[Dashboard] fetchDashboardData error:', error);
        if (cancelled) return;

        setLoadError(error instanceof Error ? error.message : 'Unable to load dashboard metrics.');
        setStats(null);
        setStageCounts(EMPTY_STAGE_COUNTS);
        setActionQueue([]);
        setAttentionJobs([]);
        setOpportunities([]);
        setBdQueue([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleApprove = async (item: BdQueueItem) => {
    setApprovingBd(p => ({ ...p, [item.submissionId]: true }));
    try {
      const updatedSubmission = await updateSubmissionInStore(item.submissionId, 'submitted_to_client');
      if (updatedSubmission) {
        setBdQueue(prev => prev.filter(i => i.submissionId !== updatedSubmission.id));
      }
    } finally {
      setApprovingBd(p => ({ ...p, [item.submissionId]: false }));
    }
  };

  const handleReject = async (item: BdQueueItem) => {
    setRejectingBd(p => ({ ...p, [item.submissionId]: true }));
    try {
      const updatedSubmission = await updateSubmissionInStore(item.submissionId, 'rejected');
      if (updatedSubmission) {
        setBdQueue(prev => prev.filter(i => i.submissionId !== updatedSubmission.id));
      }
    } finally {
      setRejectingBd(p => ({ ...p, [item.submissionId]: false }));
    }
  };

  const handleHold = async (item: BdQueueItem) => {
    setHoldingBd(p => ({ ...p, [item.submissionId]: true }));
    try {
      const updatedSubmission = await updateSubmissionInStore(item.submissionId, 'hold');
      if (updatedSubmission) {
        setBdQueue(prev => prev.filter(i => i.submissionId !== updatedSubmission.id));
      }
    } finally {
      setHoldingBd(p => ({ ...p, [item.submissionId]: false }));
    }
  };

  const isBD = role === 'bd';
  const isRecruiter = role === 'recruiter';
  const isAdmin = role === 'admin';
  const canRecruiter = isRecruiter || isAdmin;
  const canBD = isBD || isAdmin;
  const dashTitle = isBD ? 'BD Dashboard' : isRecruiter ? 'Recruiter Dashboard' : 'Admin Dashboard';

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredActionQueue = useMemo(
    () =>
      actionQueue.filter(item => {
        if (!normalizedSearch) return true;
        return [
          item.candidateName,
          item.jobTitle,
          item.companyName,
          item.location,
          stageLabel(item.stage),
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      }),
    [actionQueue, normalizedSearch]
  );

  const filteredAttentionJobs = useMemo(
    () =>
      attentionJobs.filter(job => {
        if (!normalizedSearch) return true;
        return [
          job.job_title,
          job.company_name,
          job.location,
          job.reason,
          job.status,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      }),
    [attentionJobs, normalizedSearch]
  );

  const filteredOpportunities = useMemo(
    () =>
      opportunities.filter(item => {
        if (!normalizedSearch) return true;
        return [
          item.candidateName,
          item.candidateRole,
          item.jobTitle,
          item.companyName,
          item.location,
          item.recommendation,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      }),
    [opportunities, normalizedSearch]
  );

  const filteredBdQueue = useMemo(
    () =>
      bdQueue.filter(item => {
        if (!normalizedSearch) return true;
        return [
          item.candidateName,
          item.candidateRole,
          item.jobTitle,
          item.companyName,
          item.location,
          item.aiRecommendation ?? '',
          item.recruiterNotes ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      }),
    [bdQueue, normalizedSearch]
  );

  const overdueCount = filteredActionQueue.filter(item => item.urgency === 'overdue').length;
  const todayCount = filteredActionQueue.filter(item => item.urgency === 'today').length;
  const funnelTotal = funnelConfig.reduce((sum, item) => sum + stageCounts[item.key], 0);
  const pipelineTotal = pipelineConfig.reduce((sum, item) => sum + stageCounts[item.key], 0);
  const activityOverview = [
    { label: 'Overdue', value: overdueCount, tone: 'text-red-600 bg-red-50 ring-red-100' },
    { label: 'Due Today', value: todayCount, tone: 'text-orange-600 bg-orange-50 ring-orange-100' },
    { label: 'Pending BD Review', value: filteredBdQueue.length, tone: 'text-teal-700 bg-teal-50 ring-teal-100' },
  ];

  const visibleActionQueue = useMemo(() => {
    if (actionFilter === 'all') return filteredActionQueue;
    return filteredActionQueue.filter(item => item.urgency === actionFilter);
  }, [actionFilter, filteredActionQueue]);

  const attentionCountByStatus = useMemo(() => {
    const base: Record<AttentionJob['status'], number> = {
      'No Submissions': 0,
      Stale: 0,
      'Low Coverage': 0,
    };

    for (const job of filteredAttentionJobs) {
      base[job.status] += 1;
    }

    return base;
  }, [filteredAttentionJobs]);

  const visibleAttentionJobs = useMemo(() => {
    const query = attentionQuery.trim().toLowerCase();
    return filteredAttentionJobs.filter(job => {
      if (attentionFilter !== 'all' && job.status !== attentionFilter) return false;
      if (!query) return true;
      return [job.job_title, job.company_name, job.location, job.reason]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [attentionFilter, attentionQuery, filteredAttentionJobs]);

  return (
    <div>
      <PageHeader
        eyebrow="Command Center"
        title={dashTitle}
        description={todayLabel}
        actions={
          <>
          <label className="relative block min-w-[280px]">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search jobs, candidates, companies, or stages"
              className="w-full rounded-xl border border-slate-200/70 bg-white/85 py-2.5 pl-9 pr-3 text-sm text-slate-700 shadow-[0_1px_0_rgba(15,23,42,0.03)] outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            type="button"
            onClick={() => onNavigate?.('job-intake')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <Plus size={15} />
            Add New Job
          </button>
          </>
        }
      />

      {loadError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Dashboard data could not be loaded: {loadError}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          label="My Active Jobs"
          value={String(stats?.myActiveJobs ?? 0)}
          icon={<Briefcase size={15} className="text-blue-500" />}
          sub="Assigned / in progress"
          chip={loading ? undefined : `${stats?.urgentJobs ?? 0} urgent`}
          loading={loading}
        />
        <StatCard
          label="Candidates Awaiting Review"
          value={String(stats?.candidatesAwaitingReview ?? 0)}
          icon={<Users size={15} className="text-teal-500" />}
          sub="Need recruiter decision"
          chip={loading ? undefined : `${stageCounts.shortlisted} shortlisted`}
          loading={loading}
        />
        <StatCard
          label="New BD Handoffs"
          value={String(stats?.newBdHandoffs ?? 0)}
          icon={<ClipboardCheck size={15} className="text-sky-500" />}
          sub="Created by BD (recent)"
          chip={loading ? undefined : `${filteredAttentionJobs.length} attention items`}
          loading={loading}
        />
        <StatCard
          label="Interviews / Offers"
          value={String(stats?.interviewsOffers ?? 0)}
          icon={<TrendingUp size={15} className="text-emerald-500" />}
          sub="Active processes"
          chip={loading ? undefined : `${stageCounts.offer} offers`}
          loading={loading}
        />
        <StatCard
          label="Urgent Jobs"
          value={String(stats?.urgentJobs ?? 0)}
          icon={<AlertTriangle size={15} className="text-amber-500" />}
          sub="Need recruiter action"
          chip={loading ? undefined : `${stats?.newBdHandoffs ?? 0} no submissions`}
          loading={loading}
        />
        <StatCard
          label="Action Queue"
          value={String(actionQueue.length)}
          icon={<Clock size={15} className="text-violet-500" />}
          sub="Next actions scheduled"
          chip={loading ? undefined : `${stats?.overdueActions ?? 0} overdue`}
          loading={loading}
        />
      </div>

      <section className="mb-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-950">Operational Intelligence</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Live recruiter signal across funnel health, pipeline distribution, and today&apos;s activity load
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <OperationalCard
            title="Hiring Funnel"
            subtitle="Progression across the active recruiter pipeline"
            icon={<TrendingUp size={16} className="text-blue-600" />}
          >
            <div className="space-y-3">
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                {funnelConfig.map(stage => {
                  const count = stageCounts[stage.key];
                  const width = funnelTotal > 0 ? `${(count / funnelTotal) * 100}%` : '0%';
                  return <div key={stage.key} className={stage.tone} style={{ width }} />;
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {funnelConfig.map(stage => (
                  <div key={stage.key} className="rounded-xl bg-slate-50/70 px-3 py-2 ring-1 ring-inset ring-slate-200/60">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {stage.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-950 tabular-nums">
                      {stageCounts[stage.key]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </OperationalCard>

          <OperationalCard
            title="Pipeline Overview"
            subtitle="Stage distribution across active operational jobs"
            icon={<Users size={16} className="text-violet-600" />}
          >
            <div className="space-y-3">
              {pipelineConfig.map(stage => {
                const count = stageCounts[stage.key];
                const width = pipelineTotal > 0 ? `${(count / pipelineTotal) * 100}%` : '0%';

                return (
                  <div key={stage.key}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">{stage.label}</span>
                      <span className="font-semibold text-slate-950 tabular-nums">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${stage.tone}`} style={{ width }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </OperationalCard>

          <OperationalCard
            title="Activity Overview"
            subtitle="Count-based momentum from recruiter actions and BD handoff"
            icon={<CalendarClock size={16} className="text-amber-600" />}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {activityOverview.map(item => (
                <div key={item.label} className={`rounded-xl px-3 py-3 ring-1 ${item.tone}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          </OperationalCard>
        </div>

        {(canRecruiter && filteredOpportunities.length > 0) || loading || filteredBdQueue.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {canRecruiter && filteredOpportunities.length > 0 && (
              <Panel padded={false} className="overflow-hidden">
                <SectionHeader
                  title="Immediate Opportunities"
                  description="Candidates with strong momentum signals ready for recruiter action."
                  icon={<Star size={15} className="text-blue-600" />}
                  meta={
                    <Badge tone="blue" className="tabular-nums">
                      {filteredOpportunities.length} ready
                    </Badge>
                  }
                />
                <div className="border-t border-slate-200/70 divide-y divide-slate-100">
                  {filteredOpportunities.map(opp => (
                    <div
                      key={`${opp.candidateId}-${opp.jobId}`}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950">{opp.candidateName}</p>
                          <span className="text-xs text-slate-300">&middot;</span>
                          <p className="text-xs text-slate-600">{opp.candidateRole}</p>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <p className="text-xs text-slate-700">{opp.jobTitle}</p>
                          <span className="text-xs text-slate-300">&middot;</span>
                          <p className="text-xs text-slate-600">{opp.companyName}</p>
                          <span className="flex items-center gap-0.5 text-xs text-slate-500">
                            <MapPin size={10} />
                            {opp.location}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <Badge>{stageLabel(opp.stage)}</Badge>
                        <Badge tone={opp.recommendation === 'Strong Fit' ? 'emerald' : 'blue'}>
                          {opp.recommendation}
                        </Badge>
                        <span className="text-xs font-semibold tabular-nums text-blue-700">
                          {opp.aiScore > 0 ? `${Math.round(opp.aiScore)}` : '\u2014'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {(loading || filteredBdQueue.length > 0) && (
              <Panel padded={false} className="overflow-hidden">
                <SectionHeader
                  title="BD Review Queue"
                  description="Candidates awaiting BD approval before client submission."
                  icon={<ClipboardCheck size={15} className="text-teal-600" />}
                  meta={
                    !loading ? (
                      <Badge tone={filteredBdQueue.length > 0 ? 'teal' : 'slate'} className="tabular-nums">
                        {filteredBdQueue.length} pending
                      </Badge>
                    ) : (
                      <Badge tone="amber">Loading</Badge>
                    )
                  }
                />
                <div className="border-t border-slate-200/70">
                  {loading ? (
                    <LoadingRows count={3} />
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredBdQueue.map(item => {
                      const isExpanded = expandedBd === item.submissionId;
                      const isApproving = approvingBd[item.submissionId];
                      const isRejecting = rejectingBd[item.submissionId];
                      const isHolding = holdingBd[item.submissionId];
                      const sentDate = new Date(item.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                      return (
                        <div key={item.submissionId}>
                          <div className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-slate-950">{item.candidateName}</p>
                                <span className="text-xs text-slate-300">&middot;</span>
                                <p className="text-xs text-slate-600">{item.candidateRole}</p>
                                <span className="text-xs font-semibold tabular-nums text-slate-600">{item.candidateScore}</span>
                                {item.recruiterNotes && (
                                  <span className="flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-400">
                                    <MessageSquare size={10} />
                                    Note
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                <p className="text-xs text-slate-700">{item.jobTitle}</p>
                                <span className="text-xs text-slate-300">&middot;</span>
                                <p className="text-xs text-slate-600">{item.companyName}</p>
                                <span className="flex items-center gap-0.5 text-xs text-slate-500">
                                  <MapPin size={10} />
                                  {item.location}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-2">
                              <span className="text-[11px] text-slate-400 tabular-nums">{sentDate}</span>
                              {item.aiRecommendation && (
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  item.aiRecommendation === 'Strong Fit'
                                    ? 'bg-emerald-100 text-emerald-700'
                                  : item.aiRecommendation === 'Low Fit' || item.aiRecommendation === 'Weak Fit'
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-sky-100 text-sky-700'
                                }`}>
                                  {item.aiRecommendation}
                                </span>
                              )}
                              <button
                                onClick={() => setExpandedBd(isExpanded ? null : item.submissionId)}
                                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                              >
                                <ChevronRight size={13} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                {isExpanded ? 'Hide' : 'Review'}
                              </button>
                              {canBD && (
                                <>
                                  <button
                                    onClick={() => handleHold(item)}
                                    disabled={isHolding || isRejecting || isApproving}
                                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                      isHolding
                                        ? 'cursor-default border-slate-200 bg-slate-50 text-slate-400'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    <PauseCircle size={11} />
                                    {isHolding ? 'Holding...' : 'Hold'}
                                  </button>
                                  <button
                                    onClick={() => handleReject(item)}
                                    disabled={isRejecting || isApproving || isHolding}
                                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                      isRejecting
                                        ? 'cursor-default border-slate-200 bg-slate-50 text-slate-400'
                                        : 'border-red-200 bg-white text-red-600 hover:bg-red-50'
                                    }`}
                                  >
                                    <XCircle size={11} />
                                    {isRejecting ? 'Rejecting...' : 'Reject'}
                                  </button>
                                  <button
                                    onClick={() => handleApprove(item)}
                                    disabled={isApproving || isRejecting || isHolding}
                                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                      isApproving
                                        ? 'cursor-default border-slate-200 bg-slate-50 text-slate-400'
                                        : 'border-teal-600 bg-teal-600 text-white hover:bg-teal-700'
                                    }`}
                                  >
                                    <Send size={11} />
                                    {isApproving ? 'Submitting...' : 'Approve & Submit to Client'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="space-y-4 border-t border-slate-200/70 bg-slate-50/40 px-5 pb-5">
                              {item.recruiterNotes && (
                                <div className="pt-4">
                                  <div className="mb-1.5 flex items-center gap-1.5">
                                    <MessageSquare size={11} className="text-slate-500" />
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                      Recruiter Notes
                                    </p>
                                  </div>
                                  <p className="whitespace-pre-wrap rounded-lg bg-white/80 px-4 py-3 text-sm leading-relaxed text-slate-700 ring-1 ring-inset ring-slate-200/70">
                                    {item.recruiterNotes}
                                  </p>
                                </div>
                              )}

                              {item.submissionSummary && (
                                <div className={item.recruiterNotes ? '' : 'pt-4'}>
                                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    AI Summary
                                  </p>
                                  <p className="rounded-lg bg-white/80 px-4 py-3 text-sm leading-relaxed text-slate-700 ring-1 ring-inset ring-blue-200/50">
                                    {item.submissionSummary}
                                  </p>
                                </div>
                              )}

                              {item.submissionStrengths && item.submissionStrengths.length > 0 && (
                                <div>
                                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Key Strengths
                                  </p>
                                  <div className="space-y-1.5 rounded-lg bg-white/80 px-4 py-3 ring-1 ring-inset ring-emerald-200/50">
                                    {item.submissionStrengths.map((strength, index) => (
                                      <div key={index} className="flex items-start gap-2">
                                        <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                                        <p className="text-xs text-slate-700">{strength}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {item.submissionConcerns && item.submissionConcerns.length > 0 && (
                                <div>
                                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Areas to Probe
                                  </p>
                                  <div className="space-y-1.5 rounded-lg bg-white/80 px-4 py-3 ring-1 ring-inset ring-amber-200/60">
                                    {item.submissionConcerns.map((concern, index) => (
                                      <div key={index} className="flex items-start gap-2">
                                        <AlertTriangle size={12} className="mt-0.5 flex-shrink-0 text-amber-500" />
                                        <p className="text-xs text-slate-700">{concern}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {canBD && (
                                <div className="flex items-center justify-end gap-2 border-t border-slate-200/70 pt-1">
                                  <button
                                    onClick={() => handleHold(item)}
                                    disabled={isHolding || isRejecting || isApproving}
                                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                      isHolding
                                        ? 'cursor-default border-slate-200 bg-slate-50 text-slate-400'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    <PauseCircle size={11} />
                                    {isHolding ? 'Holding...' : 'Hold'}
                                  </button>
                                  <button
                                    onClick={() => handleReject(item)}
                                    disabled={isRejecting || isApproving || isHolding}
                                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                      isRejecting
                                        ? 'cursor-default border-slate-200 bg-slate-50 text-slate-400'
                                        : 'border-red-200 bg-white text-red-600 hover:bg-red-50'
                                    }`}
                                  >
                                    <XCircle size={11} />
                                    {isRejecting ? 'Rejecting...' : 'Reject'}
                                  </button>
                                  <button
                                    onClick={() => handleApprove(item)}
                                    disabled={isApproving || isRejecting || isHolding}
                                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                      isApproving
                                        ? 'cursor-default border-slate-200 bg-slate-50 text-slate-400'
                                        : 'border-teal-600 bg-teal-600 text-white hover:bg-teal-700'
                                    }`}
                                  >
                                    <Send size={11} />
                                    {isApproving ? 'Submitting...' : 'Approve & Submit to Client'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                      })}
                    </div>
                  )}
                </div>
              </Panel>
            )}
          </div>
        ) : null}
      </section>

      {canRecruiter && (
        <Panel padded={false} className="mb-6 overflow-hidden">
          <SectionHeader
            title="Action Queue"
            description="Today's recruiter working list, prioritised by urgency and next action timing"
            icon={<AlertCircle size={16} className="text-red-500" />}
            meta={
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl bg-slate-50 p-1 ring-1 ring-inset ring-slate-200/70">
                  {[
                    { key: 'all' as const, label: `All ${filteredActionQueue.length}` },
                    { key: 'overdue' as const, label: `Overdue ${overdueCount}` },
                    { key: 'today' as const, label: `Today ${todayCount}` },
                  ].map(option => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setActionFilter(option.key)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold tabular-nums transition-colors ${
                        actionFilter === option.key
                          ? 'bg-slate-950 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {!loading ? (
                  <Badge tone={visibleActionQueue.length === 0 ? 'slate' : 'blue'} className="tabular-nums">
                    {visibleActionQueue.length} visible
                  </Badge>
                ) : null}
              </div>
            }
          />

          <div className="border-t border-slate-200/70">
            {loading ? (
              <LoadingRows count={4} />
            ) : visibleActionQueue.length === 0 ? (
              <EmptyState
                icon={<CalendarClock size={20} className="text-slate-300" />}
                message="No upcoming actions. Set next_action_date on submissions to see items here."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleActionQueue.map(item => {
                  const isOverdue = item.urgency === 'overdue';
                  const isToday = item.urgency === 'today';
                  const accent =
                    item.urgency === 'overdue'
                      ? 'bg-red-500'
                      : item.urgency === 'today'
                      ? 'bg-amber-400'
                      : 'bg-slate-200';

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50 ${
                        isOverdue ? 'bg-red-50/40' : isToday ? 'bg-amber-50/40' : 'bg-white/60'
                      }`}
                    >
                      <div className={`h-12 w-1.5 flex-shrink-0 rounded-full ${accent}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {item.candidateName}
                          <span className="mx-1 font-normal text-slate-300">&rarr;</span>
                          {item.jobTitle}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="truncate">{item.companyName}</span>
                          <span className="text-slate-300">&middot;</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin size={10} className="text-slate-400" />
                            {item.location}
                          </span>
                          <Badge>{stageLabel(item.stage)}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                            isOverdue
                              ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200/60'
                              : isToday
                              ? 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200/60'
                              : 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200/60'
                          }`}
                        >
                          {formatActionDate(item.nextActionDate, item.urgency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>
      )}

      <Panel padded={false} className="overflow-hidden">
        <SectionHeader
          title="Jobs Needing Attention"
          description="Operational jobs with low or stale submission coverage."
          icon={<Clock size={15} className="text-amber-600" />}
          meta={
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-slate-50 p-1 ring-1 ring-inset ring-slate-200/70">
                {[
                  { key: 'all' as const, label: `All ${filteredAttentionJobs.length}` },
                  { key: 'No Submissions' as const, label: `No Sub ${attentionCountByStatus['No Submissions']}` },
                  { key: 'Stale' as const, label: `Stale ${attentionCountByStatus.Stale}` },
                  { key: 'Low Coverage' as const, label: `Low ${attentionCountByStatus['Low Coverage']}` },
                ].map(option => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setAttentionFilter(option.key)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold tabular-nums transition-colors ${
                      attentionFilter === option.key
                        ? 'bg-slate-950 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {!loading ? (
                <Badge tone={visibleAttentionJobs.length === 0 ? 'slate' : 'amber'} className="tabular-nums">
                  {visibleAttentionJobs.length} visible
                </Badge>
              ) : null}
            </div>
          }
        />

        <div className="border-t border-slate-200/70 px-5 py-3">
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={attentionQuery}
              onChange={(e) => setAttentionQuery(e.target.value)}
              placeholder="Search attention jobs (title, company, location, reason)"
              className="w-full rounded-xl border border-slate-200/70 bg-white/85 py-2.5 pl-9 pr-3 text-sm text-slate-700 shadow-[0_1px_0_rgba(15,23,42,0.03)] outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

        {loading ? (
          <LoadingRows count={4} />
        ) : visibleAttentionJobs.length === 0 ? (
          <EmptyState
            icon={<Briefcase size={20} className="text-slate-300" />}
            message="All active jobs have healthy candidate coverage."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleAttentionJobs.map(job => (
              <div key={job.id} className="px-5 py-4 transition-colors hover:bg-slate-50">
                <div className="mb-1 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold leading-snug text-slate-950">{job.job_title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{job.company_name}</p>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${attentionStatusStyle[job.status]}`}
                  >
                    {job.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-0.5">
                    <MapPin size={10} />
                    {job.location}
                  </span>
                  <span className="text-slate-300">&middot;</span>
                  <span className="tabular-nums">
                    {job.submissionCount} candidate{job.submissionCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-slate-300">&middot;</span>
                  <span className="italic text-slate-500">{job.reason}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  sub,
  chip,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub: string;
  chip?: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
          {chip && (
            <div className="mt-2">
              <Badge className="tabular-nums">{chip}</Badge>
            </div>
          )}
        </div>
        <div className="rounded-lg bg-slate-50 p-2 ring-1 ring-inset ring-slate-200/70">{icon}</div>
      </div>
      {loading ? (
        <div className="mb-1.5 mt-1 h-7 w-20 animate-pulse rounded bg-slate-100" />
      ) : (
        <p className="mb-0.5 text-2xl font-semibold tracking-tight text-slate-950 tabular-nums">{value}</p>
      )}
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function OperationalCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function LoadingRows({ count }: { count: number }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
          <div className="h-8 w-1 rounded-full bg-slate-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/4 rounded bg-slate-100" />
            <div className="h-2.5 w-1/2 rounded bg-slate-100" />
          </div>
          <div className="h-5 w-16 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon}
      <p className="max-w-[240px] text-xs leading-relaxed text-slate-400">{message}</p>
    </div>
  );
}
