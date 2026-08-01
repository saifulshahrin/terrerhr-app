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

  return [
    ...canonicalRows.map((row) =>
      canonicalOpportunityToDto(row, canonicalMatchById.get(row.id))
    ),
    ...externalRows.map((row) =>
      externalOpportunityToDto(row, externalMatchById.get(row.id))
    ),
  ].sort((left, right) => {
    const leftFreshness = left.lastVerifiedAt ?? left.publishedAt ?? left.discoveredAt ?? '';
    const rightFreshness = right.lastVerifiedAt ?? right.publishedAt ?? right.discoveredAt ?? '';
    return rightFreshness.localeCompare(leftFreshness);
  });
}
