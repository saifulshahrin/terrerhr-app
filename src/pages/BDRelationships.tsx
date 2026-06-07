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
import { useAuth } from '../store/AuthContext';
import { Badge, MetricTile, PageHeader, Panel, SectionHeader } from '../components/visualSystem';

interface Props {
  onNavigate: (page: string) => void;
}
const NEW_COMPANY_SENTINEL = '__create_new_company__';
const BD_SELECTED_COMPANY_KEY = 'terrer.bd.selectedCompanyId';

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

interface BdNoteRow {
  id: string;
  company_id: number;
  contact_id: string | null;
  note_body: string;
  note_type: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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

type StakeholderRole =
  | 'HR'
  | 'Talent Acquisition'
  | 'Recruiter'
  | 'Hiring Manager'
  | 'Decision Maker'
  | 'Department Head'
  | 'Unknown';

interface RevenueRecommendation {
  action: string;
  reason: string;
  bestContact: ContactRow | null;
  contactability: string;
  lastContacted: string;
  nextAction: string;
}

interface RelationshipWinScore {
  company: CompanyRow;
  score: number;
  contactCount: number;
  activeRatio: number;
  hasHrCoverage: boolean;
  hasTaCoverage: boolean;
  hasHiringManagerCoverage: boolean;
  sourceStatus: ReturnType<typeof deriveCompanySourceStatus>;
  recommendedAction: string;
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

function companyInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'CO';
}

function contactSignalText(contact: ContactRow): string {
  return `${contact.job_title ?? ''} ${contact.relationship_status ?? ''} ${contact.notes ?? ''}`.toLowerCase();
}

function inferStakeholderRoles(contact: ContactRow): StakeholderRole[] {
  const title = normalize(contact.job_title);
  const roles: StakeholderRole[] = [];

  if (/\b(hr|human resources?|human capital|people ops|people operations)\b/i.test(title)) roles.push('HR');
  if (/\b(talent acquisition|talent partner|talent lead|sourcing)\b/i.test(title)) roles.push('Talent Acquisition');
  if (/\b(recruiter|recruitment|recruiting)\b/i.test(title)) roles.push('Recruiter');
  if (
    /\b(hiring manager)\b/i.test(title) ||
    (/\b(manager|lead)\b/i.test(title) && !/\b(hr|human resources?|talent acquisition|recruit|people)\b/i.test(title))
  ) {
    roles.push('Hiring Manager');
  }
  if (/\b(head|director|chief|ceo|coo|cfo|cto|vp|vice president|owner|founder|general manager)\b/i.test(title)) {
    roles.push('Decision Maker');
  }
  if (/\b(head of|department head|director of)\b/i.test(title)) roles.push('Department Head');

  return roles.length > 0 ? Array.from(new Set(roles)).slice(0, 2) : ['Unknown'];
}

function stakeholderRoleTone(role: StakeholderRole): Parameters<typeof Badge>[0]['tone'] {
  if (role === 'Decision Maker' || role === 'Department Head') return 'emerald';
  if (role === 'HR' || role === 'Talent Acquisition') return 'blue';
  if (role === 'Recruiter' || role === 'Hiring Manager') return 'teal';
  return 'slate';
}

function contactabilityLabel(contact: ContactRow): string {
  const hasEmail = Boolean(contact.email);
  const hasPhone = Boolean(contact.mobile_phone || contact.phone);
  if (hasEmail && hasPhone) return 'Email + phone available';
  if (hasPhone) return 'Phone available';
  if (hasEmail) return 'Email available';
  return 'Contact details incomplete';
}

function stakeholderScore(contact: ContactRow): number {
  const roles = inferStakeholderRoles(contact);
  let score = 0;
  if (roles.includes('Decision Maker')) score += 8;
  if (roles.includes('Department Head')) score += 7;
  if (roles.includes('Talent Acquisition')) score += 6;
  if (roles.includes('HR')) score += 6;
  if (roles.includes('Hiring Manager')) score += 5;
  if (roles.includes('Recruiter')) score += 4;
  if (contact.mobile_phone || contact.phone) score += 3;
  if (contact.email) score += 2;
  if (normalize(contact.relationship_status) === 'responded') score += 2;
  if (normalize(contact.relationship_status) === 'active') score += 1;
  return score;
}

function buildRevenueRecommendation(companyContacts: ContactRow[], intel: CompanyIntel): RevenueRecommendation {
  const todayIso = new Date().toISOString().slice(0, 10);
  const orderedContacts = [...companyContacts].sort((a, b) => {
    const aDue = a.next_action_date?.slice(0, 10);
    const bDue = b.next_action_date?.slice(0, 10);
    const aUrgency = aDue && aDue <= todayIso ? 20 : 0;
    const bUrgency = bDue && bDue <= todayIso ? 20 : 0;
    return bUrgency + stakeholderScore(b) - (aUrgency + stakeholderScore(a));
  });
  const bestContact = orderedContacts[0] ?? null;
  const latestContacted = companyContacts
    .map((contact) => contact.last_contacted_at)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  const scheduledContact = orderedContacts
    .filter((contact) => contact.next_action || contact.next_action_date)
    .sort((a, b) => (a.next_action_date ?? '9999-12-31').localeCompare(b.next_action_date ?? '9999-12-31'))[0];

  if (!bestContact) {
    return {
      action: 'Review account and identify best contact',
      reason:
        intel.hiringSignal === 'None'
          ? 'No stakeholder or current hiring activity is available yet.'
          : `${intel.hiringSignal} hiring activity is visible, but no stakeholder is available for outreach.`,
      bestContact: null,
      contactability: 'No contact available',
      lastContacted: 'No previous contact',
      nextAction: 'Identify an HR, TA, or hiring decision-maker',
    };
  }

  const roles = inferStakeholderRoles(bestContact).filter((role) => role !== 'Unknown');
  const primaryRole = roles[0] ?? 'stakeholder';
  const dueDate = bestContact.next_action_date?.slice(0, 10);
  const hasPhone = Boolean(bestContact.mobile_phone || bestContact.phone);
  const hasEmail = Boolean(bestContact.email);
  let action = hasPhone ? `Call ${primaryRole}` : hasEmail ? `Email ${primaryRole}` : 'Update contact details';

  if (dueDate && dueDate <= todayIso) {
    action = bestContact.next_action || `Follow up with ${bestContact.full_name}`;
  } else if (intel.hiringSignal === 'None') {
    action = `Reconnect with ${bestContact.full_name}`;
  }

  const reasonParts = [
    intel.hiringSignal === 'None' ? 'No confirmed hiring activity yet' : `${intel.hiringSignal} hiring activity`,
    `${companyContacts.length} contact${companyContacts.length === 1 ? '' : 's'} available`,
  ];
  if (roles.length > 0) reasonParts.push(`${primaryRole} stakeholder identified`);

  return {
    action,
    reason: `${reasonParts.join(' and ')}.`,
    bestContact,
    contactability: contactabilityLabel(bestContact),
    lastContacted: latestContacted ? daysAgoLabel(latestContacted) : 'No previous contact',
    nextAction: scheduledContact
      ? nextActionLabel(scheduledContact.next_action, scheduledContact.next_action_date)
      : 'Confirm hiring needs and agree next step',
  };
}

function hasHrSignal(contact: ContactRow): boolean {
  return /\b(hr|human resources|human resource|people|people ops|people operations|human capital)\b/i.test(
    contactSignalText(contact)
  );
}

function hasTaSignal(contact: ContactRow): boolean {
  return /\b(ta|talent acquisition|recruiter|recruitment|recruiting|sourcing)\b/i.test(contactSignalText(contact));
}

function hasHiringManagerSignal(contact: ContactRow): boolean {
  return /\b(hiring manager|manager|director|head|lead|leader|ceo|chief|vp|vice president|business partner|owner)\b/i.test(
    contactSignalText(contact)
  );
}

function scoreContactCount(count: number): number {
  if (count >= 5) return 20;
  if (count >= 3) return 15;
  if (count === 2) return 10;
  if (count === 1) return 5;
  return 0;
}

function scoreSourceStatus(status: ReturnType<typeof deriveCompanySourceStatus>): number {
  if (status === 'Ready') return 10;
  if (status === 'Partial' || status === 'Queued') return 5;
  return 0;
}

function hasOverdueNextAction(contacts: ContactRow[]): boolean {
  const todayIso = new Date().toISOString().slice(0, 10);
  return contacts.some((contact) => contact.next_action_date && contact.next_action_date.slice(0, 10) < todayIso);
}

function hasUpcomingNextAction(contacts: ContactRow[]): boolean {
  const todayIso = new Date().toISOString().slice(0, 10);
  return contacts.some((contact) => contact.next_action_date && contact.next_action_date.slice(0, 10) >= todayIso);
}

function hasRecentContactActivity(contacts: ContactRow[]): boolean {
  return contacts.some((contact) => {
    if (!contact.last_contacted_at) return false;
    const days = (Date.now() - new Date(contact.last_contacted_at).getTime()) / 86400000;
    return Number.isFinite(days) && days <= 30;
  });
}

function isArchiveOrDuplicateRisk(company: CompanyRow): boolean {
  const text = normalize(`${company.company_status ?? ''} ${company.company_name}`);
  return text.includes('archive') || text.includes('...') || text.includes('duplicate');
}

function computeRelationshipWinScore(company: CompanyRow, companyContacts: ContactRow[]): RelationshipWinScore {
  const contactCount = companyContacts.length;
  const activeContacts = companyContacts.filter((contact) => normalize(contact.relationship_status) === 'active').length;
  const activeRatio = contactCount > 0 ? activeContacts / contactCount : 0;
  const hasHrCoverage = companyContacts.some(hasHrSignal);
  const hasTaCoverage = companyContacts.some(hasTaSignal);
  const hasHiringManagerCoverage = companyContacts.some(hasHiringManagerSignal);
  const sourceStatus = deriveCompanySourceStatus(company);
  const overdue = hasOverdueNextAction(companyContacts);
  const activityScore = hasRecentContactActivity(companyContacts) || hasUpcomingNextAction(companyContacts) ? 10 : 0;

  const score =
    scoreContactCount(contactCount) +
    Math.round(activeRatio * 15) +
    (hasHrCoverage ? 15 : 0) +
    (hasTaCoverage ? 20 : 0) +
    (hasHiringManagerCoverage ? 15 : 0) +
    scoreSourceStatus(sourceStatus) +
    activityScore;

  let recommendedAction = 'Re-engage account and confirm hiring priorities';
  if (isArchiveOrDuplicateRisk(company)) {
    recommendedAction = 'Review duplicate/archive status';
  } else if (overdue) {
    recommendedAction = 'Follow up overdue action';
  } else if (sourceStatus === 'Missing' || sourceStatus === 'Blocked') {
    recommendedAction = 'Enrich source first';
  } else if (!hasHrCoverage && !hasTaCoverage) {
    recommendedAction = 'Identify HR/TA stakeholder';
  } else if (hasTaCoverage || hasHrCoverage) {
    recommendedAction = 'Contact HR/TA lead';
  } else if (hasHiringManagerCoverage) {
    recommendedAction = 'Contact decision-maker';
  }

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

function scoreTone(score: number): Parameters<typeof Badge>[0]['tone'] {
  if (score >= 75) return 'emerald';
  if (score >= 55) return 'amber';
  return 'slate';
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
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [bdNotes, setBdNotes] = useState<BdNoteRow[]>([]);
  const [jobs, setJobs] = useState<JobListRow[]>([]);
  const [jobsIntelError, setJobsIntelError] = useState<string | null>(null);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const selectedCompanyId = window.sessionStorage.getItem(BD_SELECTED_COMPANY_KEY);
    if (selectedCompanyId) window.sessionStorage.removeItem(BD_SELECTED_COMPANY_KEY);
    return selectedCompanyId;
  });
  const [search, setSearch] = useState('');
  const [companiesRestricted, setCompaniesRestricted] = useState(false);
  const [showAllCompanies, setShowAllCompanies] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'overview' | 'contacts' | 'activity' | 'notes'>('overview');
  const [accountStatusFilter, setAccountStatusFilter] = useState('all');
  const [hiringSignalFilter, setHiringSignalFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'activity'>('activity');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showNoteComposer, setShowNoteComposer] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

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

        const { data: noteRows, error: noteErrorResult } = await supabase
          .from('bd_notes')
          .select('id,company_id,contact_id,note_body,note_type,created_by,created_at,updated_at')
          .order('created_at', { ascending: false })
          .limit(1000);

        if (noteErrorResult) throw noteErrorResult;

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
        setBdNotes((noteRows ?? []) as BdNoteRow[]);
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

  const topCompaniesWeCanWin = useMemo(() => {
    return relationshipCompanies
      .map((company) => computeRelationshipWinScore(company, contactsByCompanyId.get(company.id) ?? []))
      .sort((a, b) => {
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;

        const contactsDiff = b.contactCount - a.contactCount;
        if (contactsDiff !== 0) return contactsDiff;

        return a.company.company_name.localeCompare(b.company.company_name);
      })
      .slice(0, 12);
  }, [contactsByCompanyId, relationshipCompanies]);

  const relationshipCompaniesCount = relationshipCompanies.length;
  const contactsCount = contacts.length;
  const unreviewedCount = contacts.filter((c) => normalize(c.relationship_status ?? '') === 'new').length;

  const accountStatusOptions = useMemo(() => {
    return Array.from(new Set(companies.map((company) => company.company_status).filter(Boolean) as string[])).sort();
  }, [companies]);

  const sourceOptions = useMemo(() => {
    return Array.from(
      new Set(companies.map((company) => deriveCompanySourceStatus(company)).filter(Boolean))
    ).sort();
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const query = normalize(search);
    const baseCompanies = query ? companies : showAllCompanies ? companies : relationshipCompanies;

    const filtered = baseCompanies.filter((company) => {
      const name = normalize(company.company_name);
      const status = normalize(company.company_status ?? '');
      const source = normalize(company.source_type ?? '');
      const companyContacts = contactsByCompanyId.get(company.id) ?? [];
      const key = normalizeCompanyKey(company.company_name);
      const companyJobs = key ? jobsByCompanyKey.get(key) ?? [] : [];
      const intel = computeCompanyIntel({ company, companyContacts, companyJobs });
      const sourceStatus = deriveCompanySourceStatus(company);

      if (accountStatusFilter !== 'all' && status !== normalize(accountStatusFilter)) return false;
      if (hiringSignalFilter !== 'all' && intel.hiringSignal !== hiringSignalFilter) return false;
      if (sourceFilter !== 'all' && sourceStatus !== sourceFilter) return false;

      if (!query) return true;
      if (name.includes(query) || status.includes(query) || source.includes(query) || normalize(sourceStatus).includes(query)) return true;

      return companyContacts.some((contact) => {
        const contactName = normalize(contact.full_name);
        const contactTitle = normalize(contact.job_title ?? '');
        const contactEmail = normalize(contact.email ?? '');
        const contactPhone = normalizePhone(contact.phone);
        const contactMobile = normalizePhone(contact.mobile_phone);
        const phoneQuery = normalizePhone(query);
        return (
          contactName.includes(query) ||
          contactTitle.includes(query) ||
          contactEmail.includes(query) ||
          (Boolean(phoneQuery) && (contactPhone.includes(phoneQuery) || contactMobile.includes(phoneQuery)))
        );
      });
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') return a.company_name.localeCompare(b.company_name);
      if (sortBy === 'activity') {
        const aContacts = contactsByCompanyId.get(a.id) ?? [];
        const bContacts = contactsByCompanyId.get(b.id) ?? [];
        const aLatest = aContacts
          .map((contact) => contact.last_contacted_at ?? contact.updated_at ?? contact.created_at ?? '')
          .sort()
          .at(-1) ?? '';
        const bLatest = bContacts
          .map((contact) => contact.last_contacted_at ?? contact.updated_at ?? contact.created_at ?? '')
          .sort()
          .at(-1) ?? '';
        return bLatest.localeCompare(aLatest);
      }
      return a.company_name.localeCompare(b.company_name);
    });
  }, [
    accountStatusFilter,
    companies,
    contactsByCompanyId,
    hiringSignalFilter,
    jobsByCompanyKey,
    relationshipCompanies,
    search,
    showAllCompanies,
    sortBy,
    sourceFilter,
  ]);

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
  const expandedContacts = useMemo(
    () => (expandedCompanyId ? contactsByCompanyId.get(Number(expandedCompanyId)) ?? [] : []),
    [contactsByCompanyId, expandedCompanyId]
  );
  const expandedCompanyIntel = useMemo(() => {
    if (!expandedCompany) return null;
    const companyContacts = contactsByCompanyId.get(expandedCompany.id) ?? [];
    const key = normalizeCompanyKey(expandedCompany.company_name);
    const companyJobs = key ? jobsByCompanyKey.get(key) ?? [] : [];
    return computeCompanyIntel({ company: expandedCompany, companyContacts, companyJobs });
  }, [contactsByCompanyId, expandedCompany, jobsByCompanyKey]);
  const expandedRevenueRecommendation = useMemo(() => {
    if (!expandedCompanyIntel) return null;
    return buildRevenueRecommendation(expandedContacts, expandedCompanyIntel);
  }, [expandedCompanyIntel, expandedContacts]);

  const expandedCompanyNotes = useMemo(() => {
    if (!expandedCompany) return [];
    return bdNotes
      .filter((note) => note.company_id === expandedCompany.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [bdNotes, expandedCompany]);

  useEffect(() => {
    setShowNoteComposer(false);
    setNoteDraft('');
    setNoteError(null);
  }, [expandedCompanyId]);

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

  function formatNoteTimestamp(value: string): string {
    return new Intl.DateTimeFormat('en-MY', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  function noteAuthorLabel(note: BdNoteRow): string {
    if (profile?.id && note.created_by === profile.id) {
      return profile.full_name || profile.email || 'You';
    }
    if (note.created_by) return `User ${note.created_by.slice(0, 8)}`;
    return 'Unknown author';
  }

  async function saveBdNote() {
    if (!expandedCompany) return;
    const noteBody = noteDraft.trim();
    if (!noteBody) return;

    setNoteSaving(true);
    setNoteError(null);
    try {
      // TODO: connect created_by to profile ownership and restrict notes by assigned account once multi-BD ownership rules exist.
      const payload = {
        company_id: expandedCompany.id,
        contact_id: null,
        note_body: noteBody,
        note_type: 'general',
        created_by: user?.id ?? null,
      };

      const { data, error: insertError } = await supabase
        .from('bd_notes')
        .insert(payload)
        .select('id,company_id,contact_id,note_body,note_type,created_by,created_at,updated_at')
        .single();

      if (insertError) throw insertError;

      setBdNotes((prev) => [data as BdNoteRow, ...prev]);
      setNoteDraft('');
      setShowNoteComposer(false);
    } catch (err) {
      console.error('[BDRelationships] save BD note failed', err);
      setNoteError('Unable to save note right now. Please check access policies and try again.');
    } finally {
      setNoteSaving(false);
    }
  }

  function clearRelationshipFilters() {
    setAccountStatusFilter('all');
    setHiringSignalFilter('all');
    setSourceFilter('all');
    setShowAllCompanies(false);
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
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

      {showFilterDrawer ? (
        <div className="fixed inset-0 z-50 2xl:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setShowFilterDrawer(false)}
            className="absolute inset-0 bg-slate-950/30"
          />
          <aside className="absolute left-0 top-0 flex h-full w-full max-w-sm flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">Filters</p>
                <p className="text-xs text-slate-500">Narrow accounts without hiding the workspace.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterDrawer(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <button
                type="button"
                onClick={clearRelationshipFilters}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-teal-700 shadow-sm transition hover:bg-slate-50"
              >
                Clear All
              </button>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Account Status</span>
                <select value={accountStatusFilter} onChange={(event) => setAccountStatusFilter(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
                  <option value="all">All Statuses</option>
                  {accountStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Hiring Signal</span>
                <select value={hiringSignalFilter} onChange={(event) => setHiringSignalFilter(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
                  <option value="all">All Signals</option>
                  {['High', 'Medium', 'Low', 'None'].map((signal) => <option key={signal} value={signal}>{signal}</option>)}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Source</span>
                <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
                  <option value="all">All Sources</option>
                  {sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Industry</span>
                <select disabled className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 outline-none">
                  <option>All Industries</option>
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Owner</span>
                <select disabled className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 outline-none">
                  <option>All Owners</option>
                </select>
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <span>Only My Accounts</span>
                <input type="checkbox" checked={false} readOnly className="h-4 w-4 rounded border-slate-300 text-teal-600" />
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <span>Show all companies</span>
                <input type="checkbox" checked={showAllCompanies} onChange={(event) => setShowAllCompanies(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-200" />
              </label>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.22fr)] 2xl:grid-cols-[260px_minmax(340px,0.85fr)_minmax(0,1.25fr)]">
        <aside className="hidden space-y-3 2xl:sticky 2xl:top-6 2xl:block 2xl:self-start">
          <Panel padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Filters</p>
              <button
                type="button"
                onClick={clearRelationshipFilters}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                Clear all
              </button>
            </div>
            <div className="space-y-3 p-4">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Account Status</span>
                <select
                  value={accountStatusFilter}
                  onChange={(event) => setAccountStatusFilter(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="all">All Statuses</option>
                  {accountStatusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Hiring Signal</span>
                <select
                  value={hiringSignalFilter}
                  onChange={(event) => setHiringSignalFilter(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="all">All Signals</option>
                  {['High', 'Medium', 'Low', 'None'].map((signal) => (
                    <option key={signal} value={signal}>{signal}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Source</span>
                <select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="all">All Sources</option>
                  {sourceOptions.map((source) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Industry</span>
                <select disabled className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 outline-none">
                  <option>All Industries</option>
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Owner</span>
                <select disabled className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 outline-none">
                  <option>All Owners</option>
                </select>
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <span>Only My Accounts</span>
                <input type="checkbox" checked={false} readOnly className="h-4 w-4 rounded border-slate-300 text-teal-600" />
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <span>Show all companies</span>
                <input
                  type="checkbox"
                  checked={showAllCompanies}
                  onChange={(event) => setShowAllCompanies(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-200"
                />
              </label>
              {companiesRestricted ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Company details are restricted by database policies. Showing contact-linked placeholders.
                </p>
              ) : null}
            </div>
          </Panel>
        </aside>

        <Panel padded={false} className="min-w-0 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">All Accounts ({filteredCompanies.length})</p>
              <p className="text-xs text-slate-500">Select an account to open the relationship workspace.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilterDrawer(true)}
                className="inline-flex min-h-[34px] items-center justify-center rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-100 2xl:hidden"
              >
                Filters
              </button>
              {jobsIntelError ? <Badge tone="amber">Job signals unavailable</Badge> : null}
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              >
                <option value="activity">Sort by Activity</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>
          </div>

          <div className="max-h-[calc(100vh-220px)] divide-y divide-slate-100 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-5 text-sm text-slate-500">Loading BD relationships...</div>
            ) : error ? (
              <div className="px-4 py-5 text-sm text-red-700">{error}</div>
            ) : filteredCompanies.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">No matching companies or contacts found.</div>
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
                    onClick={() => {
                      setExpandedCompanyId(companyIdString);
                      setActiveWorkspaceTab('overview');
                    }}
                    className={`w-full px-4 py-3 text-left transition ${
                      isExpanded ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-100' : 'bg-white hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-teal-700 shadow-sm">
                        {companyInitials(company.company_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">{company.company_name}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {formatCompanyLocation(company) || formatCompanySourceLabel(company.source_type)} • {companyContacts.length} contacts
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge tone="slate">{intel.lastActivityLabel}</Badge>
                          <Badge tone={intel.followUpLabel.includes('overdue') || intel.followUpLabel.includes('due today') ? 'amber' : 'slate'}>
                            {intel.followUpLabel}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Panel>

        <Panel
          padded={false}
          className="flex min-w-0 overflow-hidden xl:sticky xl:top-6 xl:max-h-[calc(100vh-120px)] xl:flex-col xl:self-start"
        >
          {!expandedCompany ? (
            <div className="flex min-h-[520px] items-center justify-center px-6 text-center">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Building2 size={20} />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-950">Select an account</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Search or choose a company to review relationship intelligence, contacts, activity, and next actions.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-bold text-teal-700 shadow-sm">
                      {companyInitials(expandedCompany.company_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-slate-950">{expandedCompany.company_name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatCompanySourceLabel(expandedCompany.source_type)} • {formatCompanyLocation(expandedCompany) || 'Malaysia'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {expandedCompanyIntel ? (
                          <Badge tone={hiringSignalTone(expandedCompanyIntel.hiringSignal)}>
                            {expandedCompanyIntel.hiringSignal === 'None'
                              ? 'No Hiring Activity'
                              : `${expandedCompanyIntel.hiringSignal} Hiring Activity`}
                          </Badge>
                        ) : null}
                        <Badge tone="slate">{expandedContacts.length} contacts available</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-100 px-4">
                <div className="flex gap-1 overflow-x-auto">
                  {(['overview', 'contacts', 'activity', 'notes'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveWorkspaceTab(tab)}
                      className={`border-b-2 px-3 py-3 text-xs font-semibold capitalize transition ${
                        activeWorkspaceTab === tab
                          ? 'border-teal-600 text-teal-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {activeWorkspaceTab === 'overview' && expandedCompanyIntel ? (
                  <div className="space-y-4">
                    {expandedRevenueRecommendation ? (
                      <div className="overflow-hidden rounded-2xl border border-teal-200 bg-teal-50/50">
                        <div className="flex flex-col gap-3 border-b border-teal-100 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-700">Recommended Action</p>
                            <p className="mt-1 text-base font-semibold text-slate-950">{expandedRevenueRecommendation.action}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-600">{expandedRevenueRecommendation.reason}</p>
                          </div>
                          <Badge tone={hiringSignalTone(expandedCompanyIntel.hiringSignal)}>
                            {expandedCompanyIntel.hiringSignal === 'None'
                              ? 'No Hiring Activity'
                              : `${expandedCompanyIntel.hiringSignal} Hiring Activity`}
                          </Badge>
                        </div>
                        <div className="grid gap-px bg-teal-100/80 sm:grid-cols-2">
                          <div className="bg-white/90 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Best Contact</p>
                            {expandedRevenueRecommendation.bestContact ? (
                              <>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <p className="text-sm font-semibold text-slate-950">
                                    {expandedRevenueRecommendation.bestContact.full_name}
                                  </p>
                                  {inferStakeholderRoles(expandedRevenueRecommendation.bestContact).map((role) => (
                                    <Badge key={role} tone={stakeholderRoleTone(role)}>{role}</Badge>
                                  ))}
                                </div>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {expandedRevenueRecommendation.bestContact.job_title || 'Role not specified'}
                                </p>
                                <p className="mt-1 text-xs font-medium text-teal-700">{expandedRevenueRecommendation.contactability}</p>
                              </>
                            ) : (
                              <p className="mt-1 text-sm text-slate-600">No stakeholder identified yet.</p>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-px bg-slate-100">
                            <div className="bg-white/90 px-3 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Last Contacted</p>
                              <p className="mt-1 text-xs font-semibold text-slate-800">{expandedRevenueRecommendation.lastContacted}</p>
                            </div>
                            <div className="bg-white/90 px-3 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Next Action</p>
                              <p className="mt-1 text-xs font-semibold text-slate-800">{expandedRevenueRecommendation.nextAction}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-950">Account Summary</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {jobsIntelError ? jobsIntelError : expandedCompanyIntel.why.slice(0, 2).join(' ')}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div><p className="text-lg font-semibold text-slate-950">{expandedCompanyIntel.activeJobs}</p><p className="text-xs text-slate-500">Active Jobs</p></div>
                        <div><p className="text-lg font-semibold text-slate-950">{expandedCompanyIntel.hiringSignal}</p><p className="text-xs text-slate-500">Hiring Activity</p></div>
                        <div><p className="text-sm font-semibold text-slate-950">{expandedRevenueRecommendation?.lastContacted ?? 'No activity'}</p><p className="text-xs text-slate-500">Last Contacted</p></div>
                        <div><p className="text-lg font-semibold text-slate-950">{expandedContacts.length}</p><p className="text-xs text-slate-500">Contacts Available</p></div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-950">Key Signals</p>
                      <div className="mt-3 grid gap-2">
                        {expandedCompanyIntel.signals.slice(0, 6).map((signal) => (
                          <div key={signal.label} className="flex items-center gap-2 text-sm text-slate-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                            {signal.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-950">Top Contacts</p>
                        <button type="button" onClick={() => setActiveWorkspaceTab('contacts')} className="text-xs font-semibold text-teal-700 hover:text-teal-800">
                          View all
                        </button>
                      </div>
                      <div className="mt-3 divide-y divide-slate-100">
                        {expandedContacts.slice(0, 3).map((contact) => (
                          <div key={contact.id} className="py-3">
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-slate-950">{contact.full_name}</p>
                                  {renderStatusTag(getUiStatus(contact))}
                                  {inferStakeholderRoles(contact).map((role) => (
                                    <Badge key={role} tone={stakeholderRoleTone(role)}>{role}</Badge>
                                  ))}
                                </div>
                                <p className="mt-0.5 truncate text-xs text-slate-500">{contact.job_title ?? 'Contact'}</p>
                                <div className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-slate-600 sm:grid-cols-2">
                                  <span className="truncate">Email: {contact.email || 'Not available'}</span>
                                  <span className="truncate">Mobile: {contact.mobile_phone || 'Not available'}</span>
                                  <span className="truncate">Direct: {contact.phone || 'Not available'}</span>
                                  <span className="truncate">
                                    Last: {contact.last_contacted_at ? daysAgoLabel(contact.last_contacted_at) : 'Never'}
                                  </span>
                                  <span className="truncate sm:col-span-2">
                                    Next: {nextActionLabel(contact.next_action, contact.next_action_date)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                                <a
                                  href={contact.email ? `mailto:${contact.email}` : undefined}
                                  aria-disabled={!contact.email}
                                  className={`rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold shadow-sm transition ${
                                    contact.email
                                      ? 'bg-white text-slate-700 hover:bg-slate-50'
                                      : 'pointer-events-none bg-slate-50 text-slate-400'
                                  }`}
                                >
                                  Email
                                </a>
                                <a
                                  href={contact.mobile_phone || contact.phone ? `tel:${contact.mobile_phone || contact.phone}` : undefined}
                                  aria-disabled={!contact.mobile_phone && !contact.phone}
                                  className={`rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold shadow-sm transition ${
                                    contact.mobile_phone || contact.phone
                                      ? 'bg-white text-slate-700 hover:bg-slate-50'
                                      : 'pointer-events-none bg-slate-50 text-slate-400'
                                  }`}
                                >
                                  Call
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const splitNotes = splitNotesForDisplay(contact.notes);
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
                                    });
                                  }}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {expandedContacts.length === 0 ? <p className="py-3 text-sm text-slate-500">No contacts found for this account yet.</p> : null}
                      </div>
                    </div>

                    <details className="rounded-2xl border border-slate-200 bg-slate-50/60">
                      <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-slate-600">
                        Technical account details
                      </summary>
                      <div className="grid gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-600 sm:grid-cols-2">
                        <p><span className="font-semibold text-slate-700">Source status:</span> {deriveCompanySourceStatus(expandedCompany)}</p>
                        <p><span className="font-semibold text-slate-700">ATS family:</span> {expandedCompany.ats_family || 'Unknown'}</p>
                        <p><span className="font-semibold text-slate-700">Source confidence:</span> {expandedCompany.source_confidence ?? 'Not available'}</p>
                        <p>
                          <span className="font-semibold text-slate-700">Careers page:</span>{' '}
                          {expandedCompany.career_url ? (
                            <a href={expandedCompany.career_url} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">
                              Open careers page
                            </a>
                          ) : (
                            'Not available'
                          )}
                        </p>
                      </div>
                    </details>
                  </div>
                ) : null}

                {activeWorkspaceTab === 'contacts' ? (
                  expandedContacts.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No contacts found for this account yet.</div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="divide-y divide-slate-100">
                        {expandedContacts.map((contact) => {
                          const splitNotes = splitNotesForDisplay(contact.notes);
                          return (
                            <div
                              key={contact.id}
                              className="grid min-w-0 gap-3 px-3 py-3 text-sm transition hover:bg-slate-50/70 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"
                            >
                              <div className="min-w-0">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                  <p className="truncate font-semibold text-slate-950">{contact.full_name}</p>
                                  {renderStatusTag(getUiStatus(contact))}
                                  {inferStakeholderRoles(contact).map((role) => (
                                    <Badge key={role} tone={stakeholderRoleTone(role)}>{role}</Badge>
                                  ))}
                                </div>
                                <p className="mt-0.5 truncate text-xs text-slate-500">{contact.job_title ?? 'Contact'}</p>
                                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                                  <a
                                    href={contact.email ? `mailto:${contact.email}` : undefined}
                                    className={`max-w-full truncate ${contact.email ? 'text-teal-700 hover:underline' : 'text-slate-400'}`}
                                  >
                                    Email: {contact.email || 'Not available'}
                                  </a>
                                  <a
                                    href={contact.mobile_phone ? `tel:${contact.mobile_phone}` : undefined}
                                    className={`max-w-full truncate ${contact.mobile_phone ? 'text-slate-700 hover:underline' : 'text-slate-400'}`}
                                  >
                                    Mobile: {contact.mobile_phone || 'Not available'}
                                  </a>
                                  <a
                                    href={contact.phone ? `tel:${contact.phone}` : undefined}
                                    className={`max-w-full truncate ${contact.phone ? 'text-slate-700 hover:underline' : 'text-slate-400'}`}
                                  >
                                    Direct: {contact.phone || 'Not available'}
                                  </a>
                                </div>
                                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                  <span className="font-medium text-teal-700">{contactabilityLabel(contact)}</span>
                                  <span className="truncate">
                                    Last contacted: {contact.last_contacted_at ? daysAgoLabel(contact.last_contacted_at) : 'Never'}
                                  </span>
                                  <span className="flex min-w-0 items-center gap-1.5">
                                    <span className="shrink-0">Next action:</span>
                                    <Badge tone={nextActionTone(contact.next_action_date)}>
                                      {nextActionLabel(contact.next_action, contact.next_action_date)}
                                    </Badge>
                                  </span>
                                  <input
                                    type="date"
                                    value={followUpDates[contact.id] ?? contact.next_action_date ?? ''}
                                    onChange={(event) => setFollowUpDates((prev) => ({ ...prev, [contact.id]: event.target.value }))}
                                    className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-800 outline-none"
                                  />
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
                                <a
                                  href={contact.email ? `mailto:${contact.email}` : undefined}
                                  aria-disabled={!contact.email}
                                  className={`rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold shadow-sm ${
                                    contact.email ? 'bg-white text-slate-700 hover:bg-slate-50' : 'pointer-events-none bg-slate-50 text-slate-400'
                                  }`}
                                >
                                  Email
                                </a>
                                <a
                                  href={contact.mobile_phone || contact.phone ? `tel:${contact.mobile_phone || contact.phone}` : undefined}
                                  aria-disabled={!contact.mobile_phone && !contact.phone}
                                  className={`rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold shadow-sm ${
                                    contact.mobile_phone || contact.phone ? 'bg-white text-slate-700 hover:bg-slate-50' : 'pointer-events-none bg-slate-50 text-slate-400'
                                  }`}
                                >
                                  Call
                                </a>
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
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => markContacted(contact).catch((err) => console.error('[BDRelationships] markContacted failed', err))}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                                >
                                  Contacted
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFollowUp(contact).catch((err) => console.error('[BDRelationships] setFollowUp failed', err))}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                                >
                                  Follow-up
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                ) : null}

                {activeWorkspaceTab === 'activity' ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-950">Action Queue</p>
                      <div className="mt-3 divide-y divide-slate-100">
                        {actionQueue.filter((contact) => contact.company_id === expandedCompany.id).length === 0 ? (
                          <p className="py-2 text-sm text-slate-500">No follow-ups due for this account.</p>
                        ) : (
                          actionQueue.filter((contact) => contact.company_id === expandedCompany.id).map((contact) => (
                            <div key={contact.id} className="py-2">
                              <p className="text-sm font-semibold text-slate-950">{contact.full_name}</p>
                              <p className="text-xs text-slate-500">{nextActionLabel(contact.next_action, contact.next_action_date)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeWorkspaceTab === 'notes' ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">BD Working Notes</p>
                          <p className="mt-1 text-xs text-slate-500">Capture account context, outreach details, and next-step thinking.</p>
                        </div>
                        {/* TODO: Create proper BD notes table later with id, company_id, contact_id nullable, note_body, note_type, created_by, created_at, and visibility / owner rules. Future multi-BD support must respect assigned accounts/clients and permitted notes. */}
                        <button
                          type="button"
                          onClick={() => setShowNoteComposer(true)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                        >
                          Add Note
                        </button>
                      </div>
                      {showNoteComposer ? (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                          <textarea
                            value={noteDraft}
                            onChange={(event) => setNoteDraft(event.target.value)}
                            rows={4}
                            placeholder="Write a note about this account..."
                            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                          />
                          {noteError ? <p className="mt-2 text-xs text-red-700">{noteError}</p> : null}
                          <div className="mt-3 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowNoteComposer(false);
                                setNoteDraft('');
                                setNoteError(null);
                              }}
                              disabled={noteSaving}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void saveBdNote()}
                              disabled={noteSaving || !noteDraft.trim()}
                              className="rounded-xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {noteSaving ? 'Saving...' : 'Save Note'}
                            </button>
                          </div>
                        </div>
                      ) : expandedCompanyNotes.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => setShowNoteComposer(true)}
                          className="mt-4 w-full rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-3 py-4 text-left text-sm text-slate-500 transition hover:border-teal-200 hover:bg-teal-50/40"
                        >
                          Write a note about this account...
                        </button>
                      ) : null}
                    </div>

                    {expandedCompanyNotes.map((note) => (
                      <div key={note.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{note.note_body}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{formatNoteTimestamp(note.created_at)}</span>
                          <span aria-hidden="true">-</span>
                          <span>{noteAuthorLabel(note)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="border-t border-slate-100 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => onNavigate('bd-tasks')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">Log Activity</button>
                  <button type="button" onClick={() => setShowAddContactModal(true)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">Add Contact</button>
                  <button type="button" onClick={() => onNavigate('jobs')} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800">Create Opportunity</button>
                </div>
              </div>
            </>
          )}
        </Panel>
      </div>

      <div className="hidden">

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
          title="Top Companies We Can Win"
          description="Dynamic relationship ranking from contacts, stakeholder coverage, source readiness, and activity."
          icon={<Sparkles size={16} />}
          meta={<Badge tone="slate">{topCompaniesWeCanWin.length} ranked</Badge>}
        />
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="px-4 py-4 text-sm text-slate-500">Loading relationship intelligence...</div>
          ) : topCompaniesWeCanWin.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-500">No relationship companies available yet.</div>
          ) : (
            topCompaniesWeCanWin.map((item) => (
              <button
                key={item.company.id}
                type="button"
                onClick={() => setExpandedCompanyId(String(item.company.id))}
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
              <div className="px-4 py-5 text-sm text-slate-500">No matching companies or contacts found.</div>
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

        <Panel
          padded={false}
          className="flex overflow-hidden xl:sticky xl:top-6 xl:max-h-[calc(100vh-120px)] xl:flex-col xl:self-start"
        >
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

          <div className="min-h-0 flex-1 overflow-y-auto">
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
          </div>
        </Panel>
      </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/40 px-4 py-6">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
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

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
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
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Contact Notes</span>
                <textarea
                  value={editingContact.notes ?? ''}
                  onChange={(e) => setEditingContact({ ...editingContact, notes: e.target.value })}
                  rows={3}
                  className="max-h-28 w-full resize-y rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </label>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 bg-white px-5 py-4">
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
