import { useState, useEffect, useMemo } from 'react';
import { CheckCircle, XCircle, UserCheck, Send, Eye, MapPin, Briefcase, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/StoreContext';
import { useRole } from '../store/RoleContext';
import type { Candidate } from '../store/types';
import type { SubmissionStage } from '../store/types';
import { generateTerrerAIReview } from '../lib/terrerAI';
import type { TerrerAIReview } from '../lib/terrerAI';
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

interface Job {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  status: string;
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

interface Props {
  jobId?: string;
  onNavigate: (page: string, jobId?: string) => void;
}

const avatarColors: string[] = [
  'bg-teal-100 text-teal-700',
  'bg-blue-100 text-blue-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-cyan-100 text-cyan-700',
  'bg-green-100 text-green-700',
];

const STAGE_LABEL: Record<SubmissionStage, string> = {
  new:                  'New',
  shortlisted:          'Shortlisted',
  ready_for_bd_review:  'BD Review',
  submitted_to_client:  'Submitted',
  interview:            'Interview',
  offer:                'Offer',
};

const STAGE_STYLE: Record<SubmissionStage, string> = {
  new:                  'bg-gray-100 text-gray-500',
  shortlisted:          'bg-sky-50 text-sky-700',
  ready_for_bd_review:  'bg-violet-50 text-violet-700',
  submitted_to_client:  'bg-yellow-50 text-yellow-700',
  interview:            'bg-amber-50 text-amber-700',
  offer:                'bg-emerald-50 text-emerald-700',
};

const matchConfig = (score: number) => {
  if (score >= 90) return { bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' };
  if (score >= 75) return { bar: 'bg-sky-500',     text: 'text-sky-600',     bg: 'bg-sky-50',     ring: 'ring-sky-200' };
  return               { bar: 'bg-amber-400',      text: 'text-amber-600',   bg: 'bg-amber-50',   ring: 'ring-amber-200' };
};

const initials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase();

function looseMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const wordsA = normalize(a).split(/\s+/).filter(w => w.length > 2);
  const wordsB = normalize(b).split(/\s+/).filter(w => w.length > 2);
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

export default function TopMatches({ jobId, onNavigate }: Props) {
  const { candidates, getStage, shortlist, sendToBdReview } = useStore();
  const { role } = useRole();
  const canRecruit = role === 'recruiter' || role === 'admin' || role === null;
  const [job, setJob] = useState<Job | null>(null);
  const [loadingJob, setLoadingJob] = useState(!!jobId);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [reviews, setReviews] = useState<Record<string, TerrerAIReview>>({});
  const [reviewRunning, setReviewRunning] = useState<Record<string, boolean>>({});
  const [jobRequirements, setJobRequirements] = useState<JobRequirementRow[]>([]);
  const [skillMap, setSkillMap] = useState<Map<string, string[]>>(new Map());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCandidate, setModalCandidate] = useState<RankedCandidate | null>(null);
  const [modalOutput, setModalOutput] = useState<SubmissionOutput | null>(null);
  const [modalSending, setModalSending] = useState(false);

  useEffect(() => {
    setJob(null);
    setReviews({});
    setJobRequirements([]);
    setSkillMap(new Map());

    if (!jobId) {
      setLoadingJob(false);
      return;
    }
    setLoadingJob(true);

    const candidateIds = candidates.map(c => c.id);

    Promise.all([
      supabase
        .from('jobs')
        .select('id, job_title, company_name, location, status')
        .eq('id', jobId)
        .maybeSingle(),
      fetchAssessmentsForJob(jobId),
      fetchJobRequirements(jobId),
      fetchCandidateSkills(candidateIds),
    ]).then(([{ data, error }, assessments, requirements, skillRows]) => {
      if (!error && data && (data as Job).id === jobId) setJob(data as Job);

      const loaded: Record<string, TerrerAIReview> = {};
      for (const row of assessments) {
        const key = `${row.candidate_id}-${row.job_id}`;
        loaded[key] = rowToReview(row);
      }
      setReviews(loaded);
      setJobRequirements(requirements);
      setSkillMap(buildCandidateSkillMap(skillRows));
      setLoadingJob(false);
    });
  }, [jobId, candidates]);

  const ranked = useMemo<RankedCandidate[]>(() => {
    if (!job) return [];
    return rankCandidates(candidates, job, jobRequirements, skillMap);
  }, [candidates, job, jobRequirements, skillMap]);

  const handle = async (key: string, fn: () => Promise<void>) => {
    setBusy(b => ({ ...b, [key]: true }));
    try { await fn(); } catch (err) { console.error('[TopMatches]', key, err); }
    finally { setBusy(b => ({ ...b, [key]: false })); }
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
      await sendToBdReview(modalCandidate.id, job.id, modalOutput, notes);
      setModalOpen(false);
    } catch (err) {
      console.error('[TopMatches] sendToBdReview error', err);
    } finally {
      setModalSending(false);
    }
  };

  const runReview = (candidate: RankedCandidate) => {
    if (!job) return;
    const key = `${candidate.id}-${job.id}`;
    setReviewRunning(r => ({ ...r, [key]: true }));
    setTimeout(async () => {
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
      setReviewRunning(r => ({ ...r, [key]: false }));
    }, 1200);
  };

  if (loadingJob) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div>
        <div className="mb-7">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Top Matches</h1>
          <p className="text-sm text-gray-500 mt-1">Select a job from the Jobs page to view ranked candidates.</p>
        </div>
        <button
          onClick={() => onNavigate('jobs')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={14} />
          Go to Jobs
        </button>
      </div>
    );
  }

  const hasStructuredRequirements = jobRequirements.length > 0;

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
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Top Matches for</p>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight leading-snug">{job.job_title}</h1>
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
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${job.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {job.status}
          </span>
          {hasStructuredRequirements && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
              {jobRequirements.length} requirements loaded
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3">{ranked.length} candidates ranked by fit score</p>
      </div>

      <SubmissionModal
        open={modalOpen}
        candidate={modalCandidate}
        job={job}
        output={modalOutput}
        onClose={() => setModalOpen(false)}
        onSend={handleModalSend}
        sending={modalSending}
      />

      <div className="space-y-4">
        {ranked.map((m, i) => {
          const mc = matchConfig(m.matchScore);
          const stage = getStage(m.id, job.id);
          const isShortlisted = stage === 'shortlisted';
          const isSentToBd = stage === 'ready_for_bd_review';
          const isSubmitted = stage === 'submitted_to_client';
          const isAdvanced = stage === 'interview' || stage === 'offer';
          const isBusy = !!busy[`${m.id}-${job.id}`];

          const strengths: string[] = [];
          const gaps: string[] = [];

          if (m.roleMatch) strengths.push(`Role matches "${job.job_title}"`);
          if (m.locationMatch) strengths.push(`Location matches "${job.location}"`);
          if (m.score >= 90) strengths.push('High overall candidate score');
          else if (m.score >= 80) strengths.push('Strong overall candidate score');

          if (m.matchedSkills.length > 0) {
            strengths.push(`Skills matched: ${m.matchedSkills.slice(0, 3).join(', ')}${m.matchedSkills.length > 3 ? ` +${m.matchedSkills.length - 3} more` : ''}`);
          }

          if (!m.roleMatch) gaps.push('Role title differs from job requirement');
          if (!m.locationMatch) gaps.push('Location may require relocation');
          if (m.missingSkills.length > 0) {
            gaps.push(`Missing required skills: ${m.missingSkills.slice(0, 3).join(', ')}${m.missingSkills.length > 3 ? ` +${m.missingSkills.length - 3} more` : ''}`);
          }

          return (
            <div
              key={`${m.id}-${job.id}`}
              className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-150 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300 w-4 text-right tabular-nums">{i + 1}</span>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold select-none ${avatarColors[i % avatarColors.length]}`}>
                      {initials(m.name)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-gray-900 leading-snug">{m.name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{m.role} &middot; {m.location}</p>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {stage !== 'new' && (
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STAGE_STYLE[stage]}`}>
                            {STAGE_LABEL[stage]}
                          </span>
                        )}
                        <div className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl ring-1 ${mc.bg} ${mc.ring}`}>
                          <p className={`text-xl font-bold leading-none ${mc.text}`}>{m.matchScore}</p>
                          <p className="text-[10px] text-gray-400 mt-1 leading-none font-medium">score</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${mc.bar}`} style={{ width: `${m.matchScore}%` }} />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {m.skills.map(s => {
                        const isMatched = m.matchedSkills.some(ms =>
                          ms.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(ms.toLowerCase())
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
                        .filter(ss => !m.skills.some(cs =>
                          cs.toLowerCase().includes(ss.toLowerCase()) || ss.toLowerCase().includes(cs.toLowerCase())
                        ))
                        .slice(0, 3)
                        .map(ss => {
                          const isMatched = m.matchedSkills.some(ms =>
                            ms.toLowerCase().includes(ss.toLowerCase()) || ss.toLowerCase().includes(ms.toLowerCase())
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
                    <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Strengths</p>
                    {strengths.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No specific strengths identified</p>
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

                  <div className={`rounded-lg border p-3 ${gaps.length === 0 ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-100'}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${gaps.length === 0 ? 'text-gray-400' : 'text-red-600'}`}>
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
                    disabled={isShortlisted || isBusy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      isShortlisted
                        ? 'bg-sky-50 text-sky-400 border-sky-200 cursor-default opacity-60'
                        : 'text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100'
                    }`}
                  >
                    <UserCheck size={12} />
                    {isShortlisted ? 'Shortlisted' : isBusy ? 'Saving...' : 'Shortlist'}
                  </button>
                )}
                {canRecruit && (
                  <button
                    onClick={() => handleSendToBdReview(m)}
                    disabled={isSentToBd || isSubmitted || isAdvanced}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ml-auto ${
                      isSentToBd || isSubmitted || isAdvanced
                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-default'
                        : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <Send size={12} />
                    {isSentToBd ? 'Sent to BD Review' : isSubmitted ? 'Submitted to Client' : isAdvanced ? 'Advanced' : 'Send to BD Review'}
                  </button>
                )}
                {stage !== 'new' && !canRecruit && (
                  <span className={`ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-full ${STAGE_STYLE[stage]}`}>
                    {STAGE_LABEL[stage]}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
