import { useState } from 'react';
import { CheckCircle2, Briefcase, MapPin, Users, Clock, Tag } from 'lucide-react';
import { createJob } from '../lib/jobs';

const EXAMPLE_INPUT = `We're looking for a Senior Backend Engineer to join our platform team at Acme Corp. The role is based in San Francisco (hybrid) with a salary range of $160k–$200k. The candidate should have 5+ years of experience with Node.js, PostgreSQL, and cloud infrastructure (AWS preferred). They will own the design and implementation of core API services and work closely with product and frontend teams. Nice to have: experience with Kafka or similar message queue systems. Start date is flexible, targeting Q3 2026. Reporting to the VP of Engineering.`;

interface ParsedJob {
  title: string;
  company: string;
  location: string;
  type: string;
  salaryRange: string;
  experience: string;
  skills: string[];
  niceToHave: string[];
  startDate: string;
  reportingTo: string;
  summary: string;
}

const mockParse = (input: string): ParsedJob | null => {
  if (!input.trim()) return null;

  const text = input.trim();

  const titlePatterns = [
    /(?:looking for|hiring|seeking|for a|for an)\s+(?:a\s+)?([A-Z][A-Za-z\s\/\-]{2,40}?)(?:\s+to\s+join|\s+at\s+|\s+who|\s+with|\n|$)/i,
    /role[:\s]+([A-Z][A-Za-z\s\/\-]{2,40}?)(?:\n|,|\.|$)/i,
    /position[:\s]+([A-Z][A-Za-z\s\/\-]{2,40}?)(?:\n|,|\.|$)/i,
    /title[:\s]+([A-Z][A-Za-z\s\/\-]{2,40}?)(?:\n|,|\.|$)/i,
    /^([A-Z][A-Za-z\s\/\-]{2,40}?)(?:\s+–|\s+-|\s+at\s+|\n)/m,
  ];
  let title = 'Software Engineer';
  for (const p of titlePatterns) {
    const m = text.match(p);
    if (m && m[1] && m[1].trim().length > 3) {
      title = m[1].trim().replace(/\s+/g, ' ');
      break;
    }
  }

  const companyPatterns = [
    /(?:at|join|joining|with)\s+([A-Z][A-Za-z0-9\s&\.\,]{1,40}?)(?:\s+team|\s+in\s+|\s+is\s+|\.|,|\n|$)/i,
    /company[:\s]+([A-Z][A-Za-z0-9\s&\.]{2,40}?)(?:\n|,|\.|$)/i,
    /([A-Z][A-Za-z0-9&\s]{1,30}?)\s+is\s+(?:looking|hiring|seeking)/i,
  ];
  let company = 'Company';
  for (const p of companyPatterns) {
    const m = text.match(p);
    if (m && m[1] && m[1].trim().length > 1) {
      company = m[1].trim().replace(/\s+/g, ' ');
      break;
    }
  }

  const locationPatterns = [
    /(?:based in|located in|location[:\s]+|office in|remote from|in\s+)([A-Z][A-Za-z\s,]{2,40}?)(?:\s*\(|\s+with|\s+salary|\.|,|\n|$)/i,
    /([A-Z][a-zA-Z\s]+,\s*[A-Z]{2})(?:\s*\(|\s+with|\s|$)/,
  ];
  let location = 'Remote';
  for (const p of locationPatterns) {
    const m = text.match(p);
    if (m && m[1] && m[1].trim().length > 2) {
      location = m[1].trim().replace(/\s+/g, ' ');
      break;
    }
  }

  const hybridMatch = text.match(/\((hybrid|remote|on.?site)\)/i);
  if (hybridMatch) location = `${location} (${hybridMatch[1]})`;

  const salaryMatch = text.match(/\$[\d,]+(?:k)?(?:\s*[–\-]\s*\$[\d,]+(?:k)?)?(?:\s*per\s+year)?/i);
  const salaryRange = salaryMatch ? salaryMatch[0] : 'Not specified';

  const expMatch = text.match(/(\d+\+?\s*(?:–|-|to)?\s*\d*\+?\s*years?)/i);
  const experience = expMatch ? expMatch[1] : 'Not specified';

  const skillKeywords = [
    'Python', 'JavaScript', 'TypeScript', 'Node.js', 'React', 'Vue', 'Angular',
    'Java', 'Golang', 'Go', 'Rust', 'C\\+\\+', 'C#', '.NET', 'PHP', 'Ruby',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform',
    'GraphQL', 'REST', 'API Design', 'Microservices',
    'Machine Learning', 'ML', 'AI', 'NLP', 'PyTorch', 'TensorFlow',
    'dbt', 'Spark', 'Kafka', 'Airflow', 'Hadoop', 'SQL', 'Databricks',
    'Data Engineering', 'ETL', 'Data Pipelines', 'Analytics',
  ];
  const skills = skillKeywords.filter(s => new RegExp(`\\b${s}\\b`, 'i').test(text));

  const niceToHaveSection = text.match(/nice to have[:\s]+([\s\S]+?)(?:\n\n|$)/i);
  const niceToHave: string[] = niceToHaveSection
    ? niceToHaveSection[1].split(/[,\n]/).map(s => s.trim()).filter(s => s.length > 1).slice(0, 4)
    : [];

  const startMatch = text.match(/(?:start\s*date|starting|target)[:\s]+([^\n.,]+)/i);
  const startDate = startMatch ? startMatch[1].trim() : 'Flexible';

  const reportMatch = text.match(/reporting\s+to[:\s]+([^\n.,]+)/i);
  const reportingTo = reportMatch ? reportMatch[1].trim() : 'Not specified';

  const summary = text.split(/[.!]/)[0]?.trim() ?? 'See full job description for details.';

  return {
    title,
    company,
    location,
    type: 'Full-time',
    salaryRange,
    experience,
    skills: skills.length > 0 ? skills : ['See job description'],
    niceToHave,
    startDate,
    reportingTo,
    summary: summary.length > 200 ? summary.slice(0, 197) + '...' : summary,
  };
};

interface Props {
  onNavigate: (page: string, jobId?: string) => void;
}

export default function JobIntake({ onNavigate }: Props) {
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<ParsedJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleParse = () => {
    if (!input.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setParsed(mockParse(input));
      setLoading(false);
    }, 800);
  };

  const handleExample = () => {
    setInput(EXAMPLE_INPUT);
    setParsed(null);
  };

  const handleConfirmSave = async () => {
    if (!parsed) return;
    setSaving(true);
    setSaveError(null);

     await createJob({
  title: parsed.title,
  company: parsed.company,
  location: parsed.location,
});

    setSaving(false);

    onNavigate('jobs');
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Job Intake</h1>
        <p className="text-sm text-gray-500 mt-0.5">Paste a job description and extract structured details automatically</p>
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
            onChange={e => { setInput(e.target.value); setParsed(null); }}
            rows={14}
            placeholder="Paste the full job description here — title, location, salary range, skills, requirements, team context, etc."
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
              <p className="text-sm text-gray-400">Paste a job description and click "Extract Details" to see the structured output here.</p>
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
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Job Title</p>
                  <p className="text-sm font-semibold text-gray-800">{parsed.title}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Briefcase size={10} /> Company</p>
                  <p className="text-sm text-gray-700">{parsed.company}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><MapPin size={10} /> Location</p>
                  <p className="text-sm text-gray-700">{parsed.location}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Tag size={10} /> Type</p>
                  <p className="text-sm text-gray-700">{parsed.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Clock size={10} /> Start Date</p>
                  <p className="text-sm text-gray-700">{parsed.startDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Users size={10} /> Experience</p>
                  <p className="text-sm text-gray-700">{parsed.experience}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Salary Range</p>
                  <p className="text-sm text-gray-700 font-medium">{parsed.salaryRange}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1.5">Required Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.skills.map(s => (
                    <span key={s} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1.5">Nice to Have</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.niceToHave.map(s => (
                    <span key={s} className="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Summary</p>
                <p className="text-sm text-gray-600 leading-relaxed">{parsed.summary}</p>
              </div>

              {saveError && (
                <p className="text-xs text-red-600">{saveError}</p>
              )}

              <div className="pt-2 border-t border-gray-100 flex gap-2">
                <button
                  onClick={handleConfirmSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Confirm & Save'}
                </button>
                <button className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-md hover:bg-gray-200 transition-colors">
                  Edit Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
