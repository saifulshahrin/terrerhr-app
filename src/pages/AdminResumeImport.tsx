import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, UploadCloud } from 'lucide-react';
import { type AdminResumeAIExtraction, type ResumeAIConfidence } from '../lib/adminResumeAIParsing';
import { parseCandidateResumeText } from '../lib/candidateIntakeParser';
import { parseStructuredResumeFromText, type ParsedWorkEntry, type RoleFamily } from '../lib/resumeStructuredParser';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';

let pdfjsModulePromise: Promise<any> | null = null;
let pdfWorkerStatus: 'not_initialized' | 'configured' | 'config_failed' = 'not_initialized';
let pdfWorkerStatusDetail: string | null = null;

type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';
type ParseStatus = 'idle' | 'parsing' | 'parsed' | 'failed';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

interface ParsedResumeCandidate {
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

interface UploadRow {
  id: string;
  file: File;
  fileName: string;
  fileSizeBytes: number;
  validationError: string | null;
  status: UploadStatus;
  error: string | null;
  storagePath: string | null;
  resolvedUrl: string | null;
  parseStatus: ParseStatus;
  parseError: string | null;
  parsedCandidate: ParsedResumeCandidate | null;
  rawAIExtraction: AdminResumeAIExtraction | null;
  extractedTextLength: number | null;
  extractionMethod: 'pdfjs' | 'docx' | 'fallback' | null;
  extractionWarning: string | null;
  parserMode: 'rule-only' | 'ai-assisted';
  aiConfidence: ResumeAIConfidence | null;
  aiWarnings: string[];
  aiFailureReason: string | null;
  selectedEmailSource: 'labelled' | 'contact' | 'reference' | 'ai' | null;
  selectedRoleSource: 'work_experience_line' | 'ai' | 'rule' | null;
  selectedLocationSource: 'labelled_address' | 'ai' | 'rule' | null;
  parsedWorkEntries: ParsedWorkEntry[];
  inferredTargetRoleFamily: RoleFamily | null;
  fieldEdited: Partial<Record<keyof ParsedResumeCandidate, boolean>>;
  saveStatus: SaveStatus;
  saveError: string | null;
  savedCandidateId: string | null;
}

interface CandidateRow {
  candidate_id: string;
  display_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  current_role: string | null;
  target_role: string | null;
  years_experience: number | null;
  location_preference: string | null;
  key_skills: string[] | null;
  notice_period: string | null;
  resume_url: string | null;
  resume_file_path: string | null;
  notes: string | null;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const ACCEPTED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const SKILL_KEYWORDS = [
  'human resource administration',
  'administrative support',
  'documentation',
  'data management',
  'microsoft office',
  'communication',
  'javascript',
  'typescript',
  'python',
  'java',
  'react',
  'node.js',
  'node',
  'sql',
  'postgresql',
  'aws',
  'docker',
  'kubernetes',
  'excel',
  'power bi',
  'tableau',
  'figma',
  'product management',
  'project management',
  'recruitment',
  'golang',
  'c#',
  '.net',
];

const WEAK_ROLE_LABELS = new Set([
  'officer',
  'staff',
  'employee',
  'associate',
  'executive',
  'admin',
  'administrator',
]);

function formatBytes(value: number): string {
  if (!Number.isFinite(value)) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  const idx = lower.lastIndexOf('.');
  return idx >= 0 ? lower.slice(idx) : '';
}

function sanitizeFileName(fileName: string): string {
  return (
    fileName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'resume'
  );
}

function validateFile(file: File): string | null {
  const ext = getFileExtension(file.name);
  if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_MIME.has(file.type)) {
    return 'Unsupported file type. Only PDF, DOC, DOCX are allowed.';
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'File too large. Maximum allowed size is 10 MB per file.';
  }
  return null;
}

function buildStoragePath(file: File): string {
  const date = new Date().toISOString().slice(0, 10);
  const stamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const safe = sanitizeFileName(file.name);
  return `admin-imports/${date}/${stamp}-${random}-${safe}`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function extractReadableTextFromBinary(decoded: string): string {
  const matches = decoded.match(/[A-Za-z][A-Za-z0-9@,.:;()\-+/#&\s]{3,}/g) ?? [];
  const lines = matches
    .map(part => normalizeWhitespace(part))
    .filter(line => line.length >= 4)
    .slice(0, 600);
  return [...new Set(lines)].join('\n');
}

async function extractTextFromFile(file: File): Promise<string> {
  const ext = getFileExtension(file.name);
  if (ext === '.pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const loadingTask = pdfjs.getDocument({
        data: pdfBytes,
        disableWorker: true,
      });
      const pdfDocument = await loadingTask.promise;
      const pagesText: string[] = [];
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageText = (textContent.items as Array<{ str?: string }>)
          .map(item => item.str ?? '')
          .join(' ')
          .trim();
        if (pageText) pagesText.push(pageText);
      }
      const parsed = pagesText.join('\n').trim();
      if (parsed) return parsed;
      throw new Error('Empty text from PDF pages');
    } catch {
      // fall back below when PDF parsing fails
    }
  }

  try {
    const plainText = await file.text();
    const normalized = normalizeWhitespace(plainText);
    if (normalized.length > 60) return plainText;
  } catch {
    // fallback below
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const latin = new TextDecoder('latin1').decode(bytes);
  const utf8Readable = extractReadableTextFromBinary(utf8);
  const latinReadable = extractReadableTextFromBinary(latin);

  return utf8Readable.length >= latinReadable.length ? utf8Readable : latinReadable;
}

async function getPdfJsModule(): Promise<any> {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import('pdfjs-dist/legacy/build/pdf.mjs').then(module => {
      try {
        if (module?.GlobalWorkerOptions) {
          const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
          module.GlobalWorkerOptions.workerSrc = workerUrl;
          pdfWorkerStatus = 'configured';
          pdfWorkerStatusDetail = null;
        } else {
          pdfWorkerStatus = 'config_failed';
          pdfWorkerStatusDetail = 'GlobalWorkerOptions unavailable';
        }
      } catch (error) {
        pdfWorkerStatus = 'config_failed';
        pdfWorkerStatusDetail = error instanceof Error ? error.message : 'worker_config_error';
      }
      return module;
    });
  }
  return pdfjsModulePromise;
}

async function extractTextWithMeta(file: File): Promise<{
  text: string;
  method: 'pdfjs' | 'docx' | 'fallback';
  warning: string | null;
}> {
  const ext = getFileExtension(file.name);

  if (ext === '.pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    try {
      const pdfjs = await getPdfJsModule();
      const loadingTask = pdfjs.getDocument({
        data: pdfBytes,
        useWorkerFetch: true,
      });
      const pdfDocument = await loadingTask.promise;
      const pagesText: string[] = [];
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageText = (textContent.items as Array<{ str?: string }>)
          .map(item => item.str ?? '')
          .join(' ')
          .trim();
        if (pageText) pagesText.push(pageText);
      }
      const text = pagesText.join('\n').trim();
      if (text) {
        return { text, method: 'pdfjs', warning: null };
      }
      const fallbackText = await extractTextFromFile(file);
      return {
        text: fallbackText,
        method: 'fallback',
        warning: `PDF text extraction returned no readable text. Fallback extraction used. worker_status=${pdfWorkerStatus}${pdfWorkerStatusDetail ? ` (${pdfWorkerStatusDetail})` : ''}`,
      };
    } catch (error) {
      const extractionErrorMessage = error instanceof Error ? error.message : 'unknown_pdf_extraction_error';
      const fallbackText = await extractTextFromFile(file);
      return {
        text: fallbackText,
        method: 'fallback',
        warning: `PDF extraction via pdfjs failed. Fallback extraction used. worker_status=${pdfWorkerStatus}${pdfWorkerStatusDetail ? ` (${pdfWorkerStatusDetail})` : ''}; error=${extractionErrorMessage}`,
      };
    }
  }

  const text = await extractTextFromFile(file);
  const method = ext === '.doc' || ext === '.docx' ? 'docx' : 'fallback';
  return { text, method, warning: null };
}

function detectEmail(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  type CandidateEmail = { value: string; score: number; source: 'labelled' | 'contact' | 'reference' };
  const candidates: CandidateEmail[] = [];
  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const emailLabelRegex = /\bemail\b\s*[:\-]\s*([^\s,;]+)/i;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const sectionWindow = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 3)).join(' ').toLowerCase();
    const inReferenceSection = /reference|rujukan|lecturer|pensyarah|supervisor/.test(sectionWindow);
    const labelled = line.match(emailLabelRegex);
    if (labelled?.[1]) {
      const rawLabelEmail = labelled[1].trim().toLowerCase().replace(/[),.;]+$/g, '');
      let normalizedLabelEmail = rawLabelEmail;
      if (!rawLabelEmail.includes('@') && /gmail\.com$/.test(rawLabelEmail)) {
        normalizedLabelEmail = rawLabelEmail.replace(/gmail\.com$/, '@gmail.com');
      }
      candidates.push({
        value: normalizedLabelEmail,
        score: inReferenceSection ? -2 : 14,
        source: inReferenceSection ? 'reference' : 'labelled',
      });
    }
    const matches = line.match(emailRegex) ?? [];
    for (const raw of matches) {
      const email = raw.toLowerCase().trim();
      let score = 0;
      if (i < 25) score += 6; // top of resume
      if (inReferenceSection) score -= 10;
      if (/gmail|yahoo|hotmail|outlook/i.test(email)) score += 4;
      if (/\.edu\./i.test(email)) score -= 3;
      if (/email|e-mail|contact/i.test(line.toLowerCase())) score += 2;
      candidates.push({
        value: email,
        score,
        source: inReferenceSection ? 'reference' : 'contact',
      });
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].value;
}

function detectEmailWithSource(text: string): {
  value: string | null;
  source: 'labelled' | 'contact' | 'reference' | null;
  warning: string | null;
} {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const emailLabelRegex = /\bemail\b\s*[:\-]\s*([^\s,;]+)/i;
  const strictEmailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  const candidatePool: Array<{ value: string; score: number; source: 'labelled' | 'contact' | 'reference'; warning: string | null }> = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const sectionWindow = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 3)).join(' ').toLowerCase();
    const inReference = /reference|rujukan|lecturer|pensyarah|supervisor/.test(sectionWindow);
    const labelMatch = line.match(emailLabelRegex);
    if (labelMatch?.[1]) {
      const raw = labelMatch[1].trim().replace(/[),.;]+$/g, '');
      let candidate = raw.toLowerCase();
      let warning: string | null = null;
      if (!candidate.includes('@') && /gmail\.com$/i.test(candidate)) {
        candidate = candidate.replace(/gmail\.com$/i, '@gmail.com');
        warning = 'Email normalized from labelled contact text.';
      }
      candidatePool.push({
        value: candidate,
        score: inReference ? -2 : 16,
        source: inReference ? 'reference' : 'labelled',
        warning,
      });
    }

    const regexHits = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
    for (const hit of regexHits) {
      const value = hit.toLowerCase();
      let score = 0;
      if (i < 25) score += 5;
      if (inReference) score -= 10;
      if (/\.edu\./i.test(value)) score -= 4;
      if (/gmail|yahoo|hotmail|outlook/i.test(value)) score += 3;
      candidatePool.push({
        value,
        score,
        source: inReference ? 'reference' : 'contact',
        warning: null,
      });
    }
  }

  if (!candidatePool.length) return { value: null, source: null, warning: null };
  candidatePool.sort((a, b) => b.score - a.score);
  const top = candidatePool.find(entry => strictEmailRegex.test(entry.value)) ?? candidatePool[0];
  return { value: top.value, source: top.source, warning: top.warning };
}

function detectPhone(text: string): string | null {
  const match = text.match(/(?:\+?6?0[\s-]?)?(?:1\d{1}|[3-9]\d)[\s-]?\d{3,4}[\s-]?\d{3,4}/);
  return match ? normalizeWhitespace(match[0]) : null;
}

function detectYearsExperience(text: string): number | null {
  const match = text.match(/(\d{1,2})\s*\+?\s*(?:years|year|yrs|yr)\b/i);
  if (match) {
    const value = Number(match[1]);
    if (Number.isFinite(value)) return value;
  }

  const lines = text.split(/\r?\n/);
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

  function parseDateToken(token: string): { year: number; month: number } | null {
    const lower = token.toLowerCase().replace(/\./g, ' ').trim();
    const yearMatch = lower.match(/\b(19|20)\d{2}\b/);
    if (!yearMatch) return null;
    const year = Number(yearMatch[0]);
    let month = 1;
    for (const [name, number] of Object.entries(monthMap)) {
      if (new RegExp(`\\b${name}\\b`, 'i').test(lower)) {
        month = number;
        break;
      }
    }
    return { year, month };
  }

  const ranges: Array<{ start: { year: number; month: number }; end: { year: number; month: number } }> = [];
  for (const line of lines) {
    if (!/(19|20)\d{2}/.test(line)) continue;
    const normalized = line.replace(/\u2013|\u2014/g, '-');
    const parts = normalized.split('-').map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const start = parseDateToken(parts[0]);
    const endToken = parts[1].toLowerCase();
    const end =
      /present|current|kini|sekarang/.test(endToken)
        ? { year: new Date().getFullYear(), month: new Date().getMonth() + 1 }
        : parseDateToken(parts[1]);
    if (start && end) ranges.push({ start, end });
  }

  if (!ranges.length) return null;
  let totalMonths = 0;
  for (const r of ranges) {
    const startMonths = r.start.year * 12 + r.start.month;
    const endMonths = r.end.year * 12 + r.end.month;
    if (endMonths >= startMonths) totalMonths += endMonths - startMonths + 1;
  }
  if (totalMonths <= 0) return null;
  return Math.round((totalMonths / 12) * 10) / 10;
}

function detectNoticePeriod(text: string): string | null {
  const match = text.match(
    /\b(immediate|30\s*days?|60\s*days?|90\s*days?|1\s*month|2\s*months?|3\s*months?|notice period[:\s-]*[^\n,.]+)/i
  );
  return match ? normalizeWhitespace(match[0]) : null;
}

function detectLocation(text: string): string | null {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (const line of lines.slice(0, 80)) {
    const match = line.match(/\b(?:address|adress)\b\s*[:\-]\s*(.+)$/i);
    if (match?.[1]) {
      const labelledAddress = normalizeWhitespace(match[1]).replace(/[.;]+$/, '');
      if (labelledAddress.length > 4) return labelledAddress;
    }
  }

  const locations = [
    'Kuala Lumpur',
    'Selangor',
    'Petaling Jaya',
    'Shah Alam',
    'Johor Bahru',
    'Penang',
    'George Town',
    'Cyberjaya',
    'Putrajaya',
    'Negeri Sembilan',
    'N. Sembilan',
    'Kuala Pilah',
    'Malaysia',
    'Singapore',
  ];
  const lower = text.toLowerCase();
  const found = locations.find(location => lower.includes(location.toLowerCase()));
  return found ?? null;
}

function detectEducation(lines: string[]): string | null {
  const hit = lines.find(line => /(university|bachelor|master|degree|diploma|college)/i.test(line));
  return hit ? normalizeWhitespace(hit) : null;
}

function detectSummary(lines: string[]): string | null {
  const useful = lines
    .map(line => normalizeWhitespace(line))
    .filter(line => line.length > 30)
    .filter(line => !/^(email|phone|mobile|address)[:\s]/i.test(line))
    .slice(0, 2);
  return useful.length > 0 ? useful.join(' ') : null;
}

function detectSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const direct = SKILL_KEYWORDS
    .filter(skill => lower.includes(skill))
    .map(skill => skill.replace(/\b\w/g, letter => letter.toUpperCase()))
    .slice(0, 12);

  const enriched = new Set(direct);
  if (/\bhr\b|human resource|personnel|payroll|recruitment|training/i.test(text)) {
    enriched.add('Human Resource Administration');
  }
  if (/document|documentation|filing|record/i.test(text)) {
    enriched.add('Documentation');
  }
  if (/data entry|data management|database|spreadsheet/i.test(text)) {
    enriched.add('Data Management');
  }
  if (/administrative|admin support|clerical|office support/i.test(text)) {
    enriched.add('Administrative Support');
  }
  if (/microsoft office|word|powerpoint|excel/i.test(text)) {
    enriched.add('Microsoft Office');
    if (/excel/i.test(text)) enriched.add('Excel');
  }
  if (/\bspss\b/i.test(text)) enriched.add('SPSS');
  if (/\bcanva\b/i.test(text)) enriched.add('Canva');
  if (/communication|communicate|interpersonal/i.test(text)) enriched.add('Communication');

  return Array.from(enriched).slice(0, 20);
}

function inferTargetRole(currentRole: string | null): string | null {
  if (!currentRole) return null;
  if (/senior|lead|manager/i.test(currentRole)) return currentRole;
  return `Senior ${currentRole}`.replace(/\s+/g, ' ').trim();
}

function detectName(lines: string[], fallbackFileName: string): string {
  const cleanedFallback = fallbackFileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b(resume|cv)\b/gi, '')
    .replace(/\d+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanedLines = lines
    .map(line => normalizeWhitespace(line))
    .filter(Boolean)
    .map(line => line.replace(/\b(resume|cv)\b/gi, '').replace(/\d+$/g, '').trim())
    .filter(line => !/@/.test(line))
    .filter(line => !/\b(resume|curriculum vitae|cv|email|phone|mobile)\b/i.test(line))
    .filter(line => !/\d{2,}/.test(line));

  const firstStrongCaps = cleanedLines.find(line => {
    if (!/^[A-Z\s'.-]+$/.test(line)) return false;
    if (/address|adress|phone|mobile|email|about me/i.test(line)) return false;
    const words = line.split(' ').filter(Boolean);
    return words.length >= 3 && words.length <= 8;
  });
  if (firstStrongCaps) return firstStrongCaps;

  const firstNameLike = cleanedLines.find(line => {
    const words = line.split(' ').filter(Boolean);
    if (words.length < 2 || words.length > 5) return false;
    return words.every(word => /^[A-Za-z'.-]+$/.test(word));
  });

  if (firstNameLike) return firstNameLike;
  return cleanedFallback || 'Unknown';
}

function detectCurrentRole(lines: string[], fallbackRole: string | null): { role: string | null; source: 'work_experience_line' | 'rule' } {
  const roleLineHints = /(position|title|jawatan|role|experience|employment|work history)/i;
  const rolePatterns = [
    /(pelatih\s+skim\s+latihan\s+khas[^\n,]*)/i,
    /(hr\s+(?:admin(?:istrative)?|assistant|trainee)[^\n,]*)/i,
    /((?:human resource|hr)[^\n,]{0,40}(?:trainee|intern|assistant|admin)[^\n,]*)/i,
    /((?:administrative|admin)\s+(?:assistant|support|trainee)[^\n,]*)/i,
  ];

  for (const line of lines) {
    if (!line.includes('|')) continue;
    const normalized = line.replace(/\u2013|\u2014/g, '-');
    const parts = normalized.split('|').map(part => normalizeWhitespace(part)).filter(Boolean);
    if (parts.length < 3) continue;
    const middle = parts[parts.length - 2].toLowerCase();
    if (!/(19|20)\d{2}|present|current|kini|sekarang|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|mac|ogos|okt|dis/i.test(middle)) continue;
    const roleSegment = parts[parts.length - 1].split(/[•\-–—]/)[0].trim();
    if (roleSegment && !WEAK_ROLE_LABELS.has(roleSegment.toLowerCase())) {
      return { role: roleSegment, source: 'work_experience_line' };
    }
  }

  for (const line of lines.slice(0, 120)) {
    for (const pattern of rolePatterns) {
      const match = line.match(pattern);
      if (match?.[1]) return { role: normalizeWhitespace(match[1]), source: 'rule' };
    }
  }

  for (let i = 0; i < Math.min(lines.length, 140); i += 1) {
    const line = normalizeWhitespace(lines[i]);
    if (!line || line.length > 90) continue;
    const nearby = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join(' ');
    if (!roleLineHints.test(nearby)) continue;
    if (/\b(officer|staff|employee)\b/i.test(line)) continue;
    if (/(assistant|trainee|intern|executive|coordinator|administrator|admin|specialist|analyst|manager)/i.test(line)) {
      return { role: line, source: 'rule' };
    }
  }

  const normalizedFallback = (fallbackRole ?? '').trim();
  if (!normalizedFallback) return { role: null, source: 'rule' };
  if (WEAK_ROLE_LABELS.has(normalizedFallback.toLowerCase())) return { role: null, source: 'rule' };
  return { role: normalizedFallback, source: 'rule' };
}

function parseResumeIntoCandidate(rawText: string, fallbackFileName: string, resumePath: string | null): {
  candidate: ParsedResumeCandidate;
  selected_email_source: 'labelled' | 'contact' | 'reference' | null;
  selected_role_source: 'work_experience_line' | 'rule';
  selected_location_source: 'labelled_address' | 'rule';
  warning: string | null;
} {
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const base = parseCandidateResumeText(rawText);
  const name = detectName(lines, fallbackFileName);
  const skills = detectSkills(rawText);
  const emailDetected = detectEmailWithSource(rawText);
  const roleDetected = detectCurrentRole(lines, base.role || null);
  const detectedRole = roleDetected.role;
  const labelledAddress = lines
    .slice(0, 80)
    .map(line => line.match(/\b(?:address|adress)\b\s*[:\-]\s*(.+)$/i)?.[1]?.trim() ?? null)
    .find(Boolean);
  const location = labelledAddress ? normalizeWhitespace(labelledAddress) : (base.location || detectLocation(rawText));
  const locationSource: 'labelled_address' | 'rule' = labelledAddress ? 'labelled_address' : 'rule';
  const targetRole =
    /hr|human resource|administrative|admin/i.test(detectedRole ?? '')
      ? 'HR / Administrative role'
      : inferTargetRole(detectedRole || null);

  return {
    candidate: {
      full_name: name || 'Unknown',
      email: emailDetected.value || detectEmail(rawText),
      phone: detectPhone(rawText),
      current_role: detectedRole || null,
      target_role: targetRole || null,
      years_experience: detectYearsExperience(rawText),
      location,
      key_skills: skills.length > 0 ? skills : base.skills,
      education: detectEducation(lines),
      notice_period: detectNoticePeriod(rawText),
      summary: base.notes || detectSummary(lines),
      resume_file_path: resumePath,
    },
    selected_email_source: emailDetected.source,
    selected_role_source: roleDetected.source,
    selected_location_source: locationSource,
    warning: emailDetected.warning,
  };
}

function mergeMissing(existing: string | null | undefined, incoming: string | null | undefined): string | null {
  const current = existing?.trim();
  if (current) return current;
  return incoming?.trim() || null;
}

function mergeArrayMissing(existing: string[] | null | undefined, incoming: string[]): string[] | null {
  if (Array.isArray(existing) && existing.length > 0) return existing;
  return incoming.length > 0 ? incoming : null;
}

function preserveEditedFields(
  existing: ParsedResumeCandidate | null,
  next: ParsedResumeCandidate,
  edited: Partial<Record<keyof ParsedResumeCandidate, boolean>>
): ParsedResumeCandidate {
  if (!existing) return next;
  const merged = { ...next };
  (Object.keys(edited) as Array<keyof ParsedResumeCandidate>).forEach(key => {
    if (edited[key]) {
      merged[key] = existing[key];
    }
  });
  return merged;
}

export default function AdminResumeImport() {
  const { role } = useAuth();
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const canAccess = role === 'admin';

  const summary = useMemo(() => {
    const pending = rows.filter(r => r.status === 'pending').length;
    const uploading = rows.filter(r => r.status === 'uploading').length;
    const uploaded = rows.filter(r => r.status === 'uploaded').length;
    const failed = rows.filter(r => r.status === 'failed').length;
    return { pending, uploading, uploaded, failed };
  }, [rows]);

  if (!canAccess) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Restricted</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-950">Admin Resume Import</h1>
        <p className="mt-2 text-sm text-slate-600">
          You are not authorized to access this page.
        </p>
      </div>
    );
  }

  const handlePickFiles = (files: FileList | null) => {
    setGlobalError(null);
    if (!files || files.length === 0) {
      setGlobalError('No file selected.');
      return;
    }

    const additions: UploadRow[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      fileName: file.name,
      fileSizeBytes: file.size,
      validationError: validateFile(file),
      status: 'pending',
      error: null,
      storagePath: null,
      resolvedUrl: null,
      parseStatus: 'idle',
      parseError: null,
      parsedCandidate: null,
      rawAIExtraction: null,
      extractedTextLength: null,
      extractionMethod: null,
      extractionWarning: null,
      parserMode: 'rule-only',
      aiConfidence: null,
      aiWarnings: [],
      aiFailureReason: null,
      selectedEmailSource: null,
      selectedRoleSource: null,
      selectedLocationSource: null,
      parsedWorkEntries: [],
      inferredTargetRoleFamily: null,
      fieldEdited: {},
      saveStatus: 'idle',
      saveError: null,
      savedCandidateId: null,
    }));

    setRows(prev => [...additions, ...prev]);
  };

  const uploadAll = async () => {
    setGlobalError(null);
    if (rows.length === 0) {
      setGlobalError('No file selected.');
      return;
    }

    const validRows = rows.filter(row => !row.validationError);
    if (validRows.length === 0) {
      setGlobalError('All selected files have validation errors.');
      return;
    }

    setIsUploading(true);
    for (const row of validRows) {
      if (row.status === 'uploaded') continue;

      setRows(prev => prev.map(r => (r.id === row.id ? { ...r, status: 'uploading', error: null } : r)));

      const storagePath = buildStoragePath(row.file);
      try {
        const { error: uploadError } = await supabase.storage
          .from('candidate-resumes')
          .upload(storagePath, row.file, {
            upsert: false,
            cacheControl: '3600',
          });

        if (uploadError) throw uploadError;

        let resolvedUrl: string | null = null;
        try {
          const { data: signedData, error: signedError } = await supabase.storage
            .from('candidate-resumes')
            .createSignedUrl(storagePath, 3600);
          if (!signedError && signedData?.signedUrl) {
            resolvedUrl = signedData.signedUrl;
          }
        } catch {
          // ignore and fallback
        }

        if (!resolvedUrl) {
          const { data: publicData } = supabase.storage.from('candidate-resumes').getPublicUrl(storagePath);
          resolvedUrl = publicData?.publicUrl ?? null;
        }

        setRows(prev =>
          prev.map(r =>
            r.id === row.id
              ? {
                  ...r,
                  status: 'uploaded',
                  storagePath,
                  resolvedUrl,
                  error: null,
                }
              : r
          )
        );
      } catch (uploadErr) {
        const message = uploadErr instanceof Error ? uploadErr.message : 'Upload failed';
        setRows(prev =>
          prev.map(r =>
            r.id === row.id
              ? {
                  ...r,
                  status: 'failed',
                  error: message,
                  storagePath: null,
                  resolvedUrl: null,
                }
              : r
          )
        );
      }
    }
    setIsUploading(false);
  };

  const handleParseResume = async (rowId: string) => {
    const target = rows.find(r => r.id === rowId);
    if (!target) return;
    if (target.status !== 'uploaded') return;

    setRows(prev =>
      prev.map(r => (r.id === rowId ? { ...r, parseStatus: 'parsing', parseError: null, saveError: null } : r))
    );

    try {
      const extraction = await extractTextWithMeta(target.file);
      const extractedText = extraction.text;
      if (!normalizeWhitespace(extractedText)) {
        throw new Error('Unable to parse - manual review required');
      }

      const structured = await parseStructuredResumeFromText(
        extractedText,
        target.fileName,
        target.storagePath
      );

      setRows(prev =>
        prev.map(r =>
          r.id === rowId
            ? {
                ...r,
                parseStatus: 'parsed',
                parseError: structured.parserMode === 'ai-assisted'
                  ? null
                  : `AI parsing unavailable. Rule-based preview shown. ${structured.failureReason ? `Reason: ${structured.failureReason}` : ''}`.trim(),
                parsedCandidate: preserveEditedFields(r.parsedCandidate, structured.candidate, r.fieldEdited),
                rawAIExtraction: structured.rawAI,
                extractedTextLength: extractedText.length,
                extractionMethod: extraction.method,
                extractionWarning: extraction.warning,
                parserMode: structured.parserMode,
                aiConfidence: structured.confidence,
                aiWarnings: structured.warnings,
                aiFailureReason: structured.failureReason,
                selectedEmailSource: structured.selectedEmailSource,
                selectedRoleSource: structured.selectedRoleSource,
                selectedLocationSource: structured.selectedLocationSource,
                parsedWorkEntries: structured.parsed_work_entries,
                inferredTargetRoleFamily: structured.inferred_target_role_family,
              }
            : r
        )
      );
    } catch (error) {
      console.error('[AdminResumeImport] parse failed:', error);
      setRows(prev =>
        prev.map(r =>
          r.id === rowId
            ? {
                ...r,
                parseStatus: 'failed',
                parseError: 'Unable to parse - manual review required.',
                parsedCandidate: {
                  full_name: target.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Unknown',
                  email: null,
                  phone: null,
                  current_role: null,
                  target_role: null,
                  years_experience: null,
                  total_work_experience_years: null,
                  role_relevant_experience_years: null,
                  experience_confidence: 'low',
                  normalized_current_role: null,
                  normalized_target_role: null,
                  location: null,
                  key_skills: [],
                  hard_skills: [],
                  soft_skills: [],
                  tools: [],
                  languages: [],
                  education_level: null,
                  field_of_study: null,
                  education: null,
                  notice_period: null,
                  summary: null,
                  resume_file_path: target.storagePath,
                },
                rawAIExtraction: null,
                extractedTextLength: null,
                extractionMethod: null,
                extractionWarning: null,
                parserMode: 'rule-only',
                aiConfidence: null,
                aiWarnings: [],
                aiFailureReason: 'parse_exception',
                selectedEmailSource: null,
                selectedRoleSource: null,
                selectedLocationSource: null,
                parsedWorkEntries: [],
                inferredTargetRoleFamily: null,
              }
            : r
        )
      );
    }
  };

  const updateParsedField = (rowId: string, field: keyof ParsedResumeCandidate, value: string) => {
    setRows(prev =>
      prev.map(row => {
        if (row.id !== rowId || !row.parsedCandidate) return row;

        const next = { ...row.parsedCandidate };
        if (field === 'years_experience') {
          const asNumber = Number(value);
          next.years_experience = Number.isFinite(asNumber) ? asNumber : null;
        } else if (field === 'key_skills') {
          next.key_skills = value
            .split(',')
            .map(skill => skill.trim())
            .filter(Boolean)
            .slice(0, 20);
        } else {
          const normalized = value.trim();
          (next as Record<string, string | null>)[field] = normalized || null;
        }

        return {
          ...row,
          parsedCandidate: next,
          fieldEdited: { ...row.fieldEdited, [field]: true },
          saveStatus: 'idle',
          saveError: null,
        };
      })
    );
  };

  const saveCandidate = async (rowId: string) => {
    const target = rows.find(r => r.id === rowId);
    if (!target?.parsedCandidate) return;

    const parsed = target.parsedCandidate;
    const now = new Date().toISOString();

    setRows(prev => prev.map(r => (r.id === rowId ? { ...r, saveStatus: 'saving', saveError: null } : r)));

    try {
      let matchedCandidate: CandidateRow | null = null;

      if (parsed.email) {
        const { data: byEmail, error: byEmailError } = await supabase
          .from('candidates')
          .select(
            'candidate_id,display_name,full_name,email,phone,current_role,target_role,years_experience,location_preference,key_skills,notice_period,resume_url,resume_file_path,notes'
          )
          .eq('email', parsed.email)
          .limit(1)
          .maybeSingle();
        if (byEmailError) throw byEmailError;
        matchedCandidate = byEmail as CandidateRow | null;
      }

      if (!matchedCandidate && parsed.phone) {
        const { data: byPhone, error: byPhoneError } = await supabase
          .from('candidates')
          .select(
            'candidate_id,display_name,full_name,email,phone,current_role,target_role,years_experience,location_preference,key_skills,notice_period,resume_url,resume_file_path,notes'
          )
          .eq('phone', parsed.phone)
          .limit(1)
          .maybeSingle();
        if (byPhoneError) throw byPhoneError;
        matchedCandidate = byPhone as CandidateRow | null;
      }

      if (matchedCandidate) {
        const updatePayload = {
          full_name: mergeMissing(matchedCandidate.full_name, parsed.full_name),
          display_name: mergeMissing(matchedCandidate.display_name, parsed.full_name),
          email: mergeMissing(matchedCandidate.email, parsed.email),
          phone: mergeMissing(matchedCandidate.phone, parsed.phone),
          current_role: mergeMissing(matchedCandidate.current_role, parsed.current_role),
          target_role: mergeMissing(matchedCandidate.target_role, parsed.target_role),
          years_experience: matchedCandidate.years_experience ?? parsed.years_experience,
          location_preference: mergeMissing(matchedCandidate.location_preference, parsed.location),
          key_skills: mergeArrayMissing(matchedCandidate.key_skills, parsed.key_skills),
          notice_period: mergeMissing(matchedCandidate.notice_period, parsed.notice_period),
          resume_file_path: mergeMissing(matchedCandidate.resume_file_path, parsed.resume_file_path),
          resume_url: mergeMissing(
            matchedCandidate.resume_url,
            parsed.resume_file_path ? `storage:candidate-resumes/${parsed.resume_file_path}` : null
          ),
          source_type: 'admin_resume_import',
          notes: mergeMissing(matchedCandidate.notes, parsed.summary),
          updated_at: now,
        };

        const { error: updateError } = await supabase
          .from('candidates')
          .update(updatePayload)
          .eq('candidate_id', matchedCandidate.candidate_id);
        if (updateError) throw updateError;

        setRows(prev =>
          prev.map(r =>
            r.id === rowId
              ? {
                  ...r,
                  saveStatus: 'saved',
                  saveError: null,
                  savedCandidateId: matchedCandidate?.candidate_id ?? null,
                }
              : r
          )
        );
        return;
      }

      const candidateId = crypto.randomUUID();
      const insertPayload = {
        candidate_id: candidateId,
        display_name: parsed.full_name || 'Unknown',
        full_name: parsed.full_name || 'Unknown',
        email: parsed.email,
        phone: parsed.phone,
        current_role: parsed.current_role,
        target_role: parsed.target_role,
        primary_role: parsed.current_role || parsed.target_role || 'Unknown',
        years_experience: parsed.years_experience,
        location_preference: parsed.location,
        city: parsed.location,
        key_skills: parsed.key_skills.length > 0 ? parsed.key_skills : null,
        notice_period: parsed.notice_period,
        resume_file_path: parsed.resume_file_path,
        resume_url: parsed.resume_file_path ? `storage:candidate-resumes/${parsed.resume_file_path}` : null,
        source_type: 'admin_resume_import',
        candidate_status: 'active',
        notes: parsed.summary,
        created_at: now,
        updated_at: now,
      };

      const { error: insertError } = await supabase.from('candidates').insert(insertPayload);
      if (insertError) throw insertError;

      setRows(prev =>
        prev.map(r =>
          r.id === rowId
            ? {
                ...r,
                saveStatus: 'saved',
                saveError: null,
                savedCandidateId: candidateId,
              }
            : r
        )
      );
    } catch (error) {
      console.error('[AdminResumeImport] save candidate failed:', error);
      setRows(prev =>
        prev.map(r =>
          r.id === rowId
            ? {
                ...r,
                saveStatus: 'failed',
                saveError: 'Unable to save candidate record. Please review fields and try again.',
              }
            : r
        )
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Candidates</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Admin Resume Import</h1>
        <p className="mt-2 text-sm text-slate-600">
          Bulk upload resumes, parse into structured candidate previews, then review and save manually.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <UploadCloud size={16} />
            Select Files
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={event => handlePickFiles(event.target.files)}
            />
          </label>
          <button
            type="button"
            onClick={() => void uploadAll()}
            disabled={isUploading}
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isUploading ? 'Uploading...' : 'Upload All'}
          </button>
        </div>

        {globalError ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {globalError}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">Pending: {summary.pending}</div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">Uploading: {summary.uploading}</div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">Uploaded: {summary.uploaded}</div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">Failed: {summary.failed}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-sm font-semibold text-slate-900">Selected Files</p>
        </div>
        {rows.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-500">No files selected yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map(row => (
              <div key={row.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.fileName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{formatBytes(row.fileSizeBytes)}</p>
                  </div>
                  <div className="text-xs">
                    {row.status === 'uploaded' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                        <CheckCircle2 size={12} />
                        Uploaded
                      </span>
                    ) : row.status === 'failed' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 font-semibold text-red-700">
                        <AlertTriangle size={12} />
                        Failed
                      </span>
                    ) : row.status === 'uploading' ? (
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700">
                        Uploading
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {row.validationError ? (
                  <p className="mt-2 text-xs text-red-700">{row.validationError}</p>
                ) : null}
                {row.error ? (
                  <p className="mt-2 text-xs text-red-700">{row.error}</p>
                ) : null}

                {row.status === 'uploaded' ? (
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <p><span className="font-semibold text-slate-700">Storage path:</span> {row.storagePath}</p>
                    <p><span className="font-semibold text-slate-700">URL:</span> {row.resolvedUrl ?? 'Not resolvable'}</p>
                  </div>
                ) : null}

                {row.status === 'uploaded' ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleParseResume(row.id)}
                      disabled={row.parseStatus === 'parsing'}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {row.parseStatus === 'parsing' ? 'Parsing...' : 'Parse Resume'}
                    </button>
                    {row.parseStatus === 'parsed' ? (
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                        Parsed
                      </span>
                    ) : null}
                    {row.parseStatus === 'failed' ? (
                      <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                        Needs Manual Review
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {row.parseError ? (
                  <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                    {row.parseError}
                  </p>
                ) : null}
                {row.extractionMethod ? (
                  <p className="mt-2 text-xs text-slate-600">
                    Extraction: <span className="font-semibold">{row.extractionMethod}</span> | extracted_text_length: {row.extractedTextLength ?? 0}
                  </p>
                ) : null}
                {row.selectedEmailSource || row.selectedRoleSource || row.selectedLocationSource ? (
                  <p className="mt-1 text-xs text-slate-600">
                    email_source={row.selectedEmailSource ?? 'n/a'} | role_source={row.selectedRoleSource ?? 'n/a'} | location_source={row.selectedLocationSource ?? 'n/a'}
                  </p>
                ) : null}
                {row.extractionWarning ? (
                  <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                    {row.extractionWarning}
                  </p>
                ) : null}

                {row.parsedCandidate ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Candidate Preview</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600 md:col-span-2">
                        <p>
                          <span className="font-medium text-slate-700">Parser mode:</span>{' '}
                          {row.parserMode === 'ai-assisted' ? 'AI-assisted' : 'Rule-only'}
                        </p>
                        <p className="mt-1">
                          <span className="font-medium text-slate-700">Confidence:</span>{' '}
                          {row.aiConfidence ?? (row.parserMode === 'rule-only' ? 'N/A' : 'low')}
                        </p>
                        {row.aiWarnings.length > 0 ? (
                          <ul className="mt-1 list-disc pl-5">
                            {row.aiWarnings.slice(0, 4).map((warning, index) => (
                              <li key={`${row.id}-warning-${index}`}>{warning}</li>
                            ))}
                          </ul>
                        ) : null}
                        {!row.aiWarnings.length && row.aiFailureReason ? (
                          <p className="mt-1 text-amber-700">
                            <span className="font-medium">Failure reason:</span> {row.aiFailureReason}
                          </p>
                        ) : null}
                      </div>
                      <label className="text-xs">
                        <span className="mb-1 block font-medium text-slate-700">Name</span>
                        <input
                          value={row.parsedCandidate.full_name}
                          onChange={event => updateParsedField(row.id, 'full_name', event.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900"
                        />
                      </label>
                      <label className="text-xs">
                        <span className="mb-1 block font-medium text-slate-700">Email</span>
                        <input
                          value={row.parsedCandidate.email ?? ''}
                          onChange={event => updateParsedField(row.id, 'email', event.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900"
                        />
                      </label>
                      <label className="text-xs">
                        <span className="mb-1 block font-medium text-slate-700">Phone</span>
                        <input
                          value={row.parsedCandidate.phone ?? ''}
                          onChange={event => updateParsedField(row.id, 'phone', event.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900"
                        />
                      </label>
                      <label className="text-xs">
                        <span className="mb-1 block font-medium text-slate-700">Current role</span>
                        <input
                          value={row.parsedCandidate.current_role ?? ''}
                          onChange={event => updateParsedField(row.id, 'current_role', event.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900"
                        />
                      </label>
                      <label className="text-xs">
                        <span className="mb-1 block font-medium text-slate-700">Years experience</span>
                        <input
                          value={row.parsedCandidate.years_experience?.toString() ?? ''}
                          onChange={event => updateParsedField(row.id, 'years_experience', event.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900"
                        />
                      </label>
                      <label className="text-xs">
                        <span className="mb-1 block font-medium text-slate-700">Location</span>
                        <input
                          value={row.parsedCandidate.location ?? ''}
                          onChange={event => updateParsedField(row.id, 'location', event.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900"
                        />
                      </label>
                      <label className="text-xs md:col-span-2">
                        <span className="mb-1 block font-medium text-slate-700">Skills (comma-separated)</span>
                        <input
                          value={row.parsedCandidate.key_skills.join(', ')}
                          onChange={event => updateParsedField(row.id, 'key_skills', event.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900"
                        />
                      </label>
                      <div className="text-xs text-slate-600 md:col-span-2">
                        <p><span className="font-medium text-slate-700">Resume path:</span> {row.parsedCandidate.resume_file_path ?? 'Unknown'}</p>
                      </div>
                    </div>

                    <details className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                      <summary className="cursor-pointer font-semibold text-slate-800">
                        Debug: Raw AI vs Final Output
                      </summary>
                      <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-md border border-slate-100 bg-slate-50 p-2">
                          <p className="font-semibold text-slate-800">Raw AI Output</p>
                          <div className="mt-1 space-y-1">
                            <p>raw_ai_full_name: {row.rawAIExtraction?.full_name ?? 'null'}</p>
                            <p>raw_ai_email: {row.rawAIExtraction?.email ?? 'null'}</p>
                            <p>raw_ai_phone: {row.rawAIExtraction?.phone ?? 'null'}</p>
                            <p>raw_ai_current_role: {row.rawAIExtraction?.current_role ?? 'null'}</p>
                            <p>raw_ai_target_role: {row.rawAIExtraction?.target_role ?? 'null'}</p>
                            <p>raw_ai_location: {row.rawAIExtraction?.location ?? 'null'}</p>
                            <p>raw_ai_years_experience: {row.rawAIExtraction?.years_experience ?? 'null'}</p>
                            <p>raw_ai_key_skills: {(row.rawAIExtraction?.key_skills ?? []).join(', ') || '[]'}</p>
                            <p>raw_ai_confidence: {row.rawAIExtraction?.confidence ?? 'null'}</p>
                            <p>raw_ai_warnings: {(row.rawAIExtraction?.warnings ?? []).join(' | ') || '[]'}</p>
                          </div>
                        </div>
                        <div className="rounded-md border border-slate-100 bg-slate-50 p-2">
                          <p className="font-semibold text-slate-800">Final Merged Output</p>
                          <div className="mt-1 space-y-1">
                            <p>final_full_name: {row.parsedCandidate.full_name ?? 'null'}</p>
                            <p>final_email: {row.parsedCandidate.email ?? 'null'}</p>
                            <p>final_phone: {row.parsedCandidate.phone ?? 'null'}</p>
                            <p>final_current_role: {row.parsedCandidate.current_role ?? 'null'}</p>
                            <p>final_target_role: {row.parsedCandidate.target_role ?? 'null'}</p>
                            <p>final_location: {row.parsedCandidate.location ?? 'null'}</p>
                            <p>final_years_experience: {row.parsedCandidate.years_experience ?? 'null'}</p>
                            <p>final_key_skills: {row.parsedCandidate.key_skills.join(', ') || '[]'}</p>
                            <p>total_work_experience_years: {row.parsedCandidate.total_work_experience_years ?? 'null'}</p>
                            <p>role_relevant_experience_years: {row.parsedCandidate.role_relevant_experience_years ?? 'null'}</p>
                            <p>experience_confidence: {row.parsedCandidate.experience_confidence}</p>
                            <p>inferred_target_role_family: {row.inferredTargetRoleFamily ?? 'null'}</p>
                            <p>parsed_work_entries: {row.parsedWorkEntries.length ? JSON.stringify(row.parsedWorkEntries) : '[]'}</p>
                            <p>normalized_current_role: {row.parsedCandidate.normalized_current_role ?? 'null'}</p>
                            <p>normalized_target_role: {row.parsedCandidate.normalized_target_role ?? 'null'}</p>
                            <p>hard_skills: {row.parsedCandidate.hard_skills.join(', ') || '[]'}</p>
                            <p>tools: {row.parsedCandidate.tools.join(', ') || '[]'}</p>
                            <p>soft_skills: {row.parsedCandidate.soft_skills.join(', ') || '[]'}</p>
                            <p>languages: {row.parsedCandidate.languages.join(', ') || '[]'}</p>
                            <p>education_level: {row.parsedCandidate.education_level ?? 'null'}</p>
                            <p>field_of_study: {row.parsedCandidate.field_of_study ?? 'null'}</p>
                          </div>
                        </div>
                      </div>
                    </details>

                    {row.saveError ? (
                      <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                        {row.saveError}
                      </p>
                    ) : null}
                    {row.saveStatus === 'saved' ? (
                      <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700">
                        Candidate saved successfully. Candidate ID: {row.savedCandidateId ?? 'N/A'}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void saveCandidate(row.id)}
                        disabled={row.saveStatus === 'saving'}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        {row.saveStatus === 'saving' ? 'Saving candidate...' : 'Save Candidate'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRows(prev =>
                            prev.map(r =>
                              r.id === row.id
                                ? {
                                    ...r,
                                    parsedCandidate: null,
                                    rawAIExtraction: null,
                                    parseStatus: 'idle',
                                    parseError: null,
                                    extractedTextLength: null,
                                    extractionMethod: null,
                                    extractionWarning: null,
                                    parserMode: 'rule-only',
                                    aiConfidence: null,
                                    aiWarnings: [],
                                    aiFailureReason: null,
                                    selectedEmailSource: null,
                                    selectedRoleSource: null,
                                    selectedLocationSource: null,
                                    parsedWorkEntries: [],
                                    inferredTargetRoleFamily: null,
                                    fieldEdited: {},
                                    saveStatus: 'idle',
                                    saveError: null,
                                  }
                                : r
                            )
                          )
                        }
                        disabled={row.saveStatus === 'saving'}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {!row.validationError ? (
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                    <FileText size={12} />
                    <span>Accepted formats: PDF, DOC, DOCX - Max 10 MB</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
