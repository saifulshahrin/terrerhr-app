import { parseAdminResumeWithAI, type AdminResumeAIExtraction } from './adminResumeAIParsing';

export interface StructuredResumeCandidate {
  full_name: string;
  email: string | null;
  phone: string | null;
  current_role: string | null;
  target_role: string | null;
  years_experience: number | null;
  total_work_experience_years: number | null;
  role_relevant_experience_years: number | null;
  experience_confidence: 'high' | 'medium' | 'low';
  normalized_current_role: string | null;
  normalized_target_role: string | null;
  location: string | null;
  key_skills: string[];
  hard_skills: string[];
  soft_skills: string[];
  tools: string[];
  languages: string[];
  education_level: string | null;
  field_of_study: string | null;
  education: string | null;
  notice_period: string | null;
  summary: string | null;
  resume_file_path: string | null;
}

export interface ResumeStructuredParseResult {
  candidate: StructuredResumeCandidate;
  rawAI: AdminResumeAIExtraction | null;
  parserMode: 'rule-only' | 'ai-assisted';
  confidence: 'high' | 'medium' | 'low' | null;
  warnings: string[];
  failureReason: string | null;
  parsed_work_entries: ParsedWorkEntry[];
  inferred_target_role_family: RoleFamily;
  total_work_experience_years: number | null;
  role_relevant_experience_years: number | null;
  experience_confidence: 'high' | 'medium' | 'low';
  full_name_source: 'AI' | 'RULE' | 'FALLBACK';
  email_source: 'AI' | 'RULE' | 'FALLBACK';
  phone_source: 'AI' | 'RULE' | 'FALLBACK';
  current_role_source: 'AI' | 'RULE' | 'FALLBACK';
  location_source: 'AI' | 'RULE' | 'FALLBACK';
  selectedEmailSource: 'labelled' | 'contact' | 'reference' | 'ai' | null;
  selectedRoleSource: 'work_experience_line' | 'ai' | 'rule' | null;
  selectedLocationSource: 'labelled_address' | 'ai' | 'rule' | null;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isLikelyLabelLine(value: string): boolean {
  return /^(address|adress|email|phone|mobile|tel|contact|objective|summary|about|experience|education|skills|references?)\b/i.test(
    value.trim()
  );
}

function isNamePolluted(value: string | null | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim();
  if (!normalized) return true;
  if (/\bresume\b|\bcv\b/i.test(normalized)) return true;
  if (/\d{2,}/.test(normalized)) return true;
  return false;
}

function extractFirstStrongName(lines: string[], fallbackFileName: string): string {
  const cleanedFallback = fallbackFileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b(resume|cv)\b/gi, '')
    .replace(/\d+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  for (const rawLine of lines.slice(0, 24)) {
    const line = normalizeWhitespace(rawLine);
    if (!line) continue;
    if (isLikelyLabelLine(line)) continue;
    if (/@/.test(line)) continue;
    if (/(kuala|selangor|malaysia|phone|email|address|about me)/i.test(line)) continue;
    if (!/^[A-Z\s'.-]+$/.test(line)) continue;
    const words = line.split(' ').filter(Boolean);
    if (words.length < 3 || words.length > 9) continue;
    return line
      .toLowerCase()
      .replace(/\b\w/g, letter => letter.toUpperCase())
      .replace(/\b(Bin|Binti|Bt|Bte|Abd)\b/gi, token => token.toUpperCase());
  }

  return cleanedFallback || 'Unknown';
}

function extractLabelledEmail(lines: string[]): {
  value: string | null;
  source: 'labelled' | 'contact' | 'reference' | null;
  warning: string | null;
} {
  const emailLabelRegex = /\bemail\b\s*[:\-]\s*([^\s,;]+)/i;
  for (let i = 0; i < Math.min(lines.length, 60); i += 1) {
    const line = lines[i];
    const nearby = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 4)).join(' ').toLowerCase();
    const isReferenceZone = /reference|rujukan|lecturer|pensyarah|supervisor/.test(nearby);
    const match = line.match(emailLabelRegex);
    if (!match?.[1]) continue;
    if (isReferenceZone) {
      return { value: match[1].trim().toLowerCase(), source: 'reference', warning: null };
    }
    let email = match[1].trim().toLowerCase().replace(/[),.;]+$/g, '');
    if (!email.includes('@') && /gmail\.com$/i.test(email)) {
      return {
        value: email.replace(/gmail\.com$/i, '@gmail.com'),
        source: 'labelled',
        warning: 'Original email looked malformed and was normalized to @gmail.com.',
      };
    }
    return { value: email, source: 'labelled', warning: null };
  }
  return { value: null, source: null, warning: null };
}

function extractLabelledPhone(lines: string[]): string | null {
  const phoneRegex = /\b(?:phone|mobile|tel|contact)\b\s*[:\-]?\s*(\+?\d[\d\s-]{7,})/i;
  for (const line of lines.slice(0, 60)) {
    const match = line.match(phoneRegex);
    if (!match?.[1]) continue;
    const value = normalizeWhitespace(match[1]);
    if (value.length >= 8) return value;
  }
  return null;
}

function extractLabelledAddress(lines: string[]): string | null {
  for (let i = 0; i < Math.min(lines.length, 80); i += 1) {
    const line = lines[i];
    const match = line.match(/\b(?:address|adress)\b\s*[:\-]\s*(.*)$/i);
    if (!match) continue;
    const parts: string[] = [];
    if (match[1]) parts.push(match[1].trim());
    for (let j = i + 1; j < Math.min(lines.length, i + 4); j += 1) {
      const next = lines[j].trim();
      if (!next) break;
      if (isLikelyLabelLine(next) && /:/.test(next)) break;
      parts.push(next);
    }
    return normalizeWhitespace(parts.join(', ').replace(/\s*,\s*,/g, ',')).replace(/[.;]+$/, '');
  }
  return null;
}

function extractWorkLineRole(lines: string[]): string | null {
  for (const raw of lines) {
    if (!raw.includes('|')) continue;
    const normalized = raw.replace(/\u2013|\u2014/g, '-');
    const parts = normalized.split('|').map(part => normalizeWhitespace(part)).filter(Boolean);
    if (parts.length < 3) continue;
    const datePart = parts[parts.length - 2].toLowerCase();
    if (!/(19|20)\d{2}|present|current|kini|sekarang|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|mac|ogos|okt|dis/i.test(datePart)) {
      continue;
    }
    const role = parts[parts.length - 1].split(/[•\-–—]/)[0].trim();
    if (!role) continue;
    if (/^(officer|staff|employee)$/i.test(role)) continue;
    return role;
  }
  return null;
}

interface ExperienceEstimate {
  total: number | null;
  relevant: number | null;
  confidence: 'high' | 'medium' | 'low';
  hasFutureDatedRole: boolean;
}

interface ParsedDatePoint {
  year: number;
  month: number;
}

interface ParsedWorkRange {
  start: ParsedDatePoint;
  end: ParsedDatePoint;
  line: string;
}

function inferExperienceFromRanges(lines: string[], targetRole: string | null): ExperienceEstimate {
  const monthMap: Record<string, number> = {
    jan: 1, january: 1, januari: 1,
    feb: 2, february: 2, februari: 2,
    mar: 3, march: 3, mac: 3,
    apr: 4, april: 4,
    may: 5, mei: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8, ogos: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10, okt: 10, oktober: 10,
    nov: 11, november: 11,
    dec: 12, december: 12, dis: 12, disember: 12,
  };

  function parseDateToken(token: string): ParsedDatePoint | null {
    const lower = token.toLowerCase().replace(/\./g, ' ').trim();
    const yearMatch = lower.match(/\b(19|20)\d{2}\b/);
    if (!yearMatch) return null;
    const year = Number(yearMatch[0]);
    let month = 1;
    for (const [name, m] of Object.entries(monthMap)) {
      if (new RegExp(`\\b${name}\\b`, 'i').test(lower)) {
        month = m;
        break;
      }
    }
    return { year, month };
  }

  function extractRangesFromLine(line: string): ParsedWorkRange[] {
    const normalized = line.replace(/\u2013|\u2014/g, '-');
    const pipeParts = normalized.split('|').map(part => part.trim()).filter(Boolean);
    const candidateDateText =
      pipeParts.length >= 3
        ? pipeParts.find(part => /(19|20)\d{2}/.test(part) && /-/.test(part)) ?? normalized
        : normalized;

    const rangePattern =
      /((?:(?:jan|january|januari|feb|february|februari|mar|march|mac|apr|april|may|mei|jun|june|jul|july|aug|august|ogos|sep|sept|september|oct|october|okt|oktober|nov|november|dec|december|dis|disember)\s+)?(?:19|20)\d{2})\s*-\s*((?:(?:jan|january|januari|feb|february|februari|mar|march|mac|apr|april|may|mei|jun|june|jul|july|aug|august|ogos|sep|sept|september|oct|october|okt|oktober|nov|november|dec|december|dis|disember)\s+)?(?:19|20)\d{2}|present|current|kini|sekarang)/gi;

    const ranges: ParsedWorkRange[] = [];
    let match: RegExpExecArray | null;
    while ((match = rangePattern.exec(candidateDateText)) !== null) {
      const start = parseDateToken(match[1]);
      const end =
        /present|current|kini|sekarang/i.test(match[2])
          ? { year: new Date().getFullYear(), month: new Date().getMonth() + 1 }
          : parseDateToken(match[2]);
      if (start && end) {
        ranges.push({ start, end, line: normalized });
      }
    }

    if (ranges.length > 0) return ranges;

    const chunks = normalized.split('-').map(c => c.trim()).filter(Boolean);
    if (chunks.length < 2) return [];
    const start = parseDateToken(chunks[0]);
    const endToken = chunks[1].toLowerCase();
    const end =
      /present|current|kini|sekarang/.test(endToken)
        ? { year: new Date().getFullYear(), month: new Date().getMonth() + 1 }
        : parseDateToken(chunks[1]);
    return start && end ? [{ start, end, line: normalized }] : [];
  }

  let totalMonths = 0;
  let relevantMonths = 0;
  let hasFutureDatedRole = false;
  const targetIsHrAdmin = /hr|human resource|administrative|admin/i.test(targetRole ?? '');

  for (const line of lines) {
    if (!/(19|20)\d{2}/.test(line)) continue;
    const now = new Date();
    const nowMonths = now.getFullYear() * 12 + now.getMonth() + 1;
    const ranges = extractRangesFromLine(line);
    for (const range of ranges) {
      const startMonths = range.start.year * 12 + range.start.month;
      let endMonths = range.end.year * 12 + range.end.month;
      if (startMonths > nowMonths) {
        hasFutureDatedRole = true;
        continue;
      }
      if (endMonths > nowMonths) {
        hasFutureDatedRole = true;
        endMonths = nowMonths;
      }
      if (endMonths < startMonths) continue;
      const months = endMonths - startMonths + 1;
      totalMonths += months;

      const lower = range.line.toLowerCase();
      const relevant =
        targetIsHrAdmin &&
        /(hr|human resource|admin|administrative|documentation|document|record|data|community|coordination|latihan khas|pelatih|employee record|leave record)/i.test(lower) &&
        !/(sales assistant|cashier|retail|childcare|child care|teacher assistant)/i.test(lower);
      if (relevant) {
        relevantMonths += months;
      }
    }
  }
  const toYears = (months: number): number | null => {
    if (months <= 0) return null;
    return Math.round(Math.max(0.1, Math.min(40, months / 12)) * 10) / 10;
  };
  return {
    total: toYears(totalMonths),
    relevant: toYears(relevantMonths),
    confidence: totalMonths > 0 ? 'medium' : 'low',
    hasFutureDatedRole,
  };
}

export type RoleFamily =
  | 'software_engineering'
  | 'finance_accounting'
  | 'hr_admin'
  | 'sales_bd'
  | 'operations'
  | 'admin_support'
  | 'engineering'
  | 'data_analytics'
  | 'marketing'
  | 'design'
  | 'legal'
  | 'education_childcare'
  | 'customer_service'
  | 'general';

export interface ParsedWorkEntry {
  company: string | null;
  raw_role_title: string | null;
  start_date: string | null;
  end_date: string | null;
  is_future_dated: boolean;
  duration_months: number | null;
  normalized_role_family: RoleFamily;
}

interface ParsedWorkEntryInternal extends ParsedWorkEntry {
  startMonthIndex: number | null;
}

interface WorkEntryExperienceEstimate {
  total: number | null;
  relevant: number | null;
  confidence: 'high' | 'medium' | 'low';
  hasFutureDatedRole: boolean;
  hasAmbiguousEntries: boolean;
  inferredTargetRoleFamily: RoleFamily;
  entries: ParsedWorkEntry[];
  latestRole: string | null;
}

const workMonthMap: Record<string, number> = {
  jan: 1, january: 1, januari: 1,
  feb: 2, february: 2, februari: 2,
  mar: 3, march: 3, mac: 3,
  apr: 4, april: 4,
  may: 5, mei: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8, ogos: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, okt: 10, oktober: 10,
  nov: 11, november: 11,
  dec: 12, december: 12, dis: 12, disember: 12,
};

const workDateTokenPattern =
  '(?:(?:jan|january|januari|feb|february|februari|mar|march|mac|apr|april|may|mei|jun|june|jul|july|aug|august|ogos|sep|sept|september|oct|october|okt|oktober|nov|november|dec|december|dis|disember)\\s+)?(?:19|20)\\d{2}|present|current|kini|sekarang';

function normalizeDash(value: string): string {
  return value.replace(/\u2013|\u2014/g, '-');
}

function parseWorkDateToken(token: string): ParsedDatePoint | null {
  const lower = token.toLowerCase().replace(/\./g, ' ').trim();
  const now = new Date();
  if (/present|current|kini|sekarang/.test(lower)) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const yearMatch = lower.match(/\b(19|20)\d{2}\b/);
  if (!yearMatch) return null;
  const year = Number(yearMatch[0]);
  let month = 1;
  for (const [name, m] of Object.entries(workMonthMap)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(lower)) {
      month = m;
      break;
    }
  }
  return { year, month };
}

function datePointToMonthIndex(date: ParsedDatePoint): number {
  return date.year * 12 + date.month;
}

function formatDatePoint(date: ParsedDatePoint | null): string | null {
  if (!date) return null;
  return `${date.year}-${String(date.month).padStart(2, '0')}`;
}

function findWorkDateRange(line: string): ParsedWorkRange | null {
  const normalized = normalizeDash(line);
  const rangePattern = new RegExp(`(${workDateTokenPattern})\\s*(?:-|to|until|hingga|sampai)\\s*(${workDateTokenPattern})`, 'i');
  const match = normalized.match(rangePattern);
  if (!match?.[1] || !match?.[2]) return null;
  const start = parseWorkDateToken(match[1]);
  const end = parseWorkDateToken(match[2]);
  if (!start || !end) return null;
  return { start, end, line: normalized };
}

function looksLikeRole(value: string | null | undefined): boolean {
  if (!value) return false;
  return /(engineer|developer|programmer|analyst|account|finance|audit|hr|human resource|recruit|people|admin|administrator|assistant|executive|manager|officer|intern|trainee|pelatih|coordinator|specialist|consultant|designer|marketing|sales|business development|operations|logistics|teacher|lecturer|nurse|technician|supervisor|clerk|support)/i.test(value);
}

function cleanWorkToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = normalizeWhitespace(
    value
      .replace(/^[•*\-–—\s]+/g, '')
      .replace(/\b(present|current|kini|sekarang)\b/gi, '')
      .replace(/\b(19|20)\d{2}\b/g, '')
      .replace(/\b(jan|january|januari|feb|february|februari|mar|march|mac|apr|april|may|mei|jun|june|jul|july|aug|august|ogos|sep|sept|september|oct|october|okt|oktober|nov|november|dec|december|dis|disember)\b/gi, '')
      .replace(/[|]+/g, ' ')
      .replace(/\s+-\s+$/g, '')
  );
  if (!cleaned || /^(experience|work experience|employment|career|company|role|position)$/i.test(cleaned)) return null;
  return cleaned;
}

function classifyRoleFamily(text: string | null | undefined): RoleFamily {
  const value = (text ?? '').toLowerCase();
  if (!value.trim()) return 'general';
  if (/software|developer|programmer|backend|front[-\s]?end|full[-\s]?stack|web engineer|mobile developer|devops|qa engineer|quality assurance|react|node|java|python|php|ios|android/.test(value)) return 'software_engineering';
  if (/data analyst|business intelligence|bi analyst|data science|machine learning|analytics|tableau|power bi|sql/.test(value)) return 'data_analytics';
  if (/account|finance|audit|tax|bookkeep|payable|receivable|treasury|financial analyst/.test(value)) return 'finance_accounting';
  if (/hr|human resource|recruit|talent acquisition|people ops|payroll|training|employee relation|latihan khas/.test(value)) return 'hr_admin';
  if (/sales|business development|\bbd\b|account executive|key account|customer acquisition|commercial/.test(value)) return 'sales_bd';
  if (/operations|logistics|supply chain|warehouse|procurement|inventory|coordinator|planner/.test(value)) return 'operations';
  if (/admin|administrative|office|clerk|secretary|documentation|filing|records|data entry/.test(value)) return 'admin_support';
  if (/civil engineer|mechanical engineer|electrical engineer|manufacturing engineer|process engineer|site engineer|technician|maintenance/.test(value)) return 'engineering';
  if (/marketing|brand|content|seo|social media|campaign|digital marketing/.test(value)) return 'marketing';
  if (/designer|ui|ux|graphic|creative|visual/.test(value)) return 'design';
  if (/legal|lawyer|paralegal|compliance|contract/.test(value)) return 'legal';
  if (/teacher|lecturer|tutor|childcare|nursery|education|training assistant/.test(value)) return 'education_childcare';
  if (/customer service|call centre|call center|support agent|client service|front desk/.test(value)) return 'customer_service';
  return 'general';
}

function parseWorkEntryFromLine(line: string, lines: string[], index: number): ParsedWorkEntryInternal | null {
  const range = findWorkDateRange(line);
  if (!range) return null;

  const normalized = normalizeDash(line);
  const rangeText = normalized.match(new RegExp(`(${workDateTokenPattern})\\s*(?:-|to|until|hingga|sampai)\\s*(${workDateTokenPattern})`, 'i'))?.[0] ?? '';
  const parts = normalized.split('|').map(part => normalizeWhitespace(part)).filter(Boolean);
  let company: string | null = null;
  let rawRole: string | null = null;

  if (parts.length >= 3) {
    const dateIndex = parts.findIndex(part => part.includes(rangeText) || Boolean(findWorkDateRange(part)));
    if (dateIndex > 0 && dateIndex < parts.length - 1) {
      company = cleanWorkToken(parts[dateIndex - 1]);
      rawRole = cleanWorkToken(parts[dateIndex + 1]);
    } else if (dateIndex === parts.length - 1) {
      const first = cleanWorkToken(parts[0]);
      const second = cleanWorkToken(parts[1]);
      rawRole = looksLikeRole(first) ? first : second;
      company = rawRole === first ? second : first;
    }
  }

  if (!rawRole || !company) {
    const rangeStart = normalized.indexOf(rangeText);
    const beforeRange = cleanWorkToken(rangeStart >= 0 ? normalized.slice(0, rangeStart) : normalized);
    const afterRange = cleanWorkToken(rangeStart >= 0 ? normalized.slice(rangeStart + rangeText.length) : '');
    const beforeParts = (beforeRange ?? '').split(/\s+-\s+/).map(cleanWorkToken).filter(Boolean) as string[];
    const afterParts = (afterRange ?? '').split(/\s+-\s+/).map(cleanWorkToken).filter(Boolean) as string[];

    if (afterParts.length > 0) {
      rawRole = rawRole ?? afterParts.find(looksLikeRole) ?? afterParts[0];
      company = company ?? beforeParts[0] ?? cleanWorkToken(lines[index - 1]);
    } else if (beforeParts.length >= 2) {
      const firstLooksRole = looksLikeRole(beforeParts[0]);
      rawRole = rawRole ?? (firstLooksRole ? beforeParts[0] : beforeParts[beforeParts.length - 1]);
      company = company ?? (firstLooksRole ? beforeParts[1] : beforeParts[0]);
    } else {
      const nearby = [
        cleanWorkToken(lines[index - 2]),
        cleanWorkToken(lines[index - 1]),
        beforeParts[0],
        cleanWorkToken(lines[index + 1]),
        cleanWorkToken(lines[index + 2]),
      ].filter(Boolean) as string[];
      rawRole = rawRole ?? nearby.find(looksLikeRole) ?? null;
      company = company ?? nearby.find(item => item !== rawRole && !looksLikeRole(item)) ?? beforeParts[0] ?? null;
    }
  }

  if (rawRole && isInvalidRoleFragment(rawRole)) rawRole = null;

  const now = new Date();
  const nowMonths = now.getFullYear() * 12 + now.getMonth() + 1;
  const startMonths = datePointToMonthIndex(range.start);
  let endMonths = datePointToMonthIndex(range.end);
  const startsInFuture = startMonths > nowMonths;
  let isFutureDated = startsInFuture;
  let durationMonths: number | null = null;

  if (!startsInFuture) {
    if (endMonths > nowMonths) {
      endMonths = nowMonths;
      isFutureDated = true;
    }
    if (endMonths >= startMonths) {
      durationMonths = endMonths - startMonths + 1;
    }
  }

  const familySource = `${rawRole ?? ''} ${company ?? ''}`;
  return {
    company,
    raw_role_title: rawRole,
    start_date: formatDatePoint(range.start),
    end_date: formatDatePoint(range.end),
    is_future_dated: isFutureDated,
    duration_months: durationMonths,
    normalized_role_family: classifyRoleFamily(familySource),
    startMonthIndex: startMonths,
  };
}

function parseWorkEntries(lines: string[]): ParsedWorkEntryInternal[] {
  const entries: ParsedWorkEntryInternal[] = [];
  const seen = new Set<string>();

  lines.forEach((line, index) => {
    if (!/(19|20)\d{2}|present|current|kini|sekarang/i.test(line)) return;
    const entry = parseWorkEntryFromLine(line, lines, index);
    if (!entry) return;
    const key = `${entry.company ?? ''}|${entry.raw_role_title ?? ''}|${entry.start_date ?? ''}|${entry.end_date ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push(entry);
  });

  return entries.sort((a, b) => (b.startMonthIndex ?? -1) - (a.startMonthIndex ?? -1));
}

function inferTargetRoleFamily(
  aiTargetRole: string | null | undefined,
  normalizedCurrentRole: string | null | undefined,
  fieldOfStudy: string | null | undefined,
  hardSkills: string[],
  tools: string[]
): RoleFamily {
  const sources = [
    aiTargetRole,
    normalizedCurrentRole,
    fieldOfStudy,
    hardSkills.slice(0, 8).join(' '),
    tools.slice(0, 6).join(' '),
  ];
  for (const source of sources) {
    const family = classifyRoleFamily(source);
    if (family !== 'general') return family;
  }
  return 'general';
}

function isAdjacentRoleFamily(entry: RoleFamily, target: RoleFamily): boolean {
  if (entry === target) return true;
  const adjacent: Record<RoleFamily, RoleFamily[]> = {
    software_engineering: ['data_analytics', 'engineering'],
    finance_accounting: ['operations', 'data_analytics'],
    hr_admin: ['admin_support', 'operations'],
    sales_bd: ['customer_service', 'marketing'],
    operations: ['admin_support', 'sales_bd', 'finance_accounting'],
    admin_support: ['hr_admin', 'operations', 'customer_service'],
    engineering: ['software_engineering', 'operations'],
    data_analytics: ['software_engineering', 'finance_accounting', 'operations'],
    marketing: ['sales_bd', 'design'],
    design: ['marketing'],
    legal: ['admin_support'],
    education_childcare: ['hr_admin', 'admin_support'],
    customer_service: ['sales_bd', 'admin_support'],
    general: [],
  };
  return adjacent[target]?.includes(entry) ?? false;
}

function toExperienceYears(months: number): number | null {
  if (months <= 0) return null;
  return Math.round(Math.max(0.1, Math.min(40, months / 12)) * 10) / 10;
}

function inferExperienceFromWorkEntries(entries: ParsedWorkEntryInternal[], targetFamily: RoleFamily): WorkEntryExperienceEstimate {
  let totalMonths = 0;
  let relevantMonths = 0;
  let hasFutureDatedRole = false;
  let hasAmbiguousEntries = false;
  let usableEntryCount = 0;

  for (const entry of entries) {
    if (entry.is_future_dated) hasFutureDatedRole = true;
    if (entry.duration_months === null) {
      hasAmbiguousEntries = true;
      continue;
    }
    usableEntryCount += 1;
    totalMonths += entry.duration_months;
    if (targetFamily !== 'general' && isAdjacentRoleFamily(entry.normalized_role_family, targetFamily)) {
      relevantMonths += entry.duration_months;
    }
  }

  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (usableEntryCount > 0 && totalMonths >= 3) {
    confidence = hasFutureDatedRole || hasAmbiguousEntries ? 'medium' : 'high';
  } else if (usableEntryCount > 0) {
    confidence = 'medium';
  }

  return {
    total: toExperienceYears(totalMonths),
    relevant: toExperienceYears(relevantMonths),
    confidence,
    hasFutureDatedRole,
    hasAmbiguousEntries,
    inferredTargetRoleFamily: targetFamily,
    entries: entries.map(({ startMonthIndex: _startMonthIndex, ...entry }) => entry),
    latestRole: entries.find(entry => hasValue(entry.raw_role_title))?.raw_role_title ?? null,
  };
}

interface ClassifiedSkills {
  hard_skills: string[];
  soft_skills: string[];
  tools: string[];
  languages: string[];
  key_skills: string[];
}

function addIf(set: Set<string>, condition: boolean, value: string): void {
  if (condition) set.add(value);
}

function classifySkills(text: string, aiSkills: string[]): ClassifiedSkills {
  const lower = text.toLowerCase();
  const hard = new Set<string>();
  const soft = new Set<string>();
  const tools = new Set<string>();
  const languages = new Set<string>();

  for (const skill of aiSkills.map(skill => normalizeWhitespace(skill)).filter(Boolean)) {
    if (/excel|spss|canva|microsoft|office|word|powerpoint|tableau|power bi/i.test(skill)) {
      tools.add(skill);
    } else if (/communication|teamwork|interpersonal|time management|organizational|leadership|people/i.test(skill)) {
      soft.add(skill);
    } else if (/bahasa|english|mandarin|malay/i.test(skill)) {
      languages.add(skill);
    } else {
      hard.add(skill);
    }
  }

  addIf(hard, /\bhr\b|human resource|personnel|recruitment|training/i.test(lower), 'HR Administration');
  addIf(hard, /document|documentation|filing/i.test(lower), 'Documentation');
  addIf(hard, /data management|data entry|database|spreadsheet/i.test(lower), 'Data Management');
  addIf(hard, /employee record|staff record|personnel record|rekod pekerja|rekod kakitangan/i.test(lower), 'Employee Records');
  addIf(hard, /leave record|leave management|attendance|rekod cuti|cuti/i.test(lower), 'Leave Records');
  addIf(hard, /administrative|admin support|office support|clerical/i.test(lower), 'Administrative Support');

  addIf(tools, /microsoft office|ms office|word|powerpoint|excel/i.test(lower), 'Microsoft Office');
  addIf(tools, /\bexcel\b/i.test(lower), 'Excel');
  addIf(tools, /\bspss\b/i.test(lower), 'SPSS');
  addIf(tools, /\bcanva\b/i.test(lower), 'Canva');

  addIf(soft, /communication|communicate/i.test(lower), 'Communication');
  addIf(soft, /engagement|community|people/i.test(lower), 'People Engagement');
  addIf(soft, /organizational|organisational|organized|organised/i.test(lower), 'Organizational Skills');
  addIf(soft, /time management|deadline/i.test(lower), 'Time Management');
  addIf(soft, /interpersonal/i.test(lower), 'Interpersonal Skills');
  addIf(soft, /teamwork|team work|collaboration/i.test(lower), 'Teamwork');

  addIf(languages, /bahasa melayu|malay language| bahasa /i.test(lower), 'Bahasa Melayu');
  addIf(languages, /\benglish\b/i.test(lower), 'English');

  const hard_skills = Array.from(hard);
  const toolList = Array.from(tools);
  const soft_skills = Array.from(soft);
  const languageList = Array.from(languages);

  return {
    hard_skills,
    tools: toolList,
    soft_skills,
    languages: languageList,
    key_skills: [...hard_skills, ...toolList, ...soft_skills.slice(0, 2)].slice(0, 18),
  };
}

function normalizeRoleTarget(currentRole: string | null, aiTarget: string | null): string | null {
  if (aiTarget && aiTarget.trim()) return aiTarget.trim();
  if (!currentRole) return null;
  const family = classifyRoleFamily(currentRole);
  if (family === 'hr_admin' || family === 'admin_support') return 'HR / Administrative role';
  if (family === 'software_engineering') return 'Software Engineering role';
  if (family === 'finance_accounting') return 'Finance / Accounting role';
  if (family === 'sales_bd') return 'Sales / Business Development role';
  if (family === 'operations') return 'Operations role';
  if (family === 'data_analytics') return 'Data / Analytics role';
  if (family === 'engineering') return 'Engineering role';
  if (family === 'marketing') return 'Marketing role';
  if (family === 'design') return 'Design role';
  if (family === 'customer_service') return 'Customer Service role';
  return currentRole;
}

function normalizeCurrentRole(currentRole: string | null, targetRole: string | null): string | null {
  const role = `${currentRole ?? ''} ${targetRole ?? ''}`.toLowerCase();
  if (!role.trim()) return null;
  const family = classifyRoleFamily(role);
  if (/pelatih|trainee|intern/.test(role) && (family === 'hr_admin' || family === 'admin_support')) {
    return 'HR / Administrative Trainee';
  }
  if (/intern|trainee/.test(role) && family === 'software_engineering') return 'Software Engineering Intern';
  if (/intern|trainee/.test(role) && family === 'finance_accounting') return 'Finance / Accounting Intern';
  if (/intern|trainee/.test(role) && family === 'sales_bd') return 'Sales / Business Development Trainee';
  if (family === 'hr_admin') return 'HR / Administrative Support';
  if (family === 'admin_support') return 'Administrative Support';
  if (family === 'software_engineering') return 'Software Engineering';
  if (family === 'finance_accounting') return 'Finance / Accounting';
  if (family === 'sales_bd') return 'Sales / Business Development';
  if (family === 'operations') return 'Operations';
  if (family === 'data_analytics') return 'Data / Analytics';
  if (family === 'engineering') return 'Engineering';
  if (family === 'marketing') return 'Marketing';
  if (family === 'design') return 'Design';
  if (family === 'customer_service') return 'Customer Service';
  return currentRole;
}

function normalizeTargetRole(targetRole: string | null, currentRole: string | null): string | null {
  const role = `${targetRole ?? ''} ${currentRole ?? ''}`.toLowerCase();
  if (!role.trim()) return null;
  const family = classifyRoleFamily(role);
  if (family === 'hr_admin' || family === 'admin_support') return 'HR / Administrative Support';
  if (family === 'software_engineering') return 'Software Engineering';
  if (family === 'finance_accounting') return 'Finance / Accounting';
  if (family === 'sales_bd') return 'Sales / Business Development';
  if (family === 'operations') return 'Operations';
  if (family === 'data_analytics') return 'Data / Analytics';
  if (family === 'engineering') return 'Engineering';
  if (family === 'marketing') return 'Marketing';
  if (family === 'design') return 'Design';
  if (family === 'customer_service') return 'Customer Service';
  return targetRole;
}

function inferEducationLevel(education: string | null, text: string): string | null {
  const source = `${education ?? ''} ${text}`.toLowerCase();
  if (/master|msc|mba/.test(source)) return 'Master';
  if (/bachelor|degree|ijazah/.test(source)) return 'Bachelor';
  if (/diploma/.test(source)) return 'Diploma';
  if (/certificate|sijil/.test(source)) return 'Certificate';
  return null;
}

function inferFieldOfStudy(education: string | null, text: string): string | null {
  const source = `${education ?? ''} ${text}`.toLowerCase();
  if (/human resource|sumber manusia|hr/.test(source)) return 'Human Resources';
  if (/business administration|business admin|administrative|pentadbiran/.test(source)) return 'Business Administration';
  if (/management|pengurusan/.test(source)) return 'Management';
  if (/account|finance/.test(source)) return 'Accounting / Finance';
  return null;
}

function extractEducationDetails(lines: string[], aiEducation: string | null, text: string): {
  education: string | null;
  education_level: string | null;
  field_of_study: string | null;
} {
  const hits: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = normalizeWhitespace(lines[i]);
    if (!/(bachelor|degree|ijazah|diploma|stpm|cgpa|university|universiti|ukm|utm|uitm|um|usm)/i.test(line)) {
      continue;
    }
    const windowLines = lines
      .slice(i, Math.min(lines.length, i + 3))
      .map(item => normalizeWhitespace(item))
      .filter(Boolean)
      .filter(item => !/^(skills|experience|reference|work history)\b/i.test(item));
    const joined = windowLines.join(', ');
    if (joined && !hits.includes(joined)) hits.push(joined);
  }

  const source = [aiEducation, ...hits].filter(Boolean).join('; ');
  const level = inferEducationLevel(source || aiEducation, text);
  const field = inferFieldOfStudy(source || aiEducation, text);
  return {
    education: source || aiEducation || null,
    education_level: level,
    field_of_study: field,
  };
}

function buildRecruiterSummary(
  normalizedTargetRole: string | null,
  educationLevel: string | null,
  fieldOfStudy: string | null,
  hardSkills: string[],
  tools: string[],
  aiSummary: string | null
): string | null {
  if (aiSummary && aiSummary.trim().length >= 60) return aiSummary.trim();

  const target = normalizedTargetRole ?? 'junior roles';
  const education = [educationLevel, fieldOfStudy].filter(Boolean).join(' in ');
  const skillList = [...hardSkills, ...tools].slice(0, 5).join(', ');
  if (!education && !skillList) return aiSummary || null;

  const lead = education
    ? `${education} candidate`
    : 'Candidate';
  const skills = skillList
    ? ` with exposure to ${skillList}`
    : '';
  return `${lead}${skills}. Suitable for ${target}.`;
}

function hasValue(value: string | null | undefined): value is string {
  return Boolean(value && value.trim());
}

function isLowConfidence(confidence: 'high' | 'medium' | 'low' | null | undefined): boolean {
  return !confidence || confidence === 'low';
}

function isInvalidDeterministicLocation(value: string | null): boolean {
  if (!value) return true;
  const text = value.trim();
  if (!text) return true;
  if (text.includes(':')) return true;
  if (/linkedin|email|phone/i.test(text)) return true;
  if (/about me|work history|education/i.test(text)) return true;
  return false;
}

function isInvalidRoleFragment(value: string | null): boolean {
  if (!value) return true;
  return /verbal communication|supported|assisted|coordinated|skills/i.test(value);
}

export async function parseStructuredResumeFromText(
  extractedText: string,
  originalFilename: string,
  resumePath: string | null
): Promise<ResumeStructuredParseResult> {
  const lines = extractedText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const aiResult = await parseAdminResumeWithAI(extractedText);
  const ai = aiResult.extraction;

  const labelledEmail = extractLabelledEmail(lines);
  const labelledPhone = extractLabelledPhone(lines);
  const labelledAddress = extractLabelledAddress(lines);
  const workEntries = parseWorkEntries(lines);
  const latestWorkRole = workEntries.find(entry => hasValue(entry.raw_role_title))?.raw_role_title ?? null;
  const fallbackName = extractFirstStrongName(lines, originalFilename);
  const warnings: string[] = [];
  if (ai?.warnings?.length) warnings.push(...ai.warnings);
  if (labelledEmail.warning) warnings.push(labelledEmail.warning);
  const parserMode: 'rule-only' | 'ai-assisted' = ai ? 'ai-assisted' : 'rule-only';
  const aiConfidence = ai?.confidence ?? null;
  const aiWins = Boolean(ai && !isLowConfidence(aiConfidence));

  const deterministicName = fallbackName;
  const deterministicEmail = labelledEmail.value;
  const deterministicPhone = labelledPhone;
  const deterministicRole = latestWorkRole;
  const deterministicLocation = isInvalidDeterministicLocation(labelledAddress) ? null : labelledAddress;
  const classifiedSkills = classifySkills(extractedText, ai?.key_skills ?? []);
  const educationDetails = extractEducationDetails(lines, ai?.education ?? null, extractedText);
  const targetFamilySeed = inferTargetRoleFamily(
    ai?.target_role ?? null,
    normalizeCurrentRole(latestWorkRole || ai?.current_role || null, ai?.target_role ?? null),
    educationDetails.field_of_study,
    classifiedSkills.hard_skills,
    classifiedSkills.tools
  );
  const experience = inferExperienceFromWorkEntries(workEntries, targetFamilySeed);
  if (experience.hasFutureDatedRole) {
    warnings.push('Future-dated role timeline detected; experience estimate is conservative.');
    if (workEntries[0]?.is_future_dated) warnings.push('future_dated_current_role');
  }
  if (experience.hasAmbiguousEntries) {
    warnings.push('Some work history entries had ambiguous dates and were skipped for experience calculation.');
  }
  if (experience.relevant !== null) {
    warnings.push('Role-relevant experience is estimated from resume date ranges.');
  }
  if (classifiedSkills.soft_skills.length > 0) {
    warnings.push('Soft skills were separated from matching skills.');
  }

  let full_name: string;
  let email: string | null;
  let phone: string | null;
  let current_role: string | null;
  let location: string | null;
  let years_experience: number | null;
  let key_skills: string[];

  let full_name_source: 'AI' | 'RULE' | 'FALLBACK' = 'FALLBACK';
  let email_source: 'AI' | 'RULE' | 'FALLBACK' = 'FALLBACK';
  let phone_source: 'AI' | 'RULE' | 'FALLBACK' = 'FALLBACK';
  let current_role_source: 'AI' | 'RULE' | 'FALLBACK' = 'FALLBACK';
  let location_source: 'AI' | 'RULE' | 'FALLBACK' = 'FALLBACK';

  if (aiWins && hasValue(ai?.full_name)) {
    full_name = ai!.full_name!.trim();
    full_name_source = 'AI';
  } else if (hasValue(deterministicName)) {
    full_name = deterministicName.trim();
    full_name_source = 'RULE';
  } else if (hasValue(ai?.full_name)) {
    full_name = ai!.full_name!.trim();
    full_name_source = 'AI';
  } else {
    full_name = 'Unknown';
  }

  if (aiWins && hasValue(ai?.email)) {
    email = ai!.email!.trim();
    email_source = 'AI';
  } else if (hasValue(deterministicEmail)) {
    email = deterministicEmail!.trim();
    email_source = 'RULE';
  } else if (hasValue(ai?.email)) {
    email = ai!.email!.trim();
    email_source = 'AI';
  } else {
    email = null;
  }

  if (aiWins && hasValue(ai?.phone)) {
    phone = ai!.phone!.trim();
    phone_source = 'AI';
  } else if (hasValue(deterministicPhone)) {
    phone = deterministicPhone!.trim();
    phone_source = 'RULE';
  } else if (hasValue(ai?.phone)) {
    phone = ai!.phone!.trim();
    phone_source = 'AI';
  } else {
    phone = null;
  }

  const aiRoleValid = hasValue(ai?.current_role);
  const deterministicRoleValid = hasValue(deterministicRole) && !isInvalidRoleFragment(deterministicRole);
  if (deterministicRoleValid) {
    current_role = deterministicRole!.trim();
    current_role_source = 'RULE';
  } else if (aiWins && aiRoleValid) {
    current_role = ai!.current_role!.trim();
    current_role_source = 'AI';
  } else if (aiRoleValid) {
    current_role = ai!.current_role!.trim();
    current_role_source = 'AI';
  } else {
    current_role = null;
  }

  if (aiWins && hasValue(ai?.location)) {
    location = ai!.location!.trim();
    location_source = 'AI';
  } else if (deterministicLocation) {
    location = deterministicLocation;
    location_source = 'RULE';
  } else if (hasValue(ai?.location)) {
    location = ai!.location!.trim();
    location_source = 'AI';
  } else {
    location = null;
  }

  years_experience =
    experience.total ??
    (ai?.years_experience !== null && ai?.years_experience !== undefined && ai.years_experience > 0
      ? ai.years_experience
      : null);

  if (aiWins && Array.isArray(ai?.key_skills) && ai!.key_skills.length > 0) {
    key_skills = classifiedSkills.key_skills.length > 0 ? classifiedSkills.key_skills : ai!.key_skills;
  } else if (classifiedSkills.key_skills.length > 0) {
    key_skills = classifiedSkills.key_skills;
  } else {
    key_skills = ai?.key_skills ?? [];
  }

  const targetRole = normalizeRoleTarget(current_role, ai?.target_role ?? null);
  const normalized_current_role = normalizeCurrentRole(current_role, targetRole);
  const normalized_target_role = normalizeTargetRole(targetRole, current_role);
  const recruiterSummary = buildRecruiterSummary(
    normalized_target_role,
    educationDetails.education_level,
    educationDetails.field_of_study,
    classifiedSkills.hard_skills,
    classifiedSkills.tools,
    ai?.summary ?? null
  );

  return {
    candidate: {
      full_name,
      email,
      phone,
      current_role,
      target_role: targetRole,
      years_experience,
      total_work_experience_years: experience.total ?? years_experience,
      role_relevant_experience_years: experience.relevant,
      experience_confidence: experience.confidence,
      normalized_current_role,
      normalized_target_role,
      location,
      key_skills,
      hard_skills: classifiedSkills.hard_skills,
      soft_skills: classifiedSkills.soft_skills,
      tools: classifiedSkills.tools,
      languages: classifiedSkills.languages,
      education_level: educationDetails.education_level,
      field_of_study: educationDetails.field_of_study,
      education: educationDetails.education,
      notice_period: ai?.notice_period ?? null,
      summary: recruiterSummary,
      resume_file_path: resumePath,
    },
    rawAI: ai,
    parserMode,
    confidence: ai?.confidence ?? null,
    warnings,
    failureReason: ai ? null : aiResult.debug.failure_reason ?? 'ai_unavailable',
    parsed_work_entries: experience.entries,
    inferred_target_role_family: experience.inferredTargetRoleFamily,
    total_work_experience_years: experience.total ?? years_experience,
    role_relevant_experience_years: experience.relevant,
    experience_confidence: experience.confidence,
    full_name_source,
    email_source,
    phone_source,
    current_role_source,
    location_source,
    selectedEmailSource: labelledEmail.source ?? (ai?.email ? 'ai' : null),
    selectedRoleSource: latestWorkRole ? 'work_experience_line' : ai?.current_role ? 'ai' : 'rule',
    selectedLocationSource: labelledAddress ? 'labelled_address' : ai?.location ? 'ai' : 'rule',
  };
}
