import { fetchAllJobsBasic } from '../lib/jobs';
import { fetchAssessmentSummaries } from '../lib/aiAssessments';
import { fetchBDQueueSubmissions, type SubmissionStage } from '../lib/submissions';
import { useEffect, useState, useCallback } from 'react';
import {
  ClipboardCheck, Send, XCircle, PauseCircle, CheckCircle2, AlertTriangle,
  MessageSquare, Mail, Phone, Linkedin, Github, Copy, Check, MapPin,
  Briefcase, User, RefreshCw, ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react';
import { ALL_CANDIDATES } from '../store/mockData';
import type { Candidate } from '../store/types';
import { useRole } from '../store/RoleContext';
import { useStore } from '../store/StoreContext';

interface Job {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
}

interface Assessment {
  candidate_id: string;
  job_id: string;
  ai_score: number;
  overall_recommendation: string;
}

interface BDItem {
  submissionId: string;
  candidateId: string;
  jobId: string;
  candidate: Candidate;
  job: Job;
  submissionSummary: string | null;
  submissionStrengths: string[] | null;
  submissionConcerns: string[] | null;
  recruiterNotes: string | null;
  sentAt: string;
  aiScore: number | null;
  aiRecommendation: string | null;
}

type ActionState = 'idle' | 'approving' | 'rejecting' | 'holding';

const CANDIDATE_MAP = new Map(ALL_CANDIDATES.map(c => [c.id, c]));

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
      title="Copy"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}

function ContactRow({ icon, label, value, href, copyValue }: {
  icon: React.ReactNode;
  label: string;
  value: string | undefined;
  href?: string;
  copyValue?: string;
}) {
  const display = value || 'Not available';
  const available = !!value;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-gray-400 flex-shrink-0">{icon}</span>
      <span className="text-[11px] text-gray-400 w-14 flex-shrink-0">{label}</span>
      {available && href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 truncate"
        >
          <span className="truncate">{display}</span>
          <ExternalLink size={10} className="flex-shrink-0" />
        </a>
      ) : (
        <span className={`text-xs truncate ${available ? 'text-gray-700' : 'text-gray-400 italic'}`}>
          {display}
        </span>
      )}
      {available && copyValue && <CopyButton value={copyValue} />}
    </div>
  );
}

function ScoreBadge({ score, recommendation }: { score: number | null; recommendation: string | null }) {
  if (!score && !recommendation) return null;
  const isStrong = recommendation === 'Strong Fit';
  const isWeak = recommendation === 'Weak Fit';
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
      isStrong ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
      isWeak   ? 'bg-red-50 border-red-200 text-red-600' :
                 'bg-sky-50 border-sky-200 text-sky-700'
    }`}>
      {score !== null && <span className="tabular-nums font-bold">{Math.round(score)}</span>}
      {recommendation && <span>{recommendation}</span>}
    </div>
  );
}

function BDCard({ item, onAction, canAct }: { item: BDItem; onAction: (id: string, action: 'approve' | 'reject' | 'hold') => Promise<void>; canAct: boolean }) {
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [detailsOpen, setDetailsOpen] = useState(true);

  const sentDate = new Date(item.sentAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const handleAction = async (action: 'approve' | 'reject' | 'hold') => {
    setActionState(action === 'approve' ? 'approving' : action === 'reject' ? 'rejecting' : 'holding');
    try {
      await onAction(item.submissionId, action);
    } finally {
      setActionState('idle');
    }
  };

  const busy = actionState !== 'idle';

  const initials = item.candidate.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const avatarColors = ['bg-teal-100 text-teal-700', 'bg-blue-100 text-blue-700', 'bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-700'];
  const avatarColor = avatarColors[item.candidate.name.length % avatarColors.length];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-6 py-5 flex items-start gap-4">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor}`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-900 leading-snug">{item.candidate.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{item.candidate.role} &middot; {item.candidate.company}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              {(item.aiScore !== null || item.aiRecommendation) && (
                <ScoreBadge score={item.aiScore} recommendation={item.aiRecommendation} />
              )}
              <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                Received {sentDate}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Briefcase size={11} className="text-gray-400" />
              {item.job.job_title}
            </span>
            <span className="text-gray-300">&middot;</span>
            <span>{item.job.company_name}</span>
            {item.job.location && (
              <>
                <span className="text-gray-300">&middot;</span>
                <span className="flex items-center gap-1">
                  <MapPin size={11} className="text-gray-400" />
                  {item.job.location}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {item.recruiterNotes && (
        <div className="mx-6 mb-4 rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 border-b border-amber-200">
            <MessageSquare size={13} className="text-amber-600" />
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Recruiter Notes</p>
          </div>
          <p className="px-4 py-3 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {item.recruiterNotes}
          </p>
        </div>
      )}

      <div className="mx-6 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <User size={12} className="text-gray-500" />
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Contact</p>
          </div>
          <div className="space-y-2">
            <ContactRow
              icon={<Mail size={12} />}
              label="Email"
              value={item.candidate.email}
              copyValue={item.candidate.email}
            />
            <ContactRow
              icon={<Phone size={12} />}
              label="Phone"
              value={item.candidate.phone}
              copyValue={item.candidate.phone}
            />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <ExternalLink size={12} className="text-gray-500" />
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Profiles</p>
          </div>
          <div className="space-y-2">
            <ContactRow
              icon={<Linkedin size={12} />}
              label="LinkedIn"
              value={item.candidate.linkedin ? 'View Profile' : undefined}
              href={item.candidate.linkedin}
              copyValue={item.candidate.linkedin}
            />
            <ContactRow
              icon={<Github size={12} />}
              label="GitHub"
              value={item.candidate.github ? 'View Profile' : undefined}
              href={item.candidate.github}
              copyValue={item.candidate.github}
            />
          </div>
        </div>
      </div>

      <div className="mx-6 mb-4">
        <button
          onClick={() => setDetailsOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors mb-2"
        >
          {detailsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {detailsOpen ? 'Hide' : 'Show'} submission details
        </button>

        {detailsOpen && (
          <div className="space-y-3">
            {item.submissionSummary && (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">AI Summary</p>
                <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                  {item.submissionSummary}
                </p>
              </div>
            )}
            {item.submissionStrengths && item.submissionStrengths.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Key Strengths</p>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 space-y-1.5">
                  {item.submissionStrengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 leading-snug">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {item.submissionConcerns && item.submissionConcerns.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Areas to Probe</p>
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 space-y-1.5">
                  {item.submissionConcerns.map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 leading-snug">{c}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-400">
          {canAct ? 'BD action required â€” not yet submitted to client' : 'Awaiting BD approval before client submission'}
        </p>
        {canAct && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction('hold')}
              disabled={busy}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                actionState === 'holding'
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-default'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <PauseCircle size={12} />
              {actionState === 'holding' ? 'Holding...' : 'Hold'}
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={busy}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                actionState === 'rejecting'
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-default'
                  : 'bg-white border-red-200 text-red-600 hover:bg-red-50'
              }`}
            >
              <XCircle size={12} />
              {actionState === 'rejecting' ? 'Rejecting...' : 'Reject'}
            </button>
            <button
              onClick={() => handleAction('approve')}
              disabled={busy}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                actionState === 'approving'
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-default'
                  : 'bg-teal-600 border-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              <Send size={12} />
              {actionState === 'approving' ? 'Submitting...' : 'Approve & Submit to Client'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BDQueue() {
  const { role } = useRole();
  const { updateSubmissionInStore } = useStore();
  const canAct = role === 'bd' || role === 'admin' || role === null;
  const [items, setItems] = useState<BDItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [submissionsResult, jobsData, assessmentsResult] = await Promise.all([
      fetchBDQueueSubmissions(),
      fetchAllJobsBasic(),
      fetchAssessmentSummaries(),
    ]);

    const subs = submissionsResult;

    const jobMap = new Map((jobsData ?? []).map((j: Job) => [j.id, j]));
    const assessmentMap = new Map(
      (assessmentsResult as Assessment[]).map(a => [`${a.candidate_id}-${a.job_id}`, a])
    );

    const built: BDItem[] = [];
    for (const sub of subs) {
      const candidate = CANDIDATE_MAP.get(sub.candidate_id);
      const job = jobMap.get(sub.job_id);
      if (!candidate || !job) continue;
      const assessment = assessmentMap.get(`${sub.candidate_id}-${sub.job_id}`);
      built.push({
        submissionId: sub.id,
        candidateId: sub.candidate_id,
        jobId: sub.job_id,
        candidate,
        job,
        submissionSummary: sub.submission_summary,
        submissionStrengths: sub.submission_strengths,
        submissionConcerns: sub.submission_concerns,
        recruiterNotes: sub.notes,
        sentAt: sub.submission_generated_at ?? sub.stage_updated_at,
        aiScore: assessment?.ai_score ?? null,
        aiRecommendation: assessment?.overall_recommendation ?? null,
      });
    }

    built.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    setItems(built);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (submissionId: string, action: 'approve' | 'reject' | 'hold') => {
    const stageMap: Record<'approve' | 'reject' | 'hold', SubmissionStage> = {
  approve: 'submitted_to_client',
  reject: 'rejected',
  hold: 'ready_for_bd_review',
};
    const newStage = stageMap[action];
    const updatedSubmission = await updateSubmissionInStore(submissionId, newStage);

    if (updatedSubmission && action !== 'hold') {
      setItems(prev => prev.filter(i => i.submissionId !== updatedSubmission.id));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck size={20} className="text-teal-600" />
            <h1 className="text-2xl font-semibold text-gray-900">BD Review Queue</h1>
          </div>
          <p className="text-sm text-gray-500">
            Candidates submitted by recruiters and pending BD approval before client submission.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-gray-100 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mb-4">
            <ClipboardCheck size={22} className="text-teal-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">No candidates pending BD review</p>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
            When a recruiter sends a candidate to BD Review, it will appear here for your action.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-gray-700">{items.length} candidate{items.length !== 1 ? 's' : ''} awaiting review</span>
            <span className="text-[11px] bg-teal-100 text-teal-700 font-semibold px-2 py-0.5 rounded-full">Pending</span>
          </div>
          <div className="space-y-5">
            {items.map(item => (
              <BDCard key={item.submissionId} item={item} onAction={handleAction} canAct={canAct} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
