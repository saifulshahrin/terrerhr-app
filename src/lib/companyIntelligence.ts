import { supabase } from './supabase';

export type CompanySourceStatus = 'missing' | 'queued' | 'partial' | 'ready' | 'blocked';

export interface CompanyIntelligenceRow {
  id: number;
  company_name: string;
  company_slug: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  career_url: string | null;
  ats_family: string | null;
  source_confidence: number | null;
  source_status: CompanySourceStatus | null;
  source_notes: string | null;
  last_enriched_at: string | null;
  last_checked_at: string | null;
  hq_country: string | null;
  primary_city: string | null;
  company_status: string | null;
  source_type: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type CompanyIntelligenceUpdate = Partial<
  Pick<
    CompanyIntelligenceRow,
    | 'website_url'
    | 'linkedin_url'
    | 'career_url'
    | 'ats_family'
    | 'source_confidence'
    | 'source_status'
    | 'source_notes'
    | 'last_enriched_at'
    | 'last_checked_at'
  >
>;

export type CompanySourceDisplayStatus = 'Missing' | 'Queued' | 'Partial' | 'Ready' | 'Blocked';

export const COMPANY_INTELLIGENCE_SELECT = `
  id,
  company_name,
  company_slug,
  website_url,
  linkedin_url,
  career_url,
  ats_family,
  source_confidence,
  source_status,
  source_notes,
  last_enriched_at,
  last_checked_at,
  hq_country,
  primary_city,
  company_status,
  source_type,
  notes,
  created_at,
  updated_at
`;

function cleanText(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed || null;
}

function normalizeStatus(value: string | null | undefined): CompanySourceStatus | null {
  const normalized = cleanText(value)?.toLowerCase();
  if (
    normalized === 'missing' ||
    normalized === 'queued' ||
    normalized === 'partial' ||
    normalized === 'ready' ||
    normalized === 'blocked'
  ) {
    return normalized;
  }
  return null;
}

export function deriveCompanySourceStatus(
  company: Pick<
    CompanyIntelligenceRow,
    'website_url' | 'linkedin_url' | 'career_url' | 'ats_family' | 'source_confidence' | 'source_status'
  >
): CompanySourceDisplayStatus {
  const storedStatus = normalizeStatus(company.source_status);
  if (storedStatus === 'queued') return 'Queued';
  if (storedStatus === 'blocked') return 'Blocked';
  if (storedStatus === 'ready') return 'Ready';
  if (storedStatus === 'partial') return 'Partial';
  if (storedStatus === 'missing') return 'Missing';

  const hasWebsite = Boolean(cleanText(company.website_url));
  const hasLinkedIn = Boolean(cleanText(company.linkedin_url));
  const hasCareer = Boolean(cleanText(company.career_url));
  const hasAts = Boolean(cleanText(company.ats_family));
  const confidence = company.source_confidence ?? 0;

  if (hasCareer && (hasAts || confidence >= 70)) return 'Ready';
  if (hasWebsite || hasLinkedIn || hasCareer || hasAts || confidence > 0) return 'Partial';
  return 'Missing';
}

export function isCompanyMissingSourceIntelligence(
  company: Pick<
    CompanyIntelligenceRow,
    'website_url' | 'linkedin_url' | 'career_url' | 'ats_family' | 'source_confidence' | 'source_status'
  >
): boolean {
  return deriveCompanySourceStatus(company) === 'Missing';
}

export function isCompanyReadyForHiringChecks(
  company: Pick<CompanyIntelligenceRow, 'career_url' | 'source_status'>
): boolean {
  return normalizeStatus(company.source_status) === 'ready' && Boolean(cleanText(company.career_url));
}

export async function fetchCompanyIntelligence(): Promise<CompanyIntelligenceRow[]> {
  const { data, error } = await supabase
    .from('companies')
    .select(COMPANY_INTELLIGENCE_SELECT)
    .order('company_name', { ascending: true })
    .limit(1000);

  if (error) throw error;
  return (data ?? []) as CompanyIntelligenceRow[];
}

async function fetchBdRelationshipCompanyIds(): Promise<Set<number>> {
  const { data, error } = await supabase.from('bd_contacts').select('company_id').not('company_id', 'is', null).limit(5000);

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.company_id).filter((id): id is number => typeof id === 'number'));
}

export async function fetchCompaniesMissingSourceIntelligence(): Promise<CompanyIntelligenceRow[]> {
  const [companies, relationshipCompanyIds] = await Promise.all([fetchCompanyIntelligence(), fetchBdRelationshipCompanyIds()]);
  return companies.filter((company) => relationshipCompanyIds.has(company.id) && isCompanyMissingSourceIntelligence(company));
}

export async function fetchCompaniesReadyForHiringChecks(): Promise<CompanyIntelligenceRow[]> {
  const [companies, relationshipCompanyIds] = await Promise.all([fetchCompanyIntelligence(), fetchBdRelationshipCompanyIds()]);
  return companies.filter((company) => relationshipCompanyIds.has(company.id) && isCompanyReadyForHiringChecks(company));
}

export async function updateCompanyIntelligence(
  companyId: number,
  patch: CompanyIntelligenceUpdate
): Promise<CompanyIntelligenceRow> {
  const nowIso = new Date().toISOString();
  const payload: CompanyIntelligenceUpdate & { updated_at: string } = {
    updated_at: nowIso,
  };

  if ('website_url' in patch) payload.website_url = cleanText(patch.website_url);
  if ('linkedin_url' in patch) payload.linkedin_url = cleanText(patch.linkedin_url);
  if ('career_url' in patch) payload.career_url = cleanText(patch.career_url);
  if ('ats_family' in patch) payload.ats_family = cleanText(patch.ats_family)?.toLowerCase() ?? null;
  if ('source_notes' in patch) payload.source_notes = cleanText(patch.source_notes);
  if ('source_status' in patch) payload.source_status = normalizeStatus(patch.source_status);
  if ('last_checked_at' in patch) payload.last_checked_at = patch.last_checked_at ?? null;
  if ('last_enriched_at' in patch) payload.last_enriched_at = patch.last_enriched_at ?? null;
  if ('source_confidence' in patch) {
    const confidence = patch.source_confidence;
    payload.source_confidence =
      typeof confidence === 'number' && Number.isFinite(confidence)
        ? Math.max(0, Math.min(100, Math.round(confidence)))
        : null;
  }

  if (
    'website_url' in patch ||
    'linkedin_url' in patch ||
    'career_url' in patch ||
    'ats_family' in patch ||
    'source_confidence' in patch ||
    'source_status' in patch ||
    'source_notes' in patch
  ) {
    payload.last_enriched_at = patch.last_enriched_at ?? nowIso;
  }

  const { data, error } = await supabase
    .from('companies')
    .update(payload)
    .eq('id', companyId)
    .select(COMPANY_INTELLIGENCE_SELECT)
    .single();

  if (error) throw error;
  return data as CompanyIntelligenceRow;
}
