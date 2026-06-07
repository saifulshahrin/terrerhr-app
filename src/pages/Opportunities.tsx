import { useEffect, useMemo, useState } from 'react';
import { BarChart2, Briefcase, CalendarClock, Flame, Phone, Sparkles, Users } from 'lucide-react';
import {
  COMPANY_INTELLIGENCE_SELECT,
  deriveCompanySourceStatus,
  type CompanyIntelligenceRow,
} from '../lib/companyIntelligence';
import { fetchAllJobs, type JobListRow } from '../lib/jobs';
import { normalizeRoleTitle } from '../lib/roleNormalization';
import { supabase } from '../lib/supabase';
import { Badge, MetricTile, PageHeader, Panel, SectionHeader } from '../components/visualSystem';

interface Props {
  onNavigate: (page: string) => void;
}

const BD_SELECTED_COMPANY_KEY = 'terrer.bd.selectedCompanyId';

interface ContactRow {
  id: string;
  company_id: number | null;
  full_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  relationship_status: string | null;
  next_action: string | null;
  next_action_date: string | null;
  last_contacted_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

type HiringSignalStrength = 'High' | 'Medium' | 'Low' | 'None';
type BdPriorityLevel = 'High Priority' | 'Medium Priority' | 'Low Priority';

interface CompanyIntel {
  activeJobs: number;
  marketJobs: number;
  operationalJobs: number;
  hiringSignal: HiringSignalStrength;
  bdPriority: BdPriorityLevel;
  openRolesSnapshot: Array<{ label: string; count: number }>;
  lastActivityLabel: string;
  followUpLabel: string;
}

interface RelationshipWinScore {
  company: CompanyIntelligenceRow;
  score: number;
  contactCount: number;
  activeRatio: number;
  hasHrCoverage: boolean;
  hasTaCoverage: boolean;
  hasHiringManagerCoverage: boolean;
  sourceStatus: ReturnType<typeof deriveCompanySourceStatus>;
  recommendedAction: string;
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function normalizeCompanyKey(value: string | null | undefined): string {
  return normalize(value).replace(/\b(sdn\.?\s*bhd\.?|berhad|pte\.?\s*ltd\.?|limited|ltd\.?|inc\.?|corp\.?)\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function daysAgoLabel(iso: string | null): string {
  if (!iso) return 'No activity';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (!Number.isFinite(days)) return 'Unknown';
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function safeRoleLabel(value: unknown): string {
  const roleObject = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  const rawTitle =
    safeString(value) ??
    safeString(roleObject?.raw_job_title) ??
    safeString(roleObject?.job_title) ??
    safeString(roleObject?.title);
  const suppliedNormalizedTitle = safeString(roleObject?.normalized_job_title);

  if (suppliedNormalizedTitle) return suppliedNormalizedTitle;
  if (!rawTitle) return 'Unknown role';

  const normalized = normalizeRoleTitle(rawTitle);
  return (
    safeString(normalized.normalized_job_title) ??
    safeString(normalized.raw_job_title) ??
    rawTitle
  );
}

function contactSignalText(contact: ContactRow): string {
  return `${contact.job_title ?? ''} ${contact.relationship_status ?? ''} ${contact.notes ?? ''}`.toLowerCase();
}

function hasHrSignal(contact: ContactRow): boolean {
  return /\b(hr|human resources|human resource|people|people ops|human capital)\b/i.test(contactSignalText(contact));
}

function hasTaSignal(contact: ContactRow): boolean {
  return /\b(ta|talent acquisition|recruiter|recruitment|recruiting|sourcing)\b/i.test(contactSignalText(contact));
}

function hasHiringManagerSignal(contact: ContactRow): boolean {
  return /\b(hiring manager|manager|director|head|lead|ceo|chief|vp|business partner|owner)\b/i.test(contactSignalText(contact));
}

function sourceStatusTone(company: CompanyIntelligenceRow): Parameters<typeof Badge>[0]['tone'] {
  const status = deriveCompanySourceStatus(company);
  if (status === 'Ready') return 'emerald';
  if (status === 'Partial' || status === 'Queued') return 'amber';
  if (status === 'Blocked') return 'red';
  return 'slate';
}

function scoreTone(score: number): Parameters<typeof Badge>[0]['tone'] {
  if (score >= 75) return 'emerald';
  if (score >= 55) return 'amber';
  return 'slate';
}

function hiringSignalTone(signal: HiringSignalStrength): Parameters<typeof Badge>[0]['tone'] {
  if (signal === 'High') return 'emerald';
  if (signal === 'Medium') return 'amber';
  return 'slate';
}

function bdPriorityTone(priority: BdPriorityLevel): Parameters<typeof Badge>[0]['tone'] {
  if (priority === 'High Priority') return 'red';
  if (priority === 'Medium Priority') return 'amber';
  return 'slate';
}

function computeCompanyIntel(
  company: CompanyIntelligenceRow,
  companyContacts: ContactRow[],
  companyJobs: JobListRow[]
): CompanyIntel {
  const activeJobs = companyJobs.filter((job) => job.operational_status !== 'closed').length;
  const marketJobs = companyJobs.filter((job) => job.source !== 'manual').length;
  const operationalJobs = companyJobs.filter((job) => job.source === 'manual' || job.operational_status === 'active').length;
  const followUpsDue = companyContacts.filter((contact) => {
    if (!contact.next_action_date) return false;
    return contact.next_action_date.slice(0, 10) <= new Date().toISOString().slice(0, 10);
  }).length;

  const roleCounts = new Map<string, number>();
  for (const job of companyJobs) {
    const label = safeRoleLabel(job.job_title);
    roleCounts.set(label, (roleCounts.get(label) ?? 0) + 1);
  }

  const openRolesSnapshot = Array.from(roleCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const latestActivity = companyContacts
    .map((contact) => contact.last_contacted_at ?? contact.updated_at ?? contact.created_at)
    .filter((date): date is string => Boolean(date))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  let hiringSignal: HiringSignalStrength = 'None';
  if (activeJobs >= 10 || marketJobs >= 20) hiringSignal = 'High';
  else if (activeJobs >= 3 || marketJobs >= 8) hiringSignal = 'Medium';
  else if (activeJobs > 0 || marketJobs > 0) hiringSignal = 'Low';

  let bdPriority: BdPriorityLevel = 'Low Priority';
  if (followUpsDue > 0 || hiringSignal === 'High') bdPriority = 'High Priority';
  else if (hiringSignal === 'Medium' || companyContacts.length >= 2) bdPriority = 'Medium Priority';

  return {
    activeJobs,
    marketJobs,
    operationalJobs,
    hiringSignal,
    bdPriority,
    openRolesSnapshot,
    lastActivityLabel: daysAgoLabel(latestActivity),
    followUpLabel: followUpsDue > 0 ? `${followUpsDue} due` : 'No urgent follow-up',
  };
}

function computeRelationshipWinScore(company: CompanyIntelligenceRow, companyContacts: ContactRow[]): RelationshipWinScore {
  const contactCount = companyContacts.length;
  const activeContacts = companyContacts.filter((contact) => normalize(contact.relationship_status) === 'active').length;
  const activeRatio = contactCount > 0 ? activeContacts / contactCount : 0;
  const hasHrCoverage = companyContacts.some(hasHrSignal);
  const hasTaCoverage = companyContacts.some(hasTaSignal);
  const hasHiringManagerCoverage = companyContacts.some(hasHiringManagerSignal);
  const sourceStatus = deriveCompanySourceStatus(company);
  const overdue = companyContacts.some((contact) => contact.next_action_date && contact.next_action_date.slice(0, 10) <= new Date().toISOString().slice(0, 10));

  const sourceScore = sourceStatus === 'Ready' ? 10 : sourceStatus === 'Partial' || sourceStatus === 'Queued' ? 5 : 0;
  const score =
    Math.min(20, contactCount * 5) +
    Math.round(activeRatio * 15) +
    (hasHrCoverage ? 15 : 0) +
    (hasTaCoverage ? 20 : 0) +
    (hasHiringManagerCoverage ? 15 : 0) +
    sourceScore +
    (overdue ? 10 : 0);

  let recommendedAction = 'Re-engage account and confirm hiring priorities';
  if (overdue) recommendedAction = 'Follow up overdue BD action';
  else if (sourceStatus === 'Missing' || sourceStatus === 'Blocked') recommendedAction = 'Enrich source before outreach';
  else if (!hasHrCoverage && !hasTaCoverage) recommendedAction = 'Identify HR/TA stakeholder';
  else if (hasTaCoverage || hasHrCoverage) recommendedAction = 'Contact HR/TA lead';
  else if (hasHiringManagerCoverage) recommendedAction = 'Contact decision-maker';

  return {
    company,
    score: Math.min(100, score),
    contactCount,
    activeRatio,
    hasHrCoverage,
    hasTaCoverage,
    hasHiringManagerCoverage,
    sourceStatus,
    recommendedAction,
  };
}

function buildCompanyStubsFromContacts(contacts: ContactRow[]): CompanyIntelligenceRow[] {
  const ids = Array.from(new Set(contacts.map((contact) => contact.company_id).filter((id): id is number => typeof id === 'number')));
  return ids.map((id) => ({
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

export default function Opportunities({ onNavigate }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyIntelligenceRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [jobs, setJobs] = useState<JobListRow[]>([]);

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
          .select('id,company_id,full_name,job_title,email,phone,mobile_phone,relationship_status,next_action,next_action_date,last_contacted_at,notes,created_at,updated_at')
          .order('updated_at', { ascending: false })
          .limit(2000);
        if (contactError) throw contactError;

        const safeContacts = (contactRows ?? []) as ContactRow[];
        const safeCompanies = (companyRows ?? []) as CompanyIntelligenceRow[];
        const jobRows = await fetchAllJobs();

        if (!active) return;
        setContacts(safeContacts);
        setCompanies(safeCompanies.length === 0 && safeContacts.length > 0 ? buildCompanyStubsFromContacts(safeContacts) : safeCompanies);
        setJobs(jobRows);
      } catch (err) {
        if (!active) return;
        console.error('[Opportunities] load error:', err);
        setError('Unable to load BD opportunity intelligence right now.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

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

  const topCompaniesWeCanWin = useMemo(() => {
    return relationshipCompanies
      .map((company) => computeRelationshipWinScore(company, contactsByCompanyId.get(company.id) ?? []))
      .sort((a, b) => b.score - a.score || b.contactCount - a.contactCount || a.company.company_name.localeCompare(b.company.company_name))
      .slice(0, 12);
  }, [contactsByCompanyId, relationshipCompanies]);

  const companyIntelRows = useMemo(() => {
    return companies.map((company) => {
      const contactsForCompany = contactsByCompanyId.get(company.id) ?? [];
      const key = normalizeCompanyKey(company.company_name);
      const jobsForCompany = key ? jobsByCompanyKey.get(key) ?? [] : [];
      return {
        company,
        contacts: contactsForCompany,
        intel: computeCompanyIntel(company, contactsForCompany, jobsForCompany),
        score: computeRelationshipWinScore(company, contactsForCompany),
      };
    });
  }, [companies, contactsByCompanyId, jobsByCompanyKey]);

  const companiesToContact = useMemo(() => {
    return [...companyIntelRows]
      .sort((a, b) => {
        const signalRank: Record<HiringSignalStrength, number> = { High: 4, Medium: 3, Low: 2, None: 1 };
        const signalDiff = signalRank[b.intel.hiringSignal] - signalRank[a.intel.hiringSignal];
        if (signalDiff !== 0) return signalDiff;
        return b.contacts.length - a.contacts.length;
      })
      .slice(0, 10);
  }, [companyIntelRows]);

  const priorityQueue = useMemo(() => {
    return companyIntelRows
      .filter((row) => row.intel.bdPriority !== 'Low Priority' || row.intel.followUpLabel.includes('due'))
      .sort((a, b) => b.score.score - a.score.score)
      .slice(0, 12);
  }, [companyIntelRows]);

  const followUpsDue = contacts.filter((contact) => contact.next_action_date && contact.next_action_date.slice(0, 10) <= new Date().toISOString().slice(0, 10));
  const highSignalCount = companyIntelRows.filter((row) => row.intel.hiringSignal === 'High').length;

  function openRelationship(companyId?: number | null) {
    if (companyId && typeof window !== 'undefined') {
      window.sessionStorage.setItem(BD_SELECTED_COMPANY_KEY, String(companyId));
    }
    onNavigate('bd-relationships');
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="BD Intelligence"
        title="Opportunities"
        description="Your morning command center for deciding which accounts deserve BD attention first."
        actions={
          <button
            type="button"
            onClick={() => openRelationship()}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
          >
            Open Relationships
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Relationship Accounts" value={relationshipCompanies.length} detail="Companies with BD contacts" icon={<Users size={16} />} />
        <MetricTile label="High Hiring Signal" value={highSignalCount} detail="Companies heating up" icon={<Flame size={16} />} tone={highSignalCount > 0 ? 'amber' : 'slate'} />
        <MetricTile label="Follow-ups Due" value={followUpsDue.length} detail="Actions due today or earlier" icon={<CalendarClock size={16} />} tone={followUpsDue.length > 0 ? 'red' : 'slate'} />
        <MetricTile label="Top Win Targets" value={topCompaniesWeCanWin.length} detail="Prioritised by relationship score" icon={<Sparkles size={16} />} />
      </div>

      {error ? <Panel><p className="text-sm text-red-700">{error}</p></Panel> : null}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel padded={false} className="overflow-hidden">
          <SectionHeader
            title="Top Companies We Can Win"
            description="Ranked by stakeholder coverage, source readiness, activity, and relationship strength."
            icon={<Sparkles size={16} />}
            meta={<Badge tone="slate">{topCompaniesWeCanWin.length} ranked</Badge>}
          />
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="px-4 py-5 text-sm text-slate-500">Loading opportunities...</div>
            ) : topCompaniesWeCanWin.length === 0 ? (
              <div className="px-4 py-5 text-sm text-slate-500">No relationship companies available yet.</div>
            ) : (
              topCompaniesWeCanWin.map((item) => (
                <button
                  key={item.company.id}
                  type="button"
                  onClick={() => openRelationship(item.company.id)}
                  className="w-full px-4 py-3 text-left transition hover:bg-slate-50/70"
                >
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-950">{item.company.company_name}</p>
                        <Badge tone={scoreTone(item.score)}>Score {item.score}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.recommendedAction}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                      <Badge tone="slate">{item.contactCount} contacts</Badge>
                      <Badge tone={item.hasHrCoverage ? 'emerald' : 'slate'}>HR {item.hasHrCoverage ? 'Yes' : 'No'}</Badge>
                      <Badge tone={item.hasTaCoverage ? 'emerald' : 'slate'}>TA {item.hasTaCoverage ? 'Yes' : 'No'}</Badge>
                      <Badge tone={item.hasHiringManagerCoverage ? 'emerald' : 'slate'}>
                        Hiring Manager {item.hasHiringManagerCoverage ? 'Yes' : 'No'}
                      </Badge>
                      <Badge tone={sourceStatusTone(item.company)}>Source {item.sourceStatus}</Badge>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel padded={false} className="overflow-hidden">
            <SectionHeader title="Priority Account Queue" description="Accounts needing BD attention." icon={<Briefcase size={16} />} />
            <div className="divide-y divide-slate-100">
              {priorityQueue.length === 0 ? (
                <div className="px-4 py-4 text-sm text-slate-500">No priority accounts right now.</div>
              ) : (
                priorityQueue.map((row) => (
                  <button
                    key={row.company.id}
                    type="button"
                    onClick={() => openRelationship(row.company.id)}
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{row.company.company_name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{row.intel.followUpLabel} • {row.score.recommendedAction}</p>
                    </div>
                    <Badge tone={bdPriorityTone(row.intel.bdPriority)}>{row.intel.bdPriority}</Badge>
                  </button>
                ))
              )}
            </div>
          </Panel>

          <Panel padded={false} className="overflow-hidden">
            <SectionHeader title="Follow-up Indicators" description="Contacts due today or overdue." icon={<CalendarClock size={16} />} />
            <div className="divide-y divide-slate-100">
              {followUpsDue.length === 0 ? (
                <div className="px-4 py-4 text-sm text-slate-500">No overdue follow-ups. BD queue is clear.</div>
              ) : (
                followUpsDue.slice(0, 10).map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => openRelationship(contact.company_id)}
                    className="w-full px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <p className="truncate text-sm font-semibold text-slate-950">{contact.full_name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {companies.find((company) => company.id === contact.company_id)?.company_name ?? `Company #${contact.company_id ?? '?'}`} • Due {contact.next_action_date}
                    </p>
                  </button>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>

      <Panel padded={false} className="overflow-hidden">
        <SectionHeader
          title="Companies To Contact"
          description="Hiring signal, relationship coverage, and account readiness."
          icon={<Phone size={16} />}
        />
        <div className="divide-y divide-slate-100">
          {companiesToContact.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-500">No ranked companies available yet.</div>
          ) : (
            companiesToContact.map((row) => (
              <button
                key={row.company.id}
                type="button"
                onClick={() => openRelationship(row.company.id)}
                className="w-full px-4 py-3 text-left transition hover:bg-slate-50/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{row.company.company_name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {row.intel.activeJobs} active jobs • {row.contacts.length} contacts • {row.intel.lastActivityLabel}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Badge tone={hiringSignalTone(row.intel.hiringSignal)}>Hiring Signal: {row.intel.hiringSignal}</Badge>
                    <Badge tone={bdPriorityTone(row.intel.bdPriority)}>{row.intel.bdPriority}</Badge>
                    <Badge tone={sourceStatusTone(row.company)}>Source: {deriveCompanySourceStatus(row.company)}</Badge>
                  </div>
                </div>
                {row.intel.openRolesSnapshot.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {row.intel.openRolesSnapshot.map((role) => (
                      <Badge key={`${row.company.id}-${role.label}`} tone="slate">
                        {safeString(role.label) ?? 'Unknown role'} ({role.count})
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </button>
            ))
          )}
        </div>
      </Panel>

      <Panel padded={false} className="overflow-hidden">
        <SectionHeader title="Hiring Signal Rankings" description="Companies sorted by visible hiring demand." icon={<BarChart2 size={16} />} />
        <div className="divide-y divide-slate-100">
          {companyIntelRows
            .filter((row) => row.intel.hiringSignal !== 'None')
            .sort((a, b) => b.intel.activeJobs + b.intel.marketJobs - (a.intel.activeJobs + a.intel.marketJobs))
            .slice(0, 12)
            .map((row) => (
              <div key={row.company.id} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{row.company.company_name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {row.intel.marketJobs} market jobs • {row.intel.operationalJobs} operational jobs
                  </p>
                </div>
                <Badge tone={hiringSignalTone(row.intel.hiringSignal)}>{row.intel.hiringSignal} Signal</Badge>
              </div>
            ))}
        </div>
      </Panel>
    </div>
  );
}
