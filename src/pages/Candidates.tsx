import { useEffect, useState } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { fetchCandidatesForUI } from '../lib/candidates';
import { useStore } from '../store/StoreContext';
import type { Candidate, SubmissionStage } from '../store/types';

const stageConfig: Record<SubmissionStage, { label: string; style: string }> = {
  new:                 { label: 'New',        style: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200' },
  shortlisted:         { label: 'Shortlisted', style: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
  ready_for_bd_review: { label: 'BD Review',  style: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
  submitted_to_client: { label: 'Submitted',  style: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  interview:           { label: 'Interview',  style: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  offer:               { label: 'Offer',      style: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  rejected:            { label: 'Rejected',   style: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  hold:                { label: 'Hold',       style: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200' },
  hired:               { label: 'Hired',      style: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
};

const avatarColors: string[] = [
  'bg-blue-100 text-blue-700',
  'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
];

const scoreRing = (s: number) =>
  s >= 90 ? 'text-emerald-600' : s >= 80 ? 'text-sky-600' : s >= 70 ? 'text-amber-600' : 'text-gray-400';

const scoreBg = (s: number) =>
  s >= 90 ? 'bg-emerald-50 ring-1 ring-emerald-200' : s >= 80 ? 'bg-sky-50 ring-1 ring-sky-200' : s >= 70 ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-gray-50 ring-1 ring-gray-200';

const initials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase();

interface Props {
  sourcingContext?: {
    role: string;
    skills: string[];
  };
}

export default function Candidates({ sourcingContext }: Props) {
  const { getStage } = useStore();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadCandidates() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCandidatesForUI();

        if (!active) return;
        setCandidates(data);
      } catch (loadError) {
        console.error('[Candidates] fetchCandidatesForUI error:', loadError);
        if (!active) return;
        setError('Unable to load candidates right now.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCandidates();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Candidates</h1>
          <p className="text-sm text-gray-500 mt-1">{candidates.length} candidates across all jobs</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          + Add Candidate
        </button>
      </div>

      {sourcingContext && (
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
            Candidate Sourcing
          </p>
          <p className="text-sm text-blue-900 mt-1">
            Sourcing candidates for: <span className="font-semibold">{sourcingContext.role}</span>
          </p>
          {sourcingContext.skills.length > 0 && (
            <p className="text-xs text-blue-700 mt-2">
              Key skills: {sourcingContext.skills.join(', ')}
            </p>
          )}
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
          Loading candidates...
        </div>
      )}

      {error && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {candidates.map((c, i) => {
          const stage = stageConfig[getStage(c.id)];
          return (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all duration-150 cursor-pointer group"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 select-none ${avatarColors[i % avatarColors.length]}`}>
                  {initials(c.name)}
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[15px] font-semibold text-gray-900 leading-snug truncate">{c.name}</p>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{c.role}</p>
                  <p className="text-xs text-gray-400 truncate">{c.company}</p>
                </div>

                <div className={`flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl ${scoreBg(c.score)}`}>
                  <p className={`text-base font-bold leading-none ${scoreRing(c.score)}`}>{c.score}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-none">score</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {c.skills.map(s => (
                  <span
                    key={s}
                    className="text-[11px] font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full leading-none"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${stage.style}`}>
                  {stage.label}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin size={11} className="text-gray-300" />
                  {c.location}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={11} className="text-gray-300" />
                  {c.applied}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
