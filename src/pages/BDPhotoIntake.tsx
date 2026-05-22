import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Image as ImageIcon, Loader2, Save, Search, UploadCloud, X } from 'lucide-react';
import { Badge, MetricTile, PageHeader, Panel, SectionHeader } from '../components/visualSystem';
import { type BdPhotoExtractedFields, type PhotoExtractionStatus } from '../lib/bdPhotoExtraction';
import { extractBdFromPhotoWithGeminiVision } from '../lib/bdPhotoVisionExtraction';
import { uploadBdPhotoIntakeImage } from '../lib/bdPhotoStorage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';

type IntakeSaveMode = 'create_new' | 'merge_if_empty';

interface CompanyRow {
  id: number;
  company_name: string | null;
  company_status: string | null;
  notes: string | null;
}

interface ContactRow {
  id: string;
  company_id: number | null;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  relationship_status: string | null;
  notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  last_contacted_at: string | null;
  legacy_source_id?: string | null;
  legacy_source_system?: string | null;
  legacy_created_by?: string | null;
  legacy_date_added?: string | null;
  source_photo_url?: string | null;
  source_import_type?: string | null;
  extraction_status?: string | null;
  extraction_confidence?: number | null;
  raw_extracted_json?: unknown | null;
}

interface PhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  status: PhotoExtractionStatus;
  statusDetail?: string;
  uploadedPath?: string | null;
  uploadedPublicUrl?: string | null;
  extraction?: {
    source?: 'mock' | 'gemini_vision';
    fields: BdPhotoExtractedFields;
    confidence: number;
    raw: unknown;
  } | null;
  draft: BdPhotoExtractedFields | null;
  duplicateWarning?: {
    companyMatches: CompanyRow[];
    contactMatches: ContactRow[];
  } | null;
  overwriteExisting: boolean;
  saveMode: IntakeSaveMode;
  saving: boolean;
  error?: string | null;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function shortId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function normalize(value: string | null | undefined) {
  return (value ?? '').trim();
}

function normalizeKey(value: string | null | undefined) {
  return normalize(value)
    .toLowerCase()
    .replace(/\b(sdn\.?\s*bhd\.?|bhd\.?|berhad|ltd\.?|limited|inc\.?|corp\.?|co\.?|company)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function safeNumberString(value: string) {
  const cleaned = normalize(value);
  if (!cleaned) return '';
  const n = Number(cleaned);
  return Number.isFinite(n) ? String(n) : cleaned;
}

function statusTone(status: PhotoExtractionStatus) {
  if (status === 'Uploaded') return 'slate';
  if (status === 'Processing') return 'blue';
  if (status === 'Extracted') return 'emerald';
  if (status === 'Needs Review') return 'amber';
  if (status === 'Saved') return 'emerald';
  return 'red';
}

function isEmptyField(value: unknown) {
  return value === null || value === undefined || String(value).trim() === '';
}

function mergeIfEmpty(existing: ContactRow, draft: BdPhotoExtractedFields, companyId: number | null) {
  const next: Partial<ContactRow> = {};
  if (companyId && !existing.company_id) next.company_id = companyId;

  if (isEmptyField(existing.full_name) && draft.contact_full_name) next.full_name = draft.contact_full_name;
  if (isEmptyField(existing.first_name) && draft.contact_first_name) next.first_name = draft.contact_first_name;
  if (isEmptyField(existing.last_name) && draft.contact_last_name) next.last_name = draft.contact_last_name;
  if (isEmptyField(existing.job_title) && draft.occupation_title) next.job_title = draft.occupation_title;
  if (isEmptyField(existing.email) && draft.email) next.email = draft.email;
  if (isEmptyField(existing.phone) && draft.direct_phone) next.phone = draft.direct_phone;
  if (isEmptyField(existing.mobile_phone) && draft.mobile_phone) next.mobile_phone = draft.mobile_phone;
  if (isEmptyField(existing.relationship_status) && draft.relationship_status) next.relationship_status = draft.relationship_status;
  if (isEmptyField(existing.notes) && (draft.address || draft.source_notes)) {
    next.notes = [draft.address, draft.source_notes].filter(Boolean).join('\n').trim();
  }

  // Optional intake metadata columns (nullable, only set if available in schema).
  if ((existing as any).legacy_source_id !== undefined && draft.source_system_id) (next as any).legacy_source_id = draft.source_system_id;
  if ((existing as any).legacy_created_by !== undefined && draft.created_by_legacy) (next as any).legacy_created_by = draft.created_by_legacy;
  if ((existing as any).legacy_date_added !== undefined && draft.legacy_date_added) (next as any).legacy_date_added = draft.legacy_date_added;

  return next;
}

async function findCompaniesByName(companyName: string): Promise<CompanyRow[]> {
  const query = normalize(companyName);
  if (!query) return [];
  const { data, error } = await supabase
    .from('companies')
    .select('id, company_name, company_status, notes')
    .ilike('company_name', `%${query}%`)
    .limit(8);

  if (error) {
    console.warn('[BDPhotoIntake] companies lookup failed', error);
    return [];
  }
  return ((data ?? []) as CompanyRow[]) ?? [];
}

async function findContactsBySignals({
  email,
  phone,
  mobilePhone,
  fullName,
  companyId,
}: {
  email: string;
  phone: string;
  mobilePhone: string;
  fullName: string;
  companyId: number | null;
}): Promise<ContactRow[]> {
  const matches: ContactRow[] = [];

  const select = 'id, company_id, full_name, first_name, last_name, job_title, email, phone, mobile_phone, relationship_status, notes, next_action, next_action_date, last_contacted_at';

  if (normalize(email)) {
    const { data } = await supabase.from('bd_contacts').select(select).ilike('email', normalize(email)).limit(5);
    (data ?? []).forEach((row: any) => matches.push(row as ContactRow));
  }

  if (normalize(phone)) {
    const { data } = await supabase.from('bd_contacts').select(select).eq('phone', normalize(phone)).limit(5);
    (data ?? []).forEach((row: any) => matches.push(row as ContactRow));
  }

  if (normalize(mobilePhone)) {
    const { data } = await supabase.from('bd_contacts').select(select).eq('mobile_phone', normalize(mobilePhone)).limit(5);
    (data ?? []).forEach((row: any) => matches.push(row as ContactRow));
  }

  if (companyId && normalize(fullName)) {
    const { data } = await supabase
      .from('bd_contacts')
      .select(select)
      .eq('company_id', companyId)
      .ilike('full_name', normalize(fullName))
      .limit(5);
    (data ?? []).forEach((row: any) => matches.push(row as ContactRow));
  }

  const byId = new Map<string, ContactRow>();
  for (const m of matches) byId.set(m.id, m);
  return [...byId.values()];
}

export default function BDPhotoIntake() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<PhotoItem[]>([]);
  const itemsRef = useRef<PhotoItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => items.find(i => i.id === selectedId) ?? null, [items, selectedId]);

  useEffect(() => {
    return () => {
      // Cleanup created object URLs.
      itemsRef.current.forEach(i => URL.revokeObjectURL(i.previewUrl));
    };
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (!selectedId && items.length > 0) setSelectedId(items[0].id);
    if (selectedId && items.length > 0 && !items.some(i => i.id === selectedId)) setSelectedId(items[0].id);
  }, [items, selectedId]);

  const summary = useMemo(() => {
    const by: Record<PhotoExtractionStatus, number> = {
      Uploaded: 0,
      Processing: 0,
      Extracted: 0,
      'Needs Review': 0,
      Saved: 0,
      Failed: 0,
    };
    for (const it of items) by[it.status] += 1;
    return by;
  }, [items]);

  const onPickFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: PhotoItem[] = [];

    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(file.type)) continue;
      const previewUrl = URL.createObjectURL(file);
      next.push({
        id: shortId(),
        file,
        previewUrl,
        status: 'Uploaded',
        statusDetail: 'Ready for extraction',
        extraction: null,
        draft: null,
        overwriteExisting: false,
        saveMode: 'merge_if_empty',
        saving: false,
        error: null,
        duplicateWarning: null,
      });
    }

    if (next.length === 0) return;
    setItems(prev => [...next, ...prev]);
    setSelectedId(prev => prev ?? next[0].id);
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const found = prev.find(p => p.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  const runExtraction = async (id: string) => {
    setItems(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, status: 'Processing', statusDetail: 'Extracting structured fields...', error: null }
          : p
      )
    );

    try {
      const item = items.find(i => i.id === id);
      if (!item) return;

      // Upload first so the eventual record can reference the source image.
      let uploadPath: string | null = item.uploadedPath ?? null;
      let uploadPublicUrl: string | null = item.uploadedPublicUrl ?? null;

      if (!uploadPath) {
        const uploaded = await uploadBdPhotoIntakeImage(item.file, user?.id ?? null);
        uploadPath = uploaded.path;
        uploadPublicUrl = uploaded.publicUrl;
      }

      const vision = await extractBdFromPhotoWithGeminiVision(item.file);
      const confidences = Object.values(vision.field_confidence ?? {}).filter(v => typeof v === 'number') as number[];
      const avgConfidence = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0.6;

      const result: { source: 'mock' | 'gemini_vision'; fields: BdPhotoExtractedFields; confidence: number; raw: unknown } = {
        source: 'gemini_vision',
        fields: {
          company_name: vision.extracted.company_name ?? '',
          company_status: vision.extracted.company_status ?? '',
          contact_first_name: vision.extracted.first_name ?? '',
          contact_last_name: vision.extracted.last_name ?? '',
          contact_full_name: vision.extracted.contact_full_name ?? '',
          occupation_title: vision.extracted.occupation_title ?? '',
          email: vision.extracted.email ?? '',
          direct_phone: vision.extracted.direct_phone ?? '',
          mobile_phone: vision.extracted.mobile_phone ?? '',
          address: vision.extracted.address ?? '',
          source_system_id: vision.extracted.legacy_system_id ?? '',
          source_notes: vision.extracted.notes_signals ?? '',
          relationship_status: '',
          created_by_legacy: vision.extracted.recruiter_name ?? '',
          legacy_date_added: '',
          jobs_count: vision.extracted.jobs_count !== null && vision.extracted.jobs_count !== undefined ? String(vision.extracted.jobs_count) : '',
          submissions_count:
            vision.extracted.submissions_count !== null && vision.extracted.submissions_count !== undefined
              ? String(vision.extracted.submissions_count)
              : '',
          client_submissions_count: '',
          interviews_count:
            vision.extracted.interviews_count !== null && vision.extracted.interviews_count !== undefined
              ? String(vision.extracted.interviews_count)
              : '',
          placements_count:
            vision.extracted.placements_count !== null && vision.extracted.placements_count !== undefined
              ? String(vision.extracted.placements_count)
              : '',
        },
        confidence: avgConfidence,
        raw: vision.raw,
      };

      // Duplicate preview pass (best-effort; uses existing readable tables).
      const companyMatches = await findCompaniesByName(result.fields.company_name);
      const bestCompany =
        companyMatches.find(c => normalizeKey(c.company_name) === normalizeKey(result.fields.company_name)) ?? companyMatches[0] ?? null;
      const contactMatches = await findContactsBySignals({
        email: result.fields.email,
        phone: result.fields.direct_phone,
        mobilePhone: result.fields.mobile_phone,
        fullName: result.fields.contact_full_name,
        companyId: bestCompany?.id ?? null,
      });

      const needsReview = true;
      setItems(prev =>
        prev.map(p =>
          p.id === id
            ? {
                ...p,
                uploadedPath: uploadPath,
                uploadedPublicUrl: uploadPublicUrl,
                extraction: result,
                draft: { ...result.fields, jobs_count: safeNumberString(result.fields.jobs_count) },
                duplicateWarning: { companyMatches, contactMatches },
                status: needsReview ? 'Needs Review' : 'Extracted',
                statusDetail: needsReview ? 'Review and edit fields before saving' : 'Extracted',
                error: null,
              }
            : p
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed';
      setItems(prev =>
        prev.map(p =>
          p.id === id
            ? {
                ...p,
                status: 'Failed',
                statusDetail: 'Vision extraction failed. You can still enter fields manually and save.',
                error: message,
                extraction: null,
                draft: {
                  company_name: '',
                  company_status: '',
                  contact_first_name: '',
                  contact_last_name: '',
                  contact_full_name: '',
                  occupation_title: '',
                  email: '',
                  direct_phone: '',
                  mobile_phone: '',
                  address: '',
                  source_system_id: '',
                  source_notes: '',
                  relationship_status: '',
                  created_by_legacy: '',
                  legacy_date_added: '',
                  jobs_count: '',
                  submissions_count: '',
                  client_submissions_count: '',
                  interviews_count: '',
                  placements_count: '',
                },
              }
            : p
        )
      );
    }
  };

  const updateDraft = (id: string, patch: Partial<BdPhotoExtractedFields>) => {
    setItems(prev =>
      prev.map(p => (p.id === id && p.draft ? { ...p, draft: { ...p.draft, ...patch } } : p))
    );
  };

  const saveToRelationships = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item || !item.draft) return;

    setItems(prev => prev.map(p => (p.id === id ? { ...p, saving: true, error: null } : p)));

    try {
      const draft = item.draft;
      const companyName = normalize(draft.company_name);
      const contactFullName = normalize(draft.contact_full_name);

      if (!companyName || !contactFullName) {
        throw new Error('Company name and contact full name are required to save.');
      }

      // 1) Company: find best match by normalized key, otherwise create.
      const companyMatches = await findCompaniesByName(companyName);
      let company = companyMatches.find(c => normalizeKey(c.company_name) === normalizeKey(companyName)) ?? companyMatches[0] ?? null;

      if (!company) {
        const { data, error } = await supabase
          .from('companies')
          .insert({
            company_name: companyName,
            company_status: normalize(draft.company_status) || null,
            notes: normalize(draft.source_notes) || null,
            updated_at: new Date().toISOString(),
          })
          .select('id, company_name, company_status, notes')
          .single();

        if (error) throw error;
        company = data as CompanyRow;
      }

      const companyId = company?.id ?? null;

      // 2) Contact: check duplicates again (so it remains correct after edits).
      const contactMatches = await findContactsBySignals({
        email: draft.email,
        phone: draft.direct_phone,
        mobilePhone: draft.mobile_phone,
        fullName: contactFullName,
        companyId,
      });

      const existing = contactMatches[0] ?? null;
      const now = new Date().toISOString();
      const sourceNotes = [draft.address, draft.source_notes].filter(Boolean).join('\n').trim();

      const intakeMeta: Record<string, any> = {
        source_photo_url: item.uploadedPublicUrl ?? (item.uploadedPath ? `storage:${item.uploadedPath}` : null),
        source_import_type: 'photo_intake',
        extraction_status: item.status,
        extraction_confidence: item.extraction?.confidence ?? null,
        raw_extracted_json: item.extraction
          ? { source: item.extraction.source ?? null, raw: item.extraction.raw }
          : null,
        legacy_source_id: normalize(draft.source_system_id) || null,
        legacy_source_system: 'photo_intake',
        legacy_created_by: normalize(draft.created_by_legacy) || null,
        legacy_date_added: normalize(draft.legacy_date_added) || null,
      };

      if (!existing) {
        const payload: Record<string, any> = {
          company_id: companyId,
          full_name: contactFullName,
          first_name: normalize(draft.contact_first_name) || null,
          last_name: normalize(draft.contact_last_name) || null,
          job_title: normalize(draft.occupation_title) || null,
          email: normalize(draft.email) || null,
          phone: normalize(draft.direct_phone) || null,
          mobile_phone: normalize(draft.mobile_phone) || null,
          relationship_status: normalize(draft.relationship_status) || 'new',
          notes: sourceNotes || null,
          source: 'photo_intake',
          updated_at: now,
          ...intakeMeta,
        };

        const { error } = await supabase.from('bd_contacts').insert(payload);
        if (error) throw error;
      } else {
        if (item.overwriteExisting) {
          const payload: Record<string, any> = {
            company_id: companyId,
            full_name: contactFullName,
            first_name: normalize(draft.contact_first_name) || null,
            last_name: normalize(draft.contact_last_name) || null,
            job_title: normalize(draft.occupation_title) || null,
            email: normalize(draft.email) || null,
            phone: normalize(draft.direct_phone) || null,
            mobile_phone: normalize(draft.mobile_phone) || null,
            relationship_status: normalize(draft.relationship_status) || existing.relationship_status || 'new',
            notes: sourceNotes || existing.notes || null,
            updated_at: now,
            ...intakeMeta,
          };

          const { error } = await supabase.from('bd_contacts').update(payload).eq('id', existing.id);
          if (error) throw error;
        } else if (item.saveMode === 'merge_if_empty') {
          const patch = mergeIfEmpty(existing, draft, companyId);
          const payload: Record<string, any> = { ...patch, updated_at: now, ...intakeMeta };
          const keys = Object.keys(payload).filter(k => payload[k] !== undefined);
          if (keys.length > 0) {
            const { error } = await supabase.from('bd_contacts').update(payload).eq('id', existing.id);
            if (error) throw error;
          }
        } else {
          // "create_new" but duplicates exist: avoid creating a second record silently.
          throw new Error('Duplicate contact detected. Disable duplicate signals or enable overwrite to update the existing record.');
        }
      }

      setItems(prev =>
        prev.map(p =>
          p.id === id
            ? { ...p, status: 'Saved', statusDetail: 'Saved to BD Relationships', saving: false }
            : p
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setItems(prev =>
        prev.map(p => (p.id === id ? { ...p, saving: false, status: 'Failed', error: message } : p))
      );
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="BD"
        title="BD Photo Intake"
        description="Upload screenshots of legacy CRM records, business cards, or notes. Extract structured relationship data, review it, and save to BD Relationships."
        actions={
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <UploadCloud size={16} />
            Upload Photos
          </button>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => onPickFiles(e.target.files)}
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MetricTile label="Uploaded" value={summary.Uploaded} />
            <MetricTile label="Needs Review" value={summary['Needs Review']} tone="amber" />
            <MetricTile label="Saved" value={summary.Saved} tone="emerald" />
            <MetricTile label="Failed" value={summary.Failed} tone="red" />
          </div>

          <Panel padded={false}>
            <SectionHeader
              title="Upload Queue"
              description="Select a photo to review extraction. Nothing is saved automatically."
              meta={
                <Badge tone="slate">
                  {items.length} photo{items.length === 1 ? '' : 's'}
                </Badge>
              }
            />
            <div className="border-t border-slate-200/70">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200/70">
                    <ImageIcon size={18} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">No photos uploaded</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Upload screenshots or photos and review the extracted company/contact fields before saving.
                  </p>
                </div>
              ) : (
                <div className="max-h-[70vh] overflow-auto p-2">
                  <div className="space-y-2">
                    {items.map((it) => {
                      const isSelected = it.id === selectedId;
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => setSelectedId(it.id)}
                          className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                            isSelected
                              ? 'border-slate-300 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]'
                              : 'border-slate-200/70 bg-white/70 hover:bg-white'
                          }`}
                        >
                          <img
                            src={it.previewUrl}
                            alt={it.file.name}
                            className="h-12 w-12 rounded-lg object-cover ring-1 ring-inset ring-slate-200/70"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900">{it.file.name}</p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeItem(it.id);
                                }}
                                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                title="Remove"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge tone={statusTone(it.status) as any}>{it.status}</Badge>
                              {it.extraction?.source ? (
                                <Badge tone="blue">{it.extraction.source === 'gemini_vision' ? 'gemini_vision' : 'mock'}</Badge>
                              ) : null}
                              {it.saving ? <Badge tone="amber">Saving</Badge> : null}
                              {it.error ? <Badge tone="red">Error</Badge> : null}
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                              {it.statusDetail ?? ''}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <Panel>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Review Panel
                </p>
                <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-950">
                  {selected ? selected.file.name : 'Select a photo'}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Run extraction, review the structured fields, then save into Companies + BD Contacts. Duplicate signals are flagged before saving.
                </p>
              </div>
              {selected ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => runExtraction(selected.id)}
                    disabled={selected.status === 'Processing' || selected.saving}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {selected.status === 'Processing' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    {selected.status === 'Processing' ? 'Processing' : 'Run Extraction'}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveToRelationships(selected.id)}
                    disabled={!selected.draft || selected.saving || selected.status === 'Processing'}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {selected.saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save to BD Relationships
                  </button>
                </div>
              ) : null}
            </div>

            {selected?.error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={16} className="mt-0.5 text-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Action failed</p>
                    <p className="mt-1 text-xs leading-relaxed text-red-700">{selected.error}</p>
                    <p className="mt-2 text-[11px] text-red-700/80">
                      If this is a Storage bucket issue, ensure the bucket `bd-photo-intake` exists and has read/write rules for authenticated users.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {!selected ? (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-slate-800">No photo selected</p>
                <p className="mt-1 text-xs text-slate-500">Choose a photo in the queue to extract and review.</p>
              </div>
            ) : selected.status === 'Uploaded' ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
                  <img
                    src={selected.previewUrl}
                    alt="Selected upload"
                    className="w-full rounded-lg object-contain bg-slate-50 ring-1 ring-inset ring-slate-200/70"
                  />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                  <p className="text-sm font-semibold text-slate-900">Ready to extract</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Click <span className="font-semibold text-slate-700">Run Extraction</span> to generate structured company/contact fields. This phase uses a mock extractor so the UI/data flow can be validated.
                  </p>
                  <div className="mt-4 rounded-lg border border-slate-200/70 bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Status</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">Uploaded</p>
                    <p className="mt-1 text-xs text-slate-500">No extraction has been run yet.</p>
                  </div>
                </div>
              </div>
            ) : selected.status === 'Processing' ? (
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-white/70 px-4 py-5">
                <Loader2 size={18} className="animate-spin text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Processing photo</p>
                  <p className="mt-0.5 text-xs text-slate-500">Uploading and extracting structured BD relationship fields...</p>
                </div>
              </div>
            ) : selected.draft ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white/70 p-3">
                    <img
                      src={selected.previewUrl}
                      alt="Selected upload"
                      className="w-full rounded-lg object-contain bg-slate-50 ring-1 ring-inset ring-slate-200/70"
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(selected.status) as any}>{selected.status}</Badge>
                      {selected.extraction ? (
                        <Badge tone="slate">
                          Confidence {Math.round((selected.extraction.confidence ?? 0) * 100)}%
                        </Badge>
                      ) : null}
                      {selected.extraction?.source ? (
                        <Badge tone="blue">{selected.extraction.source === 'gemini_vision' ? 'gemini_vision' : 'mock'}</Badge>
                      ) : null}
                      {selected.uploadedPublicUrl ? (
                        <Badge tone="blue">Stored</Badge>
                      ) : selected.uploadedPath ? (
                        <Badge tone="blue">Stored (private)</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="lg:col-span-7 space-y-3">
                    {(selected.duplicateWarning?.companyMatches?.length ?? 0) > 0 ||
                    (selected.duplicateWarning?.contactMatches?.length ?? 0) > 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle size={16} className="mt-0.5 text-amber-700" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-amber-900">Potential duplicates detected</p>
                            <p className="mt-1 text-xs leading-relaxed text-amber-800">
                              Terrer found possible matches by email/phone or company + name. Saving will default to merging only empty fields unless you explicitly enable overwrite.
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {(selected.duplicateWarning?.companyMatches?.length ?? 0) > 0 ? (
                                <Badge tone="amber">{selected.duplicateWarning!.companyMatches.length} company match(es)</Badge>
                              ) : null}
                              {(selected.duplicateWarning?.contactMatches?.length ?? 0) > 0 ? (
                                <Badge tone="amber">{selected.duplicateWarning!.contactMatches.length} contact match(es)</Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="mt-0.5 text-emerald-700" />
                          <div>
                            <p className="text-sm font-semibold text-emerald-900">No duplicates detected</p>
                            <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                              This record looks safe to save as a new company/contact (subject to database policies).
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Save Mode
                      </p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() =>
                            setItems(prev =>
                              prev.map(p =>
                                p.id === selected.id ? { ...p, saveMode: 'merge_if_empty', overwriteExisting: false } : p
                              )
                            )
                          }
                          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                            selected.saveMode === 'merge_if_empty'
                              ? 'border-slate-300 bg-white text-slate-950'
                              : 'border-slate-200 bg-white/60 text-slate-700 hover:bg-white'
                          }`}
                        >
                          Merge empty fields
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setItems(prev =>
                              prev.map(p => (p.id === selected.id ? { ...p, overwriteExisting: true } : p))
                            )
                          }
                          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                            selected.overwriteExisting
                              ? 'border-amber-300 bg-amber-50 text-amber-900'
                              : 'border-slate-200 bg-white/60 text-slate-700 hover:bg-white'
                          }`}
                        >
                          Overwrite existing fields
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Default behavior is safe: do not overwrite existing contact data unless you explicitly enable overwrite.
                      </p>
                    </div>
                  </div>
                </div>

                <Panel padded={false}>
                  <SectionHeader
                    title="Extracted Fields (Editable)"
                    description="Review and edit before saving. This Phase 1 extractor is mocked, but the UI is wired for future Vision OCR."
                  />
                  <div className="border-t border-slate-200/70 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Company Name" value={selected.draft.company_name} onChange={(v) => updateDraft(selected.id, { company_name: v })} />
                      <Field label="Company Status" value={selected.draft.company_status} onChange={(v) => updateDraft(selected.id, { company_status: v })} placeholder="target / active / tier1 / ..." />
                      <Field label="Contact Full Name" value={selected.draft.contact_full_name} onChange={(v) => updateDraft(selected.id, { contact_full_name: v })} />
                      <Field label="First Name" value={selected.draft.contact_first_name} onChange={(v) => updateDraft(selected.id, { contact_first_name: v })} />
                      <Field label="Last Name" value={selected.draft.contact_last_name} onChange={(v) => updateDraft(selected.id, { contact_last_name: v })} />
                      <Field label="Title" value={selected.draft.occupation_title} onChange={(v) => updateDraft(selected.id, { occupation_title: v })} />
                      <Field label="Email" value={selected.draft.email} onChange={(v) => updateDraft(selected.id, { email: v })} />
                      <Field label="Direct Phone" value={selected.draft.direct_phone} onChange={(v) => updateDraft(selected.id, { direct_phone: v })} />
                      <Field label="Mobile Phone" value={selected.draft.mobile_phone} onChange={(v) => updateDraft(selected.id, { mobile_phone: v })} />
                      <Field label="Address" value={selected.draft.address} onChange={(v) => updateDraft(selected.id, { address: v })} />
                      <Field label="Source System ID" value={selected.draft.source_system_id} onChange={(v) => updateDraft(selected.id, { source_system_id: v })} />
                      <Field label="Relationship Status" value={selected.draft.relationship_status} onChange={(v) => updateDraft(selected.id, { relationship_status: v })} placeholder="new / active / ..." />
                      <Field label="Legacy Created By" value={selected.draft.created_by_legacy} onChange={(v) => updateDraft(selected.id, { created_by_legacy: v })} />
                      <Field label="Legacy Date Added" value={selected.draft.legacy_date_added} onChange={(v) => updateDraft(selected.id, { legacy_date_added: v })} placeholder="ISO date/time preferred" />
                      <Field label="Jobs Count" value={selected.draft.jobs_count} onChange={(v) => updateDraft(selected.id, { jobs_count: v })} />
                      <Field label="Submissions Count" value={selected.draft.submissions_count} onChange={(v) => updateDraft(selected.id, { submissions_count: v })} />
                      <Field label="Client Submissions Count" value={selected.draft.client_submissions_count} onChange={(v) => updateDraft(selected.id, { client_submissions_count: v })} />
                      <Field label="Interviews Count" value={selected.draft.interviews_count} onChange={(v) => updateDraft(selected.id, { interviews_count: v })} />
                      <Field label="Placements Count" value={selected.draft.placements_count} onChange={(v) => updateDraft(selected.id, { placements_count: v })} />
                    </div>

                    <div className="mt-3">
                      <TextAreaField
                        label="Source Notes"
                        value={selected.draft.source_notes}
                        onChange={(v) => updateDraft(selected.id, { source_notes: v })}
                        rows={4}
                      />
                    </div>
                  </div>
                </Panel>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-slate-800">No extracted fields</p>
                <p className="mt-1 text-xs text-slate-500">Run extraction to generate editable structured fields.</p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
}) {
  return (
    <label className="space-y-1 block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
      />
    </label>
  );
}
