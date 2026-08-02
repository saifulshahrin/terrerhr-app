export type OpportunityOrigin = 'canonical_terrer' | 'external';

export type OpportunityAction =
  | { kind: 'canonical_interest'; available: true }
  | { kind: 'external_source'; available: true; url: string }
  | { kind: 'external_review'; available: true }
  | { kind: 'unavailable'; available: false; reason: string };

export interface CandidateOpportunity {
  id: string;
  sourceId: string;
  origin: OpportunityOrigin;
  title: string;
  company: string;
  location: string;
  summary: string | null;
  salaryText: string | null;
  sourceUrl: string | null;
  publishedAt: string | null;
  discoveredAt: string | null;
  lastVerifiedAt: string | null;
  roleCluster: string | null;
  matchScore: number | null;
  matchReasons: string[];
  actions: {
    interest: OpportunityAction;
    source: OpportunityAction;
    review: OpportunityAction;
  };
}

export interface CanonicalOpportunityRow {
  id: string;
  job_title: string;
  company_name: string;
  location: string | null;
  job_description_text: string | null;
  compensation_text: string | null;
  external_job_url: string | null;
  posted_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  role_family: string | null;
}

export interface ExternalOpportunityRow {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  opportunity_summary: string | null;
  source_url: string;
  posted_at: string | null;
  discovered_at: string;
  last_verified_at: string;
  role_family: string | null;
}

export interface TrustedMatch {
  opportunityId: string;
  score: number;
  reasons: string[];
}

function authoritativeSalaryText(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new TypeError('Canonical compensation text must be a string or null.');
  }
  return value;
}

export function canonicalOpportunityToDto(
  row: CanonicalOpportunityRow,
  match?: TrustedMatch
): CandidateOpportunity {
  return {
    id: `canonical:${row.id}`,
    sourceId: row.id,
    origin: 'canonical_terrer',
    title: row.job_title,
    company: row.company_name,
    location: row.location ?? '',
    summary: row.job_description_text,
    salaryText: authoritativeSalaryText(row.compensation_text),
    sourceUrl: row.external_job_url,
    publishedAt: row.posted_date,
    discoveredAt: row.created_at,
    lastVerifiedAt: row.updated_at,
    roleCluster: row.role_family,
    matchScore: match?.score ?? null,
    matchReasons: match?.reasons ?? [],
    actions: {
      interest: { kind: 'canonical_interest', available: true },
      source: row.external_job_url
        ? { kind: 'external_source', available: true, url: row.external_job_url }
        : { kind: 'unavailable', available: false, reason: 'No external source URL' },
      review: {
        kind: 'unavailable',
        available: false,
        reason: 'External review applies only to external opportunities',
      },
    },
  };
}

export function externalOpportunityToDto(
  row: ExternalOpportunityRow,
  match?: TrustedMatch
): CandidateOpportunity {
  return {
    id: `external:${row.id}`,
    sourceId: row.id,
    origin: 'external',
    title: row.job_title,
    company: row.company_name,
    location: row.location,
    summary: row.opportunity_summary,
    salaryText: null,
    sourceUrl: row.source_url,
    publishedAt: row.posted_at,
    discoveredAt: row.discovered_at,
    lastVerifiedAt: row.last_verified_at,
    roleCluster: row.role_family,
    matchScore: match?.score ?? null,
    matchReasons: match?.reasons ?? [],
    actions: {
      interest: {
        kind: 'unavailable',
        available: false,
        reason: 'External opportunities cannot create canonical interest',
      },
      source: { kind: 'external_source', available: true, url: row.source_url },
      review: { kind: 'external_review', available: true },
    },
  };
}
