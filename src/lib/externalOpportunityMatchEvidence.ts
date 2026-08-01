export type CandidateMatchProfile = {
  currentRole: string | null;
  targetRole: string | null;
  skills: string[];
  location: string | null;
  roleFamily: string | null;
  yearsExperience: number | null;
};

export type ExternalMatchSubject = {
  jobTitle: string;
  location: string;
  roleFamily: string | null;
  seniority: string | null;
  skills: string[];
};

export type TrustedExternalMatchEvidence = {
  score: number;
  reasons: string[];
};

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function words(value: string | null | undefined): Set<string> {
  return new Set(normalize(value).split(' ').filter((word) => word.length >= 2));
}

function overlap(left: string | null | undefined, right: string | null | undefined): number {
  const leftWords = words(left);
  const rightWords = words(right);
  if (!leftWords.size || !rightWords.size) return 0;
  const shared = [...leftWords].filter((word) => rightWords.has(word)).length;
  return shared / Math.max(leftWords.size, rightWords.size);
}

function inferSeniority(profile: CandidateMatchProfile): 'entry' | 'mid' | 'senior' | 'executive' {
  const roleText = normalize(`${profile.targetRole ?? ''} ${profile.currentRole ?? ''}`);
  if (/\b(head|director|chief|vp|vice president)\b/.test(roleText)) return 'executive';
  if (/\b(senior|lead|principal|manager)\b/.test(roleText) || (profile.yearsExperience ?? 0) >= 7) {
    return 'senior';
  }
  if (/\b(graduate|trainee|intern|junior|entry)\b/.test(roleText) || (profile.yearsExperience ?? 0) <= 1) {
    return 'entry';
  }
  return 'mid';
}

export function buildTrustedExternalMatchEvidence(
  profile: CandidateMatchProfile,
  opportunity: ExternalMatchSubject,
): TrustedExternalMatchEvidence {
  const reasons: string[] = [];
  let score = 0;
  const roleTerms = [profile.targetRole, profile.currentRole].filter(Boolean).join(' ');
  const titleOverlap = overlap(roleTerms, opportunity.jobTitle);

  if (titleOverlap >= 0.5) {
    score += 35;
    reasons.push('Target or current role aligns with the opportunity title.');
  } else if (titleOverlap > 0) {
    score += 18;
    reasons.push('The opportunity title has partial role alignment.');
  }

  if (profile.roleFamily && opportunity.roleFamily && normalize(profile.roleFamily) === normalize(opportunity.roleFamily)) {
    score += 25;
    reasons.push('Role family aligns.');
  }

  const opportunitySkills = opportunity.skills.map(normalize).filter(Boolean);
  const matchedSkills = profile.skills.filter((skill) => {
    const normalizedSkill = normalize(skill);
    return normalizedSkill && opportunitySkills.some(
      (jobSkill) => jobSkill.includes(normalizedSkill) || normalizedSkill.includes(jobSkill),
    );
  });
  if (matchedSkills.length) {
    score += Math.min(25, matchedSkills.length * 10);
    reasons.push(`${matchedSkills.length} recorded skill signal(s) align.`);
  }

  const candidateLocation = normalize(profile.location || 'Malaysia');
  const opportunityLocation = normalize(opportunity.location);
  const locationAligned =
    opportunityLocation.includes(candidateLocation) ||
    candidateLocation.includes(opportunityLocation) ||
    opportunityLocation.includes('malaysia');
  if (locationAligned) {
    score += 10;
    reasons.push('Location aligns with the recorded preference.');
  } else {
    score -= 12;
  }

  const seniority = inferSeniority(profile);
  const opportunitySeniority = normalize(`${opportunity.seniority ?? ''} ${opportunity.jobTitle}`);
  const seniorityAligned =
    (seniority === 'executive' && /\b(head|director|executive|chief)\b/.test(opportunitySeniority)) ||
    (seniority === 'entry' && /\b(entry|graduate|trainee|intern|junior)\b/.test(opportunitySeniority)) ||
    (seniority === 'senior' && /\b(senior|lead|manager)\b/.test(opportunitySeniority)) ||
    (seniority === 'mid' && /\bmid\b/.test(opportunitySeniority));
  if (seniorityAligned) {
    score += 10;
    reasons.push('Seniority appears aligned.');
  } else if (seniority === 'entry' && /\b(head|director|executive|chief|manager)\b/.test(opportunitySeniority)) {
    score -= 25;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons: reasons.slice(0, 3).length
      ? reasons.slice(0, 3)
      : ['Trusted fit evidence is not available yet.'],
  };
}
