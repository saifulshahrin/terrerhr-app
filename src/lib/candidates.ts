import { supabase } from './supabase';
import type { Candidate } from '../store/types';

export type CandidateSource =
  | 'LinkedIn'
  | 'GitHub'
  | 'JobStreet'
  | 'Hiredly'
  | 'Maukerja / Ricebowl'
  | 'Other';

export const CANDIDATE_SOURCES: CandidateSource[] = [
  'LinkedIn',
  'GitHub',
  'JobStreet',
  'Hiredly',
  'Maukerja / Ricebowl',
  'Other',
];

export interface CandidateSearchRow {
  candidate_id: string;
  display_name: string | null;
  full_name: string | null;
  country: string | null;
  city: string | null;
  primary_role: string | null;
  source_name: string | null;
  source_handle: string | null;
  source_profile_url: string | null;
  score: number | string | null;
  score_reason: string | null;
  top_skills: string | null;
  capabilities: string | null;
}

export interface CreateCandidateInput {
  name: string;
  role: string;
  source: CandidateSource;
  sourceUrl: string;
  skillsText?: string;
  location?: string;
  notes?: string;
}

export function parseSkillText(value: string | null | undefined): string[] {
  if (!value) return [];

  return value
    .split(/[,;|\n]/)
    .map(part => part.trim())
    .filter(Boolean);
}

export function formatCandidateLocation(
  city: string | null | undefined,
  country: string | null | undefined
): string {
  const parts = [city?.trim(), country?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
}

export function deriveAppliedLabel(): string {
  return '\u2014';
}

export function mapCandidateRowToUI(row: CandidateSearchRow): Candidate {
  const primarySkills = parseSkillText(row.top_skills);
  const skills = primarySkills.length > 0 ? primarySkills : parseSkillText(row.capabilities);

  return {
    id: row.candidate_id,
    name: row.display_name || row.full_name || 'Unknown Candidate',
    role: row.primary_role || 'Unknown Role',
    company: row.source_name || 'Unknown Source',
    location: formatCandidateLocation(row.city, row.country),
    skills,
    score: Number(row.score ?? 0),
    applied: deriveAppliedLabel(),
  };
}

export function createFallbackCandidate(candidateId: string): Candidate {
  return {
    id: candidateId,
    name: 'Unknown Candidate',
    role: 'Unknown Role',
    company: 'Unknown Source',
    location: 'Unknown Location',
    skills: [],
    score: 0,
    applied: deriveAppliedLabel(),
  };
}

export function buildCandidateMap(candidates: Candidate[]): Map<string, Candidate> {
  return new Map(candidates.map(candidate => [candidate.id, candidate]));
}

export function detectCandidateSourceFromUrl(url: string | null | undefined): CandidateSource {
  const normalized = (url ?? '').toLowerCase();

  if (normalized.includes('linkedin.com')) return 'LinkedIn';
  if (normalized.includes('github.com')) return 'GitHub';
  if (normalized.includes('jobstreet')) return 'JobStreet';
  if (normalized.includes('hiredly')) return 'Hiredly';
  if (normalized.includes('maukerja') || normalized.includes('ricebowl')) {
    return 'Maukerja / Ricebowl';
  }

  return 'Other';
}

function extractLastPathSegment(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    const segments = parsed.pathname
      .split('/')
      .map(segment => segment.trim())
      .filter(Boolean);

    return segments.length > 0 ? segments[segments.length - 1] : '';
  } catch {
    const sanitized = trimmed.split('?')[0].split('#')[0];
    const segments = sanitized
      .split('/')
      .map(segment => segment.trim())
      .filter(Boolean);

    return segments.length > 0 ? segments[segments.length - 1] : '';
  }
}

export function extractCandidateNameFallback(
  url: string | null | undefined,
  source: CandidateSource
): string {
  if (!url) return '';

  const slug = extractLastPathSegment(url);
  if (!slug) return '';

  if (source === 'GitHub') {
    return slug;
  }

  if (source === 'LinkedIn') {
    return slug
      .replace(/^in\//i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
  }

  return '';
}

export function extractSourceHandle(
  url: string | null | undefined,
  source: CandidateSource
): string | null {
  const slug = extractLastPathSegment(url ?? '');
  if (!slug) return null;

  if (source === 'GitHub' || source === 'LinkedIn') {
    return slug;
  }

  return null;
}

function buildManualCandidate(input: CreateCandidateInput, candidateId: string): Candidate {
  const skills = parseSkillText(input.skillsText);

  return {
    id: candidateId,
    name: input.name.trim() || 'Unknown Candidate',
    role: input.role.trim() || 'Unknown Role',
    company: input.source,
    location: input.location?.trim() || 'Unknown Location',
    skills,
    score: 0,
    applied: deriveAppliedLabel(),
    linkedin: input.source === 'LinkedIn' ? input.sourceUrl.trim() || undefined : undefined,
    github: input.source === 'GitHub' ? input.sourceUrl.trim() || undefined : undefined,
  };
}

export async function createCandidateFromIntake(input: CreateCandidateInput): Promise<Candidate> {
  const candidateId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const now = new Date().toISOString();
  const name = input.name.trim() || extractCandidateNameFallback(input.sourceUrl, input.source) || 'Unknown Candidate';
  const role = input.role.trim() || 'Unknown Role';
  const sourceUrl = input.sourceUrl.trim();
  const location = input.location?.trim() || null;
  const notes = input.notes?.trim() || null;
  const sourceHandle = extractSourceHandle(sourceUrl, input.source);
  const skills = parseSkillText(input.skillsText);
  const capabilityText = skills.length > 0 ? skills.join(', ') : null;

  const candidatePayload = {
    candidate_id: candidateId,
    display_name: name,
    full_name: name,
    city: location,
    primary_role: role,
    created_at: now,
    updated_at: now,
    linkedin_url: input.source === 'LinkedIn' ? sourceUrl || null : null,
    github_url: input.source === 'GitHub' ? sourceUrl || null : null,
    source_type: input.source,
    notes,
    candidate_status: 'active',
  };

  const scorePayload = {
    candidate_id: candidateId,
    display_name: name,
    full_name: name,
    city: location,
    primary_role: role,
    capabilities: capabilityText,
    score: 0,
    score_reason: 'Manual intake',
    scored_at: now,
  };

  const sourceProfilePayload = {
    profile_id: profileId,
    candidate_id: candidateId,
    source_name: input.source,
    source_profile_url: sourceUrl || null,
    source_handle: sourceHandle,
    source_user_id: null,
    scraped_at: now,
  };

  const { error: candidateError } = await supabase.from('candidates').insert(candidatePayload);
  if (candidateError) throw candidateError;

  try {
    const { error: scoreError } = await supabase.from('candidate_scores').insert(scorePayload);
    if (scoreError) throw scoreError;

    const { error: sourceError } = await supabase.from('source_profiles').insert(sourceProfilePayload);
    if (sourceError) throw sourceError;

    if (skills.length > 0) {
      const skillRows = skills.map(skill => ({
        candidate_id: candidateId,
        skill,
        proficiency: 'intermediate',
      }));

      const { error: skillError } = await supabase.from('candidate_skills').insert(skillRows);
      if (skillError) {
        // Skills are helpful for matching, but the candidate record should still be saved.
        console.error('[candidates] candidate_skills insert error:', skillError);
      }
    }
  } catch (error) {
    await supabase.from('source_profiles').delete().eq('candidate_id', candidateId);
    await supabase.from('candidate_scores').delete().eq('candidate_id', candidateId);
    await supabase.from('candidate_skills').delete().eq('candidate_id', candidateId);
    await supabase.from('candidates').delete().eq('candidate_id', candidateId);
    throw error;
  }

  const insertedCandidate = (await fetchCandidatesByIds([candidateId]))[0];
  return insertedCandidate ?? buildManualCandidate(input, candidateId);
}

export async function fetchCandidatesForUI(): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from('vw_candidate_search_clean')
    .select(
      'candidate_id, display_name, full_name, country, city, primary_role, source_name, source_handle, source_profile_url, score, score_reason, top_skills, capabilities'
    )
    .order('score', { ascending: false })
    .order('display_name', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as CandidateSearchRow[]).map(mapCandidateRowToUI);
}

export async function fetchCandidatesByIds(candidateIds: string[]): Promise<Candidate[]> {
  if (candidateIds.length === 0) return [];

  const uniqueIds = [...new Set(candidateIds)];

  const { data, error } = await supabase
    .from('vw_candidate_search_clean')
    .select(
      'candidate_id, display_name, full_name, country, city, primary_role, source_name, source_handle, source_profile_url, score, score_reason, top_skills, capabilities'
    )
    .in('candidate_id', uniqueIds);

  if (error) throw error;

  return ((data ?? []) as CandidateSearchRow[]).map(mapCandidateRowToUI);
}

export async function fetchCandidateMapByIds(candidateIds: string[]): Promise<Map<string, Candidate>> {
  const candidates = await fetchCandidatesByIds(candidateIds);
  return buildCandidateMap(candidates);
}
