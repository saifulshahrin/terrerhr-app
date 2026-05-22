import { useEffect, useMemo, useState } from 'react';
import { Building2, CalendarClock, Camera, Clock, Mail, Phone, Search, Sparkles, Users } from 'lucide-react';
import { fetchAllJobs, type JobListRow } from '../lib/jobs';
import { normalizeRoleTitle } from '../lib/roleNormalization';
import { supabase } from '../lib/supabase';
import { Badge, MetricTile, PageHeader, Panel, SectionHeader } from '../components/visualSystem';

interface Props {
  onNavigate: (page: string) => void;
}

type CompanyStatus = string | null;
type RelationshipStatus = string | null;

interface CompanyRow {
  id: number;
  company_name: string;
  company_slug: string | null;
  website_url: string | null;
  linkedin_url: string | null;
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

type EditableContact = Pick<
  ContactRow,
  'id' | 'full_name' | 'job_title' | 'email' | 'phone' | 'mobile_phone' | 'relationship_status' | 'notes'
>;

type UiContactStatus = 'new' | 'contacted' | 'responded' | 'opportunity';

interface UiContactActionState {
  status: UiContactStatus;
  nextAction: string;
}

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
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
  why: string[];
  signals: Array<{ label: string; tone: Parameters<typeof Badge>[0]['tone'] }>;
  suggestedAction: string;
  openRolesSnapshot: Array<{ label: string; count: number }>;
  marketJobs: number;
  operationalJobs: number;
  lastActivityLabel: string;
  followUpLabel: string;
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
  const malaysiaMarketJobs = companyJobs.filter(
    (job) => job.source !== 'manual_intake' && isMalaysiaLocation(job.location)
  ).length;

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
    why,
    signals: signals.slice(0, 6),
    suggestedAction,
    openRolesSnapshot: topRoles,
    marketJobs,
    operationalJobs,
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

  // UI-only action layer (no DB writes yet)
  const [contactActions, setContactActions] = useState<Record<string, UiContactActionState>>({});
  const [followUpDates, setFollowUpDates] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { data: companyRows, error: companyError } = await supabase
          .from('companies')
          .select(
            `
              id,
              company_name,
              company_slug,
              website_url,
              linkedin_url,
              hq_country,
              primary_city,
              company_status,
              source_type,
              notes,
              created_at,
              updated_at
            `
          )
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
        if (!active) return;
        setLoading(false);
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

  function getUiNextAction(contact: ContactRow): string {
    return contactActions[contact.id]?.nextAction ?? '';
  }

  function setUiAction(contactId: string, patch: Partial<UiContactActionState>) {
    setContactActions((prev) => {
      const next = { ...prev };
      const existing = next[contactId] ?? { status: 'new' as UiContactStatus, nextAction: '' };
      next[contactId] = { ...existing, ...patch };
      return next;
    });
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
      const payload = {
        full_name: editingContact.full_name?.trim() || null,
        job_title: editingContact.job_title?.trim() || null,
        email: editingContact.email?.trim() || null,
        phone: editingContact.phone?.trim() || null,
        mobile_phone: editingContact.mobile_phone?.trim() || null,
        relationship_status: editingContact.relationship_status?.trim() || null,
        notes: editingContact.notes?.trim() || null,
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
              onClick={() => onNavigate('job-intake')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
            >
              <Building2 size={16} />
              Add Intake
            </button>
            <button
              type="button"
              onClick={() => onNavigate('bd-photo-intake')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Camera size={16} />
              Import Legacy Contacts
            </button>
          </div>
        }
      />

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
                      {company.company_status ? <Badge tone="teal">{company.company_status}</Badge> : null}
                      <Badge tone="slate">{formatCompanySourceLabel(company.source_type)}</Badge>
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
                        <p className="text-slate-500">
                          {intel.marketJobs} market jobs - {intel.operationalJobs} operational
                        </p>
                      )}
                      <p>
                        <span className="font-semibold text-slate-700">Why this account matters:</span>{' '}
                        {jobsIntelError ? jobsIntelError : intel.why.slice(0, 2).join(' | ')}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-700">Suggested BD action:</span>{' '}
                        {intel.suggestedAction}
                      </p>
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
            </div>
          )}

          {!expandedCompany ? null : expandedContacts.length === 0 ? (
            <div className="px-4 pb-4 text-sm text-slate-500">No contacts found for this account yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {expandedContacts.map((contact) => (
                <div key={contact.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">{contact.full_name}</p>
                    <div className="flex items-center gap-2">
                      {renderStatusTag(getUiStatus(contact))}
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
                            notes: contact.notes,
                          })
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {contact.job_title ?? 'Contact'}{' '}
                    {contact.relationship_status ? `- ${contact.relationship_status}` : ''}
                  </p>

                  <div className="mt-3 flex flex-col gap-2 text-xs text-slate-600">
                    {contact.email ? (
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-slate-400" />
                        <span className="break-words">{contact.email}</span>
                      </div>
                    ) : null}
                    {contact.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-slate-400" />
                        <span className="break-words">Direct: {contact.phone}</span>
                      </div>
                    ) : null}
                    {contact.mobile_phone ? (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-slate-400" />
                        <span className="break-words">Mobile: {contact.mobile_phone}</span>
                      </div>
                    ) : null}
                    {contact.notes ? (
                      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700 whitespace-pre-wrap break-words">
                        {contact.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Next Action
                        </p>
                        <input
                          value={contact.next_action ?? ''}
                          readOnly
                          placeholder="e.g. Send intro email, ask for hiring plan, schedule call"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                        />
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="date"
                            value={followUpDates[contact.id] ?? contact.next_action_date ?? ''}
                            onChange={(e) => setFollowUpDates((prev) => ({ ...prev, [contact.id]: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 sm:w-52"
                          />
                          <span className="text-xs text-slate-500">
                            {contact.next_action_date ? `Current: ${contact.next_action_date}` : 'No follow-up date set'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => markContacted(contact).catch((err) => console.error('[BDRelationships] markContacted failed', err))}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          Mark Contacted
                        </button>
                        <button
                          type="button"
                          onClick={() => setFollowUp(contact).catch((err) => console.error('[BDRelationships] setFollowUp failed', err))}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          Set Follow-up
                        </button>
                        <button
                          type="button"
                          onClick={() => markResponded(contact).catch((err) => console.error('[BDRelationships] markResponded failed', err))}
                          className="rounded-2xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
                        >
                          Mark Responded
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

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
    </div>
  );
}
