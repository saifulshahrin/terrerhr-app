import {
  canonicalOpportunityToDto,
  externalOpportunityToDto,
  type CandidateOpportunity,
  type CanonicalOpportunityRow,
  type ExternalOpportunityRow,
  type TrustedMatch,
} from './opportunityDto.ts';

export interface UnifiedOpportunityDataSource {
  listCanonical(): Promise<CanonicalOpportunityRow[]>;
  listExternal(): Promise<ExternalOpportunityRow[]>;
  listCanonicalMatches(candidateId: string): Promise<TrustedMatch[]>;
  listExternalMatches(candidateId: string): Promise<TrustedMatch[]>;
}

export interface UnifiedOpportunityQueryOptions {
  candidateId?: string;
}

function normalizeExactSourceUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      const normalizedKey = key.toLowerCase();
      if (
        normalizedKey.startsWith('utm_') ||
        ['gclid', 'dclid', 'fbclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', 'igshid'].includes(normalizedKey)
      ) {
        url.searchParams.delete(key);
      }
    }
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, '');
    url.searchParams.sort();
    return url.toString();
  } catch {
    return null;
  }
}

function opportunityFreshness(opportunity: CandidateOpportunity): number {
  const value = opportunity.lastVerifiedAt ?? opportunity.publishedAt ?? opportunity.discoveredAt;
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function opportunityQuality(opportunity: CandidateOpportunity): number {
  return [opportunity.title, opportunity.company, opportunity.location, opportunity.summary, opportunity.roleCluster]
    .filter((value) => Boolean(value?.trim())).length;
}

export function rankUnifiedOpportunities(opportunities: CandidateOpportunity[]): CandidateOpportunity[] {
  return [...opportunities].sort((left, right) => {
    const scoreDelta = (right.matchScore ?? -1) - (left.matchScore ?? -1);
    if (scoreDelta) return scoreDelta;
    const freshnessDelta = opportunityFreshness(right) - opportunityFreshness(left);
    if (freshnessDelta) return freshnessDelta;
    const qualityDelta = opportunityQuality(right) - opportunityQuality(left);
    if (qualityDelta) return qualityDelta;
    return left.id.localeCompare(right.id);
  });
}

export async function loadUnifiedOpportunities(
  source: UnifiedOpportunityDataSource,
  options: UnifiedOpportunityQueryOptions = {}
): Promise<CandidateOpportunity[]> {
  const candidateId = options.candidateId?.trim();
  const [canonicalRows, externalRows, canonicalMatches, externalMatches] =
    await Promise.all([
      source.listCanonical(),
      source.listExternal(),
      candidateId ? source.listCanonicalMatches(candidateId) : Promise.resolve([]),
      candidateId ? source.listExternalMatches(candidateId) : Promise.resolve([]),
    ]);

  const canonicalMatchById = new Map(
    canonicalMatches.map((match) => [match.opportunityId, match])
  );
  const externalMatchById = new Map(
    externalMatches.map((match) => [match.opportunityId, match])
  );

  const canonicalSourceUrls = new Set(
    canonicalRows
      .map((row) => normalizeExactSourceUrl(row.external_job_url))
      .filter((value): value is string => Boolean(value)),
  );
  const reconciledExternalRows = externalRows.filter((row) => {
    const sourceUrl = normalizeExactSourceUrl(row.source_url);
    return !sourceUrl || !canonicalSourceUrls.has(sourceUrl);
  });

  return rankUnifiedOpportunities([
    ...canonicalRows.map((row) => canonicalOpportunityToDto(row, canonicalMatchById.get(row.id))),
    ...reconciledExternalRows.map((row) => externalOpportunityToDto(row, externalMatchById.get(row.id))),
  ]);
}
