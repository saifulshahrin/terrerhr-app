import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  ClipboardList,
  ExternalLink,
  Flame,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchAllJobsBasic } from '../lib/jobs';
import { buildCandidateMap, createFallbackCandidate, fetchCandidatesByIds } from '../lib/candidates';
import { Badge, MetricTile, PageHeader, Panel, SectionHeader } from '../components/visualSystem';
import type { Candidate, SubmissionStage } from '../store/types';

interface Props {
  onNavigate: (page: string) => void;
}

interface CompanyRow {
  id: number;
  company_name: string;
  company_status: string | null;
  source_type: string | null;
}

interface ContactRow {
  id: string;
  company_id: number | null;
  full_name: string;
  job_title: string | null;
  relationship_status: string | null;
  next_action: string | null;
  next_action_date: string | null; // date
  last_contacted_at: string | null;
  updated_at: string | null;
  notes: string | null;
}

interface JobRow {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
}

interface SubmissionRow {
  id: string;
  job_id: string;
  candidate_id: string;
  submission_stage: SubmissionStage;
  next_action_date: string | null;
  stage_updated_at: string | null;
  notes: string | null;
}

type DueBucket = 'overdue' | 'today' | 'next7' | 'later' | 'none';

type TaskKind = 'bd_contact' | 'submission';

interface TaskItem {
  id: string;
  kind: TaskKind;
  title: string;
  subtitle: string;
  actionType: string;
  dueDate: string | null;
  bucket: DueBucket;
  urgencyTone: Parameters<typeof Badge>[0]['tone'];
  sourceLabel: string;
  reason: string;
  meta?: string;
  contactId?: string;
  companyId?: number | null;
  submissionId?: string;
  submissionStage?: SubmissionStage;
}

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function addDaysIso(dateIso: string, days: number): string {
  const base = new Date(`${dateIso}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function bucketForDueDate(dueDate: string | null, todayIso: string, next7Iso: string): DueBucket {
  if (!dueDate) return 'none';
  const date = dueDate.slice(0, 10);
  if (date < todayIso) return 'overdue';
  if (date === todayIso) return 'today';
  if (date <= next7Iso) return 'next7';
  return 'later';
}

function toneForBucket(bucket: DueBucket): Parameters<typeof Badge>[0]['tone'] {
  if (bucket === 'overdue') return 'red';
  if (bucket === 'today') return 'amber';
  if (bucket === 'next7') return 'blue';
  if (bucket === 'later') return 'slate';
  return 'slate';
}

function bucketLabel(bucket: DueBucket): string {
  if (bucket === 'overdue') return 'Overdue';
  if (bucket === 'today') return 'Due Today';
  if (bucket === 'next7') return 'Next 7 Days';
  if (bucket === 'later') return 'Later';
  return 'No Due Date';
}

function stageLabel(stage: SubmissionStage): string {
  const map: Record<SubmissionStage, string> = {
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

function buildCompanyStubsFromContacts(contactRows: ContactRow[]): CompanyRow[] {
  const ids = Array.from(
    new Set(contactRows.map((c) => c.company_id).filter((id): id is number => typeof id === 'number'))
  );

  return ids
    .sort((a, b) => a - b)
    .map((id) => ({
      id,
      company_name: `Company #${id}`,
      company_status: null,
      source_type: null,
    }));
}

function looksLikeFollowUpNeeded(notes: string | null | undefined): boolean {
  const text = normalize(notes);
  if (!text) return false;
  return /(follow[\s-]?up|chase|nudge|check[-\s]?in|ping|client\s+reply|waiting\s+for)/.test(text);
}

export default function BDTasksFollowUps({ onNavigate }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [candidateMap, setCandidateMap] = useState<Map<string, Candidate>>(new Map());
  const [search, setSearch] = useState('');
  const [companiesRestricted, setCompaniesRestricted] = useState(false);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const next7Iso = useMemo(() => addDaysIso(todayIso, 7), [todayIso]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const contactsResult = await supabase
          .from('bd_contacts')
          .select(
            'id,company_id,full_name,job_title,relationship_status,next_action,next_action_date,last_contacted_at,updated_at,notes'
          )
          .order('updated_at', { ascending: false })
          .limit(2000);

        if (contactsResult.error) throw contactsResult.error;

        let companiesResult: { data: CompanyRow[] | null; error: unknown | null } = { data: null, error: null };
        try {
          const res = await supabase
            .from('companies')
            .select('id,company_name,company_status,source_type')
            .order('company_name', { ascending: true })
            .limit(500);
          companiesResult = { data: (res.data ?? []) as CompanyRow[], error: res.error ?? null };
        } catch (companyErr) {
          companiesResult = { data: [], error: companyErr };
        }

        let jobsResult: JobRow[] = [];
        try {
          jobsResult = (((await fetchAllJobsBasic()) ?? []) as unknown as JobRow[]) ?? [];
        } catch (jobsErr) {
          console.warn('[BDTasksFollowUps] jobs lookup unavailable (continuing without job context):', jobsErr);
          jobsResult = [];
        }

        let submissionsResult: SubmissionRow[] = [];
        try {
          const res = await supabase
            .from('submissions')
            .select('id,candidate_id,job_id,submission_stage,next_action_date,stage_updated_at,notes')
            .in('submission_stage', ['ready_for_bd_review', 'submitted_to_client', 'interview', 'offer'])
            .order('stage_updated_at', { ascending: false })
            .limit(2000);

          if (res.error) throw res.error;
          submissionsResult = (res.data ?? []) as SubmissionRow[];
        } catch (subErr) {
          console.warn('[BDTasksFollowUps] submissions lookup unavailable (continuing without deal tasks):', subErr);
          submissionsResult = [];
        }

        if (!active) return;

        const safeContacts = (contactsResult.data ?? []) as ContactRow[];
        const safeCompanies = ((companiesResult.data ?? []) as CompanyRow[]) ?? [];
        const restricted =
          (safeCompanies.length === 0 && safeContacts.length > 0) || Boolean(companiesResult.error);
        setCompaniesRestricted(restricted);
        setCompanies(restricted ? buildCompanyStubsFromContacts(safeContacts) : safeCompanies);
        setContacts(safeContacts);
        setJobs(jobsResult);
        setSubmissions(submissionsResult);

        // Candidate map is best-effort: the view may be restricted by current RLS policies.
        const uniqueCandidateIds = Array.from(
          new Set(submissionsResult.map((row) => row.candidate_id).filter(Boolean))
        );
        if (uniqueCandidateIds.length === 0) {
          setCandidateMap(new Map());
          return;
        }

        try {
          const candidates = await fetchCandidatesByIds(uniqueCandidateIds);
          if (!active) return;
          setCandidateMap(buildCandidateMap(candidates));
        } catch (candidateErr) {
          console.warn('[BDTasksFollowUps] candidate lookup unavailable (continuing without names):', candidateErr);
          const fallback = new Map<string, Candidate>();
          for (const id of uniqueCandidateIds) {
            fallback.set(id, createFallbackCandidate(id));
          }
          if (!active) return;
          setCandidateMap(fallback);
        }
      } catch (err) {
        if (!active) return;
        console.error('[BDTasksFollowUps] load error:', err);
        setError('Unable to load tasks & follow-ups right now.');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const companiesById = useMemo(() => {
    const map = new Map<number, CompanyRow>();
    for (const c of companies) map.set(c.id, c);
    return map;
  }, [companies]);

  const jobsById = useMemo(() => {
    const map = new Map<string, JobRow>();
    for (const j of jobs) map.set(j.id, j);
    return map;
  }, [jobs]);

  const contactTasks = useMemo((): TaskItem[] => {
    return contacts
      .filter((c) => Boolean(c.next_action_date))
      .map((contact) => {
        const companyName =
          typeof contact.company_id === 'number'
            ? companiesById.get(contact.company_id)?.company_name ?? `Company #${contact.company_id}`
            : 'Unknown Company';
        const dueDate = contact.next_action_date ? contact.next_action_date.slice(0, 10) : null;
        const bucket = bucketForDueDate(dueDate, todayIso, next7Iso);
        const actionType = contact.next_action?.trim() || 'follow_up';
        const lastTouch = contact.last_contacted_at ?? contact.updated_at ?? null;
        const reason = lastTouch
          ? `Last touch ${lastTouch.slice(0, 10)}`
          : normalize(contact.relationship_status ?? '') === 'new'
            ? 'New contact needs first outreach'
            : 'No recent activity recorded';

        return {
          id: `contact:${contact.id}`,
          kind: 'bd_contact',
          title: `${contact.full_name}`,
          subtitle: companyName,
          actionType,
          dueDate,
          bucket,
          urgencyTone: toneForBucket(bucket),
          sourceLabel: 'BD Contact',
          reason,
          meta: contact.job_title ?? null,
          contactId: contact.id,
          companyId: contact.company_id,
        };
      });
  }, [companiesById, contacts, next7Iso, todayIso]);

  const submissionFollowUps = useMemo((): TaskItem[] => {
    return submissions
      .filter((sub) => Boolean(sub.next_action_date))
      .map((sub) => {
        const job = jobsById.get(sub.job_id);
        const candidate = candidateMap.get(sub.candidate_id) ?? createFallbackCandidate(sub.candidate_id);
        const dueDate = sub.next_action_date ? sub.next_action_date.slice(0, 10) : null;
        const bucket = bucketForDueDate(dueDate, todayIso, next7Iso);
        const stage = stageLabel(sub.submission_stage);
        const reason = `${stage} follow-up due`;

        return {
          id: `submission:${sub.id}`,
          kind: 'submission',
          title: candidate.name,
          subtitle: job ? `${job.job_title} - ${job.company_name}` : `Job ${sub.job_id}`,
          actionType: `Submission: ${stage}`,
          dueDate,
          bucket,
          urgencyTone: toneForBucket(bucket),
          sourceLabel: 'Submission',
          reason,
          meta: job?.location ?? null,
          submissionId: sub.id,
          submissionStage: sub.submission_stage,
        };
      });
  }, [candidateMap, jobsById, next7Iso, submissions, todayIso]);

  const submissionAttentionTasks = useMemo(() => {
    return submissionFollowUps.filter((item) => item.bucket === 'overdue' || item.bucket === 'today');
  }, [submissionFollowUps]);

  const submissionNotesFlags = useMemo((): TaskItem[] => {
    return submissions
      .filter((sub) => !sub.next_action_date && looksLikeFollowUpNeeded(sub.notes))
      .slice(0, 50)
      .map((sub) => {
        const job = jobsById.get(sub.job_id);
        const candidate = candidateMap.get(sub.candidate_id) ?? createFallbackCandidate(sub.candidate_id);
        const stage = stageLabel(sub.submission_stage);
        return {
          id: `submission-flag:${sub.id}`,
          kind: 'submission',
          title: candidate.name,
          subtitle: job ? `${job.job_title} - ${job.company_name}` : `Job ${sub.job_id}`,
          actionType: `Submission: ${stage}`,
          dueDate: null,
          bucket: 'none',
          urgencyTone: 'amber',
          sourceLabel: 'Submission',
          reason: `${stage} flagged in notes`,
          meta: job?.location ?? null,
          submissionId: sub.id,
          submissionStage: sub.submission_stage,
        };
      });
  }, [candidateMap, jobsById, submissions]);

  const allTasks = useMemo(() => {
    const merged = [...contactTasks, ...submissionFollowUps, ...submissionNotesFlags];
    merged.sort((a, b) => {
      const da = a.dueDate ?? '9999-12-31';
      const db = b.dueDate ?? '9999-12-31';
      if (da !== db) return da.localeCompare(db);
      return a.title.localeCompare(b.title);
    });
    return merged;
  }, [contactTasks, submissionFollowUps, submissionNotesFlags]);

  const visibleTasks = useMemo(() => {
    const query = normalize(search);
    if (!query) return allTasks;
    return allTasks.filter((t) => {
      const haystack = `${t.title} ${t.subtitle} ${t.actionType} ${t.sourceLabel} ${t.reason} ${t.meta ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [allTasks, search]);

  const todaysActions = useMemo(() => {
    return visibleTasks.filter((t) => t.bucket === 'overdue' || t.bucket === 'today');
  }, [visibleTasks]);

  const followUpQueue = useMemo(() => {
    const overdue = visibleTasks.filter((t) => t.bucket === 'overdue');
    const today = visibleTasks.filter((t) => t.bucket === 'today');
    const next7 = visibleTasks.filter((t) => t.bucket === 'next7');
    return { overdue, today, next7 };
  }, [visibleTasks]);

  const dealAttentionTasks = useMemo(() => {
    const merged = [...submissionAttentionTasks, ...submissionNotesFlags];
    merged.sort((a, b) => {
      const da = a.dueDate ?? '9999-12-31';
      const db = b.dueDate ?? '9999-12-31';
      if (da !== db) return da.localeCompare(db);
      return a.title.localeCompare(b.title);
    });
    return merged;
  }, [submissionAttentionTasks, submissionNotesFlags]);

  const contactsWithoutNextAction = useMemo(() => {
    const query = normalize(search);
    const filtered = contacts.filter((c) => !c.next_action_date || !c.next_action);
    const rows = filtered.map((c) => {
      const companyName =
        typeof c.company_id === 'number'
          ? companiesById.get(c.company_id)?.company_name ?? `Company #${c.company_id}`
          : 'Unknown Company';
      return {
        id: c.id,
        companyId: c.company_id,
        contactName: c.full_name,
        companyName,
        status: c.relationship_status,
        updatedAt: c.updated_at,
      };
    });
    if (!query) return rows.slice(0, 20);
    return rows
      .filter((row) => normalize(`${row.companyName} ${row.contactName} ${row.status ?? ''}`).includes(query))
      .slice(0, 20);
  }, [companiesById, contacts, search]);

  const summary = useMemo(() => {
    const overdue = allTasks.filter((t) => t.bucket === 'overdue').length;
    const dueToday = allTasks.filter((t) => t.bucket === 'today').length;
    const upcoming = allTasks.filter((t) => t.bucket === 'next7').length;
    const noNextAction = contacts.filter((c) => !c.next_action_date || !c.next_action).length;
    const rescueNeeded = allTasks.filter(
      (t) => t.bucket === 'overdue' || (t.kind === 'submission' && t.bucket === 'today')
    ).length;

    return { overdue, dueToday, upcoming, noNextAction, rescueNeeded };
  }, [allTasks, contacts]);

  function renderEmpty(message: string) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <CheckCircle2 size={20} className="text-slate-300" />
        <p className="max-w-[320px] text-xs leading-relaxed text-slate-400">{message}</p>
      </div>
    );
  }

  function TaskRow({ item }: { item: TaskItem }) {
    const canViewSubmissionInQueue =
      item.kind === 'submission' && Boolean(item.submissionId) && item.submissionStage === 'ready_for_bd_review';

    return (
      <div className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-slate-50">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">{item.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge tone={item.urgencyTone}>{bucketLabel(item.bucket)}</Badge>
            <Badge tone="slate">{item.sourceLabel}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="rounded-md bg-slate-50 px-2 py-1 font-semibold text-slate-700 ring-1 ring-inset ring-slate-200/70">
            {item.actionType}
          </span>
          {item.dueDate ? (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <CalendarClock size={12} className="text-slate-400" />
              {item.dueDate}
            </span>
          ) : null}
          {item.meta ? (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Users size={12} className="text-slate-400" />
              {item.meta}
            </span>
          ) : null}
          <span className="text-slate-300">·</span>
          <span className="italic text-slate-500">{item.reason}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            onClick={() => onNavigate('bd-relationships')}
          >
            Open Account
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            onClick={() => {
              // Placeholder only: no write logic on this stakeholder-demo page.
              console.log('[BDTasksFollowUps] Mark Contacted placeholder', item.id);
            }}
          >
            Mark Contacted
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            onClick={() => {
              // Placeholder only: no write logic on this stakeholder-demo page.
              console.log('[BDTasksFollowUps] Log Note placeholder', item.id);
            }}
          >
            Log Note
          </button>
          <button
            type="button"
            disabled={item.kind !== 'submission' || !item.submissionId}
            title={
              canViewSubmissionInQueue
                ? 'Open the BD Review Queue'
                : item.kind === 'submission'
                  ? 'This demo button is routed to the BD Review Queue (ready_for_bd_review only).'
                  : undefined
            }
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              if (canViewSubmissionInQueue) {
                onNavigate('bd-queue');
              } else {
                console.log('[BDTasksFollowUps] View Submission placeholder (not wired for this stage)', item.id);
              }
            }}
          >
            View Submission
            <ExternalLink size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="BD Command Center"
        title="Tasks & Follow-ups"
        description="What should BD do today? A lightweight action console across BD contacts and active submissions."
        actions={
          <div className="relative w-full sm:w-[420px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks (account, contact, stage, reason)"
              className="w-full rounded-xl border border-slate-200 bg-white/90 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile
          label="Overdue"
          value={loading ? '—' : summary.overdue}
          detail="Needs action now"
          icon={<AlertTriangle size={14} />}
          tone="red"
        />
        <MetricTile
          label="Due Today"
          value={loading ? '—' : summary.dueToday}
          detail="Close before EOD"
          icon={<Clock size={14} />}
          tone="amber"
        />
        <MetricTile
          label="Upcoming"
          value={loading ? '—' : summary.upcoming}
          detail="Next 7 days"
          icon={<CalendarClock size={14} />}
          tone="blue"
        />
        <MetricTile
          label="No Next Action"
          value={loading ? '—' : summary.noNextAction}
          detail="Missing follow-up date"
          icon={<ClipboardList size={14} />}
          tone="slate"
        />
        <MetricTile
          label="Rescue Needed"
          value={loading ? '—' : summary.rescueNeeded}
          detail="Overdue + deal follow-ups"
          icon={<Flame size={14} />}
          tone={summary.rescueNeeded > 0 ? 'amber' : 'slate'}
        />
      </div>

      {companiesRestricted ? (
        <Panel className="p-3">
          <div className="flex items-start gap-3 text-xs text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 text-amber-600" />
            <p className="leading-relaxed">
              Company details are currently restricted by database access policies. This page will still show BD tasks,
              but some account names may appear as placeholders.
            </p>
          </div>
        </Panel>
      ) : null}

      <Panel padded={false} className="overflow-hidden">
        <SectionHeader
          title="Today's BD Actions"
          description="Overdue and due-today items across contacts and submissions."
          icon={<Flame size={16} />}
          meta={
            <div className="flex items-center gap-2">
              <Badge tone={todaysActions.length > 0 ? 'amber' : 'slate'}>{todaysActions.length} items</Badge>
            </div>
          }
        />
        {loading ? (
          <div className="px-5 py-6 text-sm text-slate-500">Loading tasks...</div>
        ) : error ? (
          <div className="px-5 py-6 text-sm text-red-700">{error}</div>
        ) : todaysActions.length === 0 ? (
          renderEmpty('No overdue actions. BD follow-up queue is clear.')
        ) : (
          <div className="divide-y divide-slate-100">
            {todaysActions.slice(0, 30).map((item) => (
              <TaskRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </Panel>

      <Panel padded={false} className="overflow-hidden">
        <SectionHeader
          title="Follow-up Queue"
          description="Upcoming follow-ups grouped by urgency."
          icon={<CalendarClock size={16} />}
          meta={
            <div className="flex items-center gap-2">
              <Badge tone="red">{followUpQueue.overdue.length} overdue</Badge>
              <Badge tone="amber">{followUpQueue.today.length} today</Badge>
              <Badge tone="blue">{followUpQueue.next7.length} next 7 days</Badge>
            </div>
          }
        />
        {loading ? (
          <div className="px-5 py-6 text-sm text-slate-500">Loading follow-up queue...</div>
        ) : (
          <div className="grid gap-0 divide-y divide-slate-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {([
              { key: 'overdue', label: 'Overdue', items: followUpQueue.overdue, tone: 'red' as const, icon: <AlertTriangle size={16} className="text-red-500" /> },
              { key: 'today', label: 'Today', items: followUpQueue.today, tone: 'amber' as const, icon: <Clock size={16} className="text-amber-500" /> },
              { key: 'next7', label: 'Next 7 Days', items: followUpQueue.next7, tone: 'blue' as const, icon: <CalendarClock size={16} className="text-blue-500" /> },
            ] as const).map((group) => (
              <div key={group.key} className="min-w-0">
                <div className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex items-center gap-2">
                    {group.icon}
                    <p className="text-sm font-semibold text-slate-950">{group.label}</p>
                  </div>
                  <Badge tone={group.tone}>{group.items.length}</Badge>
                </div>
                {group.items.length === 0 ? (
                  <div className="px-5 pb-6 text-xs text-slate-500">No upcoming follow-ups found.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {group.items.slice(0, 10).map((item) => (
                      <div key={item.id} className="px-5 py-3">
                        <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500 truncate">{item.subtitle}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <Badge tone="slate">{item.sourceLabel}</Badge>
                          <span className="tabular-nums">{item.dueDate ?? 'No due date'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel padded={false} className="overflow-hidden">
        <SectionHeader
          title="Deals / Submissions Needing Attention"
          description="Deal-touch reminders for BD review, submitted, interview, and offer stages."
          icon={<Sparkles size={16} />}
          meta={<Badge tone="slate">{dealAttentionTasks.length} flagged</Badge>}
        />
        {loading ? (
          <div className="px-5 py-6 text-sm text-slate-500">Loading deal tasks...</div>
        ) : dealAttentionTasks.length === 0 ? (
          renderEmpty('No deals need attention right now.')
        ) : (
          <div className="divide-y divide-slate-100">
            {dealAttentionTasks.slice(0, 20).map((item) => (
              <TaskRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </Panel>

      <Panel padded={false} className="overflow-hidden">
        <SectionHeader
          title="Accounts Without Next Action"
          description="Contacts missing next_action or next_action_date. Use this to keep BD discipline."
          icon={<ClipboardList size={16} />}
          meta={<Badge tone={contactsWithoutNextAction.length > 0 ? 'amber' : 'slate'}>{contactsWithoutNextAction.length} showing</Badge>}
        />
        {loading ? (
          <div className="px-5 py-6 text-sm text-slate-500">Loading accounts...</div>
        ) : contactsWithoutNextAction.length === 0 ? (
          renderEmpty('No accounts missing next action. Follow-up hygiene looks good.')
        ) : (
          <div className="divide-y divide-slate-100">
            {contactsWithoutNextAction.map((row) => (
              <div key={row.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{row.contactName}</p>
                  <p className="mt-0.5 text-xs text-slate-500 truncate">{row.companyName}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Badge tone="amber">No next action</Badge>
                  <button
                    type="button"
                    onClick={() => onNavigate('bd-relationships')}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Open Account
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
