import { supabase } from './supabase';

export interface ParsedJob {
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

type ParsedJobShape = Partial<Record<keyof ParsedJob, unknown>>;

const ROLE_HINTS = [
  'engineer',
  'developer',
  'manager',
  'designer',
  'analyst',
  'architect',
  'lead',
  'specialist',
  'director',
  'scientist',
  'consultant',
  'administrator',
  'product',
  'backend',
  'frontend',
  'full stack',
  'devops',
  'data',
];

const DEFAULT_PARSED_JOB: ParsedJob = {
  title: 'Not specified',
  company: 'Company',
  location: 'Remote',
  type: 'Full-time',
  salaryRange: 'Not specified',
  experience: 'Not specified',
  skills: ['See job description'],
  niceToHave: [],
  startDate: 'Flexible',
  reportingTo: 'Not specified',
  summary: 'See full job description for details.',
};

export const normalizeJobIntakeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

function looksLikeRoleTitle(value: string): boolean {
  const normalized = normalizeJobIntakeWhitespace(value).toLowerCase();
  return ROLE_HINTS.some(hint => normalized.includes(hint));
}

function extractTitle(text: string): string {
  const titlePatterns = [
    /(?:looking for|hiring|seeking)\s+(?:an?\s+)?([A-Z][A-Za-z&/+\-\s]{2,60}?)(?:\s+to\s+join|\s+at\s+|\s+for\s+|\s+who\b|\s+with\b|[.,\n]|$)/i,
    /title[:\s]+([A-Z][A-Za-z&/+\-\s]{2,60}?)(?:[.,\n]|$)/i,
    /position[:\s]+([A-Z][A-Za-z&/+\-\s]{2,60}?)(?:[.,\n]|$)/i,
    /role[:\s]+(?:is\s+)?([A-Z][A-Za-z&/+\-\s]{2,60}?)(?:[.,\n]|$)/i,
  ];

  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    const candidate = normalizeJobIntakeWhitespace(match?.[1] ?? '');
    if (candidate && looksLikeRoleTitle(candidate)) {
      return candidate;
    }
  }

  const firstLine = normalizeJobIntakeWhitespace(text.split('\n')[0] ?? '');
  const trimmedFirstLine = firstLine.replace(/\s+(at|for)\s+.+$/i, '').trim();
  if (trimmedFirstLine && trimmedFirstLine.length <= 80 && looksLikeRoleTitle(trimmedFirstLine)) {
    return trimmedFirstLine;
  }

  return DEFAULT_PARSED_JOB.title;
}

function parseJobIntakeFallback(input: string): ParsedJob | null {
  if (!input.trim()) return null;

  const text = input.trim();
  const title = extractTitle(text);

  const companyPatterns = [
    /(?:at|join|joining|with)\s+([A-Z][A-Za-z0-9\s&.,]{1,40}?)(?:\s+team|\s+in\s+|\s+is\s+|\.|,|\n|$)/i,
    /company[:\s]+([A-Z][A-Za-z0-9\s&.]{2,40}?)(?:\n|,|\.|$)/i,
    /([A-Z][A-Za-z0-9&\s]{1,30}?)\s+is\s+(?:looking|hiring|seeking)/i,
  ];
  let company = DEFAULT_PARSED_JOB.company;
  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 1) {
      company = normalizeJobIntakeWhitespace(match[1]);
      break;
    }
  }

  const locationPatterns = [
    /(?:based in|located in|location[:\s]+|office in|remote from|in\s+)([A-Z][A-Za-z\s,]{2,40}?)(?:\s*\(|\s+with|\s+salary|\.|,|\n|$)/i,
    /([A-Z][A-Za-z\s]+,\s*[A-Z]{2})(?:\s*\(|\s+with|\s|$)/,
  ];
  let location = DEFAULT_PARSED_JOB.location;
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      location = normalizeJobIntakeWhitespace(match[1]);
      break;
    }
  }

  const workModeMatch = text.match(/\((hybrid|remote|on.?site)\)/i);
  if (workModeMatch) {
    location = `${location} (${workModeMatch[1]})`;
  }

  const salaryMatch = text.match(/\$[\d,]+(?:k)?(?:\s*-\s*\$[\d,]+(?:k)?)?(?:\s*per\s+year)?/i);
  const salaryRange = salaryMatch ? salaryMatch[0] : DEFAULT_PARSED_JOB.salaryRange;

  const expMatch = text.match(/(\d+\+?\s*(?:-|to)?\s*\d*\+?\s*years?)/i);
  const experience = expMatch ? expMatch[1] : DEFAULT_PARSED_JOB.experience;

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
  const skills = skillKeywords.filter(skill => new RegExp(`\\b${skill}\\b`, 'i').test(text));

  const niceToHaveSection = text.match(/nice to have[:\s]+([\s\S]+?)(?:\n\n|$)/i);
  const niceToHave = niceToHaveSection
    ? niceToHaveSection[1]
        .split(/[,\n]/)
        .map(item => item.trim())
        .filter(item => item.length > 1)
        .slice(0, 4)
    : [];

  const startMatch = text.match(/(?:start\s*date|starting|target)[:\s]+([^\n.,]+)/i);
  const startDate = startMatch ? startMatch[1].trim() : DEFAULT_PARSED_JOB.startDate;

  const reportMatch = text.match(/reporting\s+to[:\s]+([^\n.,]+)/i);
  const reportingTo = reportMatch ? reportMatch[1].trim() : DEFAULT_PARSED_JOB.reportingTo;

  const summary = text.split(/[.!]/)[0]?.trim() ?? DEFAULT_PARSED_JOB.summary;

  return {
    title,
    company,
    location,
    type: DEFAULT_PARSED_JOB.type,
    salaryRange,
    experience,
    skills: skills.length > 0 ? skills : DEFAULT_PARSED_JOB.skills,
    niceToHave,
    startDate,
    reportingTo,
    summary: summary.length > 200 ? `${summary.slice(0, 197)}...` : summary,
  };
}

function normalizeString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = normalizeJobIntakeWhitespace(value);
  return normalized || fallback;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => (typeof item === 'string' ? normalizeJobIntakeWhitespace(item) : ''))
    .filter(Boolean);
}

function normalizeParsedJob(candidate: ParsedJobShape): ParsedJob {
  const summary = normalizeString(candidate.summary, DEFAULT_PARSED_JOB.summary);

  return {
    title: normalizeString(candidate.title, DEFAULT_PARSED_JOB.title),
    company: normalizeString(candidate.company, DEFAULT_PARSED_JOB.company),
    location: normalizeString(candidate.location, DEFAULT_PARSED_JOB.location),
    type: normalizeString(candidate.type, DEFAULT_PARSED_JOB.type),
    salaryRange: normalizeString(candidate.salaryRange, DEFAULT_PARSED_JOB.salaryRange),
    experience: normalizeString(candidate.experience, DEFAULT_PARSED_JOB.experience),
    skills: (() => {
      const skills = normalizeStringArray(candidate.skills);
      return skills.length > 0 ? skills.slice(0, 8) : DEFAULT_PARSED_JOB.skills;
    })(),
    niceToHave: normalizeStringArray(candidate.niceToHave).slice(0, 8),
    startDate: normalizeString(candidate.startDate, DEFAULT_PARSED_JOB.startDate),
    reportingTo: normalizeString(candidate.reportingTo, DEFAULT_PARSED_JOB.reportingTo),
    summary: summary.length > 200 ? `${summary.slice(0, 197)}...` : summary,
  };
}

async function parseJobIntakeWithGemini(input: string): Promise<ParsedJob | null> {
  console.log('Calling Gemini parser...');
  const { data, error } = await supabase.functions.invoke('job-intake-parser', {
    body: { input },
  });

  console.log('Gemini response:', { data, error });

  if (error) {
    throw error;
  }

  if (!data || typeof data !== 'object' || !('parsedJob' in data)) {
    throw new Error('Gemini parser returned an unexpected response shape.');
  }

  return normalizeParsedJob((data as { parsedJob: ParsedJobShape }).parsedJob);
}

export async function parseJobIntakeInput(input: string): Promise<ParsedJob | null> {
  if (!input.trim()) return null;

  try {
    return await parseJobIntakeWithGemini(input);
  } catch (error) {
    console.log('Falling back to regex parser');
    console.error('[jobIntakeParser] Gemini fallback to regex parser:', error);
    return parseJobIntakeFallback(input);
  }
}
