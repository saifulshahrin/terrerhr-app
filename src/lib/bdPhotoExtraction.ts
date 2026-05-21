export type PhotoExtractionStatus =
  | 'Uploaded'
  | 'Processing'
  | 'Extracted'
  | 'Needs Review'
  | 'Saved'
  | 'Failed';

export interface BdPhotoExtractedFields {
  company_name: string;
  company_status: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_full_name: string;
  occupation_title: string;
  email: string;
  direct_phone: string;
  mobile_phone: string;
  address: string;
  source_system_id: string;
  source_notes: string;
  relationship_status: string;
  created_by_legacy: string;
  legacy_date_added: string;
  jobs_count: string;
  submissions_count: string;
  client_submissions_count: string;
  interviews_count: string;
  placements_count: string;
}

export interface BdPhotoExtractionResult {
  fields: BdPhotoExtractedFields;
  confidence: number; // 0..1 (mock)
  raw: unknown;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeBaseName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ').trim();
}

function splitName(fullName: string): { first: string; last: string } {
  const cleaned = fullName.trim().replace(/\s+/g, ' ');
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function mockEmailFromName(fullName: string, companyName: string) {
  const local = fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join('.');
  const domain = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 16);
  if (!local || !domain) return '';
  return `${local}@${domain}.com`;
}

export async function parseBdPhotoMock(image: File): Promise<BdPhotoExtractionResult> {
  // Placeholder extraction function for Phase 1:
  // Returns editable structured fields so the UI/workflow can be built without OCR/Vision.
  await sleep(700 + Math.round(Math.random() * 700));

  const label = safeBaseName(image.name);
  const seedCompany = label.toLowerCase().includes('apple') ? 'Apple Malaysia' : 'Client Account';
  const seedName = label.toLowerCase().includes('business') ? 'Aiman Zulkifli' : 'Siti Nur Aisyah';
  const split = splitName(seedName);
  const nowIso = new Date().toISOString();

  const fields: BdPhotoExtractedFields = {
    company_name: seedCompany,
    company_status: 'target',
    contact_first_name: split.first,
    contact_last_name: split.last,
    contact_full_name: seedName,
    occupation_title: 'HR Manager',
    email: mockEmailFromName(seedName, seedCompany),
    direct_phone: '',
    mobile_phone: '+60',
    address: 'Kuala Lumpur, Malaysia',
    source_system_id: `legacy:${image.name}`,
    source_notes: `Mock extracted from photo "${image.name}". Replace with OCR/Vision extraction later.`,
    relationship_status: 'new',
    created_by_legacy: 'legacy_import',
    legacy_date_added: nowIso,
    jobs_count: '0',
    submissions_count: '0',
    client_submissions_count: '0',
    interviews_count: '0',
    placements_count: '0',
  };

  return {
    fields,
    confidence: 0.62,
    raw: {
      mock: true,
      file: { name: image.name, type: image.type, size: image.size },
      generated_at: nowIso,
    },
  };
}

