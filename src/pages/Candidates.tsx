import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MapPin, Clock, X } from 'lucide-react';
import {
  CANDIDATE_SOURCES,
  createCandidateFromIntake,
  detectCandidateSourceFromUrl,
  extractCandidateNameFallback,
  fetchCandidatesForUI,
  type CandidateSource,
} from '../lib/candidates';
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

type RoleFilter = 'All' | 'Software Engineer' | 'Frontend' | 'Data' | 'Product';

const ROLE_FILTERS: RoleFilter[] = ['All', 'Software Engineer', 'Frontend', 'Data', 'Product'];

function getRoleFilter(value: string | null | undefined): RoleFilter {
  const role = (value ?? '').toLowerCase();

  if (role.includes('frontend') || role.includes('front end') || role.includes('ui developer')) {
    return 'Frontend';
  }

  if (role.includes('data') || role.includes('analytics') || role.includes('business intelligence')) {
    return 'Data';
  }

  if (
    role.includes('product') ||
    role.includes('program manager') ||
    role.includes('technical program')
  ) {
    return 'Product';
  }

  if (
    role.includes('software') ||
    role.includes('backend') ||
    role.includes('back end') ||
    role.includes('developer') ||
    role.includes('engineer')
  ) {
    return 'Software Engineer';
  }

  return 'All';
}

interface Props {
  sourcingContext?: {
    jobId?: string;
    role: string;
    skills: string[];
  };
}

interface CandidateFormState {
  name: string;
  role: string;
  source: CandidateSource;
  sourceUrl: string;
  skills: string;
  location: string;
  notes: string;
  addAndShortlist: boolean;
}

const DEFAULT_FORM_STATE = (hasJobContext: boolean): CandidateFormState => ({
  name: '',
  role: '',
  source: 'Other',
  sourceUrl: '',
  skills: '',
  location: '',
  notes: '',
  addAndShortlist: hasJobContext,
});

export default function Candidates({ sourcingContext }: Props) {
  const { getStage, shortlist } = useStore();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All');
  const [shortlisting, setShortlisting] = useState<Record<string, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSavingCandidate, setIsSavingCandidate] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [candidateForm, setCandidateForm] = useState<CandidateFormState>(() =>
    DEFAULT_FORM_STATE(Boolean(sourcingContext?.jobId))
  );
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

  useEffect(() => {
    if (sourcingContext?.role) {
      setRoleFilter(getRoleFilter(sourcingContext.role));
    }
  }, [sourcingContext?.role]);

  const filteredCandidates = useMemo(() => {
    return candidates
      .filter(candidate => {
        if (roleFilter === 'All') return true;
        return getRoleFilter(candidate.role) === roleFilter;
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }, [candidates, roleFilter]);

  const sourcingJobId = sourcingContext?.jobId;

  useEffect(() => {
    if (!showAddModal) {
      setCandidateForm(DEFAULT_FORM_STATE(Boolean(sourcingContext?.jobId)));
      setSaveError(null);
    }
  }, [showAddModal, sourcingContext?.jobId]);

  const handleShortlistForJob = async (candidateId: string) => {
    if (!sourcingJobId) return;

    setShortlisting(prev => ({ ...prev, [candidateId]: true }));
    try {
      await shortlist(candidateId, sourcingJobId);
    } finally {
      setShortlisting(prev => ({ ...prev, [candidateId]: false }));
    }
  };

  const openAddCandidateModal = () => {
    setCandidateForm(DEFAULT_FORM_STATE(Boolean(sourcingJobId)));
    setSaveError(null);
    setShowAddModal(true);
  };

  const handleSourceUrlChange = (value: string) => {
    setCandidateForm(prev => {
      const detectedSource = detectCandidateSourceFromUrl(value);
      const nextNameFallback =
        !prev.name.trim() ? extractCandidateNameFallback(value, detectedSource) : prev.name;

      return {
        ...prev,
        sourceUrl: value,
        source: detectedSource,
        name: nextNameFallback,
      };
    });
  };

  const updateCandidateForm = <K extends keyof CandidateFormState>(
    key: K,
    value: CandidateFormState[K]
  ) => {
    setCandidateForm(prev => ({ ...prev, [key]: value }));
  };

  const handleAddCandidate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSavingCandidate(true);
    setSaveError(null);

    try {
      const createdCandidate = await createCandidateFromIntake({
        name: candidateForm.name,
        role: candidateForm.role,
        source: candidateForm.source,
        sourceUrl: candidateForm.sourceUrl,
        skillsText: candidateForm.skills,
        location: candidateForm.location,
        notes: candidateForm.notes,
      });

      if (candidateForm.addAndShortlist && sourcingJobId) {
        await shortlist(createdCandidate.id, sourcingJobId);
      }

      setCandidates(prev => [createdCandidate, ...prev.filter(candidate => candidate.id !== createdCandidate.id)]);
      setShowAddModal(false);
    } catch (saveCandidateError) {
      console.error('[Candidates] createCandidateFromIntake error:', saveCandidateError);
      setSaveError('Unable to add this candidate right now.');
    } finally {
      setIsSavingCandidate(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Candidates</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredCandidates.length} of {candidates.length} candidates shown
          </p>
        </div>
        <button
          onClick={openAddCandidateModal}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
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

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">
          Role
        </span>
        {ROLE_FILTERS.map(filter => (
          <button
            key={filter}
            onClick={() => setRoleFilter(filter)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              roleFilter === filter
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {filter}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-1">Sorted by score</span>
      </div>

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
        filteredCandidates.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
            No candidates found for this role filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredCandidates.map((c, i) => {
              const candidateStage = getStage(c.id, sourcingJobId);
              const stage = stageConfig[candidateStage];
              const isInCurrentJobFlow = !!sourcingJobId && candidateStage !== 'new';
              const isShortlisting = !!shortlisting[c.id];
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

                  {sourcingJobId && (
                    <button
                      onClick={() => handleShortlistForJob(c.id)}
                      disabled={isShortlisting || isInCurrentJobFlow}
                      className={`mt-4 w-full rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        isInCurrentJobFlow
                          ? 'bg-gray-100 text-gray-400 cursor-default'
                          : isShortlisting
                          ? 'bg-blue-50 text-blue-400 cursor-default'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isShortlisting
                        ? 'Adding...'
                        : isInCurrentJobFlow
                        ? `Already ${stage.label}`
                        : 'Shortlist for this Job'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/35 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Add Candidate</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Add a candidate manually and capture their source profile for Terrer.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close add candidate modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCandidate} className="px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Name</span>
                  <input
                    required
                    value={candidateForm.name}
                    onChange={event => updateCandidateForm('name', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Candidate name"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Role / Title</span>
                  <input
                    required
                    value={candidateForm.role}
                    onChange={event => updateCandidateForm('role', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. Backend Engineer"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Source</span>
                  <select
                    value={candidateForm.source}
                    onChange={event => updateCandidateForm('source', event.target.value as CandidateSource)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {CANDIDATE_SOURCES.map(source => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Source URL</span>
                  <input
                    required
                    value={candidateForm.sourceUrl}
                    onChange={event => handleSourceUrlChange(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Paste LinkedIn, GitHub, JobStreet, or other source URL"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Skills</span>
                  <input
                    value={candidateForm.skills}
                    onChange={event => updateCandidateForm('skills', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="React, Node.js, SQL"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Location</span>
                  <input
                    value={candidateForm.location}
                    onChange={event => updateCandidateForm('location', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Kuala Lumpur, Malaysia"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Notes</span>
                <textarea
                  value={candidateForm.notes}
                  onChange={event => updateCandidateForm('notes', event.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Optional recruiter notes"
                />
              </label>

              {sourcingJobId && (
                <label className="mt-4 flex items-start gap-3 rounded-lg bg-blue-50 px-3 py-3 text-sm text-blue-900">
                  <input
                    type="checkbox"
                    checked={candidateForm.addAndShortlist}
                    onChange={event => updateCandidateForm('addAndShortlist', event.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Add and shortlist this candidate to the current sourcing job
                  </span>
                </label>
              )}

              {saveError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </div>
              )}

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCandidate}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
                    isSavingCandidate ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSavingCandidate ? 'Saving...' : 'Add Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
