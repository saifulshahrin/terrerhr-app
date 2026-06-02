import { useEffect, useMemo, useState } from 'react';
import { Building2, CalendarClock, Clock, Phone, Search, Sparkles, Users } from 'lucide-react';
import {
  COMPANY_INTELLIGENCE_SELECT,
  deriveCompanySourceStatus,
  updateCompanyIntelligence,
  type CompanyIntelligenceUpdate,
  type CompanySourceStatus,
} from '../lib/companyIntelligence';
import { fetchAllJobs, type JobListRow } from '../lib/jobs';
import { normalizeRoleTitle } from '../lib/roleNormalization';
import { supabase } from '../lib/supabase';
import { Badge, MetricTile, PageHeader, Panel, SectionHeader } from '../components/visualSystem';

interface Props {
  onNavigate: (page: string) => void;
}
const NEW_COMPANY_SENTINEL = '__create_new_company__';

type CompanyStatus = string | null;
type RelationshipStatus = string | null;

interface CompanyRow {
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
  company_status: CompanyStatus;
  source_type: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ContactRow {
  id: string;
  company_id: number | null;
  full_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  relationship_status: RelationshipStatus;
  next_action: string | null;
  next_action_date: string | null; // date
  last_contacted_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface DuplicateMatch {
  contact: ContactRow;
  kind: 'strong_email' | 'strong_phone' | 'possible_name';
}

type EditableContact = Pick<
  ContactRow,
  'id' | 'full_name' | 'job_title' | 'email' | 'phone' | 'mobile_phone' | 'relationship_status' | 'notes'
> & {
  hiddenMigrationNotes?: string;
};

type UiContactStatus = 'new' | 'contacted' | 'responded' | 'opportunity';

type EditableCompanyIntelligence = Pick<
  CompanyRow,
  | 'id'
  | 'company_name'
  | 'website_url'
  | 'linkedin_url'
  | 'career_url'
  | 'ats_family'
  | 'source_confidence'
  | 'source_status'
  | 'source_notes'
>;

interface UiContactActionState {
  status: UiContactStatus;
  nextAction: string;
}

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function isLikelyMigrationJsonBlob(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false;
  const lower = trimmed.toLowerCase();
  return (
    lower.includes('source_batch') ||
    lower.includes('source_image') ||
    lower.includes('bullhorn_contact_id') ||
    lower.includes('raw_row') ||
    lower.includes('extraction_confidence') ||
    lower.includes('hallucination_risk')
  );
}

function isInternalMigrationLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();

  if (isLikelyMigrationJsonBlob(trimmed)) return true;

  return (
    lower.startsWith('bullhorn metadata:') ||
    lower.startsWith('bullhorn secondary email:') ||
    lower.startsWith('bullhorn company_main_phone:') ||
    lower.startsWith('bullhorn address:') ||
    lower.includes('"source_batch"') ||
    lower.includes('"source_image"') ||
    lower.includes('"bullhorn_contact_id"') ||
    lower.includes('"raw_row"') ||
    lower.includes('"extraction_confidence"') ||
    lower.includes('"hallucination_risk"')
  );
}

function splitNotesForDisplay(notes: string | null | undefined): { display: string; hidden: string } {
  const raw = (notes ?? '').trim();
  if (!raw) return { display: '', hidden: '' };
  if (isLikelyMigrationJsonBlob(raw)) return { display: '', hidden: raw };

  const lines = raw.split(/\r?\n/);
  const displayLines: string[] = [];
  const hiddenLines: string[] = [];

  for (const line of lines) {
    if (isInternalMigrationLine(line)) {
      hiddenLines.push(line);
    } else {
      displayLines.push(line);
    }
  }

  return {
    display: displayLines.join('\n').trim(),
    hidden: hiddenLines.join('\n').trim(),
  };
}

function normalizePhone(value: string | null | undefined) {
  return (value ?? '').replace(/[^0-9+]/g, '').trim();
}

function formatCompanyLocation(company: CompanyRow) {
  const parts = [company.primary_city, company.hq_country].filter(Boolean);
  return parts.join(', ');
}

function formatCompanySourceLabel(sourceType: string | null | undefined): string {
  const normalized = normalize(sourceType);

  if (normalized === 'legacy_bd_list') return 'Target Account';
  if (normalized === 'demo_seed') return 'Demo Account';
  if (normalized === 'manual') return 'Manual Entry';

  // Unknown/internal values should not leak into stakeholder-facing UI.
  if (!normalized) return 'Relationship';
  return 'Relationship';
}

type AccountPriority = 'High Opportunity' | 'Medium Opportunity' | 'Watchlist';
type HiringSignalStrength = 'High' | 'Medium' | 'Low' | 'None';
type BdPriorityLevel = 'High Priority' | 'Medium Priority' | 'Low Priority';

function normalizeCompanyKey(value: string | null | undefined): string {
  return normalize(value)
    .replace(/\b(sdn\.?\s*bhd\.?|bhd\.?|berhad|ltd\.?|limited|inc\.?|corp\.?|co\.?|company)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isMalaysiaLocation(location: string | null | undefined): boolean {
  const text = normalize(location);
  if (!text) return true;
  if (text.includes('malaysia')) return true;
  return (
    text.includes('kuala') ||
    text.includes('selangor') ||
    text.includes('kl') ||
    text.includes('penang') ||
    text.includes('johor') ||
    text.includes('petaling') ||
    text.includes('pj') ||
    text.includes('cyberjaya')
  );
}

function daysAgoLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (Number.isNaN(days)) return 'Unknown';
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function nextActionTone(nextActionDate: string | null): 'red' | 'amber' | 'slate' {
  if (!nextActionDate) return 'slate';
  const todayIso = new Date().toISOString().slice(0, 10);
  const due = nextActionDate.slice(0, 10);
  if (due < todayIso) return 'red';
  if (due === todayIso) return 'amber';
  return 'slate';
}

function nextActionLabel(nextAction: string | null, nextActionDate: string | null): string {
  if (!nextAction && !nextActionDate) return 'No next action';
  if (!nextActionDate) return nextAction || 'No next action';
  const todayIso = new Date().toISOString().slice(0, 10);
  const due = nextActionDate.slice(0, 10);
  if (due < todayIso) return `${nextAction || 'Follow-up'} · Overdue`;
  if (due === todayIso) return `${nextAction || 'Follow-up'} · Due today`;
  return `${nextAction || 'Follow-up'} · ${due}`;
}

function isTierOne(company: CompanyRow): boolean {
  const status = normalize(company.company_status ?? '');
  const source = normalize(company.source_type ?? '');
  return status.includes('tier1') || status.includes('tier_1') || source === 'legacy_bd_list';
}

function priorityFromScore(score: number): AccountPriority {
  if (score >= 10) return 'High Opportunity';
  if (score >= 5) return 'Medium Opportunity';
  return 'Watchlist';
}

function priorityTone(priority: AccountPriority) {
  if (priority === 'High Opportunity') return 'emerald';
  if (priority === 'Medium Opportunity') return 'amber';
  return 'slate';
}

interface CompanyIntel {
  priority: AccountPriority;
  hiringSignal: HiringSignalStrength;
  bdPriority: BdPriorityLevel;
  why: string[];
  signals: Array<{ label: string; tone: Parameters<typeof Badge>[0]['tone'] }>;
  suggestedAction: string;
  openRolesSnapshot: Array<{ label: string; count: number }>;
  marketJobs: number;
  operationalJobs: number;
  activeJobs: number;
  lastHiringActivityDate: string | null;
  lastActivityLabel: string;
  followUpLabel: string;
}

function hiringSignalTone(signal: HiringSignalStrength): Parameters<typeof Badge>[0]['tone'] {
  if (signal === 'High') return 'emerald';
  if (signal === 'Medium') return 'amber';
  if (signal === 'Low') return 'slate';
  return 'slate';
}

function bdPriorityTone(priority: BdPriorityLevel): Parameters<typeof Badge>[0]['tone'] {
  if (priority === 'High Priority') return 'emerald';
  if (priority === 'Medium Priority') return 'amber';
  return 'slate';
}

function sourceStatusTone(company: CompanyRow): Parameters<typeof Badge>[0]['tone'] {
  const status = deriveCompanySourceStatus(company);
  if (status === 'Ready') return 'emerald';
  if (status === 'Queued') return 'blue';
  if (status === 'Partial') return 'amber';
  if (status === 'Blocked') return 'red';
  return 'slate';
}

function formatSourceUrl(url: string | null | undefined): string {
  return (url ?? '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function computeCompanyIntel({
  company,
  companyContacts,
  companyJobs,
}: {
  company: CompanyRow;
  companyContacts: ContactRow[];
  companyJobs: JobListRow[];
}): CompanyIntel {
  const tierOne = isTierOne(company);

  const marketJobs = companyJobs.filter((job) => job.source !== 'manual_intake').length;
  const operationalJobs = companyJobs.filter((job) => job.source === 'manual_intake').length;
  const activeJobs = companyJobs.filter((job) => normalize(job.operational_status) === 'active').length;
  const malaysiaMarketJobs = companyJobs.filter(
    (job) => job.source !== 'manual_intake' && isMalaysiaLocation(job.location)
  ).length;
  const lastHiringActivityIso = companyJobs
    .map((job) => job.updated_at)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
  const lastHiringActivityDate = lastHiringActivityIso ? lastHiringActivityIso.slice(0, 10) : null;

  const roleCounts = new Map<string, number>();
  const familyCounts = new Map<string, number>();
  const locationCounts = new Map<string, number>();
  const recentMarketJobs = companyJobs.filter((job) => {
    if (job.source === 'manual_intake') return false;
    const days = (Date.now() - new Date(job.updated_at).getTime()) / 86400000;
    return Number.isFinite(days) && days <= 14;
  }).length;

  for (const job of companyJobs) {
    const normalized = normalizeRoleTitle(job.job_title);
    const role = normalized.normalized_job_title?.trim() || 'Other';
    const family = normalized.role_family?.trim() || 'Other / Unclassified';
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
    familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);

    const loc = (job.location ?? '').trim() || 'Malaysia';
    locationCounts.set(loc, (locationCounts.get(loc) ?? 0) + 1);
  }

  const topRoles = Array.from(roleCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 3);

  const topFamilies = Array.from(familyCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 2);
  const primaryRoleLabel = topRoles[0]?.label ?? null;
  const backendSpike = Boolean(primaryRoleLabel && /backend/i.test(primaryRoleLabel) && recentMarketJobs >= 2);
  const dataSpike = Boolean(primaryRoleLabel && /data/i.test(primaryRoleLabel) && recentMarketJobs >= 2);

  const engineeringDemand =
    (familyCounts.get('Technology / IT') ?? 0) +
      (familyCounts.get('Data / Analytics') ?? 0) +
      (familyCounts.get('Product') ?? 0) +
      (familyCounts.get('Cybersecurity') ?? 0) >
    0;
  const financeDemand = (familyCounts.get('Finance / Accounting') ?? 0) > 0;
  const multiLocation = locationCounts.size >= 2;
  const difficultToFill =
    Array.from(roleCounts.keys()).some((r) =>
      /(data scientist|cyber|enterprise architect|devops|site reliability|ml engineer)/i.test(r)
    ) || (familyCounts.get('Cybersecurity') ?? 0) > 0;

  const signals: CompanyIntel['signals'] = [];
  if (marketJobs > 0) signals.push({ label: 'Active Hiring', tone: 'emerald' });
  if (recentMarketJobs >= 3) signals.push({ label: 'Hiring Velocity Up', tone: 'blue' });
  if (engineeringDemand) signals.push({ label: 'Engineering Demand', tone: 'violet' });
  if (financeDemand) signals.push({ label: 'Finance Hiring', tone: 'teal' });
  if (multiLocation) signals.push({ label: 'Multi-location', tone: 'slate' });
  if (difficultToFill) signals.push({ label: 'Difficult-to-fill', tone: 'amber' });
  if (tierOne) signals.push({ label: 'Tier 1 Account', tone: 'emerald' });

  const latestContacted = companyContacts
    .map((c) => c.last_contacted_at ?? c.updated_at ?? null)
    .filter((d): d is string => Boolean(d))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  const nextFollowUp = companyContacts
    .map((c) => c.next_action_date)
    .filter((d): d is string => Boolean(d))
    .sort((a, b) => a.localeCompare(b))[0];

  const lastActivityLabel = latestContacted ? `Follow-up sent ${daysAgoLabel(latestContacted)}` : 'No recent BD activity';

  const todayIso = new Date().toISOString().slice(0, 10);
  let followUpLabel = 'No follow-up scheduled';
  if (nextFollowUp) {
    followUpLabel =
      nextFollowUp < todayIso ? `Follow-up overdue (${nextFollowUp})` : nextFollowUp === todayIso ? 'Follow-up due today' : `Next follow-up ${nextFollowUp}`;
  }

  const score =
    marketJobs +
    recentMarketJobs * 2 +
    (engineeringDemand ? 2 : 0) +
    (financeDemand ? 1 : 0) +
    (tierOne ? 2 : 0) +
    Math.min(companyContacts.length, 3);

  const priority = priorityFromScore(score);

  let hiringSignal: HiringSignalStrength = 'None';
  if (marketJobs >= 5 || recentMarketJobs >= 3 || activeJobs >= 8) {
    hiringSignal = 'High';
  } else if (marketJobs >= 2 || activeJobs >= 4 || recentMarketJobs >= 1) {
    hiringSignal = 'Medium';
  } else if (marketJobs >= 1 || operationalJobs >= 1 || activeJobs >= 1) {
    hiringSignal = 'Low';
  }

  const hasContacts = companyContacts.length > 0;
  let bdPriority: BdPriorityLevel = 'Low Priority';
  if (hiringSignal === 'High' && hasContacts) {
    bdPriority = 'High Priority';
  } else if (hiringSignal === 'High' && !hasContacts) {
    bdPriority = 'Medium Priority';
  } else if (hiringSignal === 'Medium' && hasContacts) {
    bdPriority = 'Medium Priority';
  }

  const why: string[] = [];
  if (marketJobs > 0) {
    if (malaysiaMarketJobs > 0) {
      why.push(`${malaysiaMarketJobs} active Malaysia jobs`);
    } else {
      why.push(`${marketJobs} active jobs captured`);
    }
  } else {
    why.push('No current market-demand jobs captured yet');
  }
  if (topFamilies.length > 0) {
    why.push(`Recurring demand: ${topFamilies[0].label}`);
  }
  if (recentMarketJobs >= 3) {
    why.push('Hiring spike detected in the last 14 days');
  } else if (backendSpike) {
    why.push('Backend hiring spike detected');
  } else if (dataSpike) {
    why.push('Data hiring spike detected');
  } else if (tierOne) {
    why.push('Tier 1 account in internal target list');
  }

  let suggestedAction = 'Re-engage and confirm current hiring priorities.';
  const daysSinceContact = latestContacted ? (Date.now() - new Date(latestContacted).getTime()) / 86400000 : null;
  if (nextFollowUp && nextFollowUp <= todayIso) {
    suggestedAction = 'Follow up on pending outreach. Confirm hiring timeline and decision owner.';
  } else if (daysSinceContact == null || daysSinceContact > 21) {
    suggestedAction = 'Re-engage dormant account with a hiring snapshot and sourcing support offer.';
  } else if (engineeringDemand && marketJobs >= 5) {
    suggestedAction = 'Pitch engineering sourcing support. Prioritize backend/data roles first.';
  } else if (financeDemand && marketJobs >= 3) {
    suggestedAction = 'Prioritize finance hiring outreach. Offer pre-vetted analyst shortlist.';
  }

  return {
    priority,
    hiringSignal,
    bdPriority,
    why,
    signals: signals.slice(0, 6),
    suggestedAction,
    openRolesSnapshot: topRoles,
    marketJobs,
    operationalJobs,
    activeJobs,
    lastHiringActivityDate,
    lastActivityLabel,
    followUpLabel,
  };
}

function buildCompanyStubsFromContacts(contactRows: ContactRow[]): CompanyRow[] {
  // Fallback for cases where `companies` is not readable due to RLS policies.
  // Uses company_id keys from contacts to at least render a company list.
  const ids = Array.from(
    new Set(contactRows.map((c) => c.company_id).filter((id): id is number => typeof id === 'number'))
  );

  return ids
    .sort((a, b) => a - b)
    .map((id) => ({
      id,
      company_name: `Company #${id}`,
      company_slug: null,
      website_url: null,
      linkedin_url: null,
      career_url: null,
      ats_family: null,
      source_confidence: null,
      source_status: null,
      source_notes: null,
      last_enriched_at: null,
      last_checked_at: null,
      hq_country: 'Malaysia',
      primary_city: null,
      company_status: null,
      source_type: null,
      notes: 'Company details are currently not readable due to database access policies.',
      created_at: null,
      updated_at: null,
    }));
}

export default function BDRelationships({ onNavigate }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [jobs, setJobs] = useState<JobListRow[]>([]);
  const [jobsIntelError, setJobsIntelError] = useState<string | null>(null);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [companiesRestricted, setCompaniesRestricted] = useState(false);
  const [showAllCompanies, setShowAllCompanies] = useState(false);

  const [editingContact, setEditingContact] = useState<EditableContact | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingCompanyIntelligence, setEditingCompanyIntelligence] = useState<EditableCompanyIntelligence | null>(null);
  const [companyIntelSaving, setCompanyIntelSaving] = useState(false);
  const [companyIntelError, setCompanyIntelError] = useState<string | null>(null);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [addFieldErrors, setAddFieldErrors] = useState<{ company_id?: string; full_name?: string }>({});
  const [allowDuplicateSave, setAllowDuplicateSave] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [companyPickerOpen, setCompanyPickerOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    company_id: '' as string,
    full_name: '',
    job_title: '',
    linkedin_url: '',
    email: '',
    phone: '',
    mobile_phone: '',
    relationship_status: 'new',
    next_action: '',
    next_action_date: '',
    notes: '',
  });

  // UI-only action layer (no DB writes yet)
  const [contactActions] = useState<Record<string, UiContactActionState>>({});
  const [followUpDates, setFollowUpDates] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { data: companyRows, error: companyError } = await supabase
          .from('companies')
          .select(COMPANY_INTELLIGENCE_SELECT)
          .order('company_name', { ascending: true })
          .limit(500);

        if (companyError) throw companyError;

        const { data: contactRows, error: contactError } = await supabase
          .from('bd_contacts')
          .select(
            'id,company_id,full_name,job_title,email,phone,mobile_phone,relationship_status,next_action,next_action_date,last_contacted_at,notes,created_at,updated_at'
          )
          .order('updated_at', { ascending: false })
          .limit(2000);

        if (contactError) throw contactError;

        let jobRows: JobListRow[] = [];
        let jobErrorMessage: string | null = null;
        try {
          jobRows = await fetchAllJobs();
        } catch (jobErr) {
          console.warn('[BDRelationships] jobs signal load error (continuing without job intelligence):', jobErr);
          jobRows = [];
          jobErrorMessage = 'Job signal data is not readable right now.';
        }

        if (!active) return;

        const safeContacts = (contactRows ?? []) as ContactRow[];
        const safeCompanies = (companyRows ?? []) as CompanyRow[];

        // Diagnostics: helps confirm whether companies are empty due to RLS filtering.
        console.log('[BDRelationships] loaded', {
          companies: safeCompanies.length,
          contacts: safeContacts.length,
          note:
            safeCompanies.length === 0 && safeContacts.length > 0
              ? 'companies empty; using contact-derived company stubs (likely RLS on companies)'
              : undefined,
        });

        const restricted = safeCompanies.length === 0 && safeContacts.length > 0;
        setCompaniesRestricted(restricted);
        setContacts(safeContacts);
        setCompanies(restricted ? buildCompanyStubsFromContacts(safeContacts) : safeCompanies);
        setJobs(jobRows);
        setJobsIntelError(jobErrorMessage);
      } catch (err) {
        if (!active) return;
        console.error('[BDRelationships] load error:', err);
        setError('Unable to load BD relationships right now.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const companiesById = useMemo(() => {
    const map = new Map<number, CompanyRow>();
    for (const company of companies) {
      map.set(company.id, company);
    }
    return map;
  }, [companies]);

  const contactsByCompanyId = useMemo(() => {
    const map = new Map<number, ContactRow[]>();
    for (const contact of contacts) {
      if (!contact.company_id) continue;
      const existing = map.get(contact.company_id) ?? [];
      existing.push(contact);
      map.set(contact.company_id, existing);
    }
    return map;
  }, [contacts]);

  const jobsByCompanyKey = useMemo(() => {
    const map = new Map<string, JobListRow[]>();
    for (const job of jobs) {
      const key = normalizeCompanyKey(job.company_name);
      if (!key) continue;
      const existing = map.get(key) ?? [];
      existing.push(job);
      map.set(key, existing);
    }
    return map;
  }, [jobs]);

  const relationshipCompanies = useMemo(() => {
    return companies.filter((company) => (contactsByCompanyId.get(company.id) ?? []).length > 0);
  }, [companies, contactsByCompanyId]);

  const companiesToContact = useMemo(() => {
    const signalRank: Record<HiringSignalStrength, number> = {
      High: 4,
      Medium: 3,
      Low: 2,
      None: 1,
    };

    const ranked = companies.map((company) => {
      const companyContacts = contactsByCompanyId.get(company.id) ?? [];
      const key = normalizeCompanyKey(company.company_name);
      const companyJobs = key ? jobsByCompanyKey.get(key) ?? [] : [];
      const intel = computeCompanyIntel({ company, companyContacts, companyJobs });
      const latestContacted = companyContacts
        .map((c) => c.last_contacted_at ?? c.updated_at ?? null)
        .filter((d): d is string => Boolean(d))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

      return {
        company,
        intel,
        contactsCount: companyContacts.length,
        latestContacted,
      };
    });

    ranked.sort((a, b) => {
      const signalDiff = signalRank[b.intel.hiringSignal] - signalRank[a.intel.hiringSignal];
      if (signalDiff !== 0) return signalDiff;

      const contactsDiff = b.contactsCount - a.contactsCount;
      if (contactsDiff !== 0) return contactsDiff;

      const aTime = a.latestContacted ? new Date(a.latestContacted).getTime() : 0;
      const bTime = b.latestContacted ? new Date(b.latestContacted).getTime() : 0;
      return aTime - bTime;
    });

    return ranked.slice(0, 10);
  }, [companies, contactsByCompanyId, jobsByCompanyKey]);

  const relationshipCompaniesCount = relationshipCompanies.length;
  const contactsCount = contacts.length;
  const unreviewedCount = contacts.filter((c) => normalize(c.relationship_status ?? '') === 'new').length;

  const filteredCompanies = useMemo(() => {
    const baseCompanies = showAllCompanies ? companies : relationshipCompanies;
    const query = normalize(search);
    if (!query) return baseCompanies;

    return baseCompanies.filter((company) => {
      const name = normalize(company.company_name);
      const status = normalize(company.company_status ?? '');
      const source = normalize(company.source_type ?? '');

      if (name.includes(query) || status.includes(query) || source.includes(query)) return true;

      const companyContacts = contactsByCompanyId.get(company.id) ?? [];
      return companyContacts.some((contact) => {
        const contactName = normalize(contact.full_name);
        const contactTitle = normalize(contact.job_title ?? '');
        const contactEmail = normalize(contact.email ?? '');
        return (
          contactName.includes(query) ||
          contactTitle.includes(query) ||
          contactEmail.includes(query)
        );
      });
    });
  }, [companies, contactsByCompanyId, relationshipCompanies, search, showAllCompanies]);

  const companyOptions = useMemo(() => {
    const q = normalize(companySearch);
    if (!q) return companies.slice(0, 12);
    return companies
      .filter((company) => normalize(company.company_name).includes(q))
      .slice(0, 12);
  }, [companies, companySearch]);

  const effectiveCompanyIdForNewContact = useMemo(() => {
    if (newContact.company_id && newContact.company_id !== NEW_COMPANY_SENTINEL) return Number(newContact.company_id);
    const typed = companySearch.trim();
    if (!typed) return null;
    const exact = companies.find((company) => normalize(company.company_name) === normalize(typed));
    return exact?.id ?? null;
  }, [companies, companySearch, newContact.company_id]);

  const duplicateMatches = useMemo((): DuplicateMatch[] => {
    if (!effectiveCompanyIdForNewContact) return [];
    const fullName = normalize(newContact.full_name);
    const email = normalize(newContact.email);
    const phoneA = normalizePhone(newContact.phone);
    const phoneB = normalizePhone(newContact.mobile_phone);
    if (!fullName && !email && !phoneA && !phoneB) return [];

    const results: DuplicateMatch[] = [];
    for (const contact of contacts) {
      if (contact.company_id !== effectiveCompanyIdForNewContact) continue;
      const cEmail = normalize(contact.email);
      const cPhone = normalizePhone(contact.phone);
      const cMobile = normalizePhone(contact.mobile_phone);
      const cName = normalize(contact.full_name);

      if (email && cEmail && email === cEmail) {
        results.push({ contact, kind: 'strong_email' });
        continue;
      }
      if ((phoneA && (phoneA === cPhone || phoneA === cMobile)) || (phoneB && (phoneB === cPhone || phoneB === cMobile))) {
        results.push({ contact, kind: 'strong_phone' });
        continue;
      }
      if (fullName && cName && (cName.includes(fullName) || fullName.includes(cName))) {
        results.push({ contact, kind: 'possible_name' });
      }
    }
    const seen = new Set<string>();
    return results.filter((row) => {
      if (seen.has(row.contact.id)) return false;
      seen.add(row.contact.id);
      return true;
    });
  }, [contacts, effectiveCompanyIdForNewContact, newContact.email, newContact.full_name, newContact.mobile_phone, newContact.phone]);

  useEffect(() => {
    setAllowDuplicateSave(false);
  }, [newContact.company_id, companySearch, newContact.full_name, newContact.email, newContact.phone, newContact.mobile_phone]);

  const expandedCompany = expandedCompanyId ? companiesById.get(Number(expandedCompanyId)) : null;
  const expandedContacts = expandedCompanyId
    ? contactsByCompanyId.get(Number(expandedCompanyId)) ?? []
    : [];
  const expandedCompanyIntel = useMemo(() => {
    if (!expandedCompany) return null;
    const companyContacts = contactsByCompanyId.get(expandedCompany.id) ?? [];
    const key = normalizeCompanyKey(expandedCompany.company_name);
    const companyJobs = key ? jobsByCompanyKey.get(key) ?? [] : [];
    return computeCompanyIntel({ company: expandedCompany, companyContacts, companyJobs });
  }, [contactsByCompanyId, expandedCompany, jobsByCompanyKey]);

  function getUiStatus(contact: ContactRow): UiContactStatus {
    const fromUi = contactActions[contact.id]?.status;
    if (fromUi) return fromUi;

    const dbStatus = normalize(contact.relationship_status ?? '');
    if (dbStatus === 'contacted') return 'contacted';
    if (dbStatus === 'responded') return 'responded';
    if (dbStatus === 'opportunity') return 'opportunity';
    return 'new';
  }

  function renderStatusTag(status: UiContactStatus) {
    const styles =
      status === 'opportunity'
        ? 'bg-teal-50 text-teal-700'
        : status === 'responded'
        ? 'bg-emerald-50 text-emerald-700'
        : status === 'contacted'
          ? 'bg-amber-50 text-amber-800'
          : 'bg-gray-100 text-gray-700';

    return (
      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${styles}`}>
        {status}
      </span>
    );
  }

  const actionQueue = useMemo(() => {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);

    return contacts
      .filter((c) => c.next_action_date && c.next_action_date <= todayIso)
      .sort((a, b) => (a.next_action_date ?? '').localeCompare(b.next_action_date ?? ''));
  }, [contacts]);

  async function markContacted(contact: ContactRow) {
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('bd_contacts')
      .update({ relationship_status: 'contacted', last_contacted_at: nowIso, updated_at: nowIso })
      .eq('id', contact.id);

    if (updateError) throw updateError;

    setContacts((prev) =>
      prev.map((c) =>
        c.id === contact.id
          ? ({ ...c, relationship_status: 'contacted', last_contacted_at: nowIso, updated_at: nowIso } as ContactRow)
          : c
      )
    );
  }

  async function markResponded(contact: ContactRow) {
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('bd_contacts')
      .update({ relationship_status: 'responded', updated_at: nowIso })
      .eq('id', contact.id);

    if (updateError) throw updateError;

    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? ({ ...c, relationship_status: 'responded', updated_at: nowIso } as ContactRow) : c))
    );
  }

  async function setFollowUp(contact: ContactRow) {
    const date = followUpDates[contact.id] || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('bd_contacts')
      .update({ next_action: 'follow_up', next_action_date: date, updated_at: nowIso })
      .eq('id', contact.id);

    if (updateError) throw updateError;

    setContacts((prev) =>
      prev.map((c) =>
        c.id === contact.id
          ? ({ ...c, next_action: 'follow_up', next_action_date: date, updated_at: nowIso } as ContactRow)
          : c
      )
    );
  }

  async function saveContactEdits() {
    if (!editingContact) return;
    setEditSaving(true);
    setEditError(null);

    try {
      const mergedNotes = [editingContact.notes?.trim() || '', editingContact.hiddenMigrationNotes?.trim() || '']
        .filter(Boolean)
        .join('\n\n')
        .trim();

      const payload = {
        full_name: editingContact.full_name?.trim() || null,
        job_title: editingContact.job_title?.trim() || null,
        email: editingContact.email?.trim() || null,
        phone: editingContact.phone?.trim() || null,
        mobile_phone: editingContact.mobile_phone?.trim() || null,
        relationship_status: editingContact.relationship_status?.trim() || null,
        notes: mergedNotes || null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('bd_contacts')
        .update(payload)
        .eq('id', editingContact.id);

      if (updateError) throw updateError;

      // Update local state optimistically
      setContacts((prev) =>
        prev.map((c) => (c.id === editingContact.id ? ({ ...c, ...payload } as ContactRow) : c))
      );

      setEditingContact(null);
    } catch (err) {
      console.error('[BDRelationships] contact update failed', err);
      setEditError('Unable to save changes. This may be blocked by database access policies.');
    } finally {
      setEditSaving(false);
    }
  }

  async function saveCompanyIntelligenceEdits() {
    if (!editingCompanyIntelligence) return;
    setCompanyIntelSaving(true);
    setCompanyIntelError(null);

    try {
      const confidence =
        editingCompanyIntelligence.source_confidence == null || Number.isNaN(Number(editingCompanyIntelligence.source_confidence))
          ? null
          : Number(editingCompanyIntelligence.source_confidence);

      const payload: CompanyIntelligenceUpdate = {
        website_url: editingCompanyIntelligence.website_url,
        linkedin_url: editingCompanyIntelligence.linkedin_url,
        career_url: editingCompanyIntelligence.career_url,
        ats_family: editingCompanyIntelligence.ats_family,
        source_confidence: confidence,
        source_status: editingCompanyIntelligence.source_status,
        source_notes: editingCompanyIntelligence.source_notes,
      };

      const updatedCompany = await updateCompanyIntelligence(editingCompanyIntelligence.id, payload);

      setCompanies((prev) =>
        prev.map((company) => (company.id === updatedCompany.id ? ({ ...company, ...updatedCompany } as CompanyRow) : company))
      );
      setEditingCompanyIntelligence(null);
    } catch (err) {
      console.error('[BDRelationships] company intelligence update failed', err);
      setCompanyIntelError('Unable to save company source intelligence. This may be blocked by database access policies.');
    } finally {
      setCompanyIntelSaving(false);
    }
  }

  async function addContactManually() {
    setAddSaving(true);
    setAddError(null);
    setAddSuccess(null);
    setAddFieldErrors({});
    try {
      const fullName = newContact.full_name.trim();
      const companyNameInput = companySearch.trim();
      let companyIdValue: number | null = null;
      const nextFieldErrors: { company_id?: string; full_name?: string } = {};
      if (!newContact.company_id && !companyNameInput) nextFieldErrors.company_id = 'Company is required.';
      if (!fullName) nextFieldErrors.full_name = 'Full name is required.';
      if (Object.keys(nextFieldErrors).length > 0) {
        setAddFieldErrors(nextFieldErrors);
        setAddError('Please complete required fields.');
        return;
      }
      if (duplicateMatches.length > 0 && !allowDuplicateSave) {
        setAddError('Possible existing contact found. Review and choose Continue Anyway to save.');
        return;
      }

      if (newContact.company_id && newContact.company_id !== NEW_COMPANY_SENTINEL) {
        companyIdValue = Number(newContact.company_id);
      } else {
        const exact = companies.find((company) => normalize(company.company_name) === normalize(companyNameInput));
        if (exact) {
          companyIdValue = exact.id;
        } else {
          const { data: createdCompany, error: createCompanyError } = await supabase
            .from('companies')
            .insert({
              company_name: companyNameInput,
              source_type: 'manual',
              source_status: 'missing',
              updated_at: new Date().toISOString(),
            })
            .select(COMPANY_INTELLIGENCE_SELECT)
            .single();
          if (createCompanyError) throw createCompanyError;
          if (!createdCompany?.id) throw new Error('Unable to create company record.');
          companyIdValue = createdCompany.id as number;
          setCompanies((prev) => [createdCompany as CompanyRow, ...prev]);
        }
      }

      const linkedIn = newContact.linkedin_url.trim();
      const notesParts = [newContact.notes.trim()];
      if (linkedIn) notesParts.unshift(`LinkedIn: ${linkedIn}`);
      const normalizedNotes = notesParts.filter(Boolean).join('\n').trim();

      const payload: Record<string, string | number | null> = {
        company_id: companyIdValue,
        full_name: fullName,
        job_title: newContact.job_title.trim() || null,
        email: newContact.email.trim() || null,
        phone: newContact.phone.trim() || null,
        mobile_phone: newContact.mobile_phone.trim() || null,
        relationship_status: newContact.relationship_status.trim() || 'new',
        next_action: newContact.next_action.trim() || null,
        next_action_date: newContact.next_action_date || null,
        notes: normalizedNotes || null,
        source: 'manual_entry',
        updated_at: new Date().toISOString(),
      };

      const { data, error: insertError } = await supabase
        .from('bd_contacts')
        .insert(payload)
        .select('id,company_id,full_name,job_title,email,phone,mobile_phone,relationship_status,next_action,next_action_date,last_contacted_at,notes,created_at,updated_at')
        .single();

      if (insertError) throw insertError;

      setContacts((prev) => [data as ContactRow, ...prev]);
      if (data?.company_id) {
        setExpandedCompanyId(String(data.company_id));
      }
      setAddSuccess('Contact added successfully.');
      setShowAddContactModal(false);
        setNewContact({
          company_id: '',
        full_name: '',
        job_title: '',
        linkedin_url: '',
        email: '',
        phone: '',
        mobile_phone: '',
        relationship_status: 'new',
        next_action: '',
        next_action_date: '',
          notes: '',
        });
        setCompanySearch('');
        setCompanyPickerOpen(false);
        setAllowDuplicateSave(false);
      } catch (err) {
      console.error('[BDRelationships] add contact failed', err);
      setAddError('Unable to add contact right now. Please check database access policies and required fields.');
    } finally {
      setAddSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="BD Workspace"
        title="BD Relationships"
        description="Hiring-intelligence assisted account view based on captured jobs + BD contact activity. Designed for opportunity-first outreach, not a generic CRM."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search accounts or contacts"
                className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAddContactModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Users size={16} />
              Add Contact
            </button>
            <button
              type="button"
              onClick={() => onNavigate('bd-tasks')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
            >
              <CalendarClock size={16} />
              Log BD Activity
            </button>
          </div>
        }
      />
      {addSuccess ? (
        <Panel>
          <p className="text-sm font-medium text-emerald-700">{addSuccess}</p>
        </Panel>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile
          label="Relationship Companies"
          value={relationshipCompaniesCount}
          detail="Companies with BD contacts"
          icon={<Building2 size={16} />}
        />
        <MetricTile label="Contacts" value={contactsCount} detail="BD contact records" icon={<Users size={16} />} />
        <MetricTile
          label="Unreviewed"
          value={unreviewedCount}
          detail="Contacts marked new"
          icon={<Sparkles size={16} />}
          tone={unreviewedCount > 0 ? 'amber' : 'slate'}
        />
      </div>

      <Panel padded={false} className="overflow-hidden">
        <SectionHeader
          title="Companies To Contact"
          description="Top 10 ranked by hiring signal, relationship coverage, and recency of contact."
          icon={<Phone size={16} />}
        />
        <div className="divide-y divide-slate-100">
          {companiesToContact.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-500">No ranked companies available yet.</div>
          ) : (
            companiesToContact.map((item) => (
              <button
                key={item.company.id}
                type="button"
                onClick={() => setExpandedCompanyId(String(item.company.id))}
                className="w-full px-4 py-3 text-left transition hover:bg-slate-50/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{item.company.company_name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.intel.activeJobs} active jobs · {item.contactsCount} contacts
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Badge tone={hiringSignalTone(item.intel.hiringSignal)}>Hiring Signal: {item.intel.hiringSignal}</Badge>
                    <Badge tone={bdPriorityTone(item.intel.bdPriority)}>{item.intel.bdPriority}</Badge>
                    <Badge tone={sourceStatusTone(item.company)}>Source: {deriveCompanySourceStatus(item.company)}</Badge>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </Panel>

      <Panel padded={false} className="overflow-hidden">
        <SectionHeader
          title="Action Queue"
          description="Contacts with follow-ups due today or earlier."
          icon={<CalendarClock size={16} />}
          meta={<Badge tone={actionQueue.length > 0 ? 'amber' : 'slate'}>{actionQueue.length} due</Badge>}
        />
        {loading ? (
          <div className="px-4 pb-4 text-sm text-slate-500">Loading action queue...</div>
        ) : actionQueue.length === 0 ? (
          <div className="px-4 pb-4 text-sm text-slate-500">No actions due right now.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {actionQueue.slice(0, 20).map((contact) => (
              <div
                key={contact.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{contact.full_name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {(companiesById.get(contact.company_id ?? -1)?.company_name) ??
                      `Company #${contact.company_id ?? '?'}`}
                    {contact.next_action_date ? ` - Due ${contact.next_action_date}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedCompanyId(contact.company_id ? String(contact.company_id) : null)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    View account
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Panel padded={false} className="overflow-hidden">
          <SectionHeader
            title="Accounts"
            description={
              showAllCompanies
                ? 'All companies (including those without contacts). Select an account to view contacts.'
                : 'Relationship companies (accounts with contacts). Select an account to view contacts.'
            }
            icon={<Building2 size={16} />}
            meta={
              <div className="flex items-center gap-2">
                {jobsIntelError ? <Badge tone="amber">Job signals unavailable</Badge> : null}
                <Badge tone="slate">{filteredCompanies.length} shown</Badge>
              </div>
            }
          />
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 pb-4">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={showAllCompanies}
                onChange={(e) => setShowAllCompanies(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-200"
              />
              <span>Show all companies</span>
            </label>
            {companiesRestricted ? (
              <p className="text-xs text-amber-700">
                Company details are currently restricted by database access policies. Showing contact-linked company
                placeholders.
              </p>
            ) : null}
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="px-4 py-5 text-sm text-slate-500">Loading BD relationships...</div>
            ) : error ? (
              <div className="px-4 py-5 text-sm text-red-700">{error}</div>
            ) : filteredCompanies.length === 0 ? (
              <div className="px-4 py-5 text-sm text-slate-500">No accounts match your search.</div>
            ) : (
              filteredCompanies.map((company) => {
                const companyIdString = String(company.id);
                const isExpanded = companyIdString === expandedCompanyId;
                const companyContacts = contactsByCompanyId.get(company.id) ?? [];
                const key = normalizeCompanyKey(company.company_name);
                const companyJobs = key ? jobsByCompanyKey.get(key) ?? [] : [];
                const intel = computeCompanyIntel({ company, companyContacts, companyJobs });

                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => setExpandedCompanyId(isExpanded ? null : companyIdString)}
                    className={`w-full px-4 py-3 text-left transition hover:bg-slate-50/70 ${
                      isExpanded ? 'bg-slate-50 ring-1 ring-inset ring-slate-200/70' : 'bg-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{company.company_name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatCompanyLocation(company) || 'Malaysia'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Badge tone={priorityTone(intel.priority)}>{intel.priority}</Badge>
                        <Badge tone="slate">{companyContacts.length} contacts</Badge>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone={hiringSignalTone(intel.hiringSignal)}>Hiring Signal: {intel.hiringSignal}</Badge>
                      <Badge tone={bdPriorityTone(intel.bdPriority)}>{intel.bdPriority}</Badge>
                      {company.company_status ? <Badge tone="teal">{company.company_status}</Badge> : null}
                      <Badge tone="slate">{formatCompanySourceLabel(company.source_type)}</Badge>
                      <Badge tone={sourceStatusTone(company)}>Source: {deriveCompanySourceStatus(company)}</Badge>
                      {intel.signals.slice(0, 4).map((signal) => (
                        <Badge key={signal.label} tone={signal.tone}>
                          {signal.label}
                        </Badge>
                      ))}
                    </div>

                    {intel.openRolesSnapshot.length > 0 ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {intel.openRolesSnapshot.map((role) => (
                          <Badge key={role.label} tone="slate">
                            {role.label} ({role.count})
                          </Badge>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-2 grid gap-1 text-xs text-slate-600">
                      {jobsIntelError ? (
                        <p className="text-slate-500">Job signals unavailable - showing contact activity only.</p>
                      ) : (
                        <>
                          <p className="text-slate-500">
                            Active Jobs: {intel.activeJobs} · {intel.marketJobs} market · {intel.operationalJobs} operational
                          </p>
                          <p className="text-slate-500">
                            Last Hiring Activity: {intel.lastHiringActivityDate ?? 'No hiring activity captured'}
                          </p>
                        </>
                      )}
                      <p>
                        <span className="font-semibold text-slate-700">Why this account matters:</span>{' '}
                        {jobsIntelError ? jobsIntelError : intel.why.slice(0, 2).join(' | ')}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-700">Suggested BD action:</span>{' '}
                        {intel.suggestedAction}
                      </p>
                      {company.website_url || company.career_url || company.ats_family ? (
                        <p className="text-slate-500">
                          <span className="font-semibold text-slate-700">Source intelligence:</span>{' '}
                          {[
                            company.website_url ? `Website ${formatSourceUrl(company.website_url)}` : null,
                            company.career_url ? `Careers ${formatSourceUrl(company.career_url)}` : null,
                            company.ats_family ? `ATS ${company.ats_family}` : null,
                          ]
                            .filter(Boolean)
                            .join(' | ')}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-3 text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          {intel.lastActivityLabel}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock size={14} className="text-slate-400" />
                          {intel.followUpLabel}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Panel>

        <Panel padded={false} className="overflow-hidden">
          <SectionHeader
            title={expandedCompany ? expandedCompany.company_name : 'Contacts'}
            description={expandedCompany ? 'Account intelligence and BD contacts.' : 'Select an account to view contacts.'}
            icon={<Users size={16} />}
            meta={
              expandedCompanyIntel ? (
                <Badge tone={priorityTone(expandedCompanyIntel.priority)}>{expandedCompanyIntel.priority}</Badge>
              ) : null
            }
          />

          {!expandedCompany ? (
            <div className="px-4 pb-4 text-sm text-slate-500">No account selected yet.</div>
          ) : (
            <div className="px-4 pb-4">
                  {expandedCompanyIntel ? (
                    <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {jobsIntelError ? (
                          <Badge tone="amber">Job signals unavailable</Badge>
                        ) : (
                          <>
                            <Badge tone="slate">{expandedCompanyIntel.marketJobs} market jobs</Badge>
                            <Badge tone="slate">{expandedCompanyIntel.operationalJobs} operational</Badge>
                          </>
                        )}
                        {expandedCompanyIntel.signals.slice(0, 6).map((signal) => (
                          <Badge key={signal.label} tone={signal.tone}>
                            {signal.label}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-2 grid gap-1 text-xs text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-700">Why this account matters:</span>{' '}
                          {jobsIntelError ? jobsIntelError : expandedCompanyIntel.why.join(' | ')}
                        </p>
                    <p>
                      <span className="font-semibold text-slate-700">Suggested BD action:</span>{' '}
                      {expandedCompanyIntel.suggestedAction}
                    </p>
                    {expandedCompanyIntel.openRolesSnapshot.length > 0 ? (
                      <p className="text-slate-500">
                        <span className="font-semibold text-slate-700">Open roles snapshot:</span>{' '}
                        {expandedCompanyIntel.openRolesSnapshot
                          .map((role) => `${role.label} (${role.count})`)
                          .join(', ')}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-3 text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400" />
                        {expandedCompanyIntel.lastActivityLabel}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock size={14} className="text-slate-400" />
                        {expandedCompanyIntel.followUpLabel}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 rounded-xl border border-slate-200/70 bg-white p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-950">Source Intelligence</p>
                      <Badge tone={sourceStatusTone(expandedCompany)}>
                        {deriveCompanySourceStatus(expandedCompany)}
                      </Badge>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-700">Website:</span>{' '}
                        {expandedCompany.website_url ? (
                          <a
                            href={expandedCompany.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-teal-700 hover:underline"
                          >
                            {formatSourceUrl(expandedCompany.website_url)}
                          </a>
                        ) : (
                          'Not captured'
                        )}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-700">Careers:</span>{' '}
                        {expandedCompany.career_url ? (
                          <a
                            href={expandedCompany.career_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-teal-700 hover:underline"
                          >
                            {formatSourceUrl(expandedCompany.career_url)}
                          </a>
                        ) : (
                          'Not captured'
                        )}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-700">ATS family:</span>{' '}
                        {expandedCompany.ats_family || 'Unknown'}
                      </p>
                      {expandedCompany.source_confidence != null ? (
                        <p>
                          <span className="font-semibold text-slate-700">Confidence:</span>{' '}
                          {expandedCompany.source_confidence}/100
                        </p>
                      ) : null}
                      {expandedCompany.source_notes ? (
                        <p className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-slate-600">
                          {expandedCompany.source_notes}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyIntelError(null);
                      setEditingCompanyIntelligence({
                        id: expandedCompany.id,
                        company_name: expandedCompany.company_name,
                        website_url: expandedCompany.website_url,
                        linkedin_url: expandedCompany.linkedin_url,
                        career_url: expandedCompany.career_url,
                        ats_family: expandedCompany.ats_family,
                        source_confidence: expandedCompany.source_confidence,
                        source_status: expandedCompany.source_status,
                        source_notes: expandedCompany.source_notes,
                      });
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Edit Source
                  </button>
                </div>
              </div>
            </div>
          )}

          {!expandedCompany ? null : expandedContacts.length === 0 ? (
            <div className="px-4 pb-4 text-sm text-slate-500">No contacts found for this account yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {expandedContacts.map((contact) => {
                const splitNotes = splitNotesForDisplay(contact.notes);
                return (
                <div key={contact.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-950">{contact.full_name}</p>
                        {renderStatusTag(getUiStatus(contact))}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {contact.job_title ?? 'Contact'} · {contact.email || contact.phone || contact.mobile_phone || 'No email or phone'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingContact({
                          id: contact.id,
                          full_name: contact.full_name,
                          job_title: contact.job_title,
                          email: contact.email,
                          phone: contact.phone,
                          mobile_phone: contact.mobile_phone,
                          relationship_status: contact.relationship_status,
                          notes: splitNotes.display,
                          hiddenMigrationNotes: splitNotes.hidden,
                        })
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <Badge tone="slate">
                      Last contacted: {contact.last_contacted_at ? daysAgoLabel(contact.last_contacted_at) : 'Never'}
                    </Badge>
                    <Badge tone={nextActionTone(contact.next_action_date)}>
                      {nextActionLabel(contact.next_action, contact.next_action_date)}
                    </Badge>
                  </div>

                  {splitNotes.display ? (
                    <p className="mt-2 line-clamp-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600">
                      {splitNotes.display}
                    </p>
                  ) : null}

                  <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Next Action</p>
                        <input
                          value={contact.next_action ?? ''}
                          readOnly
                          placeholder="e.g. Send intro email"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-sm outline-none"
                        />
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                          <input
                            type="date"
                            value={followUpDates[contact.id] ?? contact.next_action_date ?? ''}
                            onChange={(e) => setFollowUpDates((prev) => ({ ...prev, [contact.id]: e.target.value }))}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-sm outline-none sm:w-44"
                          />
                          <span className="text-[11px] text-slate-500">
                            {contact.next_action_date ? `Current: ${contact.next_action_date}` : 'No follow-up date set'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => markContacted(contact).catch((err) => console.error('[BDRelationships] markContacted failed', err))}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          Mark Contacted
                        </button>
                        <button
                          type="button"
                          onClick={() => setFollowUp(contact).catch((err) => console.error('[BDRelationships] setFollowUp failed', err))}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          Set Follow-up
                        </button>
                        <button
                          type="button"
                          onClick={() => markResponded(contact).catch((err) => console.error('[BDRelationships] markResponded failed', err))}
                          className="rounded-lg bg-teal-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-teal-700"
                        >
                          Mark Responded
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </Panel>
      </div>

      {editingCompanyIntelligence ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-950">Edit Source Intelligence</p>
                <p className="mt-1 text-xs text-gray-500">{editingCompanyIntelligence.company_name}</p>
              </div>
              <button
                type="button"
                onClick={() => !companyIntelSaving && setEditingCompanyIntelligence(null)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {companyIntelError ? <div className="text-xs text-red-700">{companyIntelError}</div> : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Source Status</span>
                  <select
                    value={editingCompanyIntelligence.source_status ?? ''}
                    onChange={(e) =>
                      setEditingCompanyIntelligence({
                        ...editingCompanyIntelligence,
                        source_status: (e.target.value || null) as CompanySourceStatus | null,
                      })
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="">Auto / unset</option>
                    <option value="missing">Missing</option>
                    <option value="queued">Queued</option>
                    <option value="partial">Partial</option>
                    <option value="ready">Ready</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Confidence</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editingCompanyIntelligence.source_confidence ?? ''}
                    onChange={(e) =>
                      setEditingCompanyIntelligence({
                        ...editingCompanyIntelligence,
                        source_confidence: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    placeholder="0-100"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Website URL</span>
                  <input
                    value={editingCompanyIntelligence.website_url ?? ''}
                    onChange={(e) =>
                      setEditingCompanyIntelligence({ ...editingCompanyIntelligence, website_url: e.target.value })
                    }
                    placeholder="https://company.com"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">LinkedIn URL</span>
                  <input
                    value={editingCompanyIntelligence.linkedin_url ?? ''}
                    onChange={(e) =>
                      setEditingCompanyIntelligence({ ...editingCompanyIntelligence, linkedin_url: e.target.value })
                    }
                    placeholder="https://www.linkedin.com/company/..."
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Career URL</span>
                  <input
                    value={editingCompanyIntelligence.career_url ?? ''}
                    onChange={(e) =>
                      setEditingCompanyIntelligence({ ...editingCompanyIntelligence, career_url: e.target.value })
                    }
                    placeholder="https://company.com/careers"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">ATS Family</span>
                  <input
                    value={editingCompanyIntelligence.ats_family ?? ''}
                    onChange={(e) =>
                      setEditingCompanyIntelligence({ ...editingCompanyIntelligence, ats_family: e.target.value })
                    }
                    placeholder="workday / oracle / greenhouse / linkedin"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Source Notes</span>
                <textarea
                  value={editingCompanyIntelligence.source_notes ?? ''}
                  onChange={(e) =>
                    setEditingCompanyIntelligence({ ...editingCompanyIntelligence, source_notes: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setEditingCompanyIntelligence(null)}
                disabled={companyIntelSaving}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCompanyIntelligenceEdits}
                disabled={companyIntelSaving}
                className="rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
              >
                {companyIntelSaving ? 'Saving...' : 'Save Source Intelligence'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingContact ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-950">Edit Contact</p>
                <p className="mt-1 text-xs text-gray-500">Update details for BD relationship tracking.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingContact(null)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {editError ? <div className="text-xs text-red-700">{editError}</div> : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Full Name</span>
                  <input
                    value={editingContact.full_name ?? ''}
                    onChange={(e) => setEditingContact({ ...editingContact, full_name: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Status</span>
                  <input
                    value={editingContact.relationship_status ?? ''}
                    onChange={(e) => setEditingContact({ ...editingContact, relationship_status: e.target.value })}
                    placeholder="new / active / ..."
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
              </div>

              {duplicateMatches.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900">Possible existing contact found</p>
                  <div className="mt-2 space-y-2">
                    {duplicateMatches.slice(0, 3).map((match) => {
                      const companyName =
                        typeof match.contact.company_id === 'number'
                          ? companiesById.get(match.contact.company_id)?.company_name ?? `Company #${match.contact.company_id}`
                          : 'Unknown Company';
                      const reason =
                        match.kind === 'strong_email'
                          ? 'Strong match: same company + email'
                          : match.kind === 'strong_phone'
                            ? 'Strong match: same company + phone'
                            : 'Possible match: same company + similar name';
                      return (
                        <div key={match.contact.id} className="rounded-lg border border-amber-200/80 bg-white px-3 py-2">
                          <p className="text-sm font-semibold text-slate-900">{match.contact.full_name}</p>
                          <p className="text-xs text-slate-600">{companyName}</p>
                          <p className="text-xs text-slate-600">
                            {[match.contact.email, match.contact.phone, match.contact.mobile_phone].filter(Boolean).join(' · ') || 'No contact details'}
                          </p>
                          <p className="text-xs text-slate-500">
                            Status: {match.contact.relationship_status || 'unknown'} · {reason}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAllowDuplicateSave(true);
                        setAddError(null);
                      }}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                    >
                      Continue Anyway
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewContact({
                          company_id: '',
                          full_name: '',
                          job_title: '',
                          linkedin_url: '',
                          email: '',
                          phone: '',
                          mobile_phone: '',
                          relationship_status: 'new',
                          next_action: '',
                          next_action_date: '',
                          notes: '',
                        });
                        setCompanySearch('');
                        setCompanyPickerOpen(false);
                        setAllowDuplicateSave(false);
                        setAddError(null);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Clear Form
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const first = duplicateMatches[0];
                        if (!first) return;
                        if (first.contact.company_id) setExpandedCompanyId(String(first.contact.company_id));
                        setShowAddContactModal(false);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      View Existing
                    </button>
                  </div>
                </div>
              ) : null}

              <label className="space-y-1 block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Role / Title</span>
                <input
                  value={editingContact.job_title ?? ''}
                  onChange={(e) => setEditingContact({ ...editingContact, job_title: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Email</span>
                  <input
                    value={editingContact.email ?? ''}
                    onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Direct Phone</span>
                  <input
                    value={editingContact.phone ?? ''}
                    onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Mobile Phone</span>
                <input
                  value={editingContact.mobile_phone ?? ''}
                  onChange={(e) => setEditingContact({ ...editingContact, mobile_phone: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Notes / Address</span>
                <textarea
                  value={editingContact.notes ?? ''}
                  onChange={(e) => setEditingContact({ ...editingContact, notes: e.target.value })}
                  rows={4}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setEditingContact(null)}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveContactEdits}
                disabled={editSaving}
                className="rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAddContactModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-950">Add Contact</p>
                <p className="mt-1 text-xs text-gray-500">Manual BD contact entry for relationship operations.</p>
              </div>
              <button
                type="button"
                onClick={() => !addSaving && setShowAddContactModal(false)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {addError ? <div className="text-xs text-red-700">{addError}</div> : null}

              <label className="space-y-1 block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Company</span>
                <input
                  value={companySearch}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    setCompanyPickerOpen(true);
                    setNewContact({ ...newContact, company_id: '' });
                    if (addFieldErrors.company_id) setAddFieldErrors((prev) => ({ ...prev, company_id: undefined }));
                  }}
                  onFocus={() => setCompanyPickerOpen(true)}
                  placeholder="Search or type company name"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
                {companyPickerOpen ? (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                    {companyOptions.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => {
                          setNewContact({ ...newContact, company_id: String(company.id) });
                          setCompanySearch(company.company_name);
                          setCompanyPickerOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                      >
                        {company.company_name}
                      </button>
                    ))}
                    {companySearch.trim() && companyOptions.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setNewContact({ ...newContact, company_id: NEW_COMPANY_SENTINEL });
                          setCompanyPickerOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm font-medium text-slate-900 hover:bg-gray-50"
                      >
                        + Create "{companySearch.trim()}"
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {addFieldErrors.company_id ? <p className="text-xs text-red-600">{addFieldErrors.company_id}</p> : null}
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Full Name</span>
                  <input
                    value={newContact.full_name}
                    onChange={(e) => {
                      setNewContact({ ...newContact, full_name: e.target.value });
                      if (addFieldErrors.full_name) setAddFieldErrors((prev) => ({ ...prev, full_name: undefined }));
                    }}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                  {addFieldErrors.full_name ? <p className="text-xs text-red-600">{addFieldErrors.full_name}</p> : null}
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Status</span>
                  <input
                    value={newContact.relationship_status}
                    onChange={(e) => setNewContact({ ...newContact, relationship_status: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Role / Title</span>
                <input
                  value={newContact.job_title}
                  onChange={(e) => setNewContact({ ...newContact, job_title: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">LinkedIn URL</span>
                <input
                  value={newContact.linkedin_url}
                  onChange={(e) => setNewContact({ ...newContact, linkedin_url: e.target.value })}
                  placeholder="https://www.linkedin.com/in/..."
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Email</span>
                  <input
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Direct Phone</span>
                  <input
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Mobile Phone</span>
                <input
                  value={newContact.mobile_phone}
                  onChange={(e) => setNewContact({ ...newContact, mobile_phone: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Next Action</span>
                  <input
                    value={newContact.next_action}
                    onChange={(e) => setNewContact({ ...newContact, next_action: e.target.value })}
                    placeholder="e.g. Intro call follow-up"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Next Action Date</span>
                  <input
                    type="date"
                    value={newContact.next_action_date}
                    onChange={(e) => setNewContact({ ...newContact, next_action_date: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Notes</span>
                <textarea
                  value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                  rows={4}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-white px-5 py-4">
              <button
                type="button"
                onClick={() => setShowAddContactModal(false)}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addContactManually}
                disabled={addSaving}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              >
                {addSaving ? 'Adding...' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
