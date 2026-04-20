import { useRef, useState } from 'react';
import { CheckCircle2, Briefcase, MapPin, Users, Clock, Tag } from 'lucide-react';
import { createJob } from '../lib/jobs';
import {
  parseJobIntakeInput,
  normalizeJobIntakeWhitespace,
  type ParsedJob,
} from '../lib/jobIntakeParser';

const EXAMPLE_INPUT = `We're looking for a Senior Backend Engineer to join our platform team at Acme Corp. The role is based in San Francisco (hybrid) with a salary range of $160k-$200k. The candidate should have 5+ years of experience with Node.js, PostgreSQL, and cloud infrastructure (AWS preferred). They will own the design and implementation of core API services and work closely with product and frontend teams. Nice to have: experience with Kafka or similar message queue systems. Start date is flexible, targeting Q3 2026. Reporting to the VP of Engineering.`;

interface Props {
  onNavigate: (page: string, jobId?: string) => void;
}

export default function JobIntake({ onNavigate }: Props) {
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<ParsedJob | null>(null);
  const [draft, setDraft] = useState<ParsedJob | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const parseRequestRef = useRef(0);

  const handleParse = () => {
    if (!input.trim()) return;

    const currentInput = input.trim();
    const requestId = parseRequestRef.current + 1;
    parseRequestRef.current = requestId;

    setLoading(true);
    setEditing(false);
    setSaveError(null);

    setTimeout(async () => {
      if (parseRequestRef.current !== requestId) return;

      try {
        const result = await parseJobIntakeInput(currentInput);

        if (parseRequestRef.current !== requestId) return;

        setParsed(result);
        setDraft(result);
      } finally {
        if (parseRequestRef.current === requestId) {
          setLoading(false);
        }
      }
    }, 800);
  };

  const handleExample = () => {
    parseRequestRef.current += 1;
    setInput(EXAMPLE_INPUT);
    setParsed(null);
    setDraft(null);
    setEditing(false);
    setSaveError(null);
  };

  const handleEditDetails = () => {
    if (!parsed) return;
    setDraft(parsed);
    setEditing(true);
  };

  const handleDraftChange = <K extends keyof ParsedJob>(key: K, value: ParsedJob[K]) => {
    setDraft(prev => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSaveEdits = () => {
    if (!draft) return;

    const normalizedDraft: ParsedJob = {
      ...draft,
      title: normalizeJobIntakeWhitespace(draft.title) || 'Not specified',
      company: normalizeJobIntakeWhitespace(draft.company) || 'Company',
      location: normalizeJobIntakeWhitespace(draft.location) || 'Remote',
      type: normalizeJobIntakeWhitespace(draft.type) || 'Full-time',
      salaryRange: normalizeJobIntakeWhitespace(draft.salaryRange) || 'Not specified',
      experience: normalizeJobIntakeWhitespace(draft.experience) || 'Not specified',
      startDate: normalizeJobIntakeWhitespace(draft.startDate) || 'Flexible',
      reportingTo: normalizeJobIntakeWhitespace(draft.reportingTo) || 'Not specified',
      summary: normalizeJobIntakeWhitespace(draft.summary) || 'See full job description for details.',
      skills: draft.skills.map(normalizeJobIntakeWhitespace).filter(Boolean),
      niceToHave: draft.niceToHave.map(normalizeJobIntakeWhitespace).filter(Boolean),
    };

    setDraft(normalizedDraft);
    setParsed(normalizedDraft);
    setEditing(false);
  };

  const handleConfirmSave = async () => {
    if (!parsed) return;

    setSaving(true);
    setSaveError(null);

    try {
      await createJob({
        title: parsed.title,
        company: parsed.company,
        location: parsed.location,
      });
      onNavigate('jobs');
    } catch (error) {
      console.error('[JobIntake] createJob error:', error);
      setSaveError('Unable to save job. Please review the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Job Intake</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Paste a job description and extract structured details automatically
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Job Description Input</h2>
            <button
              onClick={handleExample}
              className="text-xs text-blue-600 hover:underline"
            >
              Load example
            </button>
          </div>
          <textarea
            value={input}
            onChange={e => {
              parseRequestRef.current += 1;
              setInput(e.target.value);
              setParsed(null);
              setDraft(null);
              setEditing(false);
            }}
            rows={14}
            placeholder="Paste the full job description here - title, location, salary range, skills, requirements, team context, etc."
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-400">{input.length} characters</span>
            <button
              onClick={handleParse}
              disabled={!input.trim() || loading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Parsing...' : 'Extract Details'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Structured Output</h2>
          </div>

          {!parsed && !loading && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Briefcase size={18} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-400">
                Paste a job description and click "Extract Details" to see the structured output here.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-400">Parsing job description...</p>
            </div>
          )}

          {parsed && !loading && (
            <div className="p-6 space-y-5">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-0.5">Job Title</p>
                  {editing && draft ? (
                    <input
                      value={draft.title}
                      onChange={e => handleDraftChange('title', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-gray-800">{parsed.title}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <Briefcase size={10} /> Company
                  </p>
                  {editing && draft ? (
                    <input
                      value={draft.company}
                      onChange={e => handleDraftChange('company', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-700">{parsed.company}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <MapPin size={10} /> Location
                  </p>
                  {editing && draft ? (
                    <input
                      value={draft.location}
                      onChange={e => handleDraftChange('location', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-700">{parsed.location}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <Tag size={10} /> Type
                  </p>
                  {editing && draft ? (
                    <input
                      value={draft.type}
                      onChange={e => handleDraftChange('type', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-700">{parsed.type}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <Clock size={10} /> Start Date
                  </p>
                  {editing && draft ? (
                    <input
                      value={draft.startDate}
                      onChange={e => handleDraftChange('startDate', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-700">{parsed.startDate}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <Users size={10} /> Experience
                  </p>
                  {editing && draft ? (
                    <input
                      value={draft.experience}
                      onChange={e => handleDraftChange('experience', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-700">{parsed.experience}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Salary Range</p>
                  {editing && draft ? (
                    <input
                      value={draft.salaryRange}
                      onChange={e => handleDraftChange('salaryRange', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-700 font-medium">{parsed.salaryRange}</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1.5">Required Skills</p>
                {editing && draft ? (
                  <textarea
                    value={draft.skills.join(', ')}
                    onChange={e =>
                      handleDraftChange(
                        'skills',
                        e.target.value.split(',').map(item => item.trim()).filter(Boolean)
                      )
                    }
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {parsed.skills.map(skill => (
                      <span key={skill} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1.5">Nice to Have</p>
                {editing && draft ? (
                  <textarea
                    value={draft.niceToHave.join(', ')}
                    onChange={e =>
                      handleDraftChange(
                        'niceToHave',
                        e.target.value.split(',').map(item => item.trim()).filter(Boolean)
                      )
                    }
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {parsed.niceToHave.map(skill => (
                      <span key={skill} className="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Summary</p>
                {editing && draft ? (
                  <textarea
                    value={draft.summary}
                    onChange={e => handleDraftChange('summary', e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
                  />
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed">{parsed.summary}</p>
                )}
              </div>

              {saveError && (
                <p className="text-xs text-red-600">{saveError}</p>
              )}

              <div className="pt-2 border-t border-gray-100 flex gap-2">
                <button
                  onClick={handleConfirmSave}
                  disabled={saving || editing}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Confirm & Save'}
                </button>
                {editing ? (
                  <button
                    onClick={handleSaveEdits}
                    className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Save Changes
                  </button>
                ) : (
                  <button
                    onClick={handleEditDetails}
                    className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Edit Details
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
