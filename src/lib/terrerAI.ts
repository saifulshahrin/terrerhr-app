import type { JobRequirementRow } from './skillMatch';

export type Decision = 'Proceed' | 'Review' | 'Reject';
export type Recommendation = 'Strong Fit' | 'Potential Fit' | 'Low Fit';

export interface TerrerAIReview {
  status: 'completed';
  decision: Decision;
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

interface RoleConstraintResult {
  applies: boolean;
  passed: boolean;
  roleLabel: string;
  missingRequirements: string[];
  relevantSkills: string[];
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

function recommendationForDecision(decision: Decision): Recommendation {
  if (decision === 'Proceed') return 'Strong Fit';
  if (decision === 'Review') return 'Potential Fit';
  return 'Low Fit';
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(text));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

function candidateEvidence(candidate: ReviewCandidate, allCandidateSkills: string[]): string {
  return [
    candidate.role,
    candidate.company,
    candidate.location,
    ...allCandidateSkills,
  ].join(' ').toLowerCase();
}

function isMedicalOfficerMalaysiaRole(job: ReviewJob): boolean {
  const title = job.job_title.toLowerCase();
  return /\bmedical officer\b/.test(title) || /\bdoctor\b/.test(title) || /\bphysician\b/.test(title);
}

function isMedicalRelevantSkill(skill: string): boolean {
  return hasAny(skill.toLowerCase(), [
    /\bmedical\b/,
    /\bclinical\b/,
    /\bdoctor\b/,
    /\bphysician\b/,
    /\bmbbs\b/,
    /\bmbchb\b/,
    /\bmedicine\b/,
    /\bhospital\b/,
    /\bhealthcare\b/,
    /\bpatient\b/,
    /\bdiagnosis\b/,
    /\bemergency\b/,
    /\bsurgery\b/,
    /\bward\b/,
    /\bclinic\b/,
    /\bhousemanship\b/,
    /\bhouse officer\b/,
    /\bmmc\b/,
    /\bapc\b/,
    /\bpractising certificate\b/,
    /\bpracticing certificate\b/,
  ]);
}

function evaluateMedicalOfficerMalaysiaConstraints(
  candidate: ReviewCandidate,
  allCandidateSkills: string[],
  job: ReviewJob
): RoleConstraintResult {
  if (!isMedicalOfficerMalaysiaRole(job)) {
    return {
      applies: false,
      passed: true,
      roleLabel: '',
      missingRequirements: [],
      relevantSkills: allCandidateSkills,
    };
  }

  const evidence = candidateEvidence(candidate, allCandidateSkills);
  const missingRequirements: string[] = [];
  const hasMedicalBackground = hasAny(evidence, [
    /\bmedical\b/,
    /\bclinical\b/,
    /\bdoctor\b/,
    /\bphysician\b/,
    /\bmbbs\b/,
    /\bmbchb\b/,
    /\bmedicine\b/,
    /\bhospital\b/,
    /\bhealthcare\b/,
    /\bhouse officer\b/,
  ]);
  const hasHousemanship = hasAny(evidence, [
    /\bhousemanship\b/,
    /\bhouse officer\b/,
    /\bhouseman\b/,
    /\bmedical internship\b/,
    /\bclinical internship\b/,
    /\bclinical rotation\b/,
  ]);
  const hasMmcRegistration = hasAny(evidence, [
    /\bmmc\b/,
    /\bmalaysian medical council\b/,
    /\bmalaysia medical council\b/,
    /\bmedical council\b/,
    /\bregistered medical practitioner\b/,
    /\bfull registration\b/,
    /\bprovisional registration\b/,
  ]);
  const hasApcOrLicense = hasAny(evidence, [
    /\bapc\b/,
    /\bannual practising certificate\b/,
    /\bannual practicing certificate\b/,
    /\bpractising certificate\b/,
    /\bpracticing certificate\b/,
    /\blicensed medical practitioner\b/,
    /\blicensed doctor\b/,
    /\blicence to practise\b/,
    /\blicense to practice\b/,
    /\bregistered to practise\b/,
    /\bregistered to practice\b/,
  ]);

  if (!hasMedicalBackground) missingRequirements.push('medical or clinical background');
  if (!hasHousemanship) missingRequirements.push('housemanship or house officer experience');
  if (!hasMmcRegistration) missingRequirements.push('MMC registration or equivalent medical registration signal');
  if (!hasApcOrLicense) missingRequirements.push('APC or active medical licensing indicator');

  return {
    applies: true,
    passed: missingRequirements.length === 0,
    roleLabel: 'Medical Officer (Malaysia)',
    missingRequirements,
    relevantSkills: unique(allCandidateSkills.filter(isMedicalRelevantSkill)),
  };
}

function evaluateRoleConstraints(
  candidate: ReviewCandidate,
  allCandidateSkills: string[],
  job: ReviewJob
): RoleConstraintResult {
  return evaluateMedicalOfficerMalaysiaConstraints(candidate, allCandidateSkills, job);
}

export function generateTerrerAIReview(candidate: ReviewCandidate, job: ReviewJob): TerrerAIReview {
  const allCandidateSkills = [
    ...candidate.skills,
    ...(candidate.structuredSkills ?? []),
  ];
  const roleConstraints = evaluateRoleConstraints(candidate, allCandidateSkills, job);

  // Regulated roles must pass hard constraints before softer AI-style reasoning.
  if (roleConstraints.applies && !roleConstraints.passed) {
    const missing = roleConstraints.missingRequirements.join(', ');
    return {
      status: 'completed',
      decision: 'Reject',
      summary: `${candidate.name} should be rejected for the ${job.job_title} role because required ${roleConstraints.roleLabel} regulatory requirements are not evidenced: ${missing}. Do not progress this candidate until these credentials are confirmed.`,
      strengths: [],
      concerns: roleConstraints.missingRequirements.map(
        requirement => `Missing required regulatory requirement: ${requirement}`
      ),
      recommendation: 'Low Fit',
      generatedAt: new Date().toISOString(),
    };
  }

  const reasoningSkills = roleConstraints.applies && roleConstraints.relevantSkills.length > 0
    ? roleConstraints.relevantSkills
    : allCandidateSkills;

  const alignment = titleAlignment(candidate.role, job.job_title);
  const locationFit = looseMatch(candidate.location, job.location);
  const score = candidate.score;

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
    if (alignment === 'weak') {
      concerns.push('Skills are not role-aligned enough to count as strengths for this specific job');
    } else if (reasoningSkills.length >= 4) {
      strengths.push(`Broad skill set (${reasoningSkills.slice(0, 3).join(', ')} and more) suggests good versatility`);
    } else if (reasoningSkills.length >= 2) {
      strengths.push(`Relevant skills on profile: ${reasoningSkills.join(', ')}`);
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

  const roleAligned = alignment !== 'weak';
  if (!roleAligned) {
    strengths.length = 0;
  }

  const skillsRelevant = hasStructuredData
    ? roleAligned && structuredOverlapRatio >= 0.4
    : roleAligned && reasoningSkills.length >= 2;
  const experienceMatch = score >= 70;
  const decisionPoints = [roleAligned, skillsRelevant, experienceMatch].filter(Boolean).length;
  const hasCriticalSkillGap = hasStructuredData && structuredMissing.length >= 3 && structuredOverlapRatio < 0.4;

  let decision: Decision;
  let summary: string;

  if (decisionPoints === 3 && !hasCriticalSkillGap) {
    decision = 'Proceed';
    summary = `${candidate.name} should proceed for the ${job.job_title} role at ${job.company_name}. Role alignment, skills relevance, and experience indicators are all strong enough to move forward.`;
  } else if (decisionPoints >= 2 && !hasCriticalSkillGap) {
    decision = 'Review';
    summary = `${candidate.name} should be reviewed before progressing for the ${job.job_title} role. The profile has enough role, skill, or experience relevance to justify follow-up, but specific gaps should be validated first.`;
  } else {
    decision = 'Reject';
    summary = `${candidate.name} should be rejected for the ${job.job_title} role at this stage. The evidence is not strong enough across role alignment, skills relevance, and experience match to justify progressing.`;
  }

  const recommendation = recommendationForDecision(decision);

  return {
    status: 'completed',
    decision,
    summary,
    strengths,
    concerns,
    recommendation,
    generatedAt: new Date().toISOString(),
  };
}
