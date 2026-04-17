import { supabase } from './supabase';

export interface CandidateSkillRow {
  candidate_id: string;
  skill: string;
  proficiency: string;
}

export interface JobRequirementRow {
  job_id: string;
  requirement: string;
  required: boolean;
}

export interface SkillOverlap {
  matched: string[];
  missing: string[];
  bonus: number;
}

export async function fetchJobRequirements(jobId: string): Promise<JobRequirementRow[]> {
  const { data, error } = await supabase
    .from('job_requirements')
    .select('job_id, requirement, required')
    .eq('job_id', jobId);

  if (error) {
    console.error('[skillMatch] fetchJobRequirements error', error);
    return [];
  }
  return (data ?? []) as JobRequirementRow[];
}

export async function fetchCandidateSkills(candidateIds: string[]): Promise<CandidateSkillRow[]> {
  if (candidateIds.length === 0) return [];
  const { data, error } = await supabase
    .from('candidate_skills')
    .select('candidate_id, skill, proficiency')
    .in('candidate_id', candidateIds);

  if (error) {
    console.error('[skillMatch] fetchCandidateSkills error', error);
    return [];
  }
  return (data ?? []) as CandidateSkillRow[];
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function skillsMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.length > 3 && nb.length > 3 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

export function computeSkillOverlap(
  candidateSkills: string[],
  jobRequirements: JobRequirementRow[]
): SkillOverlap {
  if (jobRequirements.length === 0 || candidateSkills.length === 0) {
    return { matched: [], missing: [], bonus: 0 };
  }

  const matched: string[] = [];
  const missing: string[] = [];

  for (const req of jobRequirements) {
    const hit = candidateSkills.some(cs => skillsMatch(cs, req.requirement));
    if (hit) {
      matched.push(req.requirement);
    } else if (req.required) {
      missing.push(req.requirement);
    }
  }

  const totalRequired = jobRequirements.filter(r => r.required).length || 1;
  const matchedRequired = matched.filter(m =>
    jobRequirements.some(r => r.required && skillsMatch(r.requirement, m))
  ).length;

  const overlapRatio = matchedRequired / totalRequired;
  const bonus = Math.round(overlapRatio * 12);

  return { matched, missing, bonus };
}

export function buildCandidateSkillMap(rows: CandidateSkillRow[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    if (!map.has(row.candidate_id)) map.set(row.candidate_id, []);
    map.get(row.candidate_id)!.push(row.skill);
  }
  return map;
}
