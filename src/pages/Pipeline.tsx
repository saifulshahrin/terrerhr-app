import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, Search, Users } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import type { Candidate, SubmissionStage, Submission } from '../store/types';
import { useRole } from '../store/RoleContext';
import { buildCandidateMap, createFallbackCandidate, fetchCandidatesByIds } from '../lib/candidates';
import { fetchAllJobsBasic } from '../lib/jobs';
import { Badge, MetricTile, PageHeader, Panel, SectionHeader } from '../components/visualSystem';

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

function normalizeText(value: unknown): string {
  return String(value ?? '').toLowerCase().trim();
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
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const isAdmin = role === 'admin';
  const total = new Set(submissions.map(sub => sub.candidate_id)).size;
  const overdueCount = submissions.filter(sub => getDateUrgency(sub.next_action_date) === 'overdue').length;

  const stageCounts = PIPELINE_STAGES.reduce<Record<string, number>>((acc, stage) => {
    acc[stage.key] = submissions.filter(sub => sub.submission_stage === stage.key).length;
    return acc;
  }, {});

  const offerHiredCount =
    (stageCounts.offer ?? 0) + (stageCounts.hired ?? 0);

  const containerTopRef = useRef<HTMLDivElement | null>(null);
  const stageRefs = useRef<Record<string, HTMLElement | null>>({});

  const firstOverdueStageKey = useMemo(() => {
    for (const stage of PIPELINE_STAGES) {
      const hasOverdue = submissions.some(
        sub => sub.submission_stage === stage.key && getDateUrgency(sub.next_action_date) === 'overdue'
      );
      if (hasOverdue) return stage.key;
    }
    return null;
  }, [submissions]);

  const scrollToStage = (key: string | null) => {
    if (!key) return;
    const el = stageRefs.current[key];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

  const searchableSubmissions = useMemo(() => {
    const query = normalizeText(search);
    if (!query) return submissions;

    return submissions.filter(sub => {
      const candidate = candidateMap.get(sub.candidate_id);
      const job = jobMap.get(sub.job_id);

      const haystack = [
        candidate?.name,
        candidate?.role,
        candidate?.company,
        candidate?.location,
        sub.submission_stage,
        job?.job_title,
        job?.company_name,
        job?.location,
        sub.notes,
      ]
        .map(normalizeText)
        .join(' ');

      return haystack.includes(query);
    });
  }, [candidateMap, jobMap, search, submissions]);

  const stageGroups = useMemo(() => {
    return PIPELINE_STAGES.map(stage => {
      const stageSubs = searchableSubmissions
        .filter(s => s.submission_stage === stage.key)
        .sort((a, b) => urgencyScore(a) - urgencyScore(b));

      return {
        stage,
        submissions: stageSubs,
        overdueCount: stageSubs.filter(sub => getDateUrgency(sub.next_action_date) === 'overdue').length,
        todayCount: stageSubs.filter(sub => getDateUrgency(sub.next_action_date) === 'today').length,
      };
    });
  }, [searchableSubmissions]);

  useEffect(() => {
    if (searchableSubmissions.length === 0) {
      setSelectedSubmissionId(null);
      return;
    }

    if (!selectedSubmissionId || !searchableSubmissions.some(sub => sub.id === selectedSubmissionId)) {
      const next = [...searchableSubmissions].sort((a, b) => urgencyScore(a) - urgencyScore(b))[0];
      setSelectedSubmissionId(next?.id ?? null);
    }
  }, [searchableSubmissions, selectedSubmissionId]);

  const selectedSubmission = useMemo(
    () => searchableSubmissions.find(sub => sub.id === selectedSubmissionId) ?? null,
    [searchableSubmissions, selectedSubmissionId]
  );

  const selectedCandidate = useMemo(() => {
    if (!selectedSubmission) return null;
    return candidateMap.get(selectedSubmission.candidate_id) ?? createFallbackCandidate(selectedSubmission.candidate_id);
  }, [candidateMap, selectedSubmission]);

  const selectedJobContext = useMemo(() => {
    if (!selectedSubmission) return null;
    return jobMap.get(selectedSubmission.job_id) ?? null;
  }, [jobMap, selectedSubmission]);

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
      } else {
        window.alert('Could not send this candidate to BD Review. Check console logs for details.');
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

  const selectedSubmissionBusy = selectedSubmission ? Boolean(busy[selectedSubmission.id]) : false;
  const selectedNoteValue = selectedSubmission ? (noteDrafts[selectedSubmission.id] ?? selectedSubmission.notes ?? '') : '';
  const selectedResetOptions = selectedSubmission ? getResetOptions(selectedSubmission.submission_stage) : [];
  const selectedResetTarget =
    selectedSubmission && selectedResetOptions.length > 0
      ? (resetTargets[selectedSubmission.id] ?? selectedResetOptions[0])
      : null;

  const selectedAiGeneratedAt = selectedSubmission?.submission_generated_at ?? null;
  const selectedAiSummary = selectedSubmission?.submission_summary ?? null;
  const selectedAiStrengths = selectedSubmission?.submission_strengths ?? [];
  const selectedAiConcerns = selectedSubmission?.submission_concerns ?? [];

  const selectedActions = useMemo(() => {
    if (!selectedSubmission) return [];

    return selectedSubmission.submission_stage === 'submitted_to_client'
      ? [
          { label: 'Interview', nextStage: 'interview' as SubmissionStage },
          { label: 'Reject', nextStage: 'rejected' as SubmissionStage },
        ]
      : selectedSubmission.submission_stage === 'interview'
      ? [
          { label: 'Offer', nextStage: 'offer' as SubmissionStage },
          { label: 'Reject', nextStage: 'rejected' as SubmissionStage },
        ]
      : selectedSubmission.submission_stage === 'offer'
      ? [
          { label: 'Hired', nextStage: 'hired' as SubmissionStage },
          { label: 'Reject', nextStage: 'rejected' as SubmissionStage },
        ]
      : [];
  }, [selectedSubmission]);

  return (
    <div>
      <PageHeader
        eyebrow="Execution Console"
        title="Pipeline"
        description={`${total} total candidates across all stages`}
        actions={
          <button
            type="button"
            onClick={() => containerTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Users size={16} />
            Summary
          </button>
        }
      />

      <div ref={containerTopRef} className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-6">
        <MetricTile label="Total Candidates" value={total} detail="Unique candidates" tone="blue" icon={<Users size={14} />} />
        <MetricTile
          label="Overdue"
          value={overdueCount}
          detail={firstOverdueStageKey ? `First: ${formatStageLabel(firstOverdueStageKey as SubmissionStage)}` : 'No overdue actions'}
          tone="red"
          icon={<CalendarClock size={14} />}
        />
        <MetricTile label="Shortlisted" value={stageCounts.shortlisted ?? 0} detail="Ready for action" tone="teal" />
        <MetricTile label="BD Review" value={stageCounts.ready_for_bd_review ?? 0} detail="Awaiting BD review" tone="violet" />
        <MetricTile label="Submitted" value={stageCounts.submitted_to_client ?? 0} detail="Awaiting client feedback" tone="amber" />
        <MetricTile label="Offer/Hired" value={offerHiredCount} detail="Closing outcomes" tone="emerald" />
      </div>

      <Panel className="mb-4 flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => scrollToStage('new')}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 hover:bg-slate-50"
          >
            New {stageCounts.new ?? 0}
          </button>
          <button
            type="button"
            onClick={() => scrollToStage('shortlisted')}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 hover:bg-slate-50"
          >
            Shortlisted {stageCounts.shortlisted ?? 0}
          </button>
          <button
            type="button"
            onClick={() => scrollToStage('ready_for_bd_review')}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 hover:bg-slate-50"
          >
            BD Review {stageCounts.ready_for_bd_review ?? 0}
          </button>
          <button
            type="button"
            onClick={() => scrollToStage('submitted_to_client')}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 hover:bg-slate-50"
          >
            Submitted {stageCounts.submitted_to_client ?? 0}
          </button>
          <button
            type="button"
            onClick={() => scrollToStage('interview')}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 hover:bg-slate-50"
          >
            Interview {stageCounts.interview ?? 0}
          </button>
          <button
            type="button"
            onClick={() => scrollToStage('offer')}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 hover:bg-slate-50"
          >
            Offer {stageCounts.offer ?? 0}
          </button>
          <button
            type="button"
            onClick={() => scrollToStage('hold')}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 hover:bg-slate-50"
          >
            Hold {stageCounts.hold ?? 0}
          </button>
          <button
            type="button"
            onClick={() => scrollToStage('rejected')}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 hover:bg-slate-50"
          >
            Rejected {stageCounts.rejected ?? 0}
          </button>
        </div>

        <label className="relative block w-full lg:w-[420px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate, job, company, or notes"
            className="w-full rounded-xl border border-slate-200 bg-white/90 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel padded={false} className="overflow-hidden">
          <SectionHeader
            title="Pipeline Queue"
            description={`${searchableSubmissions.length} visible submissions sorted by urgency within each stage`}
            meta={firstOverdueStageKey ? <Badge tone="red">Overdue present</Badge> : <Badge>All clear</Badge>}
          />

          <div className="border-t border-slate-200/80">
            <table className="w-full table-fixed divide-y divide-slate-200/80 text-left text-sm">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[28%]" />
                <col className="w-[22%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-3 py-3">Job</th>
                  <th className="px-3 py-3">Signal</th>
                  <th className="px-3 py-3">Stage</th>
                  <th className="px-4 py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/60">
                {stageGroups.map(({ stage, submissions: stageSubs, overdueCount: stageOverdueCount, todayCount: stageTodayCount }) => (
                  <Fragment key={stage.key}>
                    <tr
                      ref={(el) => {
                        stageRefs.current[stage.key] = el;
                      }}
                      className="bg-slate-50/60"
                    >
                      <td className="px-4 py-2 text-xs font-semibold text-slate-700" colSpan={5}>
                        <span className="mr-2">{stage.name}</span>
                        <Badge className="align-middle">{stageSubs.length} candidates</Badge>
                        {stageOverdueCount > 0 ? (
                          <Badge tone="red" className="ml-2 align-middle tabular-nums">
                            {stageOverdueCount} overdue
                          </Badge>
                        ) : null}
                        {stageTodayCount > 0 ? (
                          <Badge tone="amber" className="ml-2 align-middle tabular-nums">
                            {stageTodayCount} due today
                          </Badge>
                        ) : null}
                      </td>
                    </tr>

                    {stageSubs.length === 0 ? (
                      <tr>
                        <td className="px-4 py-4 text-xs text-slate-400" colSpan={5}>
                          No candidates in this stage.
                        </td>
                      </tr>
                    ) : (
                      stageSubs.map(sub => {
                        const candidate = candidateMap.get(sub.candidate_id) ?? createFallbackCandidate(sub.candidate_id);
                        const jobContext = jobMap.get(sub.job_id);
                        const urgency = getDateUrgency(sub.next_action_date);
                        const recommendedAction = getRecommendedAction(sub.submission_stage, urgency);
                        const isSelected = selectedSubmission?.id === sub.id;
                        const urgencyTone =
                          urgency === 'overdue'
                            ? 'red'
                            : urgency === 'today'
                            ? 'amber'
                            : urgency === 'upcoming'
                            ? 'blue'
                            : 'slate';
                        const urgencyBar =
                          urgency === 'overdue'
                            ? 'bg-red-400'
                            : urgency === 'today'
                            ? 'bg-amber-400'
                            : urgency === 'upcoming'
                            ? 'bg-blue-400'
                            : 'bg-slate-200';

                        return (
                          <tr
                            key={sub.id}
                            className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                              isSelected ? 'bg-blue-50/60 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.18)]' : ''
                            }`}
                            onClick={() => setSelectedSubmissionId(sub.id)}
                          >
                            <td className="px-4 py-3 align-top">
                              <div className="flex items-start gap-2.5">
                                <div className={`mt-1 h-8 w-1 shrink-0 rounded-full ${urgencyBar}`} />
                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200/70">
                                  {initials(candidate.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-950">{candidate.name}</p>
                                  <p className="mt-0.5 truncate text-xs text-slate-600">{candidate.role ?? 'Unknown role'}</p>
                                  {!candidateMap.has(sub.candidate_id) ? (
                                    <p className="mt-0.5 truncate text-[11px] text-slate-400">ID: {sub.candidate_id}</p>
                                  ) : null}
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-3 align-top">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {jobContext?.job_title ?? `Job ${sub.job_id}`}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-slate-600">{jobContext?.company_name ?? ''}</p>
                              <p className="mt-0.5 truncate text-[11px] text-slate-500">{jobContext?.location ?? ''}</p>
                            </td>

                            <td className="px-3 py-3 align-top">
                              <div className="flex flex-col gap-1.5">
                                <Badge tone={urgencyTone as any}>
                                  {urgency === 'overdue'
                                    ? 'Overdue'
                                    : urgency === 'today'
                                    ? 'Today'
                                    : urgency === 'upcoming'
                                    ? 'Upcoming'
                                    : 'No action'}
                                </Badge>
                                <p className="truncate text-xs font-medium text-slate-700">{recommendedAction}</p>
                                <p className="text-xs text-slate-400">
                                  {sub.next_action_date ? formatDate(sub.next_action_date) : 'No next action date'}
                                </p>
                              </div>
                            </td>

                            <td className="px-3 py-3 align-top">
                              <Badge>{formatStageLabel(sub.submission_stage)}</Badge>
                            </td>

                            <td className="px-4 py-3 text-right align-top">
                              <span className={`text-sm font-semibold ${scoreColor(candidate.score)}`}>{candidate.score}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="xl:sticky xl:top-6 xl:self-start">
          {selectedSubmission && selectedCandidate ? (
            <>
              <div className="border-b border-slate-200/80 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Selected Submission</p>
                <h2 className="mt-2 text-base font-semibold leading-snug text-slate-950">{selectedCandidate.name}</h2>
                <p className="mt-0.5 text-sm text-slate-600">{selectedCandidate.role ?? 'Unknown role'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge>{formatStageLabel(selectedSubmission.submission_stage)}</Badge>
                  <Badge
                    tone={
                      getDateUrgency(selectedSubmission.next_action_date) === 'overdue'
                        ? 'red'
                        : getDateUrgency(selectedSubmission.next_action_date) === 'today'
                        ? 'amber'
                        : getDateUrgency(selectedSubmission.next_action_date) === 'upcoming'
                        ? 'blue'
                        : 'slate'
                    }
                  >
                    {getDateUrgency(selectedSubmission.next_action_date) === 'overdue'
                      ? 'Overdue'
                      : getDateUrgency(selectedSubmission.next_action_date) === 'today'
                      ? 'Due today'
                      : getDateUrgency(selectedSubmission.next_action_date) === 'upcoming'
                      ? 'Upcoming'
                      : 'No action'}
                  </Badge>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50/80 px-3 py-2 ring-1 ring-inset ring-slate-200/70">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Fit Score</p>
                  <p className={`mt-1 text-xl font-semibold ${scoreColor(selectedCandidate.score)}`}>{selectedCandidate.score}</p>
                </div>
                <div className="rounded-xl bg-slate-50/80 px-3 py-2 ring-1 ring-inset ring-slate-200/70">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Next Action</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {getRecommendedAction(selectedSubmission.submission_stage, getDateUrgency(selectedSubmission.next_action_date))}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {selectedSubmission.next_action_date ? formatDate(selectedSubmission.next_action_date) : 'No date'}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-white/80 px-3 py-3 ring-1 ring-inset ring-slate-200/70">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Job Context</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {selectedJobContext?.job_title ?? `Job ${selectedSubmission.job_id}`}
                </p>
                <p className="mt-0.5 text-sm text-slate-600">{selectedJobContext?.company_name ?? ''}</p>
                <p className="mt-1 text-xs text-slate-500">{selectedJobContext?.location ?? ''}</p>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50/70 px-3 py-3 ring-1 ring-inset ring-slate-200/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Terrer AI Review</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {selectedAiGeneratedAt
                        ? `Generated ${new Date(selectedAiGeneratedAt).toLocaleString()}`
                        : 'No AI review captured for this submission.'}
                    </p>
                  </div>
                  <Badge tone="violet">AI</Badge>
                </div>

                {selectedAiSummary ? (
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{selectedAiSummary}</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500 italic">
                    This submission does not yet include an AI summary. Run Top Matches / AI Review to generate one.
                  </p>
                )}

                {selectedAiStrengths.length > 0 || selectedAiConcerns.length > 0 ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-white/70 px-3 py-2 ring-1 ring-inset ring-slate-200/70">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Strengths</p>
                      {selectedAiStrengths.length === 0 ? (
                        <p className="mt-1 text-xs text-slate-400 italic">No strengths captured.</p>
                      ) : (
                        <ul className="mt-1 space-y-1">
                          {selectedAiStrengths.slice(0, 4).map((s, i) => (
                            <li key={i} className="text-xs text-slate-700">
                              {s}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="rounded-xl bg-white/70 px-3 py-2 ring-1 ring-inset ring-slate-200/70">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Risks / Missing</p>
                      {selectedAiConcerns.length === 0 ? (
                        <p className="mt-1 text-xs text-slate-400 italic">No risks captured.</p>
                      ) : (
                        <ul className="mt-1 space-y-1">
                          {selectedAiConcerns.slice(0, 4).map((c, i) => (
                            <li key={i} className="text-xs text-slate-700">
                              {c}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 rounded-xl bg-white/80 px-3 py-3 ring-1 ring-inset ring-slate-200/70">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</p>
                  {selectedSubmissionBusy ? <Badge tone="amber">Saving</Badge> : null}
                </div>
                <textarea
                  value={selectedNoteValue}
                  onChange={(e) => {
                    if (!selectedSubmission) return;
                    setNoteDrafts(prev => ({ ...prev, [selectedSubmission.id]: e.target.value }));
                  }}
                  placeholder="Recruiter note for this submission (optional)"
                  rows={4}
                  disabled={selectedSubmissionBusy}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                />
                {selectedSubmission.submission_stage === 'shortlisted' ? (
                  <button
                    type="button"
                    onClick={() => handleSendToBdReview(selectedSubmission)}
                    disabled={selectedSubmissionBusy}
                    className={`mt-2 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                      selectedSubmissionBusy
                        ? 'cursor-default bg-slate-100 text-slate-400'
                        : 'bg-slate-950 text-white hover:bg-slate-800'
                    }`}
                  >
                    {selectedSubmissionBusy ? 'Sending...' : 'Send to BD Review'}
                  </button>
                ) : null}
              </div>

              {selectedActions.length > 0 ? (
                <div className="mt-4 rounded-xl bg-white/80 px-3 py-3 ring-1 ring-inset ring-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Stage Movement</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedActions.map(action => (
                      <button
                        key={action.nextStage}
                        type="button"
                        onClick={() => handleStageMove(selectedSubmission.id, action.nextStage)}
                        disabled={selectedSubmissionBusy}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                          selectedSubmissionBusy
                            ? 'cursor-default border-slate-200 bg-slate-50 text-slate-400'
                            : action.nextStage === 'rejected'
                            ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {selectedSubmissionBusy ? 'Saving...' : action.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {isAdmin ? (
                <div className="mt-4 rounded-xl bg-white/80 px-3 py-3 ring-1 ring-inset ring-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Admin</p>
                  {selectedResetOptions.length > 0 && selectedResetTarget ? (
                    <div className="mt-2 flex gap-2">
                      <select
                        value={selectedResetTarget}
                        onChange={(e) => {
                          if (!selectedSubmission) return;
                          setResetTargets(prev => ({ ...prev, [selectedSubmission.id]: e.target.value as SubmissionStage }));
                        }}
                        disabled={selectedSubmissionBusy}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                      >
                        {selectedResetOptions.map(option => (
                          <option key={option} value={option}>
                            {formatStageLabel(option)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAdminReset(selectedSubmission.id, selectedSubmission.submission_stage)}
                        disabled={selectedSubmissionBusy}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                          selectedSubmissionBusy
                            ? 'cursor-default border-slate-200 bg-slate-50 text-slate-400'
                            : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        Reset
                      </button>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => handleAdminDelete(selectedSubmission.id)}
                    disabled={selectedSubmissionBusy}
                    className={`mt-2 inline-flex w-full items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                      selectedSubmissionBusy
                        ? 'cursor-default border-slate-200 bg-slate-50 text-slate-400'
                        : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    Delete Submission
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-sm text-slate-400">No submission selected.</p>
              <p className="mt-1 text-xs text-slate-500">Select a row from the queue to view context and actions.</p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
