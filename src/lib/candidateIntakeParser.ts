const ROLE_KEYWORDS = [
  'Software Engineer',
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Engineer',
  'Data Engineer',
  'Data Analyst',
  'Product Manager',
  'Project Manager',
  'Business Analyst',
  'Legal Associate',
  'Lawyer',
  'Associate',
  'Manager',
  'Engineer',
  'Developer',
  'Designer',
  'Recruiter',
  'Consultant',
  'Executive',
  'Coordinator',
  'Specialist',
  'Officer',
  'Analyst',
];

const SKILL_KEYWORDS = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'React',
  'Node.js',
  'SQL',
  'PostgreSQL',
  'AWS',
  'Docker',
  'Kubernetes',
  'Excel',
  'Power BI',
  'Tableau',
  'Litigation',
  'Contract Drafting',
  'Compliance',
  'Regulatory',
  'Project Management',
  'Product Strategy',
  'Figma',
  'UI Design',
  'Recruitment',
];

const MALAYSIA_LOCATIONS = [
  'Kuala Lumpur',
  'Selangor',
  'Petaling Jaya',
  'Shah Alam',
  'Subang Jaya',
  'Johor Bahru',
  'Penang',
  'George Town',
  'Klang',
  'Cyberjaya',
  'Putrajaya',
  'Malaysia',
  'KL',
];

const WEAK_ROLE_KEYWORDS = ['Associate', 'Manager', 'Executive', 'Officer', 'Coordinator', 'Specialist'];

export interface ParsedCandidateIntake {
  name: string;
  role: string;
  skills: string[];
  location: string;
  notes: string;
}

export interface CandidateAIRefinement {
  full_name: string;
  current_role: string;
  key_skills: string[];
  location: string;
  summary: string;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isNameLike(line: string): boolean {
  const cleaned = normalizeWhitespace(line);
  if (!cleaned) return false;
  if (cleaned.length < 4 || cleaned.length > 60) return false;
  if (/\d/.test(cleaned)) return false;

  const words = cleaned.split(' ').filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;

  return words.every(word => /^[A-Z][a-zA-Z'.-]+$/.test(word));
}

function extractName(lines: string[]): string {
  const firstNameLike = lines.find(isNameLike);
  return firstNameLike ? normalizeWhitespace(firstNameLike) : '';
}

function extractRole(text: string): string {
  const lower = text.toLowerCase();

  for (const role of ROLE_KEYWORDS) {
    if (lower.includes(role.toLowerCase())) {
      return role;
    }
  }

  return '';
}

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();

  return SKILL_KEYWORDS.filter(skill => lower.includes(skill.toLowerCase()));
}

function extractLocation(text: string): string {
  const lower = text.toLowerCase();
  const match = MALAYSIA_LOCATIONS.find(location => lower.includes(location.toLowerCase()));
  return match ?? '';
}

function extractNotes(lines: string[]): string {
  const usefulLines = lines
    .map(normalizeWhitespace)
    .filter(Boolean)
    .filter(line => line.length > 20)
    .slice(0, 3);

  return usefulLines.join(' ').trim();
}

export function parseCandidateResumeText(rawText: string): ParsedCandidateIntake {
  const text = rawText.trim();
  if (!text) {
    return {
      name: '',
      role: '',
      skills: [],
      location: '',
      notes: '',
    };
  }

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  return {
    name: extractName(lines),
    role: extractRole(text),
    skills: extractSkills(text),
    location: extractLocation(text),
    notes: extractNotes(lines),
  };
}

export function isWeakCandidateRole(role: string): boolean {
  const normalized = role.trim().toLowerCase();
  if (!normalized) return true;

  return WEAK_ROLE_KEYWORDS.some(keyword => normalized === keyword.toLowerCase());
}

export function shouldRefineCandidateWithAI(
  rawText: string,
  parsed: ParsedCandidateIntake
): boolean {
  const trimmed = rawText.trim();
  if (!trimmed) return false;

  return !parsed.name || isWeakCandidateRole(parsed.role) || trimmed.length > 200;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? normalizeWhitespace(value) : '';
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(item => normalizeString(item))
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeCandidateAIRefinement(value: unknown): CandidateAIRefinement {
  if (!value || typeof value !== 'object') {
    return {
      full_name: '',
      current_role: '',
      key_skills: [],
      location: '',
      summary: '',
    };
  }

  const candidate = value as Record<string, unknown>;

  return {
    full_name: normalizeString(candidate.full_name),
    current_role: normalizeString(candidate.current_role),
    key_skills: normalizeStringArray(candidate.key_skills),
    location: normalizeString(candidate.location),
    summary: normalizeString(candidate.summary),
  };
}

export async function refineCandidateWithAI(rawText: string): Promise<CandidateAIRefinement | null> {
  const input = rawText.trim();
  if (!input) return null;

  try {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.functions.invoke('job-intake-parser', {
      body: {
        mode: 'candidate',
        input,
      },
    });

    if (error) {
      throw error;
    }

    if (!data || typeof data !== 'object' || !('parsedCandidate' in data)) {
      throw new Error('Candidate refinement returned an unexpected response shape.');
    }

    return normalizeCandidateAIRefinement(
      (data as { parsedCandidate?: unknown }).parsedCandidate
    );
  } catch (error) {
    console.error('[candidateIntakeParser] AI refinement fallback to rule parser:', error);
    return null;
  }
}

export function mergeCandidateParseOutputs(
  ruleOutput: ParsedCandidateIntake,
  aiOutput: CandidateAIRefinement | null
): ParsedCandidateIntake {
  if (!aiOutput) return ruleOutput;

  return {
    name: aiOutput.full_name || ruleOutput.name,
    role:
      aiOutput.current_role && (isWeakCandidateRole(ruleOutput.role) || !ruleOutput.role)
        ? aiOutput.current_role
        : ruleOutput.role || aiOutput.current_role,
    skills: aiOutput.key_skills.length > 0 ? aiOutput.key_skills : ruleOutput.skills,
    location: aiOutput.location || ruleOutput.location,
    notes: aiOutput.summary || ruleOutput.notes,
  };
}
