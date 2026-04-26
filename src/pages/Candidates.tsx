import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import { MapPin, X } from 'lucide-react';
import {
  CANDIDATE_SOURCES,
  createCandidateFromIntake,
  detectCandidateSourceFromUrl,
  extractCandidateNameFallback,
  fetchCandidatesForUI,
  type CandidateSource,
} from '../lib/candidates';
import {
  mergeCandidateParseOutputs,
  parseCandidateResumeText,
  refineCandidateWithAI,
  shouldRefineCandidateWithAI,
} from '../lib/candidateIntakeParser';
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
  resumeText: string;
  skills: string;
  location: string;
  notes: string;
  addAndShortlist: boolean;
}

type IntakeMode = 'linkedin' | 'resume';
type SuggestionMode = 'rule' | 'ai';
type JobOption = {
  id: string;
  label: string;
  role: string;
};

type MockJobRequirement = {
  title: string;
  preferredSkills: string[];
  preferredLocation: string;
  preferredRoleKeywords: string[];
};

type CandidateJobFit = {
  score: number;
  label: 'Strong Fit' | 'Moderate Fit' | 'Weak Fit';
  reasons: string[];
};

type CandidateRowView = {
  candidate: Candidate;
  stage: SubmissionStage;
  isInCurrentJobFlow: boolean;
  isShortlisting: boolean;
  isAddedToSelectedJob: boolean;
  cardMessage?: string;
  jobFit: CandidateJobFit | null;
};

type PipelineEntry = {
  jobId: string;
  candidateId: string;
  stage: 'identified';
};

const MOCK_JOB_OPTIONS: JobOption[] = [
  { id: 'mock-backend', label: 'Backend Engineer - Terrer (Kuala Lumpur)', role: 'Software Engineer' },
  { id: 'mock-frontend', label: 'Frontend Engineer - Fintech Co (Hybrid)', role: 'Frontend' },
  { id: 'mock-data', label: 'Data Analyst - Retail Group (Selangor)', role: 'Data' },
  { id: 'mock-product', label: 'Product Manager - SaaS Startup (Remote)', role: 'Product' },
];

const MOCK_JOB_REQUIREMENTS: Record<string, MockJobRequirement> = {
  'mock-backend': {
    title: 'Backend Engineer',
    preferredSkills: ['Python', 'Node.js', 'SQL', 'PostgreSQL', 'AWS'],
    preferredLocation: 'Kuala Lumpur',
    preferredRoleKeywords: ['backend', 'software engineer', 'developer', 'api'],
  },
  'mock-frontend': {
    title: 'Frontend Engineer',
    preferredSkills: ['React', 'TypeScript', 'JavaScript', 'UI Design', 'Figma'],
    preferredLocation: 'Hybrid',
    preferredRoleKeywords: ['frontend', 'ui', 'front end', 'web'],
  },
  'mock-data': {
    title: 'Data Analyst',
    preferredSkills: ['SQL', 'Python', 'Power BI', 'Tableau', 'Excel'],
    preferredLocation: 'Selangor',
    preferredRoleKeywords: ['data', 'analytics', 'business intelligence', 'analyst'],
  },
  'mock-product': {
    title: 'Product Manager',
    preferredSkills: ['Product Strategy', 'Project Management', 'SQL', 'Figma'],
    preferredLocation: 'Remote',
    preferredRoleKeywords: ['product', 'program manager', 'technical program', 'pm'],
  },
};

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

function getCandidateJobFit(candidate: Candidate, requirement: MockJobRequirement | null): CandidateJobFit | null {
  if (!requirement) return null;

  const roleText = normalizeValue(candidate.role);
  const locationText = normalizeValue(candidate.location);
  const candidateSkills = candidate.skills.map(skill => skill.trim());
  const normalizedSkills = candidateSkills.map(normalizeValue);
  const reasons: string[] = [];
  let score = 20;

  const matchedSkills = requirement.preferredSkills.filter(skill =>
    normalizedSkills.includes(normalizeValue(skill))
  );

  if (matchedSkills.length > 0) {
    score += Math.min(45, matchedSkills.length * 15);
    reasons.push(`Matches ${matchedSkills.slice(0, 2).join(' and ')}`);
  }

  const matchedRoleKeyword = requirement.preferredRoleKeywords.find(keyword =>
    roleText.includes(normalizeValue(keyword))
  );

  if (matchedRoleKeyword) {
    score += 25;
    reasons.push(`${requirement.title} role alignment`);
  }

  const normalizedPreferredLocation = normalizeValue(requirement.preferredLocation);
  if (
    normalizedPreferredLocation === 'remote' ||
    normalizedPreferredLocation === 'hybrid' ||
    locationText.includes(normalizedPreferredLocation)
  ) {
    score += 10;
    reasons.push(
      normalizedPreferredLocation === 'remote'
        ? 'Open to remote-style role'
        : `Based in ${requirement.preferredLocation}`
    );
  }

  const cappedScore = Math.max(0, Math.min(100, score));
  const label =
    cappedScore >= 80 ? 'Strong Fit' : cappedScore >= 55 ? 'Moderate Fit' : 'Weak Fit';

  return {
    score: cappedScore,
    label,
    reasons: reasons.slice(0, 3),
  };
}

function getFitToneClasses(label: CandidateJobFit['label'] | null): string {
  if (label === 'Strong Fit') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (label === 'Moderate Fit') return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  if (label === 'Weak Fit') return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200';
  return 'bg-sky-50 text-sky-700 ring-1 ring-sky-200';
}

const DEFAULT_FORM_STATE = (hasJobContext: boolean): CandidateFormState => ({
  name: '',
  role: '',
  source: 'Other',
  sourceUrl: '',
  resumeText: '',
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
  const [pipelineEntries, setPipelineEntries] = useState<PipelineEntry[]>([]);
  const [cardMessageMap, setCardMessageMap] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSavingCandidate, setIsSavingCandidate] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [intakeMode, setIntakeMode] = useState<IntakeMode>('linkedin');
  const [suggestionMode, setSuggestionMode] = useState<SuggestionMode>('rule');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string>(sourcingContext?.jobId ?? '');
  const [suggestedFields, setSuggestedFields] = useState<Partial<Record<'name' | 'role' | 'skills' | 'location' | 'notes', boolean>>>({});
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof CandidateFormState, boolean>>>({});
  const resumeParseTimeoutRef = useRef<number | null>(null);
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

  useEffect(() => {
    if (sourcingContext?.jobId) {
      setSelectedJobId(sourcingContext.jobId);
    }
  }, [sourcingContext?.jobId]);

  const jobOptions = useMemo(() => {
    const options = [...MOCK_JOB_OPTIONS];

    if (sourcingContext?.jobId && sourcingContext.role) {
      options.unshift({
        id: sourcingContext.jobId,
        label: `${sourcingContext.role} - Current sourcing job`,
        role: sourcingContext.role,
      });
    }

    return options.filter(
      (option, index, list) => list.findIndex(candidate => candidate.id === option.id) === index
    );
  }, [sourcingContext?.jobId, sourcingContext?.role]);

  const selectedJob = useMemo(
    () => jobOptions.find(option => option.id === selectedJobId) ?? null,
    [jobOptions, selectedJobId]
  );

  const selectedJobRequirement = useMemo(() => {
    if (selectedJobId && MOCK_JOB_REQUIREMENTS[selectedJobId]) {
      return MOCK_JOB_REQUIREMENTS[selectedJobId];
    }

    if (sourcingContext?.jobId && selectedJobId === sourcingContext.jobId) {
      return {
        title: sourcingContext.role,
        preferredSkills: sourcingContext.skills,
        preferredLocation: '',
        preferredRoleKeywords: sourcingContext.role
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean),
      };
    }

    return null;
  }, [selectedJobId, sourcingContext?.jobId, sourcingContext?.role, sourcingContext?.skills]);

  const filteredCandidates = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return candidates
      .filter(candidate => {
        if (roleFilter === 'All') return true;
        return getRoleFilter(candidate.role) === roleFilter;
      })
      .filter(candidate => {
        if (!normalizedSearch) return true;

        const haystack = [
          candidate.name,
          candidate.role,
          candidate.location,
          ...candidate.skills,
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => {
        if (selectedJobRequirement) {
          const fitA = getCandidateJobFit(a, selectedJobRequirement);
          const fitB = getCandidateJobFit(b, selectedJobRequirement);
          const scoreDiff = (fitB?.score ?? 0) - (fitA?.score ?? 0);

          if (scoreDiff !== 0) return scoreDiff;
        }

        return b.score - a.score || a.name.localeCompare(b.name);
      });
  }, [candidates, roleFilter, searchQuery, selectedJobRequirement]);

  const sourcingJobId = sourcingContext?.jobId;

  const candidateRows = useMemo<CandidateRowView[]>(
    () =>
      filteredCandidates.map(candidate => {
        const stage = getStage(candidate.id, sourcingJobId);
        const pipelineEntry = selectedJobId
          ? pipelineEntries.find(
              entry => entry.jobId === selectedJobId && entry.candidateId === candidate.id
            )
          : null;

        return {
          candidate,
          stage,
          isInCurrentJobFlow: !!sourcingJobId && stage !== 'new',
          isShortlisting: !!shortlisting[candidate.id],
          isAddedToSelectedJob: !!pipelineEntry,
          cardMessage: pipelineEntry ? `Added to job · ${pipelineEntry.stage}` : cardMessageMap[candidate.id],
          jobFit: getCandidateJobFit(candidate, selectedJobRequirement),
        };
      }),
    [
      cardMessageMap,
      filteredCandidates,
      getStage,
      pipelineEntries,
      selectedJobId,
      selectedJobRequirement,
      shortlisting,
      sourcingJobId,
    ]
  );

  const suggestedCandidates = useMemo(
    () => (selectedJobRequirement ? candidateRows.slice(0, 6) : []),
    [candidateRows, selectedJobRequirement]
  );

  useEffect(() => {
    if (!showAddModal) {
      setCandidateForm(DEFAULT_FORM_STATE(Boolean(sourcingContext?.jobId)));
      setSaveError(null);
      setSuggestedFields({});
      setTouchedFields({});
      setIntakeMode('linkedin');
      setSuggestionMode('rule');
      if (resumeParseTimeoutRef.current) {
        window.clearTimeout(resumeParseTimeoutRef.current);
        resumeParseTimeoutRef.current = null;
      }
    }
  }, [showAddModal, sourcingContext?.jobId]);

  useEffect(() => {
    return () => {
      if (resumeParseTimeoutRef.current) {
        window.clearTimeout(resumeParseTimeoutRef.current);
      }
    };
  }, []);

  const handleShortlistForJob = async (candidateId: string) => {
    if (!sourcingJobId) return;

    setShortlisting(prev => ({ ...prev, [candidateId]: true }));
    try {
      await shortlist(candidateId, sourcingJobId);
    } finally {
      setShortlisting(prev => ({ ...prev, [candidateId]: false }));
    }
  };

  const handleViewProfile = (candidate: Candidate) => {
    const profileUrl = candidate.linkedin || candidate.github;

    if (!profileUrl) {
      window.alert('Profile URL is not available for this candidate yet.');
      return;
    }

    window.open(profileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAddToJob = (candidateId: string) => {
    if (!selectedJobId) {
      window.alert('Please select a job first');
      return;
    }

    const alreadyInPipeline = pipelineEntries.some(
      entry => entry.jobId === selectedJobId && entry.candidateId === candidateId
    );

    if (alreadyInPipeline) {
      setCardMessageMap(prev => ({ ...prev, [candidateId]: 'Already added' }));
      return;
    }

    setPipelineEntries(prev => [
      ...prev,
      {
        jobId: selectedJobId,
        candidateId,
        stage: 'identified',
      },
    ]);
    setCardMessageMap(prev => ({ ...prev, [candidateId]: 'Added to selected job' }));
  };

  const openAddCandidateModal = () => {
    setCandidateForm(DEFAULT_FORM_STATE(Boolean(sourcingJobId)));
    setSaveError(null);
    setSuggestedFields({});
    setTouchedFields({});
    setIntakeMode('linkedin');
    setSuggestionMode('rule');
    setShowAddModal(true);
  };

  const handleSourceUrlChange = (value: string) => {
    setCandidateForm(prev => {
      const detectedSource = detectCandidateSourceFromUrl(value);
      const nextNameFallback =
        !prev.name.trim() && !touchedFields.name
          ? extractCandidateNameFallback(value, detectedSource)
          : prev.name;

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
    setTouchedFields(prev => ({ ...prev, [key]: true }));
    setCandidateForm(prev => ({ ...prev, [key]: value }));
  };

  const applyResumeSuggestions = async (rawText: string) => {
    const ruleOutput = parseCandidateResumeText(rawText);
    let finalOutput = ruleOutput;
    let usedAI = false;

    if (shouldRefineCandidateWithAI(rawText, ruleOutput)) {
      const aiOutput = await refineCandidateWithAI(rawText);
      finalOutput = mergeCandidateParseOutputs(ruleOutput, aiOutput);
      usedAI = Boolean(aiOutput);
    }

    setCandidateForm(prev => {
      const nextState: CandidateFormState = {
        ...prev,
        resumeText: rawText,
        source: prev.source,
      };

      if (!touchedFields.name && !prev.name.trim() && finalOutput.name) {
        nextState.name = finalOutput.name;
      }

      if (!touchedFields.role && !prev.role.trim() && finalOutput.role) {
        nextState.role = finalOutput.role;
      }

      if (!touchedFields.skills && !prev.skills.trim() && finalOutput.skills.length > 0) {
        nextState.skills = finalOutput.skills.join(', ');
      }

      if (!touchedFields.location && !prev.location.trim() && finalOutput.location) {
        nextState.location = finalOutput.location;
      }

      if (!touchedFields.notes && !prev.notes.trim() && finalOutput.notes) {
        nextState.notes = finalOutput.notes;
      }

      return nextState;
    });

    setSuggestionMode(usedAI ? 'ai' : 'rule');
    setSuggestedFields({
      name: Boolean(finalOutput.name),
      role: Boolean(finalOutput.role),
      skills: finalOutput.skills.length > 0,
      location: Boolean(finalOutput.location),
      notes: Boolean(finalOutput.notes),
    });
  };

  const handleResumePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = event.clipboardData.getData('text');
    const target = event.currentTarget;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const nextText = `${target.value.slice(0, start)}${pastedText}${target.value.slice(end)}`;

    if (resumeParseTimeoutRef.current) {
      window.clearTimeout(resumeParseTimeoutRef.current);
    }

    resumeParseTimeoutRef.current = window.setTimeout(() => {
      void applyResumeSuggestions(nextText);
    }, 650);
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

  const renderActionButtons = (row: CandidateRowView, compact = false) => (
    <div className={`flex ${compact ? 'flex-col' : 'gap-2'} ${compact ? 'gap-2' : ''}`}>
      <button
        type="button"
        onClick={() => handleAddToJob(row.candidate.id)}
        disabled={row.isAddedToSelectedJob}
        className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
          row.isAddedToSelectedJob
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {row.isAddedToSelectedJob ? 'Added' : 'Add to Job'}
      </button>
      <button
        type="button"
        onClick={() => handleViewProfile(row.candidate)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
      >
        View
      </button>
    </div>
  );

  const renderSuggestedCard = (row: CandidateRowView, index: number) => {
    const { candidate, jobFit, cardMessage } = row;

    return (
      <div
        key={candidate.id}
        className="rounded-2xl border border-white/70 bg-white/95 p-4 shadow-sm ring-1 ring-slate-200/70 transition-all duration-150 hover:border-slate-200 hover:shadow-md"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white/95">
            Top Match
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${jobFit ? getFitToneClasses(jobFit.label) : getFitToneClasses(null)}`}>
            {jobFit ? `${jobFit.score}% · ${jobFit.label}` : `Score ${candidate.score}`}
          </span>
        </div>

        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 flex-shrink-0 select-none items-center justify-center rounded-full text-sm font-bold ${avatarColors[index % avatarColors.length]}`}
          >
            {initials(candidate.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-slate-900">{candidate.name}</p>
            <p className="mt-0.5 truncate text-sm text-slate-600">{candidate.role}</p>
            <p className="mt-1 text-xs font-medium text-slate-400">{candidate.location}</p>
          </div>
        </div>

        {jobFit && jobFit.reasons.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {jobFit.reasons.map(reason => (
              <p
                key={reason}
                className="text-xs font-medium text-slate-700"
              >
                <span className="mr-1.5 text-emerald-600">✓</span>
                {reason}
              </p>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {candidate.skills.slice(0, 4).map(skill => (
            <span
              key={skill}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
            >
              {skill}
            </span>
          ))}
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3">
          {renderActionButtons(row, false)}
          {cardMessage && <p className="mt-2 text-xs font-medium text-emerald-600">{cardMessage}</p>}
        </div>
      </div>
    );
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

      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr),280px]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Search Candidates
            </span>
            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Search by name, role, skills, or location"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Job Context
            </span>
            <select
              value={selectedJobId}
              onChange={event => setSelectedJobId(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">No job selected</option>
              {jobOptions.map(job => (
                <option key={job.id} value={job.id}>
                  {job.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedJob && (
          <p className="mt-3 text-sm text-gray-600">
            Sourcing focus: <span className="font-medium text-gray-900">{selectedJob.label}</span>
          </p>
        )}
      </div>

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
        <span className="text-xs text-gray-400 ml-1">
          {selectedJobRequirement ? 'Sorted by job fit' : 'Sorted by score'}
        </span>
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
        candidateRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
            No candidates found for this role filter.
          </div>
        ) : (
          <div className="space-y-8">
            {selectedJobRequirement && (
              <section>
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-5 shadow-sm">
                  <div className="mb-5">
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                      Top Suggested Candidates
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      Recommended by Terrer for the selected job
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                      Based on job requirements and candidate fit
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {suggestedCandidates.map((row, index) => renderSuggestedCard(row, index))}
                  </div>
                </div>
              </section>
            )}

            <section>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">All Candidates</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Search, scan, and act across the full candidate pool
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/80">
                      <tr className="text-left">
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Candidate</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Location</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Skills</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Job Fit</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {candidateRows.map((row, index) => {
                        const { candidate, stage, jobFit, cardMessage } = row;
                        const stageMeta = stageConfig[stage];
                        const fitSummary = jobFit
                          ? `${jobFit.score}% · ${jobFit.label}`
                          : `Score ${candidate.score}`;

                        return (
                          <tr key={candidate.id} className="align-top hover:bg-gray-50/70">
                            <td className="px-5 py-4">
                              <div className="flex items-start gap-3">
                                <div
                                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColors[index % avatarColors.length]}`}
                                >
                                  {initials(candidate.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-gray-900">{candidate.name}</p>
                                  <p className="truncate text-sm text-gray-500">{candidate.role}</p>
                                  <p className="truncate text-xs text-gray-400">{candidate.company}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1.5">
                                <MapPin size={12} className="text-gray-300" />
                                <span>{candidate.location}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex max-w-xs flex-wrap gap-1.5">
                                {candidate.skills.slice(0, 4).map(skill => (
                                  <span
                                    key={skill}
                                    className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="space-y-1">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${jobFit ? getFitToneClasses(jobFit.label) : getFitToneClasses(null)}`}>
                                  {fitSummary}
                                </span>
                                {jobFit?.reasons[0] && (
                                  <p className="text-xs text-gray-500">{jobFit.reasons[0]}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="space-y-2">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${stageMeta.style}`}>
                                  {stageMeta.label}
                                </span>
                                {cardMessage && (
                                  <p className="text-xs font-medium text-emerald-600">{cardMessage}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex min-w-[180px] flex-col gap-2">
                                {renderActionButtons(row, true)}
                                {sourcingJobId && (
                                  <button
                                    type="button"
                                    onClick={() => handleShortlistForJob(candidate.id)}
                                    disabled={row.isShortlisting || row.isInCurrentJobFlow}
                                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                                      row.isInCurrentJobFlow
                                        ? 'bg-gray-100 text-gray-400 cursor-default'
                                        : row.isShortlisting
                                        ? 'bg-blue-50 text-blue-400 cursor-default'
                                        : 'bg-white text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50'
                                    }`}
                                  >
                                    {row.isShortlisting
                                      ? 'Adding...'
                                      : row.isInCurrentJobFlow
                                      ? `Already ${stageMeta.label}`
                                      : 'Shortlist for this Job'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
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
                  Add a candidate from a profile URL or pasted resume text, then confirm the details before saving.
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
              <div className="mb-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIntakeMode('linkedin')}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    intakeMode === 'linkedin'
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Paste LinkedIn URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIntakeMode('resume');
                    setCandidateForm(prev => ({
                      ...prev,
                      source: prev.source === 'Other' ? 'Other' : prev.source,
                    }));
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    intakeMode === 'resume'
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Paste Resume Text
                </button>
              </div>

              {intakeMode === 'linkedin' ? (
                <label className="mb-4 block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Source URL</span>
                  <input
                    required
                    value={candidateForm.sourceUrl}
                    onChange={event => handleSourceUrlChange(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Paste LinkedIn, GitHub, JobStreet, or other source URL"
                  />
                </label>
              ) : (
                <label className="mb-4 block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Paste resume or profile text
                  </span>
                  <textarea
                    value={candidateForm.resumeText}
                    onChange={event => setCandidateForm(prev => ({ ...prev, resumeText: event.target.value }))}
                    onPaste={handleResumePaste}
                    rows={6}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Paste resume summary, profile excerpt, or candidate notes"
                  />
                </label>
              )}

              {intakeMode === 'resume' && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Suggested fields are best-effort only. Please confirm and edit before saving.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Name
                    {suggestedFields.name && (
                      <span className="ml-2 text-xs font-normal text-amber-700">
                        {suggestionMode === 'ai'
                          ? 'Suggested (AI-assisted, please confirm)'
                          : 'Suggested (please confirm)'}
                      </span>
                    )}
                  </span>
                  <input
                    required
                    value={candidateForm.name}
                    onChange={event => updateCandidateForm('name', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Candidate name"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Role / Title
                    {suggestedFields.role && (
                      <span className="ml-2 text-xs font-normal text-amber-700">
                        {suggestionMode === 'ai'
                          ? 'Suggested (AI-assisted, please confirm)'
                          : 'Suggested (please confirm)'}
                      </span>
                    )}
                  </span>
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
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Skills
                    {suggestedFields.skills && (
                      <span className="ml-2 text-xs font-normal text-amber-700">
                        {suggestionMode === 'ai'
                          ? 'Suggested (AI-assisted, please confirm)'
                          : 'Suggested (please confirm)'}
                      </span>
                    )}
                  </span>
                  <input
                    value={candidateForm.skills}
                    onChange={event => updateCandidateForm('skills', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="React, Node.js, SQL"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Location
                    {suggestedFields.location && (
                      <span className="ml-2 text-xs font-normal text-amber-700">
                        {suggestionMode === 'ai'
                          ? 'Suggested (AI-assisted, please confirm)'
                          : 'Suggested (please confirm)'}
                      </span>
                    )}
                  </span>
                  <input
                    value={candidateForm.location}
                    onChange={event => updateCandidateForm('location', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Kuala Lumpur, Malaysia"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Notes
                  {suggestedFields.notes && (
                    <span className="ml-2 text-xs font-normal text-amber-700">
                      {suggestionMode === 'ai'
                        ? 'Suggested (AI-assisted, please confirm)'
                        : 'Suggested (please confirm)'}
                    </span>
                  )}
                </span>
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
