export type RoleTrustPolicy = 'STRICT' | 'SEMI_STRICT' | 'FLEX';

const STRICT_PATTERNS: RegExp[] = [
  /\bmedical\b/,
  /\bdoctor\b/,
  /\bphysician\b/,
  /\bnurse\b/,
  /\bclinic\b/,
  /\bhospital\b/,
  /\bpharmacist\b/,
  /\bpharmacy\b/,
  /\bdentist\b/,
  /\bdental\b/,
  /\bsurgeon\b/,
  /\bspecialist\b/,
  /\bradiographer\b/,
  /\bphysiotherapist\b/,
  /\btherapist\b/,
  /\bparamedic\b/,
  /\bklinik\b/,
  /\bkesihatan\b/,
  /\blegal\b/,
  /\blawyer\b/,
  /\bcounsel\b/,
  /\bsolicitor\b/,
  /\bbarrister\b/,
  /\badvocate\b/,
  /\bchambering\b/,
  /\bpupillage\b/,
  /\blitigation\b/,
  /\bsyariah\b/,
  /\baccountant\b/,
  /\baccounting\b/,
  /\baudit\b/,
  /\bauditor\b/,
  /\btax\b/,
  /\btaxation\b/,
  /\bcompliance\b/,
  /\bregulatory\b/,
  /\bacca\b/,
  /\bcpa\b/,
  /\bmia\b/,
  /\bpilot\b/,
  /\bcaptain\b/,
  /\bfirst officer\b/,
  /\baviation\b/,
  /\baircraft\b/,
  /\bflight crew\b/,
  /\bair traffic\b/,
  /\batc\b/,
  /\bprofessional engineer\b/,
  /\bir\.\b/,
  /\bbem\b/,
  /\bstructural engineer\b/,
  /\bsafety officer\b/,
  /\bhse\b/,
  /\behs\b/,
  /\bosha\b/,
  /\bdosh\b/,
  /\benvironmental officer\b/,
  /\bpolice\b/,
  /\bmilitary\b/,
  /\barmy\b/,
  /\benforcement\b/,
  /\bimmigration\b/,
  /\bclinical\b/,
  /\blaboratory\b/,
  /\bchemist\b/,
];

const SEMI_STRICT_PATTERNS: RegExp[] = [
  /\bcompliance manager\b/,
  /\brisk\b/,
  /\binternal audit\b/,
  /\bquality assurance\b/,
  /\bqa\b/,
  /\bqc\b/,
  /\bregulatory affairs\b/,
  /\bfinance manager\b/,
  /\btax manager\b/,
  /\bsafety manager\b/,
  /\bclinical sales\b/,
  /\bmedical device\b/,
  /\bpharma sales\b/,
  /\boperations manager\b.*\b(bank|banking|medical|healthcare|pharma|aviation|regulated)\b/,
  /\b(bank|banking|medical|healthcare|pharma|aviation|regulated)\b.*\boperations manager\b/,
];

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9.\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function classifyRoleTrustPolicy(jobTitle: string): RoleTrustPolicy {
  const title = normalizeTitle(jobTitle);

  if (SEMI_STRICT_PATTERNS.some(pattern => pattern.test(title))) {
    return 'SEMI_STRICT';
  }

  if (STRICT_PATTERNS.some(pattern => pattern.test(title))) {
    return 'STRICT';
  }

  return 'FLEX';
}
