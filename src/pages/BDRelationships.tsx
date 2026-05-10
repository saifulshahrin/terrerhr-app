import { useEffect, useMemo, useState } from 'react';
import { Building2, Mail, Phone, Search, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

type EditableContact = Pick<
  ContactRow,
  'id' | 'full_name' | 'job_title' | 'email' | 'phone' | 'mobile_phone' | 'relationship_status' | 'notes'
>;

type UiContactStatus = 'new' | 'contacted' | 'responded';

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
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [companiesRestricted, setCompaniesRestricted] = useState(false);
  const [showAllCompanies, setShowAllCompanies] = useState(false);

  const [editingContact, setEditingContact] = useState<EditableContact | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // UI-only action layer (no DB writes yet)
  const [contactActions, setContactActions] = useState<Record<string, UiContactActionState>>({});

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
            'id,company_id,full_name,job_title,email,phone,mobile_phone,relationship_status,notes,created_at,updated_at'
          )
          .order('updated_at', { ascending: false })
          .limit(2000);

        if (contactError) throw contactError;

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

  function getUiStatus(contact: ContactRow): UiContactStatus {
    const fromUi = contactActions[contact.id]?.status;
    if (fromUi) return fromUi;

    const dbStatus = normalize(contact.relationship_status ?? '');
    if (dbStatus === 'contacted') return 'contacted';
    if (dbStatus === 'responded') return 'responded';
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
      status === 'responded'
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
    <div className="space-y-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">
            Relationship Layer
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">BD Relationships</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
            Store hiring-side companies and contacts so BD can prioritize outreach and keep relationship memory.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search companies or contacts"
              className="w-full rounded-2xl border border-gray-200 bg-white px-10 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <button
            type="button"
            onClick={() => onNavigate('job-intake')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
          >
            <Building2 size={16} />
            Add Intake
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Relationship Companies</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">{relationshipCompaniesCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Contacts</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">{contactsCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Unreviewed</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
            {unreviewedCount}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-950">Companies</p>
                <p className="mt-1 text-xs text-gray-500">
                  {showAllCompanies
                    ? 'All companies (including those without contacts).'
                    : 'Relationship companies (only companies with contacts).'}{' '}
                  Click a company to view its contacts.
                </p>
                {companiesRestricted ? (
                  <p className="mt-2 text-xs text-amber-700">
                    Company details are currently restricted by database access policies. Showing contact-linked company placeholders.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={showAllCompanies}
                    onChange={(e) => setShowAllCompanies(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-200"
                  />
                  <span>Show all companies</span>
                </label>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Users size={14} />
                  <span>{filteredCompanies.length} shown</span>
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="px-5 py-6 text-sm text-gray-500">Loading BD relationships...</div>
            ) : error ? (
              <div className="px-5 py-6 text-sm text-red-700">{error}</div>
            ) : filteredCompanies.length === 0 ? (
              <div className="px-5 py-6 text-sm text-gray-500">No companies match your search.</div>
            ) : (
              filteredCompanies.map((company) => {
                const companyIdString = String(company.id);
                const isExpanded = companyIdString === expandedCompanyId;
                const contactsCount = (contactsByCompanyId.get(company.id) ?? []).length;
                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => setExpandedCompanyId(isExpanded ? null : companyIdString)}
                    className={`w-full px-5 py-4 text-left transition hover:bg-gray-50 ${
                      isExpanded ? 'bg-teal-50/40' : 'bg-white'
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-950">{company.company_name}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatCompanyLocation(company) || 'Malaysia'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-700">
                          {contactsCount} contacts
                        </span>
                        <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-700">
                          {company.company_status ?? 'target'}
                        </span>
                        <span className="rounded-full bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-600">
                          {company.source_type ?? 'legacy_bd_list'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-sm font-semibold text-gray-950">Contacts</p>
            <p className="mt-1 text-xs text-gray-500">
              {expandedCompany
                ? `Showing contacts for ${expandedCompany.company_name}`
                : 'Select a company to view contacts.'}
            </p>
          </div>

          {!expandedCompany ? (
            <div className="px-5 py-6 text-sm text-gray-500">No company selected yet.</div>
          ) : expandedContacts.length === 0 ? (
            <div className="px-5 py-6 text-sm text-gray-500">No contacts found for this company yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {expandedContacts.map((contact) => (
                <div key={contact.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-950">{contact.full_name}</p>
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
                        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {contact.job_title ?? 'Contact'}{' '}
                    {contact.relationship_status ? `• ${contact.relationship_status}` : ''}
                  </p>

                  <div className="mt-3 flex flex-col gap-2 text-xs text-gray-600">
                    {contact.email ? (
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-gray-400" />
                        <span className="break-words">{contact.email}</span>
                      </div>
                    ) : null}
                    {contact.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        <span className="break-words">Direct: {contact.phone}</span>
                      </div>
                    ) : null}
                    {contact.mobile_phone ? (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        <span className="break-words">Mobile: {contact.mobile_phone}</span>
                      </div>
                    ) : null}
                    {contact.notes ? (
                      <p className="rounded-2xl bg-gray-50 px-3 py-2 text-xs text-gray-700 whitespace-pre-wrap break-words">
                        {contact.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-3 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                          Next Action
                        </p>
                        <input
                          value={getUiNextAction(contact)}
                          onChange={(e) => setUiAction(contact.id, { nextAction: e.target.value })}
                          placeholder="e.g. Send intro email, ask for hiring plan, schedule call"
                          className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setUiAction(contact.id, {
                              status: 'contacted',
                              nextAction: getUiNextAction(contact) || 'Follow up in 3 days',
                            })
                          }
                          className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                        >
                          Mark Contacted
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setUiAction(contact.id, {
                              status: getUiStatus(contact),
                              nextAction: 'Set follow-up for next week',
                            })
                          }
                          className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                        >
                          Set Follow-up
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setUiAction(contact.id, {
                              status: 'responded',
                              nextAction: getUiNextAction(contact) || 'Qualify hiring needs and open roles',
                            })
                          }
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
        </section>
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
