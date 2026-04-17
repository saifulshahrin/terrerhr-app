import type { JobRequirementRow } from './skillMatch';

export type Recommendation = 'Strong Fit' | 'Potential Fit' | 'Weak Fit';

export interface TerrerAIReview {
  status: 'completed';
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendation: Recommendation;
  confidence?: string;
  submissionReady?: boolean;
  generatedAt: string;
}

export interface ReviewJob {
  job_title: string;
  company_name: string;
  location: string;
  requirements?: JobRequirementRow[];
}

export interface ReviewCandidate {
  name: string;
  role: string;
  company: string;
  location: string;
  skills: string[];
  score: number;
  structuredSkills?: string[];
}

function looseMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const wordsA = normalize(a).split(/\s+/).filter(w => w.length > 2);
  const wordsB = normalize(b).split(/\s+/).filter(w => w.length > 2);
  return wordsA.some(wa => wordsB.some(wb => wa.includes(wb) || wb.includes(wa)));
}

function titleAlignment(candidateRole: string, jobTitle: string): 'strong' | 'partial' | 'weak' {
  const normalize = (s: string) => s.toLowerCase().trim();
  if (normalize(candidateRole) === normalize(jobTitle)) return 'strong';
  if (looseMatch(candidateRole, jobTitle)) return 'partial';
  return 'weak';
}

function normalizeSkill(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function skillsMatch(a: string, b: string): boolean {
  const na = normalizeSkill(a);
  const nb = normalizeSkill(b);
  if (na === nb) return true;
  if (na.length > 3 && nb.length > 3 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

function computeStructuredOverlap(
  candidateSkills: string[],
  requirements: JobRequirementRow[]
): { matched: string[]; missing: string[] } {
  const matched: string[] = [];
  const missing: string[] = [];
  for (const req of requirements) {
    const hit = candidateSkills.some(cs => skillsMatch(cs, req.requirement));
    if (hit) {
      matched.push(req.requirement);
    } else if (req.required) {
      missing.push(req.requirement);
    }
  }
  return { matched, missing };
}

export function generateTerrerAIReview(candidate: ReviewCandidate, job: ReviewJob): TerrerAIReview {
  const alignment = titleAlignment(candidate.role, job.job_title);
  const locationFit = looseMatch(candidate.location, job.location);
  const score = candidate.score;

  const allCandidateSkills = [
    ...candidate.skills,
    ...(candidate.structuredSkills ?? []),
  ];

  const hasStructuredData =
    (candidate.structuredSkills ?? []).length > 0 &&
    (job.requirements ?? []).length > 0;

  let structuredMatched: string[] = [];
  let structuredMissing: string[] = [];
  let structuredOverlapRatio = 0;

  if (hasStructuredData) {
    const overlap = computeStructuredOverlap(candidate.structuredSkills!, job.requirements!);
    structuredMatched = overlap.matched;
    structuredMissing = overlap.missing;
    const totalRequired = (job.requirements ?? []).filter(r => r.required).length || 1;
    structuredOverlapRatio = structuredMatched.filter(m =>
      (job.requirements ?? []).some(r => r.required && skillsMatch(r.requirement, m))
    ).length / totalRequired;
  }

  const strengths: string[] = [];
  const concerns: string[] = [];

  if (alignment === 'strong') {
    strengths.push(`Title is a direct match — "${candidate.role}" aligns precisely with ${job.job_title}`);
  } else if (alignment === 'partial') {
    strengths.push(`Good title alignment — current role as ${candidate.role} shows relevant progression towards ${job.job_title}`);
  } else {
    concerns.push(`Current title "${candidate.role}" has limited direct alignment to ${job.job_title}`);
  }

  if (score >= 90) {
    strengths.push('Exceptional overall profile score — consistently strong across assessed dimensions');
  } else if (score >= 80) {
    strengths.push('Strong overall profile with above-average scores across key criteria');
  } else if (score >= 70) {
    strengths.push('Reasonable profile score — worth validating in a brief screening call');
  } else {
    concerns.push('Overall profile score is below the typical threshold for this level of role');
  }

  if (locationFit) {
    strengths.push(`Location is well-suited — ${candidate.location} aligns with the ${job.location} requirement`);
  } else {
    concerns.push(`Location mismatch — candidate is in ${candidate.location}, role requires presence in ${job.location}`);
  }

  if (hasStructuredData) {
    if (structuredMatched.length > 0) {
      const topMatched = structuredMatched.slice(0, 4).join(', ');
      strengths.push(`Confirmed skill overlap against job requirements: ${topMatched}`);
    }
    if (structuredMissing.length > 0) {
      const topMissing = structuredMissing.slice(0, 3).join(', ');
      concerns.push(`Missing required skills: ${topMissing} — worth probing in a call`);
    }
    if (structuredOverlapRatio >= 0.75) {
      strengths.push('High overlap with structured job requirements — strong technical alignment');
    } else if (structuredOverlapRatio >= 0.4) {
      strengths.push('Moderate overlap with job requirements — core skills are present with some gaps');
    }
  } else {
    if (allCandidateSkills.length >= 4) {
      strengths.push(`Broad skill set (${allCandidateSkills.slice(0, 3).join(', ')} and more) suggests good versatility`);
    } else if (allCandidateSkills.length >= 2) {
      strengths.push(`Relevant skills on profile: ${allCandidateSkills.join(', ')}`);
    } else {
      concerns.push('Limited skill data available — full skills assessment recommended before advancing');
    }
  }

  if (alignment !== 'weak' && score >= 70) {
    strengths.push(`Background at ${candidate.company} suggests exposure to relevant environments`);
  }

  if (alignment === 'weak' && score < 75) {
    concerns.push('Limited evidence for direct fit — recommend additional validation before progressing');
  }

  let fitPoints: number;

  if (hasStructuredData) {
    const skillPoint = structuredOverlapRatio >= 0.5 ? 1 : 0;
    fitPoints =
      (alignment !== 'weak' ? 1 : 0) +
      (score >= 80 ? 1 : 0) +
      (locationFit ? 1 : 0) +
      skillPoint;
  } else {
    fitPoints =
      (alignment !== 'weak' ? 1 : 0) +
      (score >= 80 ? 1 : 0) +
      (locationFit ? 1 : 0);
  }

  let recommendation: Recommendation;
  let summary: string;

  const maxFitPoints = hasStructuredData ? 4 : 3;
  const threshold = maxFitPoints >= 4 ? 3 : 2;

  if (fitPoints >= maxFitPoints) {
    recommendation = 'Strong Fit';
    summary = `${candidate.name} presents a compelling match for the ${job.job_title} role at ${job.company_name}. ${hasStructuredData ? `Skill overlap against the structured job requirements is strong (${structuredMatched.length} of ${(job.requirements ?? []).length} matched), and` : 'Title alignment, location, and'} overall profile indicators are positive. Recommended for immediate consideration.`;
  } else if (fitPoints >= threshold) {
    recommendation = 'Potential Fit';
    summary = `${candidate.name} shows solid alignment for the ${job.job_title} role but has a couple of areas worth probing. ${hasStructuredData && structuredMissing.length > 0 ? `Key gaps include: ${structuredMissing.slice(0, 2).join(', ')}. ` : ''}A short screening call should clarify overall suitability.`;
  } else if (fitPoints === 1) {
    recommendation = 'Potential Fit';
    summary = `${candidate.name} has some relevant qualities for the ${job.job_title} role, though there are clear gaps that need validation before progressing. A brief discovery call is recommended.`;
  } else {
    recommendation = 'Weak Fit';
    summary = `${candidate.name} does not present a strong case for the ${job.job_title} role at ${job.company_name} at this stage. Notable gaps exist in ${[!locationFit && 'location', alignment === 'weak' && 'title alignment', hasStructuredData && structuredMissing.length > 2 && 'required skills'].filter(Boolean).join(', ') || 'key criteria'}. Consider deprioritising unless further context emerges.`;
  }

  return {
    status: 'completed',
    summary,
    strengths,
    concerns,
    recommendation,
    generatedAt: new Date().toISOString(),
  };
}
