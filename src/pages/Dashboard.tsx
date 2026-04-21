import { useEffect, useState } from 'react';
import {
  AlertCircle, Clock, TrendingUp, Briefcase, Users,
  Send, Star, MapPin, CalendarClock, ChevronRight,
  CheckCircle2, AlertTriangle, ClipboardCheck, MessageSquare, XCircle,
} from 'lucide-react';
import {
  fetchDashboardData,
  type DashboardStats,
  type ActionQueueItem,
  type AttentionJob,
  type OpportunityItem,
  type BdQueueItem,
} from '../lib/dashboardData';
import { updateSubmissionStage } from '../lib/submissions';
import { useStore } from '../store/StoreContext';
import { useRole } from '../store/RoleContext';

const TODAY = new Date();
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const todayLabel = `${DAY_NAMES[TODAY.getDay()]}, ${TODAY.getDate()} ${MONTH_NAMES[TODAY.getMonth()]} ${TODAY.getFullYear()}`;

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
    hired: 'Hired',
  };
  return map[stage] ?? stage;
}

const attentionStatusStyle: Record<string, string> = {
  'No Submissions': 'bg-red-100 text-red-700',
  'Stale': 'bg-gray-100 text-gray-600',
  'Low Coverage': 'bg-yellow-100 text-yellow-700',
};

export default function Dashboard() {
  const { approveAndSubmitToClient } = useStore();
  const { role } = useRole();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [actionQueue, setActionQueue] = useState<ActionQueueItem[]>([]);
  const [attentionJobs, setAttentionJobs] = useState<AttentionJob[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [bdQueue, setBdQueue] = useState<BdQueueItem[]>([]);
  const [expandedBd, setExpandedBd] = useState<string | null>(null);
  const [approvingBd, setApprovingBd] = useState<Record<string, boolean>>({});
  const [rejectingBd, setRejectingBd] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchDashboardData().then(data => {
      setStats(data.stats);
      setActionQueue(data.actionQueue);
      setAttentionJobs(data.attentionJobs);
      setOpportunities(data.opportunities);
      setBdQueue(data.bdQueue);
      setLoading(false);
    });
  }, []);

  const handleApprove = async (item: BdQueueItem) => {
    setApprovingBd(p => ({ ...p, [item.submissionId]: true }));
    await approveAndSubmitToClient(item.candidateId, item.jobId);
    setBdQueue(prev => prev.filter(i => i.submissionId !== item.submissionId));
    setApprovingBd(p => ({ ...p, [item.submissionId]: false }));
  };

  const handleReject = async (item: BdQueueItem) => {
    setRejectingBd(p => ({ ...p, [item.submissionId]: true }));
    const updatedSubmission = await updateSubmissionStage(item.submissionId, 'shortlisted');
    setBdQueue(prev => prev.filter(i => i.submissionId !== updatedSubmission.id));
    setRejectingBd(p => ({ ...p, [item.submissionId]: false }));
  };

  const overdueCount = actionQueue.filter(a => a.urgency === 'overdue').length;
  const todayCount = actionQueue.filter(a => a.urgency === 'today').length;

  const isBD = role === 'bd';
  const isRecruiter = role === 'recruiter';
  const isAdmin = role === 'admin' || role === null;

  const dashTitle = isBD ? 'BD Dashboard' : isRecruiter ? 'Recruiter Dashboard' : 'Dashboard';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{dashTitle}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{todayLabel}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Jobs"
          value={loading ? '—' : String(stats?.activeJobs ?? 0)}
          icon={<Briefcase size={15} className="text-blue-500" />}
          sub="Open roles"
          loading={loading}
        />
        <StatCard
          label="In Pipeline"
          value={loading ? '—' : String(stats?.totalCandidatesInPipeline ?? 0)}
          icon={<Users size={15} className="text-teal-500" />}
          sub="Unique candidates"
          loading={loading}
        />
        <StatCard
          label="Submissions"
          value={loading ? '—' : String(stats?.totalSubmissions ?? 0)}
          icon={<Send size={15} className="text-sky-500" />}
          sub="Across all jobs"
          loading={loading}
        />
        <StatCard
          label="Interview / Offer"
          value={loading ? '—' : String(stats?.advancedStageCount ?? 0)}
          icon={<TrendingUp size={15} className="text-emerald-500" />}
          sub="Advanced stage"
          loading={loading}
        />
      </div>

      {!isBD && opportunities.length > 0 && (
        <div className="mb-6 bg-white rounded-lg border border-blue-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-blue-100 flex items-center gap-2 bg-blue-50">
            <Star size={15} className="text-blue-600" />
            <h2 className="text-sm font-semibold text-blue-800">Immediate Opportunities</h2>
            <span className="ml-auto text-xs bg-blue-600 text-white font-semibold px-2 py-0.5 rounded-full">
              {opportunities.length} ready to submit
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {opportunities.map(opp => (
              <div key={`${opp.candidateId}-${opp.jobId}`} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{opp.candidateName}</p>
                    <span className="text-xs text-gray-400">&middot;</span>
                    <p className="text-xs text-gray-500">{opp.candidateRole}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-xs text-gray-600">{opp.jobTitle}</p>
                    <span className="text-xs text-gray-300">&middot;</span>
                    <p className="text-xs text-gray-500">{opp.companyName}</p>
                    <span className="flex items-center gap-0.5 text-xs text-gray-400">
                      <MapPin size={10} />
                      {opp.location}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {stageLabel(opp.stage)}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    opp.recommendation === 'Strong Fit'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-sky-100 text-sky-700'
                  }`}>
                    {opp.recommendation}
                  </span>
                  <span className="text-xs font-bold text-blue-600 tabular-nums">
                    {opp.aiScore > 0 ? `${Math.round(opp.aiScore)}` : '—'}
                  </span>
                </div>
                <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {(loading || bdQueue.length > 0) && (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ClipboardCheck size={15} className="text-teal-600" />
            <h2 className="text-sm font-semibold text-gray-700">BD Review Queue</h2>
            <span className="text-[11px] text-gray-400 font-normal ml-1">Candidates awaiting BD approval before client submission</span>
            {!loading && bdQueue.length > 0 && (
              <span className="ml-auto text-xs bg-teal-100 text-teal-700 font-semibold px-2 py-0.5 rounded-full">
                {bdQueue.length} pending
              </span>
            )}
          </div>
          {loading ? (
            <LoadingRows count={3} />
          ) : (
            <div className="divide-y divide-gray-50">
              {bdQueue.map(item => {
                const isExpanded = expandedBd === item.submissionId;
                const isApproving = approvingBd[item.submissionId];
                const isRejecting = rejectingBd[item.submissionId];
                const sentDate = new Date(item.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <div key={item.submissionId}>
                    <div className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{item.candidateName}</p>
                          <span className="text-xs text-gray-400">&middot;</span>
                          <p className="text-xs text-gray-500">{item.candidateRole}</p>
                          <span className="text-xs font-bold text-gray-500 tabular-nums">{item.candidateScore}</span>
                          {item.recruiterNotes && (
                            <span className="flex items-center gap-0.5 text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              <MessageSquare size={10} />
                              Note
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-xs text-gray-600">{item.jobTitle}</p>
                          <span className="text-xs text-gray-300">&middot;</span>
                          <p className="text-xs text-gray-500">{item.companyName}</p>
                          <span className="flex items-center gap-0.5 text-xs text-gray-400">
                            <MapPin size={10} />
                            {item.location}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-gray-400">{sentDate}</span>
                        {item.aiRecommendation && (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
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
                          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
                        >
                          <ChevronRight size={13} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          {isExpanded ? 'Hide' : 'Review'}
                        </button>
                        {!isRecruiter && (
                          <>
                            <button
                              onClick={() => handleReject(item)}
                              disabled={isRejecting || isApproving}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                isRejecting
                                  ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-default'
                                  : 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                              }`}
                            >
                              <XCircle size={11} />
                              {isRejecting ? 'Rejecting...' : 'Reject'}
                            </button>
                            <button
                              onClick={() => handleApprove(item)}
                              disabled={isApproving || isRejecting}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                isApproving
                                  ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-default'
                                  : 'bg-teal-600 border-teal-600 text-white hover:bg-teal-700'
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
                      <div className="px-5 pb-5 space-y-4 bg-gray-50 border-t border-gray-100">
                        {item.recruiterNotes && (
                          <div className="pt-4">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <MessageSquare size={11} className="text-gray-500" />
                              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Recruiter Notes</p>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed bg-white border border-gray-200 rounded-lg px-4 py-3 whitespace-pre-wrap">
                              {item.recruiterNotes}
                            </p>
                          </div>
                        )}
                        {item.submissionSummary && (
                          <div className={item.recruiterNotes ? '' : 'pt-4'}>
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">AI Summary</p>
                            <p className="text-sm text-gray-700 leading-relaxed bg-white border border-blue-100 rounded-lg px-4 py-3">
                              {item.submissionSummary}
                            </p>
                          </div>
                        )}
                        {item.submissionStrengths && item.submissionStrengths.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Key Strengths</p>
                            <div className="bg-white border border-emerald-100 rounded-lg px-4 py-3 space-y-1.5">
                              {item.submissionStrengths.map((s, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-gray-700">{s}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {item.submissionConcerns && item.submissionConcerns.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Areas to Probe</p>
                            <div className="bg-white border border-amber-100 rounded-lg px-4 py-3 space-y-1.5">
                              {item.submissionConcerns.map((c, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-gray-700">{c}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {!isRecruiter && (
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-200">
                            <button
                              onClick={() => handleReject(item)}
                              disabled={isRejecting || isApproving}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                isRejecting
                                  ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-default'
                                  : 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                              }`}
                            >
                              <XCircle size={11} />
                              {isRejecting ? 'Rejecting...' : 'Reject — Send Back'}
                            </button>
                            <button
                              onClick={() => handleApprove(item)}
                              disabled={isApproving || isRejecting}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                isApproving
                                  ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-default'
                                  : 'bg-teal-600 border-teal-600 text-white hover:bg-teal-700'
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {!isBD && <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <AlertCircle size={15} className="text-red-500" />
            <h2 className="text-sm font-semibold text-gray-700">Action Queue</h2>
            <div className="ml-auto flex items-center gap-1.5">
              {overdueCount > 0 && (
                <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                  {overdueCount} overdue
                </span>
              )}
              {todayCount > 0 && (
                <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-0.5 rounded-full">
                  {todayCount} today
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <LoadingRows count={4} />
          ) : actionQueue.length === 0 ? (
            <EmptyState icon={<CalendarClock size={20} className="text-gray-300" />} message="No upcoming actions. Set next_action_date on submissions to see items here." />
          ) : (
            <div className="divide-y divide-gray-50">
              {actionQueue.map(item => {
                const isOverdue = item.urgency === 'overdue';
                const isToday = item.urgency === 'today';
                return (
                  <div key={item.id} className={`px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-red-50/40' : isToday ? 'bg-orange-50/40' : ''}`}>
                    <div className={`w-1 h-10 rounded-full flex-shrink-0 ${
                      isOverdue ? 'bg-red-500' : isToday ? 'bg-orange-400' : 'bg-gray-200'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 leading-snug truncate">
                        {item.candidateName}
                        <span className="font-normal text-gray-400 mx-1">&rarr;</span>
                        {item.jobTitle}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{item.companyName}</span>
                        <span className="flex items-center gap-0.5">
                          <MapPin size={10} className="text-gray-400" />
                          {item.location}
                        </span>
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          {stageLabel(item.stage)}
                        </span>
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
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
        </div>}

        <div className={`${isBD ? 'lg:col-span-5' : 'lg:col-span-2'} bg-white rounded-lg border border-gray-200 overflow-hidden`}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock size={15} className="text-yellow-500" />
            <h2 className="text-sm font-semibold text-gray-700">Jobs Needing Attention</h2>
            {!loading && attentionJobs.length > 0 && (
              <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 font-medium px-2 py-0.5 rounded-full">
                {attentionJobs.length}
              </span>
            )}
          </div>

          {loading ? (
            <LoadingRows count={4} />
          ) : attentionJobs.length === 0 ? (
            <EmptyState icon={<Briefcase size={20} className="text-gray-300" />} message="All active jobs have healthy candidate coverage." />
          ) : (
            <div className="divide-y divide-gray-50">
              {attentionJobs.map(job => (
                <div key={job.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className="text-sm font-medium text-gray-800 leading-snug">{job.job_title}</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${attentionStatusStyle[job.status]}`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{job.company_name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                    <span className="flex items-center gap-0.5">
                      <MapPin size={10} />
                      {job.location}
                    </span>
                    <span>&middot;</span>
                    <span>{job.submissionCount} candidate{job.submissionCount !== 1 ? 's' : ''}</span>
                    <span>&middot;</span>
                    <span className="text-gray-400 italic">{job.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, sub, loading,
}: {
  label: string; value: string; icon: React.ReactNode; sub: string; loading: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        {icon}
      </div>
      <p className={`text-3xl font-bold text-gray-900 mb-0.5 ${loading ? 'text-gray-200' : ''}`}>
        {loading ? '—' : value}
      </p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function LoadingRows({ count }: { count: number }) {
  return (
    <div className="divide-y divide-gray-50">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
          <div className="w-1 h-8 bg-gray-100 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-2.5 bg-gray-100 rounded w-1/2" />
          </div>
          <div className="h-5 w-16 bg-gray-100 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 px-6 text-center">
      {icon}
      <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">{message}</p>
    </div>
  );
}
