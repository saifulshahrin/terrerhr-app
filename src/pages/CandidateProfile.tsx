import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Briefcase, Mail, MapPin, Phone, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchCandidatesByIds } from '../lib/candidates';
import { getJobById } from '../lib/jobs';
import type { Candidate, SubmissionStage } from '../store/types';

type SubmissionRow = {
  id: string;
  candidate_id: string;
  job_id: string;
  submission_stage: SubmissionStage;
  created_at: string;
};

type CandidateDetailsRow = {
  candidate_id: string;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
};

interface Props {
  candidateId?: string;
  jobId?: string;
  onNavigate: (page: string, jobId?: string, sourcingContext?: { jobId?: string; role: string; skills: string[] }) => void;
}

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

export default function CandidateProfile({ candidateId, jobId, onNavigate }: Props) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [candidateDetails, setCandidateDetails] = useState<CandidateDetailsRow | null>(null);
  const [submission, setSubmission] = useState<SubmissionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const job = useMemo(() => {
    if (!jobId) return null;
    try {
      return getJobById(jobId);
    } catch {
      return null;
    }
  }, [jobId]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      if (!candidateId) {
        setCandidate(null);
        setCandidateDetails(null);
        setSubmission(null);
        setLoading(false);
        return;
      }

      try {
        const [candidateRow] = await fetchCandidatesByIds([candidateId]);
        if (!alive) return;
        setCandidate(candidateRow ?? null);

        // Best-effort: these fields may not exist depending on the current Supabase shape.
        try {
          const { data, error: detailsError } = await supabase
            .from('candidates')
            .select('candidate_id,email,phone,linkedin_url,github_url')
            .eq('candidate_id', candidateId)
            .maybeSingle();

          if (!alive) return;
          if (!detailsError) {
            setCandidateDetails((data as CandidateDetailsRow) ?? null);
          }
        } catch {
          // Ignore candidate detail lookup errors; profile should still render.
        }

        try {
          let query = supabase
            .from('submissions')
            .select('id,candidate_id,job_id,submission_stage,created_at')
            .eq('candidate_id', candidateId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (jobId) {
            query = query.eq('job_id', jobId);
          }

          const { data: submissionRow, error: submissionError } = await query;
          if (!alive) return;
          if (!submissionError) {
            setSubmission(((submissionRow ?? [])[0] as SubmissionRow) ?? null);
          }
        } catch {
          // Ignore submission lookup errors; profile should still render.
        }
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load candidate profile');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [candidateId, jobId]);

  const contactEmail = candidate?.email ?? candidateDetails?.email ?? null;
  const contactPhone = candidate?.phone ?? candidateDetails?.phone ?? null;

  return (
    <div className="max-w-5xl">
      <div className="mb-5 flex items-center gap-3 border-b border-slate-200/70 pb-4">
        <button
          type="button"
          onClick={() => onNavigate('top-matches', jobId)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Back to Top Matches
        </button>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Candidate Profile</p>
          <h1 className="truncate text-[1.45rem] font-semibold tracking-tight text-slate-950">
            {candidate?.name ?? (candidateId ? 'Loading candidate…' : 'No candidate selected')}
          </h1>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          Failed to load candidate profile: {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm shadow-slate-200/40 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">{candidate?.name ?? 'Unknown Candidate'}</p>
              <p className="mt-1 text-sm text-slate-600">{candidate?.role ?? 'Unknown Role'}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <User size={14} />
              {candidate?.company ?? 'Unknown Source'}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <MapPin size={16} className="text-gray-500" />
              <span className="truncate">{candidate?.location ?? 'Unknown Location'}</span>
            </div>

            {(contactEmail || contactPhone) ? (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {contactEmail ? <Mail size={16} className="text-gray-500" /> : <Phone size={16} className="text-gray-500" />}
                <span className="truncate">{contactEmail ?? contactPhone}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                <Phone size={16} className="text-gray-400" />
                <span className="truncate">No contact details available</span>
              </div>
            )}
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Skills</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(candidate?.skills ?? []).length > 0 ? (
                (candidate?.skills ?? []).map(skill => (
                  <span
                    key={skill}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500">No skills captured yet.</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm shadow-slate-200/40">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Job Context</p>
          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3">
            {job ? (
              <>
                <p className="text-sm font-semibold text-gray-900">{job.job_title}</p>
                <p className="mt-1 text-sm text-gray-600">{job.company_name}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <Briefcase size={14} />
                  <span className="truncate">{job.location}</span>
                </div>
              </>
            ) : jobId ? (
              <p className="text-sm text-gray-600">Job selected: {jobId}</p>
            ) : (
              <p className="text-sm text-gray-600">No job context selected.</p>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Submission Stage</p>
            <p className="mt-2 text-sm text-gray-800">
              {submission?.submission_stage ? (STAGE_LABEL[submission.submission_stage] ?? submission.submission_stage) : (loading ? 'Loading…' : 'No submission yet')}
            </p>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            {loading ? 'Loading candidate profile…' : 'Review details and take action back in Top Matches.'}
          </p>
        </section>
      </div>
    </div>
  );
}
