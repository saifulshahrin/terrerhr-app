import { useEffect, useState } from 'react';
import { useStore } from '../store/StoreContext';
import type { Candidate, SubmissionStage, Submission } from '../store/types';
import { CalendarClock } from 'lucide-react';
import { useRole } from '../store/RoleContext';
import { buildCandidateMap, createFallbackCandidate, fetchCandidatesByIds } from '../lib/candidates';
import { fetchAllJobsBasic } from '../lib/jobs';

const PIPELINE_STAGES: { key: SubmissionStage; name: string; color: string; headerColor: string }[] = [
  { key: 'new',                 name: 'New',           color: 'border-gray-300',   headerColor: 'bg-gray-100' },
  { key: 'shortlisted',         name: 'Shortlisted',   color: 'border-blue-300',   headerColor: 'bg-blue-50' },
  { key: 'ready_for_bd_review', name: 'BD Review',     color: 'border-violet-300', headerColor: 'bg-violet-50' },
  { key: 'submitted_to_client', name: 'Submitted',     color: 'border-yellow-300', headerColor: 'bg-yellow-50' },
  { key: 'interview',           name: 'Interview',     color: 'border-orange-300', headerColor: 'bg-orange-50' },
  { key: 'offer',               name: 'Offer',         color: 'border-green-300',  headerColor: 'bg-green-50' },
  { key: 'hold',                name: 'Hold',          color: 'border-gray-300',   headerColor: 'bg-gray-50' },
  { key: 'rejected',            name: 'Rejected',      color: 'border-red-300',    headerColor: 'bg-red-50' },
  { key: 'hired',               name: 'Hired',         color: 'border-emerald-300', headerColor: 'bg-emerald-50' },
];

const RESETTABLE_STAGES: SubmissionStage[] = [
  'new',
  'shortlisted',
  'ready_for_bd_review',
  'submitted_to_client',
  'interview',
  'offer',
  'hold',
];

const scoreColor = (s: number) =>
  s >= 90 ? 'text-green-600' : s >= 80 ? 'text-blue-600' : 'text-yellow-600';

const initials = (name: string) =>
  name.split(' ').map(n => n[0]).join('');

function getDateUrgency(dateStr: string | null): 'overdue' | 'today' | 'upcoming' | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const diff = d.getTime() - today.getTime();
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  return 'upcoming';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function urgencyScore(sub: Submission): number {
  if (!sub.next_action_date) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(sub.next_action_date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() - today.getTime();
}

function getResetOptions(stage: SubmissionStage): SubmissionStage[] {
  if (stage === 'rejected' || stage === 'hired') {
    return RESETTABLE_STAGES;
  }

  const index = RESETTABLE_STAGES.indexOf(stage);
  if (index <= 0) return [];
  return RESETTABLE_STAGES.slice(0, index);
}

function formatStageLabel(stage: SubmissionStage): string {
  switch (stage) {
    case 'ready_for_bd_review':
      return 'BD Review';
    case 'submitted_to_client':
      return 'Submitted';
    case 'hold':
      return 'Hold';
    default:
      return stage.charAt(0).toUpperCase() + stage.slice(1);
  }
}

function getRecommendedAction(
  stage: SubmissionStage,
  urgency: 'overdue' | 'today' | 'upcoming' | null
): string {
  if (urgency === 'overdue') return 'Follow up overdue';
  if (urgency === 'today') return 'Follow up today';

  switch (stage) {
    case 'new':
      return 'Review match';
    case 'shortlisted':
      return 'Send to BD review';
    case 'ready_for_bd_review':
      return 'BD review';
    case 'submitted_to_client':
      return 'Chase client feedback';
    case 'interview':
      return 'Prepare candidate / confirm schedule';
    case 'offer':
      return 'Close offer';
    case 'hold':
      return 'Review hold status';
    case 'rejected':
      return 'Archive / reset if needed';
    case 'hired':
      return 'Confirm placement';
    default:
      return 'Review next step';
  }
}

export default function Pipeline() {
  const {
    submissions,
    moveSubmissionStage,
    sendSubmissionToBdReviewInStore,
    resetSubmissionToStage,
    deleteSubmissionById,
  } = useStore();
  const { role } = useRole();
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [resetTargets, setResetTargets] = useState<Record<string, SubmissionStage>>({});
  const [candidateMap, setCandidateMap] = useState<Map<string, Candidate>>(new Map());
  const [jobMap, setJobMap] = useState<Map<string, { job_title: string; company_name: string; location: string }>>(new Map());

  const isAdmin = role === 'admin';
  const total = new Set(submissions.map(sub => sub.candidate_id)).size;

  useEffect(() => {
    let cancelled = false;

    fetchAllJobsBasic()
      .then(rows => {
        if (cancelled) return;
        setJobMap(
          new Map(
            (rows ?? []).map(job => [
              job.id,
              {
                job_title: job.job_title,
                company_name: job.company_name,
                location: job.location,
              },
            ])
          )
        );
      })
      .catch(error => {
        console.error('[Pipeline] fetchAllJobsBasic error:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchCandidatesByIds(submissions.map(sub => sub.candidate_id))
      .then(rows => {
        if (cancelled) return;
        setCandidateMap(buildCandidateMap(rows));
      })
      .catch(error => {
        console.error('[Pipeline] fetchCandidatesByIds error:', error);
        if (!cancelled) {
          setCandidateMap(new Map());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [submissions]);

  const handleStageMove = async (submissionId: string, stage: SubmissionStage) => {
    setBusy(prev => ({ ...prev, [submissionId]: true }));
    try {
      await moveSubmissionStage(submissionId, stage);
    } finally {
      setBusy(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleSendToBdReview = async (sub: Submission) => {
    const draft = noteDrafts[sub.id] ?? sub.notes ?? '';

    setBusy(prev => ({ ...prev, [sub.id]: true }));
    try {
      const result = await sendSubmissionToBdReviewInStore(sub.id, draft, sub.notes);
      if (result) {
        setNoteDrafts(prev => {
          const next = { ...prev };
          delete next[sub.id];
          return next;
        });
      }
    } finally {
      setBusy(prev => ({ ...prev, [sub.id]: false }));
    }
  };

  const handleAdminReset = async (submissionId: string, currentStage: SubmissionStage) => {
    const targetStage = resetTargets[submissionId] ?? getResetOptions(currentStage)[0];
    if (!targetStage) return;
    if (!window.confirm(`Reset this submission to ${formatStageLabel(targetStage)}?`)) return;

    setBusy(prev => ({ ...prev, [submissionId]: true }));
    try {
      await resetSubmissionToStage(submissionId, targetStage);
    } finally {
      setBusy(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleAdminDelete = async (submissionId: string) => {
    if (!window.confirm('Delete this submission record? This is intended for test data cleanup.')) {
      return;
    }

    setBusy(prev => ({ ...prev, [submissionId]: true }));
    try {
      const deleted = await deleteSubmissionById(submissionId);
      if (!deleted) {
        window.alert('Delete failed. Check Supabase policies or console logs for details.');
        return;
      }

      setNoteDrafts(prev => {
        const next = { ...prev };
        delete next[submissionId];
        return next;
      });
      setResetTargets(prev => {
        const next = { ...prev };
        delete next[submissionId];
        return next;
      });
    } finally {
      setBusy(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Pipeline</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {total} total candidates across all stages
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageSubs = submissions
            .filter(s => s.submission_stage === stage.key)
            .sort((a, b) => urgencyScore(a) - urgencyScore(b));

          return (
            <div key={stage.key} className={`flex-shrink-0 w-56 rounded-lg border ${stage.color} overflow-hidden`}>
              <div className={`${stage.headerColor} px-4 py-3 flex items-center justify-between`}>
                <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{stage.name}</h2>
                <span className="text-xs bg-white border border-gray-200 text-gray-500 rounded-full px-2 py-0.5 font-medium">
                  {stageSubs.length}
                </span>
              </div>
              <div className="p-3 space-y-2 bg-white min-h-32">
                {stageSubs.map((sub) => {
                  const card = candidateMap.get(sub.candidate_id) ?? createFallbackCandidate(sub.candidate_id);
                  const isResolvedCandidate = candidateMap.has(sub.candidate_id);
                  const jobContext = jobMap.get(sub.job_id);
                  const jobTitle = jobContext?.job_title ?? `Job ${sub.job_id}`;
                  const urgency = getDateUrgency(sub.next_action_date);
                  const recommendedAction = getRecommendedAction(sub.submission_stage, urgency);
                  const submissionBusy = !!busy[sub.id];
                  const noteValue = noteDrafts[sub.id] ?? sub.notes ?? '';
                  const resetOptions = getResetOptions(sub.submission_stage);
                  const selectedResetTarget = resetTargets[sub.id] ?? resetOptions[0];

                  const actions = sub.submission_stage === 'submitted_to_client'
                    ? [
                        { label: 'Interview', nextStage: 'interview' as SubmissionStage },
                        { label: 'Reject', nextStage: 'rejected' as SubmissionStage },
                      ]
                    : sub.submission_stage === 'interview'
                    ? [
                        { label: 'Offer', nextStage: 'offer' as SubmissionStage },
                        { label: 'Reject', nextStage: 'rejected' as SubmissionStage },
                      ]
                    : sub.submission_stage === 'offer'
                    ? [
                        { label: 'Hired', nextStage: 'hired' as SubmissionStage },
                        { label: 'Reject', nextStage: 'rejected' as SubmissionStage },
                      ]
                    : [];

                  return (
                    <div key={card.id} className="bg-white border border-gray-200 rounded-md px-3 py-2.5 shadow-sm hover:shadow transition-shadow cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {initials(card.name)}
                        </div>
                        <p className="text-xs font-medium text-gray-800 truncate">{card.name}</p>
                      </div>
                      <div className="flex items-center justify-between pl-8">
                        <p className="text-xs text-gray-500 truncate">{jobTitle}</p>
                        <p className={`text-xs font-semibold flex-shrink-0 ml-1 ${scoreColor(card.score)}`}>{card.score}</p>
                      </div>
                      <p className="mt-1 pl-8 text-[10px] font-semibold text-gray-600">
                        <span className="text-gray-400 font-medium">Recommended:</span> {recommendedAction}
                      </p>
                      {!isResolvedCandidate && (
                        <p className="mt-1 pl-8 text-[10px] text-gray-400 truncate">ID: {sub.candidate_id}</p>
                      )}
                      {sub.next_action_date && (
                        <div className={`mt-2 pl-8 flex items-center gap-1 ${
                          urgency === 'overdue' ? 'text-red-500' :
                          urgency === 'today'   ? 'text-orange-500' :
                                                  'text-gray-400'
                        }`}>
                          <CalendarClock size={10} className="flex-shrink-0" />
                          <span className="text-[10px] font-medium leading-none">
                            {urgency === 'overdue' ? 'Overdue · ' : urgency === 'today' ? 'Today · ' : ''}
                            {formatDate(sub.next_action_date)}
                          </span>
                        </div>
                      )}
                      {sub.submission_stage === 'shortlisted' && (
                        <div className="mt-2 pl-8 space-y-1.5">
                          <textarea
                            value={noteValue}
                            onChange={(e) => setNoteDrafts(prev => ({ ...prev, [sub.id]: e.target.value }))}
                            placeholder="Recruiter note for this submission (optional)"
                            rows={2}
                            disabled={submissionBusy}
                            className="w-full text-[10px] text-gray-600 border border-gray-200 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-300 disabled:bg-gray-50"
                          />
                          <button
                            onClick={() => handleSendToBdReview(sub)}
                            disabled={submissionBusy}
                            className={`px-2 py-1 text-[10px] font-medium rounded border transition-colors ${
                              submissionBusy
                                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-default'
                                : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50'
                            }`}
                          >
                            {submissionBusy ? 'Sending...' : 'Send to BD Review'}
                          </button>
                        </div>
                      )}
                      {actions.length > 0 && (
                        <div className="mt-2 pl-8 flex flex-wrap gap-1">
                          {actions.map(action => (
                            <button
                              key={action.nextStage}
                              onClick={() => handleStageMove(sub.id, action.nextStage)}
                              disabled={submissionBusy}
                              className={`px-2 py-1 text-[10px] font-medium rounded border transition-colors ${
                                submissionBusy
                                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-default'
                                  : action.nextStage === 'rejected'
                                  ? 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {submissionBusy ? 'Saving...' : action.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {isAdmin && (
                        <div className="mt-2 pl-8 space-y-1.5">
                          {resetOptions.length > 0 && selectedResetTarget && (
                            <div className="flex gap-1">
                              <select
                                value={selectedResetTarget}
                                onChange={(e) =>
                                  setResetTargets(prev => ({
                                    ...prev,
                                    [sub.id]: e.target.value as SubmissionStage,
                                  }))
                                }
                                disabled={submissionBusy}
                                className="flex-1 text-[10px] text-gray-600 border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-gray-200 disabled:bg-gray-50"
                              >
                                {resetOptions.map(option => (
                                  <option key={option} value={option}>
                                    {formatStageLabel(option)}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleAdminReset(sub.id, sub.submission_stage)}
                                disabled={submissionBusy}
                                className={`px-2 py-1 text-[10px] font-medium rounded border transition-colors ${
                                  submissionBusy
                                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-default'
                                    : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50'
                                }`}
                              >
                                {submissionBusy ? 'Saving...' : 'Reset'}
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => handleAdminDelete(sub.id)}
                            disabled={submissionBusy}
                            className={`px-2 py-1 text-[10px] font-medium rounded border transition-colors ${
                              submissionBusy
                                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-default'
                                : 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                            }`}
                          >
                            {submissionBusy ? 'Deleting...' : 'Delete Submission'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {stageSubs.length === 0 && (
                  <p className="text-xs text-gray-300 text-center py-4">No candidates</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
