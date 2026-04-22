import { useState, useEffect, useMemo } from 'react';
import { CheckCircle, XCircle, UserCheck, Send, Eye, MapPin, Briefcase, ArrowLeft, Search } from 'lucide-react';
import { getJobById } from '../lib/jobs';
import { fetchCandidatesForUI } from '../lib/candidates';
import { useStore } from '../store/StoreContext';
import { useRole } from '../store/RoleContext';
import type { Candidate } from '../store/types';
import type { SubmissionStage } from '../store/types';
import { generateTerrerAIReview } from '../lib/terrerAI';
import type { Decision, TerrerAIReview } from '../lib/terrerAI';
import TerrerAIReviewPanel from '../components/TerrerAIReviewPanel';
import SubmissionModal from '../components/SubmissionModal';
import { fetchAssessmentsForJob, upsertAssessment, rowToReview } from '../lib/aiAssessments';
import { generateSubmissionOutput, type SubmissionOutput } from '../lib/submissionOutput';
import {
  fetchJobRequirements,
  fetchCandidateSkills,
  computeSkillOverlap,
  buildCandidateSkillMap,
  type JobRequirementRow,
} from '../lib/skillMatch';
import { classifyRoleTrustPolicy, type RoleTrustPolicy } from '../lib/roleTrustPolicy';

interface Job {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  operational_status?: string;
}

interface RankedCandidate extends Candidate {
  matchScore: number;
  roleMatch: boolean;
  locationMatch: boolean;
  structuredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  skillBonus: number;
}

type SupplyStatus = 'No viable candidates' | 'Strong supply' | 'Limited supply';
type JobDetailView = 'top-matches' | 'sourcing-plan';
type ChannelStatus = 'Not started' | 'In progress' | 'Posted' | 'Paused';
type ChannelPriority = 'HIGH' | 'MEDIUM' | 'LOW';

interface SupplyAssessment {
  proceed: number;
  review: number;
  reject: number;
  total: number;
  status: SupplyStatus;
}

interface SourcingChannel {
  channel: string;
  priority: ChannelPriority;
  reason: string;
  status: ChannelStatus;
  leads: number;
  addedToJob: number;
  nextAction: string;
}

type SourcingChannelStateByJob = Record<string, SourcingChannel[]>;

interface Props {
  jobId?: string;
  onNavigate: (
    page: string,
    jobId?: string,
    sourcingContext?: { jobId?: string; role: string; skills: string[] }
  ) => void;
}

const avatarColors: string[] = [
  'bg-teal-100 text-teal-700',
  'bg-blue-100 text-blue-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-cyan-100 text-cyan-700',
  'bg-green-100 text-green-700',
];

const STAGE_LABEL: Partial<Record<SubmissionStage, string>> = {
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

const STAGE_STYLE: Partial<Record<SubmissionStage, string>> = {
  new: 'bg-gray-100 text-gray-500',
  shortlisted: 'bg-sky-50 text-sky-700',
  ready_for_bd_review: 'bg-violet-50 text-violet-700',
  submitted_to_client: 'bg-yellow-50 text-yellow-700',
  interview: 'bg-amber-50 text-amber-700',
  offer: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  hold: 'bg-gray-100 text-gray-500',
  hired: 'bg-green-50 text-green-700',
};

const SUPPLY_STYLE: Record<SupplyStatus, string> = {
  'No viable candidates': 'bg-red-50 text-red-700 border-red-100',
  'Strong supply': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Limited supply': 'bg-amber-50 text-amber-700 border-amber-100',
};

const CHANNEL_PRIORITY_STYLE: Record<ChannelPriority, string> = {
  HIGH: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-100',
  LOW: 'bg-gray-100 text-gray-600 border-gray-200',
};

const CHANNEL_STATUS_OPTIONS: ChannelStatus[] = ['Not started', 'In progress', 'Posted', 'Paused'];

const SOURCING_CHANNELS: SourcingChannel[] = [
  {
    channel: 'Internal Database',
    priority: 'HIGH',
    reason: 'Fastest candidates, already in system',
    status: 'In progress',
    leads: 18,
    addedToJob: 3,
    nextAction: 'Search and shortlist strongest matches',
  },
  {
    channel: 'LinkedIn Outreach',
    priority: 'HIGH',
    reason: 'Best for targeted outreach',
    status: 'Not started',
    leads: 0,
    addedToJob: 0,
    nextAction: 'Build target list by role keywords',
  },
  {
    channel: 'JobStreet',
    priority: 'MEDIUM',
    reason: 'Useful for broader inbound reach',
    status: 'Not started',
    leads: 0,
    addedToJob: 0,
    nextAction: 'Post once job requirements are stable',
  },
  {
    channel: 'Hiredly',
    priority: 'MEDIUM',
    reason: 'Useful for white-collar / professional inbound',
    status: 'Paused',
    leads: 0,
    addedToJob: 0,
    nextAction: 'Resume if internal search is thin',
  },
  {
    channel: 'Referrals',
    priority: 'LOW',
    reason: 'Useful when warm network access is available',
    status: 'Not started',
    leads: 0,
    addedToJob: 0,
    nextAction: 'Ask team for warm intros if needed',
  },
];

function createDefaultSourcingChannels(): SourcingChannel[] {
  return SOURCING_CHANNELS.map(channel => ({ ...channel }));
}

const matchConfig = (score: number) => {
  if (score >= 90) {
    return {
      bar: 'bg-emerald-500',
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      ring: 'ring-emerald-200',
    };
  }
  if (score >= 75) {
    return {
      bar: 'bg-sky-500',
      text: 'text-sky-600',
      bg: 'bg-sky-50',
      ring: 'ring-sky-200',
    };
  }
  return {
    bar: 'bg-amber-400',
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
  };
};

const initials = (name: string) =>
  name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

function looseMatch(a: string, b: string): boolean {
  if (!a || !b) return false;

  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  const wordsA = normalize(a)
    .split(/\s+/)
    .filter(w => w.length > 2);

  const wordsB = normalize(b)
    .split(/\s+/)
    .filter(w => w.length > 2);

  return wordsA.some(wa => wordsB.some(wb => wa.includes(wb) || wb.includes(wa)));
}

function rankCandidates(
  candidates: Candidate[],
  job: Job,
  jobRequirements: JobRequirementRow[],
  skillMap: Map<string, string[]>
): RankedCandidate[] {
  return candidates
    .map(c => {
      const roleMatch = looseMatch(c.role, job.job_title);
      const locationMatch = looseMatch(c.location, job.location);
      const structuredSkills = skillMap.get(c.id) ?? [];

      const overlap = computeSkillOverlap(structuredSkills, jobRequirements);

      let matchScore = c.score;
      if (roleMatch) matchScore = Math.min(100, matchScore + 8);
      if (locationMatch) matchScore = Math.min(100, matchScore + 4);
      matchScore = Math.min(100, matchScore + overlap.bonus);

      return {
        ...c,
        matchScore,
        roleMatch,
        locationMatch,
        structuredSkills,
        matchedSkills: overlap.matched,
        missingSkills: overlap.missing,
        skillBonus: overlap.bonus,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

function deriveSupplyStatus(proceed: number, review: number): SupplyStatus {
  if (proceed + review === 0) return 'No viable candidates';
  if (proceed > 0) return 'Strong supply';
  return 'Limited supply';
}

function getSourcingSkills(jobRequirements: JobRequirementRow[]): string[] {
  return jobRequirements
    .filter(req => req.required)
    .map(req => req.requirement)
    .filter(Boolean)
    .slice(0, 5);
}

function SourcingPlan({
  job,
  jobRequirements,
  channelRows,
  onChannelStatusChange,
  onSearchInternalCandidates,
  onViewTopMatches,
}: {
  job: Job;
  jobRequirements: JobRequirementRow[];
  channelRows: SourcingChannel[];
  onChannelStatusChange: (channel: string, status: ChannelStatus) => void;
  onSearchInternalCandidates: () => void;
  onViewTopMatches: () => void;
}) {
  const priorityLabel = job.operational_status === 'active' ? 'Active' : 'Not prioritized';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ContextItem label="Job" value={job.job_title} />
          <ContextItem label="Company" value={job.company_name} />
          <ContextItem label="Priority" value={priorityLabel} />
          <ContextItem label="Sourcing Mode" value="Database First" emphasis />
        </div>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Recommended Channels</h2>
            <p className="text-xs text-gray-500 mt-1">
              Lightweight V1 playbook for where recruiters should hunt first.
            </p>
          </div>
          {jobRequirements.length > 0 && (
            <span className="text-xs font-medium text-blue-600 bg-blue-50 rounded-full px-2.5 py-1">
              {jobRequirements.length} requirements loaded
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {channelRows.map(row => (
            <div key={row.channel} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{row.channel}</p>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${CHANNEL_PRIORITY_STYLE[row.priority]}`}>
                  {row.priority}
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mt-3">{row.reason}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Channel Tracker</h2>
          <p className="text-xs text-gray-500 mt-1">
            Mock tracker only. Changes are local to this page and are not saved yet.
          </p>
        </div>

        <div className="hidden lg:grid grid-cols-[1.1fr_0.9fr_0.6fr_0.75fr_1.5fr] gap-3 bg-gray-50 border-b border-gray-100 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          <span>Channel</span>
          <span>Status</span>
          <span>Leads</span>
          <span>Added to Job</span>
          <span>Next Action</span>
        </div>

        <div className="divide-y divide-gray-100">
          {channelRows.map(row => (
            <div
              key={row.channel}
              className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr_0.6fr_0.75fr_1.5fr] gap-3 px-5 py-4 text-sm lg:items-center"
            >
              <p className="font-semibold text-gray-900">{row.channel}</p>
              <select
                value={row.status}
                onChange={(event) =>
                  onChannelStatusChange(row.channel, event.target.value as ChannelStatus)
                }
                className="w-fit rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-200"
              >
                {CHANNEL_STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <p className="text-gray-600">{row.leads}</p>
              <p className="text-gray-600">{row.addedToJob}</p>
              <p className="text-gray-600">{row.nextAction}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Next recruiter action</h2>
          <p className="text-xs text-gray-500 mt-1">
            Start with internal candidates, then use Top Matches to narrow and progress.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onSearchInternalCandidates}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Search size={13} />
            Search Internal Candidates
          </button>
          <button
            onClick={onViewTopMatches}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View Top Matches
          </button>
        </div>
      </div>
    </div>
  );
}

function ContextItem({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-sm mt-1 ${emphasis ? 'font-semibold text-blue-700' : 'font-semibold text-gray-900'}`}>
        {value || '-'}
      </p>
    </div>
  );
}

function getNoViableCopy(policy: RoleTrustPolicy): { title: string; body: string } {
  if (policy === 'STRICT') {
    return {
      title: 'No viable candidates found',
      body: 'This role appears regulated or requirement-critical, so Terrer will not show exploratory candidates as substitutes.',
    };
  }

  if (policy === 'SEMI_STRICT') {
    return {
      title: 'No strong matches found. Showing limited near matches for review.',
      body: 'These candidates are partial matches only and need recruiter judgment before any progression.',
    };
  }

  return {
    title: 'No strong matches found. Showing exploratory profiles for sourcing.',
    body: 'These are not strong matches but may be useful for sourcing.',
  };
}

function TrustPolicyBadge({ policy }: { policy: RoleTrustPolicy }) {
  const style: Record<RoleTrustPolicy, string> = {
    STRICT: 'bg-red-50 text-red-700 border-red-100',
    SEMI_STRICT: 'bg-orange-50 text-orange-700 border-orange-100',
    FLEX: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };

  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${style[policy]}`}>
      {policy === 'SEMI_STRICT' ? 'SEMI-STRICT' : policy}
    </span>
  );
}

type ProfileSignalCategory =
  | 'backend'
  | 'frontend'
  | 'software'
  | 'data'
  | 'product'
  | 'medical'
  | 'legal'
  | 'finance'
  | 'operations';

const PROFILE_SIGNAL_LABEL: Record<ProfileSignalCategory, string> = {
  backend: 'backend engineering',
  frontend: 'frontend engineering',
  software: 'software engineering',
  data: 'data',
  product: 'product',
  medical: 'medical / clinical',
  legal: 'legal',
  finance: 'finance / compliance',
  operations: 'operations',
};

function detectProfileSignal(values: string[]): ProfileSignalCategory | null {
  const text = values.join(' ').toLowerCase();

  if (/\b(backend|back end|node|java|php|python|api|server|database)\b/.test(text)) return 'backend';
  if (/\b(frontend|front end|react|vue|angular|ui developer|web developer)\b/.test(text)) return 'frontend';
  if (/\b(software|developer|engineer|programmer|full stack|fullstack)\b/.test(text)) return 'software';
  if (/\b(data|analytics|analyst|bi|business intelligence|sql|machine learning|ml)\b/.test(text)) return 'data';
  if (/\b(product manager|product owner|tpm|technical product|product)\b/.test(text)) return 'product';
  if (/\b(medical|doctor|clinical|clinic|hospital|nurse|pharma|healthcare)\b/.test(text)) return 'medical';
  if (/\b(legal|lawyer|counsel|solicitor|litigation|chambering)\b/.test(text)) return 'legal';
  if (/\b(finance|accounting|audit|tax|compliance|risk|regulatory)\b/.test(text)) return 'finance';
  if (/\b(operations|ops|supply chain|logistics|coordinator)\b/.test(text)) return 'operations';

  return null;
}

function getNearMatchReasons(
  candidate: RankedCandidate,
  job: Job,
  policy: Exclude<RoleTrustPolicy, 'STRICT'>
): string[] {
  const reasons: string[] = [];
  const jobSignal = detectProfileSignal([job.job_title]);
  const candidateSignal = detectProfileSignal([candidate.role, ...candidate.skills, ...candidate.structuredSkills]);

  if (!candidate.roleMatch) {
    if (jobSignal && candidateSignal && jobSignal !== candidateSignal) {
      reasons.push(
        `${PROFILE_SIGNAL_LABEL[candidateSignal]} signal is adjacent to the ${PROFILE_SIGNAL_LABEL[jobSignal]} requirement`
      );
    } else {
      reasons.push(
        policy === 'SEMI_STRICT'
          ? 'Role alignment is partial or unclear for this requirement'
          : 'Role alignment is exploratory rather than direct'
      );
    }
  }

  if (candidate.missingSkills.length > 0) {
    reasons.push(`Missing required signals: ${candidate.missingSkills.slice(0, 2).join(', ')}`);
  }

  if (candidate.matchedSkills.length > 0 && (candidate.missingSkills.length > 0 || !candidate.roleMatch)) {
    reasons.push('Some relevant skills are present, but fit remains incomplete');
  }

  if (!candidate.locationMatch && job.location && candidate.location) {
    reasons.push('Location fit may need manual validation');
  }

  if (reasons.length === 0) {
    reasons.push(
      policy === 'SEMI_STRICT'
        ? 'Partial match only; validate requirements before progressing'
        : 'Exploratory profile only; useful for manual sourcing, not a strong match'
    );
  }

  return reasons.slice(0, 3);
}

function ExploratoryCandidateSection({
  policy,
  candidates,
  job,
}: {
  policy: Exclude<RoleTrustPolicy, 'STRICT'>;
  candidates: RankedCandidate[];
  job: Job;
}) {
  const title =
    policy === 'SEMI_STRICT'
      ? 'Near matches for review'
      : 'Exploratory profiles for manual sourcing';
  const helper =
    policy === 'SEMI_STRICT'
      ? 'Partial matches only. Review carefully before deciding whether to source or shortlist.'
      : 'These are not strong matches but may be useful for sourcing.';

  return (
    <section className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-1">{helper}</p>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Not recommended
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {candidates.map(candidate => {
          const reasons = getNearMatchReasons(candidate, job, policy);

          return (
            <div key={candidate.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{candidate.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{candidate.role}</p>
                </div>
                <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-gray-500 border border-gray-200">
                  {candidate.matchScore}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {candidate.skills.slice(0, 4).map(skill => (
                  <span
                    key={skill}
                    className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-500 border border-gray-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Why shown
                </p>
                <ul className="mt-2 space-y-1.5">
                  {reasons.map(reason => (
                    <li key={reason} className="text-xs leading-relaxed text-gray-500">
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-3 text-xs text-gray-400">
                Manual review only. Do not treat as a strong match.
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function TopMatches({ jobId, onNavigate }: Props) {
  const {
    submissions,
    getSubmission,
    shortlist,
    sendToBdReviewWithOutput,
    resetSubmissionsForJob,
    deleteSubmissionsForJob,
  } = useStore();
  const { role } = useRole();

  const canRecruit = role === 'recruiter' || role === 'admin' || role === null;
  const isAdmin = role === 'admin';

  const [job, setJob] = useState<Job | null>(null);
  const [loadingJob, setLoadingJob] = useState(!!jobId);
  const [invalidJob, setInvalidJob] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [reviews, setReviews] = useState<Record<string, TerrerAIReview>>({});
  const [reviewRunning, setReviewRunning] = useState<Record<string, boolean>>({});
  const [jobRequirements, setJobRequirements] = useState<JobRequirementRow[]>([]);
  const [skillMap, setSkillMap] = useState<Map<string, string[]>>(new Map());
  const [liveCandidates, setLiveCandidates] = useState<Candidate[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCandidate, setModalCandidate] = useState<RankedCandidate | null>(null);
  const [modalOutput, setModalOutput] = useState<SubmissionOutput | null>(null);
  const [modalSending, setModalSending] = useState(false);
  const [bulkResetStage, setBulkResetStage] = useState<SubmissionStage>('shortlisted');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [jobDetailView, setJobDetailView] = useState<JobDetailView>('top-matches');
  const [sourcingChannelsByJob, setSourcingChannelsByJob] = useState<SourcingChannelStateByJob>({});

  useEffect(() => {
    let cancelled = false;
    let resolvedValidJob = false;

    // Opening Top Matches from a job card should always show the candidate list first.
    setJobDetailView('top-matches');
    setJob(null);
    setInvalidJob(false);
    setReviews({});
    setJobRequirements([]);
    setSkillMap(new Map());
    setLiveCandidates([]);

    if (!jobId) {
      setLoadingJob(false);
      return;
    }

    const selectedJobId = jobId;
    setLoadingJob(true);

    async function loadTopMatches() {
      try {
        const jobData = await getJobById(selectedJobId);
        if (cancelled) return;

        if (!jobData) {
          setInvalidJob(true);
          return;
        }

        resolvedValidJob = true;
        setJob(jobData as Job);

        const [assessments, requirements, loadedCandidates] = await Promise.all([
          fetchAssessmentsForJob(selectedJobId),
          fetchJobRequirements(selectedJobId),
          fetchCandidatesForUI(),
        ]);
        if (cancelled) return;

        const loaded: Record<string, TerrerAIReview> = {};
        for (const row of assessments) {
          const key = `${row.candidate_id}-${row.job_id}`;
          loaded[key] = rowToReview(row);
        }

        setReviews(loaded);
        setJobRequirements(requirements);
        setLiveCandidates(loadedCandidates);

        // Skill overlap stays live-candidate driven without changing ranking behavior.
        const skillRows = await fetchCandidateSkills(loadedCandidates.map(c => c.id));
        if (cancelled) return;
        setSkillMap(buildCandidateSkillMap(skillRows));
      } catch (err) {
        console.error('[TopMatches] load error:', err);
        if (!cancelled && !resolvedValidJob) {
          setInvalidJob(true);
        }
      } finally {
        if (!cancelled) {
          setLoadingJob(false);
        }
      }
    }

    loadTopMatches();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const ranked = useMemo<RankedCandidate[]>(() => {
    if (!job) return [];
    return rankCandidates(liveCandidates, job, jobRequirements, skillMap);
  }, [job, jobRequirements, liveCandidates, skillMap]);

  const roleTrustPolicy = useMemo<RoleTrustPolicy>(() => {
    if (!job) return 'FLEX';
    return classifyRoleTrustPolicy(job.job_title);
  }, [job]);

  const jobSubmissionCount = useMemo(() => {
    if (!job) return 0;
    return submissions.filter(s => s.job_id === job.id).length;
  }, [job, submissions]);

  const sourcingChannels = useMemo<SourcingChannel[]>(() => {
    if (!job) return createDefaultSourcingChannels();

    const jobChannels = sourcingChannelsByJob[job.id] ?? createDefaultSourcingChannels();

    return jobChannels.map(row =>
      row.channel === 'Internal Database'
        ? { ...row, addedToJob: jobSubmissionCount }
        : row
    );
  }, [job, jobSubmissionCount, sourcingChannelsByJob]);

  const supplyAssessment = useMemo<SupplyAssessment>(() => {
    const counts: Record<Decision, number> = {
      Proceed: 0,
      Review: 0,
      Reject: 0,
    };

    if (!job) {
      return {
        proceed: 0,
        review: 0,
        reject: 0,
        total: 0,
        status: 'No viable candidates',
      };
    }

    for (const [key, review] of Object.entries(reviews)) {
      if (!key.endsWith(`-${job.id}`)) continue;
      counts[review.decision] += 1;
    }

    const total = counts.Proceed + counts.Review + counts.Reject;

    // A job with loaded candidates but no saved reviews is pending review, not "no viable".
    if (total === 0 && ranked.length > 0) {
      return {
        proceed: 0,
        review: 0,
        reject: 0,
        total: 0,
        status: 'Limited supply',
      };
    }

    return {
      proceed: counts.Proceed,
      review: counts.Review,
      reject: counts.Reject,
      total,
      status: deriveSupplyStatus(counts.Proceed, counts.Review),
    };
  }, [job, ranked.length, reviews]);

  const handle = async (key: string, fn: () => Promise<void>) => {
    setBusy(b => ({ ...b, [key]: true }));
    try {
      await fn();
    } catch (err) {
      console.error('[TopMatches]', key, err);
    } finally {
      setBusy(b => ({ ...b, [key]: false }));
    }
  };

  const handleSendToBdReview = (candidate: RankedCandidate) => {
    if (!job) return;

    const key = `${candidate.id}-${job.id}`;
    const review = reviews[key] ?? null;
    const output = generateSubmissionOutput(candidate, job, review);

    setModalCandidate(candidate);
    setModalOutput(output);
    setModalOpen(true);
  };

  const handleModalSend = async (notes: string) => {
    if (!modalCandidate || !job || !modalOutput) return;

    setModalSending(true);
    try {
      const result = await sendToBdReviewWithOutput(modalCandidate.id, job.id, modalOutput, notes);
      if (result) {
        setModalOpen(false);
      } else {
        window.alert('Could not send this candidate to BD Review. Check console logs for details.');
      }
    } catch (err) {
      console.error('[TopMatches] sendToBdReviewWithOutput error', err);
      window.alert('Could not send this candidate to BD Review. Check console logs for details.');
    } finally {
      setModalSending(false);
    }
  };

  const runReview = (candidate: RankedCandidate) => {
    if (!job) return;

    const key = `${candidate.id}-${job.id}`;
    setReviewRunning(r => ({ ...r, [key]: true }));

    setTimeout(async () => {
      try {
        const reviewCandidate = {
          ...candidate,
          structuredSkills: candidate.structuredSkills,
        };

        const reviewJob = {
          ...job,
          requirements: jobRequirements,
        };

        const result = generateTerrerAIReview(reviewCandidate, reviewJob);
        await upsertAssessment(candidate.id, job.id, result, candidate.score, candidate.matchScore);
        setReviews(rv => ({ ...rv, [key]: result }));
      } catch (err) {
        console.error('[TopMatches] runReview error', err);
      } finally {
        setReviewRunning(r => ({ ...r, [key]: false }));
      }
    }, 1200);
  };

  const handleBulkReset = async () => {
    if (!job) return;
    if (!window.confirm(`Reset all submissions for ${job.job_title} to ${STAGE_LABEL[bulkResetStage]}?`)) {
      return;
    }

    setBulkBusy(true);
    try {
      await resetSubmissionsForJob(job.id, bulkResetStage);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!job) return;
    if (!window.confirm(`Delete all submission records for ${job.job_title}? This is intended for test data cleanup.`)) {
      return;
    }

    setBulkBusy(true);
    try {
      const deletedCount = await deleteSubmissionsForJob(job.id);
      if (deletedCount === 0 && jobSubmissionCount > 0) {
        window.alert('Bulk delete failed. Check Supabase policies or console logs for details.');
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const handleChannelStatusChange = (channel: string, status: ChannelStatus) => {
    if (!job) return;

    setSourcingChannelsByJob(prev => {
      const currentRows = prev[job.id] ?? createDefaultSourcingChannels();
      return {
        ...prev,
        [job.id]: currentRows.map(row => (row.channel === channel ? { ...row, status } : row)),
      };
    });
  };

  if (loadingJob) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasSelectedJob = Boolean(jobId);

  if (!hasSelectedJob || !job) {
    return (
      <div>
        <div className="mb-7">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Top Matches</h1>
          {hasSelectedJob && invalidJob && (
            <p className="text-sm text-amber-600 mt-1">That job could not be found.</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Top Matches works on a specific job. Choose a job from Jobs or Active Jobs to review
            ranked candidates, shortlist them, and send them into the submission workflow.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate('jobs')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={14} />
            Go to Jobs
          </button>
          <button
            onClick={() => onNavigate('active-jobs')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Active Jobs
          </button>
        </div>
      </div>
    );
  }

  const hasStructuredRequirements = jobRequirements.length > 0;
  const isNoViableCandidates = supplyAssessment.status === 'No viable candidates';
  const noViableCopy = getNoViableCopy(roleTrustPolicy);
  const exploratoryCandidates = isNoViableCandidates
    ? ranked.slice(0, roleTrustPolicy === 'SEMI_STRICT' ? 3 : 5)
    : [];
  const shouldRenderCandidateCards = jobDetailView === 'top-matches' && !isNoViableCandidates;

  return (
    <div>
      <div className="mb-1">
        <button
          onClick={() => onNavigate('jobs')}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-4"
        >
          <ArrowLeft size={12} />
          Back to Jobs
        </button>
      </div>

      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
          Selected Job
        </p>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight leading-snug">
          {job.job_title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <Briefcase size={13} className="text-gray-400" />
            {job.company_name}
          </span>

          {job.location && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin size={13} className="text-gray-400" />
              {job.location}
            </span>
          )}

          {hasStructuredRequirements && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
              {jobRequirements.length} requirements loaded
            </span>
          )}

          <TrustPolicyBadge policy={roleTrustPolicy} />
        </div>
        <p className="text-sm text-gray-500 mt-3">
          Reviewing candidates for this role only. Submission status and actions below apply to{' '}
          {job.company_name}.
        </p>
        <p className="text-xs text-gray-400 mt-3">{ranked.length} candidates ranked by fit score</p>
        {isAdmin && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
                  Testing Data
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  {jobSubmissionCount} submission{jobSubmissionCount !== 1 ? 's' : ''} for this job.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={bulkResetStage}
                  onChange={(e) => setBulkResetStage(e.target.value as SubmissionStage)}
                  disabled={bulkBusy}
                  className="text-xs text-gray-600 border border-amber-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-amber-200 disabled:bg-gray-50"
                >
                  <option value="new">New</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="ready_for_bd_review">BD Review</option>
                  <option value="submitted_to_client">Submitted</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                </select>
                <button
                  onClick={handleBulkReset}
                  disabled={bulkBusy || jobSubmissionCount === 0}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    bulkBusy || jobSubmissionCount === 0
                      ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-default'
                      : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  {bulkBusy ? 'Working...' : 'Reset All Submissions'}
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkBusy || jobSubmissionCount === 0}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    bulkBusy || jobSubmissionCount === 0
                      ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-default'
                      : 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                  }`}
                >
                  {bulkBusy ? 'Working...' : 'Delete All Submissions'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 mb-6">
        <button
          onClick={() => setJobDetailView('top-matches')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            jobDetailView === 'top-matches'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Top Matches
        </button>
        <button
          onClick={() => setJobDetailView('sourcing-plan')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            jobDetailView === 'sourcing-plan'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sourcing Plan
        </button>
      </div>

      {jobDetailView === 'sourcing-plan' && (
        <SourcingPlan
          job={job}
          jobRequirements={jobRequirements}
          channelRows={sourcingChannels}
          onChannelStatusChange={handleChannelStatusChange}
          onSearchInternalCandidates={() =>
            onNavigate('candidates', undefined, {
              jobId: job.id,
              role: job.job_title,
              skills: getSourcingSkills(jobRequirements),
            })
          }
          onViewTopMatches={() => setJobDetailView('top-matches')}
        />
      )}

      {jobDetailView === 'top-matches' && (
      <>
      <div className={`mb-6 rounded-xl border p-4 ${SUPPLY_STYLE[supplyAssessment.status]}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide">Supply Assessment</p>
            <p className="text-base font-semibold mt-1">
              {isNoViableCandidates ? noViableCopy.title : supplyAssessment.status}
            </p>
            <p className="text-sm mt-1 opacity-90">
              {isNoViableCandidates
                ? noViableCopy.body
                : supplyAssessment.status === 'Strong supply'
                  ? 'At least one candidate is ready to progress based on Terrer AI Review decisions.'
                  : 'There are candidates worth reviewing, but no clear Proceed decision yet.'}
            </p>
            {isNoViableCandidates && roleTrustPolicy === 'STRICT' && (
              <p className="text-xs mt-2 opacity-80">
                STRICT role: exploratory candidates are hidden to preserve recruiter trust.
              </p>
            )}
            {isNoViableCandidates && (
              <button
                onClick={() =>
                  onNavigate('candidates', undefined, {
                    jobId: job.id,
                    role: job.job_title,
                    skills: getSourcingSkills(jobRequirements),
                  })
                }
                className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Source Candidates
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white/70 px-2.5 py-1">Proceed {supplyAssessment.proceed}</span>
            <span className="rounded-full bg-white/70 px-2.5 py-1">Review {supplyAssessment.review}</span>
            <span className="rounded-full bg-white/70 px-2.5 py-1">Reject {supplyAssessment.reject}</span>
          </div>
        </div>
      </div>

      {shouldRenderCandidateCards && (
        <SubmissionModal
          open={modalOpen}
          candidate={modalCandidate}
          job={job}
          output={modalOutput}
          onClose={() => setModalOpen(false)}
          onSend={handleModalSend}
          sending={modalSending}
        />
      )}

      {isNoViableCandidates && roleTrustPolicy !== 'STRICT' && exploratoryCandidates.length > 0 && (
        <ExploratoryCandidateSection
          policy={roleTrustPolicy}
          candidates={exploratoryCandidates}
          job={job}
        />
      )}

      {shouldRenderCandidateCards && (
        <div className="space-y-4">
          {ranked.map((m, i) => {
          const mc = matchConfig(m.matchScore);
          const submission = getSubmission(m.id, job.id);
          const stage = (submission?.submission_stage as SubmissionStage) ?? 'new';
          const isShortlisted = stage === 'shortlisted';
          const isSentToBd = stage === 'ready_for_bd_review';
          const isSubmitted = stage === 'submitted_to_client';
          const isInterview = stage === 'interview';
          const isOffer = stage === 'offer';
          const isHold = stage === 'hold';
          const isHired = stage === 'hired';
          const isRejected = stage === 'rejected';
          const isBusy = !!busy[`${m.id}-${job.id}`];
          const shortlistDisabled =
            isShortlisted || isSentToBd || isSubmitted || isInterview || isOffer || isHold || isHired || isRejected;
          const sendToBdReviewDisabled =
            isSentToBd || isSubmitted || isInterview || isOffer || isHold || isHired || isRejected;

          let shortlistLabel = 'Shortlist';
          if (isShortlisted) shortlistLabel = 'Shortlisted';
          else if (isSentToBd) shortlistLabel = 'In BD Review';
          else if (isSubmitted) shortlistLabel = 'Submitted';
          else if (isInterview) shortlistLabel = 'Interview';
          else if (isOffer) shortlistLabel = 'Offer';
          else if (isHold) shortlistLabel = 'Hold';
          else if (isHired) shortlistLabel = 'Hired';
          else if (isRejected) shortlistLabel = 'Rejected';

          let sendToBdReviewLabel = 'Send to BD Review';
          if (isSentToBd) sendToBdReviewLabel = 'Sent to BD Review';
          else if (isSubmitted) sendToBdReviewLabel = 'Submitted to Client';
          else if (isInterview) sendToBdReviewLabel = 'Interview';
          else if (isOffer) sendToBdReviewLabel = 'Offer';
          else if (isHold) sendToBdReviewLabel = 'Hold';
          else if (isHired) sendToBdReviewLabel = 'Hired';
          else if (isRejected) sendToBdReviewLabel = 'Rejected';

          const strengths: string[] = [];
          const gaps: string[] = [];

          if (m.roleMatch) {
            strengths.push(`Role matches "${job.job_title}"`);
            if (m.locationMatch) strengths.push(`Location matches "${job.location}"`);
            if (m.score >= 90) strengths.push('High overall candidate score');
            else if (m.score >= 80) strengths.push('Strong overall candidate score');

            if (m.matchedSkills.length > 0) {
              strengths.push(
                `Skills matched: ${m.matchedSkills.slice(0, 3).join(', ')}${
                  m.matchedSkills.length > 3 ? ` +${m.matchedSkills.length - 3} more` : ''
                }`
              );
            }
          }

          if (!m.roleMatch) gaps.push('Role title differs from job requirement');
          if (!m.locationMatch) gaps.push('Location may require relocation');
          if (m.missingSkills.length > 0) {
            gaps.push(
              `Missing required skills: ${m.missingSkills.slice(0, 3).join(', ')}${
                m.missingSkills.length > 3 ? ` +${m.missingSkills.length - 3} more` : ''
              }`
            );
          }

          return (
            <div
              key={`${m.id}-${job.id}`}
              className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-150 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300 w-4 text-right tabular-nums">
                      {i + 1}
                    </span>
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold select-none ${
                        avatarColors[i % avatarColors.length]
                      }`}
                    >
                      {initials(m.name)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-gray-900 leading-snug">
                          {m.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {m.role} &middot; {m.location}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {stage !== 'new' && (
                          <span
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                              STAGE_STYLE[stage]
                            }`}
                          >
                            {STAGE_LABEL[stage]}
                          </span>
                        )}
                        <div
                          className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl ring-1 ${mc.bg} ${mc.ring}`}
                        >
                          <p className={`text-xl font-bold leading-none ${mc.text}`}>
                            {m.matchScore}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1 leading-none font-medium">
                            score
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${mc.bar}`}
                        style={{ width: `${m.matchScore}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {m.skills.map(s => {
                        const isMatched = m.matchedSkills.some(
                          ms =>
                            ms.toLowerCase().includes(s.toLowerCase()) ||
                            s.toLowerCase().includes(ms.toLowerCase())
                        );

                        return (
                          <span
                            key={s}
                            className={`text-[11px] font-medium px-2.5 py-1 rounded-full leading-none transition-colors ${
                              isMatched && hasStructuredRequirements
                                ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {s}
                          </span>
                        );
                      })}

                      {m.structuredSkills
                        .filter(
                          ss =>
                            !m.skills.some(
                              cs =>
                                cs.toLowerCase().includes(ss.toLowerCase()) ||
                                ss.toLowerCase().includes(cs.toLowerCase())
                            )
                        )
                        .slice(0, 3)
                        .map(ss => {
                          const isMatched = m.matchedSkills.some(
                            ms =>
                              ms.toLowerCase().includes(ss.toLowerCase()) ||
                              ss.toLowerCase().includes(ms.toLowerCase())
                          );

                          return (
                            <span
                              key={ss}
                              className={`text-[11px] font-medium px-2.5 py-1 rounded-full leading-none ${
                                isMatched
                                  ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {ss}
                            </span>
                          );
                        })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                    <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                      Strengths
                    </p>
                    {strengths.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">
                        No specific strengths identified
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {strengths.map(s => (
                          <li key={s} className="flex items-start gap-1.5 text-xs text-gray-700">
                            <CheckCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div
                    className={`rounded-lg border p-3 ${
                      gaps.length === 0
                        ? 'bg-gray-50 border-gray-100'
                        : 'bg-red-50 border-red-100'
                    }`}
                  >
                    <p
                      className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${
                        gaps.length === 0 ? 'text-gray-400' : 'text-red-600'
                      }`}
                    >
                      Gaps
                    </p>
                    {gaps.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No significant gaps identified</p>
                    ) : (
                      <ul className="space-y-1">
                        {gaps.map(g => (
                          <li key={g} className="flex items-start gap-1.5 text-xs text-gray-700">
                            <XCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                            {g}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <TerrerAIReviewPanel
                    review={reviews[`${m.id}-${job.id}`] ?? null}
                    running={!!reviewRunning[`${m.id}-${job.id}`]}
                    onRun={() => runReview(m)}
                    hasExisting={!!reviews[`${m.id}-${job.id}`]}
                    canRun={canRecruit}
                  />
                </div>
              </div>

              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                  <Eye size={12} />
                  View Profile
                </button>

                {canRecruit && (
                  <button
                    onClick={() => handle(`${m.id}-${job.id}`, () => shortlist(m.id, job.id))}
                    disabled={shortlistDisabled || isBusy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      shortlistDisabled
                        ? 'bg-sky-50 text-sky-400 border-sky-200 cursor-default opacity-60'
                        : 'text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100'
                    }`}
                  >
                    <UserCheck size={12} />
                    {isBusy ? 'Saving...' : shortlistLabel}
                  </button>
                )}

                {canRecruit && (
                  <button
                    onClick={() => handleSendToBdReview(m)}
                    disabled={sendToBdReviewDisabled}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ml-auto ${
                      sendToBdReviewDisabled
                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-default'
                        : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <Send size={12} />
                    {sendToBdReviewLabel}
                  </button>
                )}

                {stage !== 'new' && !canRecruit && (
                  <span
                    className={`ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      STAGE_STYLE[stage]
                    }`}
                  >
                    {STAGE_LABEL[stage]}
                  </span>
                )}
              </div>
            </div>
          );
          })}
        </div>
      )}
      </>
      )}
    </div>
  );
}
