import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

interface WebJobInterestRow {
  id: string;
  candidate_id: string;
  job_id: string;
  job_title: string | null;
  company_name: string | null;
  interest_status: string | null;
  created_at: string | null;
}

interface CandidateRow {
  candidate_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  primary_role: string | null;
}

interface JobRow {
  id: string;
  job_title: string | null;
  company_name: string | null;
}

interface MergedInterestRow {
  id: string;
  candidateName: string;
  email: string;
  phone: string;
  candidateRole: string;
  jobTitle: string;
  companyName: string;
  interestStatus: string;
  createdAt: string | null;
}

function formatDate(value: string | null) {
  if (!value) return 'Date unavailable';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';

  return parsed.toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function InterestedCandidates() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MergedInterestRow[]>([]);

  useEffect(() => {
    let active = true;

    async function loadInterestedCandidates() {
      try {
        setLoading(true);
        setError(null);

        const { data: interestRows, error: interestError } = await supabase
          .from('web_job_interest')
          .select('id, candidate_id, job_id, job_title, company_name, interest_status, created_at')
          .order('created_at', { ascending: false });

        if (interestError) throw interestError;

        const interests = (interestRows ?? []) as WebJobInterestRow[];
        const candidateIds = [...new Set(interests.map(row => row.candidate_id).filter(Boolean))];
        const jobIds = [...new Set(interests.map(row => row.job_id).filter(Boolean))];

        let candidates: CandidateRow[] = [];
        let jobs: JobRow[] = [];

        if (candidateIds.length > 0) {
          const { data: candidateRows, error: candidatesError } = await supabase
            .from('candidates')
            .select('candidate_id, full_name, email, phone, primary_role')
            .in('candidate_id', candidateIds);

          if (candidatesError) throw candidatesError;
          candidates = (candidateRows ?? []) as CandidateRow[];
        }

        if (jobIds.length > 0) {
          const { data: jobRows, error: jobsError } = await supabase
            .from('jobs')
            .select('id, job_title, company_name')
            .in('id', jobIds);

          if (jobsError) throw jobsError;
          jobs = (jobRows ?? []) as JobRow[];
        }

        const candidateMap = new Map(candidates.map(candidate => [candidate.candidate_id, candidate]));
        const jobMap = new Map(jobs.map(job => [job.id, job]));

        const mergedRows: MergedInterestRow[] = interests.map(interest => {
          const candidate = candidateMap.get(interest.candidate_id);
          const job = jobMap.get(interest.job_id);

          return {
            id: interest.id,
            candidateName: candidate?.full_name || 'Unknown candidate',
            email: candidate?.email || 'Not provided',
            phone: candidate?.phone || 'Not provided',
            candidateRole: candidate?.primary_role || 'Role not provided',
            jobTitle: interest.job_title || job?.job_title || 'Job title unavailable',
            companyName: interest.company_name || job?.company_name || 'Company unavailable',
            interestStatus: interest.interest_status || 'interested',
            createdAt: interest.created_at,
          };
        });

        if (!active) return;
        setRows(mergedRows);
      } catch (loadError) {
        console.error('[InterestedCandidates] failed to load web job interests', loadError);
        if (!active) return;
        setError('Unable to load interested candidates right now.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInterestedCandidates();

    return () => {
      active = false;
    };
  }, []);

  const totalCount = useMemo(() => rows.length, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          Interested Candidates
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Candidate interest captured from Terrer Web matched jobs flow.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {totalCount} interest{totalCount === 1 ? '' : 's'} recorded
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-sm text-gray-500 shadow-sm">
          Loading...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-sm text-gray-500 shadow-sm">
          No job interests yet
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Candidate Name
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Email
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Phone
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Candidate Role
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Job Title
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Company Name
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Interest Status
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(row => (
                  <tr key={row.id} className="align-top hover:bg-gray-50/70">
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">{row.candidateName}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{row.email}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{row.phone}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{row.candidateRole}</td>
                    <td className="px-5 py-4 text-sm text-gray-900">{row.jobTitle}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{row.companyName}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                        {row.interestStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
