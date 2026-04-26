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

const TODAY = new Date();
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const todayLabel = `${DAY_NAMES[TODAY.getDay()]}, ${TODAY.getDate()} ${MONTH_NAMES[TODAY.getMonth()]} ${TODAY.getFullYear()}`;

const attentionStatusStyle: Record<string, string> = {
  'No Submissions': 'bg-red-100 text-red-700',
  'Stale': 'bg-gray-100 text-gray-600',
  'Low Coverage': 'bg-yellow-100 text-yellow-700',
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
  const [searchQuery, setSearchQuery] = useState('');
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
    fetchDashboardData().then(data => {
      setStats(data.stats);
      setStageCounts(data.stageCounts);
      setActionQueue(data.actionQueue);
      setAttentionJobs(data.attentionJobs);
      setOpportunities(data.opportunities);
      setBdQueue(data.bdQueue);
      setLoading(false);
    });
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

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">{dashTitle}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{todayLabel}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block min-w-[280px]">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search jobs, candidates, companies, or stages"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-700 shadow-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            type="button"
            onClick={() => onNavigate?.('job-intake')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800"
          >
            <Plus size={15} />
            Add New Job
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Jobs"
          value={loading ? '—' : String(stats?.activeJobs ?? 0)}
          icon={<Briefcase size={15} className="text-blue-500" />}
          sub="Operational jobs"
          chip={loading ? undefined : `${filteredAttentionJobs.length} need attention`}
          loading={loading}
        />
        <StatCard
          label="In Pipeline"
          value={loading ? '—' : String(stats?.totalCandidatesInPipeline ?? 0)}
          icon={<Users size={15} className="text-teal-500" />}
          sub="Unique candidates"
          chip={loading ? undefined : `${stageCounts.shortlisted} shortlisted`}
          loading={loading}
        />
        <StatCard
          label="Submissions"
          value={loading ? '—' : String(stats?.totalSubmissions ?? 0)}
          icon={<Send size={15} className="text-sky-500" />}
          sub="Active jobs only"
          chip={loading ? undefined : `${stageCounts.submitted_to_client} sent`}
          loading={loading}
        />
        <StatCard
          label="Interview / Offer"
          value={loading ? '—' : String(stats?.advancedStageCount ?? 0)}
          icon={<TrendingUp size={15} className="text-emerald-500" />}
          sub="Advanced stage"
          chip={loading ? undefined : `${stageCounts.offer} offers`}
          loading={loading}
        />
      </div>

      <section className="mb-8 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Operational Intelligence</h2>
          <p className="mt-1 text-sm text-gray-500">
            Live recruiter signal across funnel health, pipeline distribution, and today&apos;s activity load
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <OperationalCard
            title="Hiring Funnel"
            subtitle="Progression across the active recruiter pipeline"
            icon={<TrendingUp size={16} className="text-blue-600" />}
          >
            <div className="space-y-3">
              <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
                {funnelConfig.map(stage => {
                  const count = stageCounts[stage.key];
                  const width = funnelTotal > 0 ? `${(count / funnelTotal) * 100}%` : '0%';
                  return <div key={stage.key} className={stage.tone} style={{ width }} />;
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {funnelConfig.map(stage => (
                  <div key={stage.key} className="rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {stage.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
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
                      <span className="font-medium text-gray-600">{stage.label}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
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
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {canRecruiter && filteredOpportunities.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-5 py-4">
                  <Star size={15} className="text-blue-600" />
                  <h2 className="text-sm font-semibold text-blue-800">Immediate Opportunities</h2>
                  <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                    {filteredOpportunities.length} ready
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {filteredOpportunities.map(opp => (
                    <div key={`${opp.candidateId}-${opp.jobId}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{opp.candidateName}</p>
                          <span className="text-xs text-gray-400">·</span>
                          <p className="text-xs text-gray-500">{opp.candidateRole}</p>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <p className="text-xs text-gray-600">{opp.jobTitle}</p>
                          <span className="text-xs text-gray-300">·</span>
                          <p className="text-xs text-gray-500">{opp.companyName}</p>
                          <span className="flex items-center gap-0.5 text-xs text-gray-400">
                            <MapPin size={10} />
                            {opp.location}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          {stageLabel(opp.stage)}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          opp.recommendation === 'Strong Fit'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-sky-100 text-sky-700'
                        }`}>
                          {opp.recommendation}
                        </span>
                        <span className="text-xs font-bold tabular-nums text-blue-600">
                          {opp.aiScore > 0 ? `${Math.round(opp.aiScore)}` : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(loading || filteredBdQueue.length > 0) && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
                  <ClipboardCheck size={15} className="text-teal-600" />
                  <h2 className="text-sm font-semibold text-gray-700">BD Review Queue</h2>
                  <span className="ml-1 text-[11px] font-normal text-gray-400">
                    Candidates awaiting BD approval before client submission
                  </span>
                  {!loading && filteredBdQueue.length > 0 && (
                    <span className="ml-auto rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                      {filteredBdQueue.length} pending
                    </span>
                  )}
                </div>
                {loading ? (
                  <LoadingRows count={3} />
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filteredBdQueue.map(item => {
                      const isExpanded = expandedBd === item.submissionId;
                      const isApproving = approvingBd[item.submissionId];
                      const isRejecting = rejectingBd[item.submissionId];
                      const isHolding = holdingBd[item.submissionId];
                      const sentDate = new Date(item.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                      return (
                        <div key={item.submissionId}>
                          <div className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">{item.candidateName}</p>
                                <span className="text-xs text-gray-400">·</span>
                                <p className="text-xs text-gray-500">{item.candidateRole}</p>
                                <span className="text-xs font-bold tabular-nums text-gray-500">{item.candidateScore}</span>
                                {item.recruiterNotes && (
                                  <span className="flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-400">
                                    <MessageSquare size={10} />
                                    Note
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                <p className="text-xs text-gray-600">{item.jobTitle}</p>
                                <span className="text-xs text-gray-300">·</span>
                                <p className="text-xs text-gray-500">{item.companyName}</p>
                                <span className="flex items-center gap-0.5 text-xs text-gray-400">
                                  <MapPin size={10} />
                                  {item.location}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-2">
                              <span className="text-[11px] text-gray-400">{sentDate}</span>
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
                                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
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
                                        ? 'cursor-default border-gray-200 bg-gray-50 text-gray-400'
                                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
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
                                        ? 'cursor-default border-gray-200 bg-gray-50 text-gray-400'
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
                                        ? 'cursor-default border-gray-200 bg-gray-50 text-gray-400'
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
                            <div className="space-y-4 border-t border-gray-100 bg-gray-50 px-5 pb-5">
                              {item.recruiterNotes && (
                                <div className="pt-4">
                                  <div className="mb-1.5 flex items-center gap-1.5">
                                    <MessageSquare size={11} className="text-gray-500" />
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                      Recruiter Notes
                                    </p>
                                  </div>
                                  <p className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-700">
                                    {item.recruiterNotes}
                                  </p>
                                </div>
                              )}

                              {item.submissionSummary && (
                                <div className={item.recruiterNotes ? '' : 'pt-4'}>
                                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                    AI Summary
                                  </p>
                                  <p className="rounded-lg border border-blue-100 bg-white px-4 py-3 text-sm leading-relaxed text-gray-700">
                                    {item.submissionSummary}
                                  </p>
                                </div>
                              )}

                              {item.submissionStrengths && item.submissionStrengths.length > 0 && (
                                <div>
                                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                    Key Strengths
                                  </p>
                                  <div className="space-y-1.5 rounded-lg border border-emerald-100 bg-white px-4 py-3">
                                    {item.submissionStrengths.map((strength, index) => (
                                      <div key={index} className="flex items-start gap-2">
                                        <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                                        <p className="text-xs text-gray-700">{strength}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {item.submissionConcerns && item.submissionConcerns.length > 0 && (
                                <div>
                                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                    Areas to Probe
                                  </p>
                                  <div className="space-y-1.5 rounded-lg border border-amber-100 bg-white px-4 py-3">
                                    {item.submissionConcerns.map((concern, index) => (
                                      <div key={index} className="flex items-start gap-2">
                                        <AlertTriangle size={12} className="mt-0.5 flex-shrink-0 text-amber-500" />
                                        <p className="text-xs text-gray-700">{concern}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {canBD && (
                                <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-1">
                                  <button
                                    onClick={() => handleHold(item)}
                                    disabled={isHolding || isRejecting || isApproving}
                                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                      isHolding
                                        ? 'cursor-default border-gray-200 bg-gray-50 text-gray-400'
                                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
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
                                        ? 'cursor-default border-gray-200 bg-gray-50 text-gray-400'
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
                                        ? 'cursor-default border-gray-200 bg-gray-50 text-gray-400'
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
            )}
          </div>
        ) : null}
      </section>

      {canRecruiter && (
        <section className="mb-8 overflow-hidden rounded-3xl border border-red-100 bg-gradient-to-br from-white via-white to-red-50 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-red-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red-500" />
                <h2 className="text-base font-semibold text-gray-900">Action Queue</h2>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Today’s recruiter working list, prioritised by urgency and next action timing
              </p>
            </div>
            <div className="flex items-center gap-2">
              {overdueCount > 0 && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">
                  {overdueCount} overdue
                </span>
              )}
              {todayCount > 0 && (
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600">
                  {todayCount} due today
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <LoadingRows count={4} />
          ) : filteredActionQueue.length === 0 ? (
            <EmptyState
              icon={<CalendarClock size={20} className="text-gray-300" />}
              message="No upcoming actions. Set next_action_date on submissions to see items here."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredActionQueue.map(item => {
                const isOverdue = item.urgency === 'overdue';
                const isToday = item.urgency === 'today';

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-white ${
                      isOverdue ? 'bg-red-50/70' : isToday ? 'bg-orange-50/60' : 'bg-white'
                    }`}
                  >
                    <div
                      className={`h-12 w-1.5 flex-shrink-0 rounded-full ${
                        isOverdue ? 'bg-red-500' : isToday ? 'bg-orange-400' : 'bg-gray-200'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {item.candidateName}
                        <span className="mx-1 font-normal text-gray-400">→</span>
                        {item.jobTitle}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>{item.companyName}</span>
                        <span className="text-gray-300">·</span>
                        <span className="flex items-center gap-0.5">
                          <MapPin size={10} className="text-gray-400" />
                          {item.location}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          {stageLabel(item.stage)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isOverdue
                          ? 'bg-red-100 text-red-600'
                          : isToday
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {formatActionDate(item.nextActionDate, item.urgency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <Clock size={15} className="text-yellow-500" />
          <h2 className="text-sm font-semibold text-gray-700">Jobs Needing Attention</h2>
          {!loading && filteredAttentionJobs.length > 0 && (
            <span className="ml-auto rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
              {filteredAttentionJobs.length}
            </span>
          )}
        </div>

        {loading ? (
          <LoadingRows count={4} />
        ) : filteredAttentionJobs.length === 0 ? (
          <EmptyState
            icon={<Briefcase size={20} className="text-gray-300" />}
            message="All active jobs have healthy candidate coverage."
          />
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredAttentionJobs.map(job => (
              <div key={job.id} className="px-5 py-4 transition-colors hover:bg-gray-50">
                <div className="mb-1 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold leading-snug text-gray-900">{job.job_title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{job.company_name}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${attentionStatusStyle[job.status]}`}>
                    {job.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span className="flex items-center gap-0.5">
                    <MapPin size={10} />
                    {job.location}
                  </span>
                  <span>·</span>
                  <span>{job.submissionCount} candidate{job.submissionCount !== 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span className="italic text-gray-500">{job.reason}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</p>
          {chip && (
            <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              {chip}
            </span>
          )}
        </div>
        <div className="rounded-xl bg-gray-50 p-2 ring-1 ring-gray-100">{icon}</div>
      </div>
      <p className={`mb-1 text-3xl font-bold text-gray-900 ${loading ? 'text-gray-200' : ''}`}>
        {loading ? '—' : value}
      </p>
      <p className="text-xs text-gray-400">{sub}</p>
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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function LoadingRows({ count }: { count: number }) {
  return (
    <div className="divide-y divide-gray-50">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
          <div className="h-8 w-1 rounded-full bg-gray-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/4 rounded bg-gray-100" />
            <div className="h-2.5 w-1/2 rounded bg-gray-100" />
          </div>
          <div className="h-5 w-16 rounded-full bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon}
      <p className="max-w-[240px] text-xs leading-relaxed text-gray-400">{message}</p>
    </div>
  );
}
