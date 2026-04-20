import { supabase } from './supabase';
import type { Candidate } from '../store/types';

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
