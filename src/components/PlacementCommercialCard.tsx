import { useEffect, useState } from 'react';
import { Briefcase, CircleCheck, ReceiptText } from 'lucide-react';
import {
  fetchPlacementCommercialRecord,
  savePlacementCommercialRecord,
  type PlacementCommercialRecord,
} from '../lib/placementCommercialRecords';

type FormValues = {
  offer_made_at: string;
  offer_accepted_at: string;
  offer_evidence_ref: string;
  start_date: string;
  start_confirmed_at: string;
  start_evidence_ref: string;
  invoice_number: string;
  invoice_issued_at: string;
  invoice_due_date: string;
  invoice_amount: string;
  invoice_evidence_ref: string;
  payment_received_at: string;
  payment_cleared_at: string;
  payment_amount: string;
  payment_evidence_ref: string;
};

const emptyForm: FormValues = {
  offer_made_at: '',
  offer_accepted_at: '',
  offer_evidence_ref: '',
  start_date: '',
  start_confirmed_at: '',
  start_evidence_ref: '',
  invoice_number: '',
  invoice_issued_at: '',
  invoice_due_date: '',
  invoice_amount: '',
  invoice_evidence_ref: '',
  payment_received_at: '',
  payment_cleared_at: '',
  payment_amount: '',
  payment_evidence_ref: '',
};

function asDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

function toForm(record: PlacementCommercialRecord): FormValues {
  return {
    offer_made_at: asDateInput(record.offer_made_at),
    offer_accepted_at: asDateInput(record.offer_accepted_at),
    offer_evidence_ref: record.offer_evidence_ref ?? '',
    start_date: asDateInput(record.start_date),
    start_confirmed_at: asDateInput(record.start_confirmed_at),
    start_evidence_ref: record.start_evidence_ref ?? '',
    invoice_number: record.invoice_number ?? '',
    invoice_issued_at: asDateInput(record.invoice_issued_at),
    invoice_due_date: asDateInput(record.invoice_due_date),
    invoice_amount: record.invoice_amount === null ? '' : String(record.invoice_amount),
    invoice_evidence_ref: record.invoice_evidence_ref ?? '',
    payment_received_at: asDateInput(record.payment_received_at),
    payment_cleared_at: asDateInput(record.payment_cleared_at),
    payment_amount: record.payment_amount === null ? '' : String(record.payment_amount),
    payment_evidence_ref: record.payment_evidence_ref ?? '',
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function money(value: string): number | null {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

export default function PlacementCommercialCard({
  submissionId,
  candidateName,
  jobTitle,
  companyName,
}: {
  submissionId: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
}) {
  const [record, setRecord] = useState<PlacementCommercialRecord | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setRecord(null);
    setForm(emptyForm);
    setOpen(false);
    setError(null);

    void fetchPlacementCommercialRecord(submissionId)
      .then(next => {
        if (!active) return;
        setRecord(next);
        if (next) setForm(toForm(next));
      })
      .catch(loadError => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load placement record.');
      });

    return () => { active = false; };
  }, [submissionId]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await savePlacementCommercialRecord({
        submission_id: submissionId,
        offer_made_at: nullable(form.offer_made_at),
        offer_accepted_at: nullable(form.offer_accepted_at),
        offer_evidence_ref: nullable(form.offer_evidence_ref),
        start_date: nullable(form.start_date),
        start_confirmed_at: nullable(form.start_confirmed_at),
        start_evidence_ref: nullable(form.start_evidence_ref),
        invoice_number: nullable(form.invoice_number),
        invoice_issued_at: nullable(form.invoice_issued_at),
        invoice_due_date: nullable(form.invoice_due_date),
        invoice_amount: money(form.invoice_amount),
        invoice_evidence_ref: nullable(form.invoice_evidence_ref),
        payment_received_at: nullable(form.payment_received_at),
        payment_cleared_at: nullable(form.payment_cleared_at),
        payment_amount: money(form.payment_amount),
        payment_evidence_ref: nullable(form.payment_evidence_ref),
      });
      setRecord(saved);
      setForm(toForm(saved));
      setOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save placement record.');
    } finally {
      setBusy(false);
    }
  };

  const status = record?.commercial_status?.replace(/_/g, ' ') ?? 'Not recorded';

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BriefcaseBusiness size={14} className="text-slate-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Placement & Commercial Record</p>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {record ? `${record.placement_reference} · ${status}` : 'Not recorded'}
          </p>
          <p className="mt-1 text-xs text-slate-500">{candidateName} · {jobTitle} · {companyName}</p>
        </div>
        <button type="button" onClick={() => setOpen(value => !value)} className="rounded-lg bg-slate-950 px-2 py-1.5 text-xs font-semibold text-white">
          {record ? 'Update' : 'Set up'}
        </button>
      </div>

      {record?.commercial_status === 'payment_cleared' ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700"><CircleCheck size={13} /> Cleared payment evidence is recorded.</p>
      ) : record?.start_confirmed_at ? (
        <p className="mt-2 text-xs text-blue-700">Start is confirmed. Invoice and payment remain open.</p>
      ) : (
        <p className="mt-2 text-xs text-amber-700">Use this record to evidence offer, confirmed start, invoice and cleared payment.</p>
      )}

      {open ? (
        <div className="mt-3 space-y-4 border-t border-slate-200 pt-3">
          <section className="grid gap-2">
            <p className="text-xs font-semibold text-slate-700">Offer</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Offer made" type="date" value={form.offer_made_at} onChange={value => setForm(current => ({ ...current, offer_made_at: value }))} />
              <Field label="Offer accepted" type="date" value={form.offer_accepted_at} onChange={value => setForm(current => ({ ...current, offer_accepted_at: value }))} />
            </div>
            <Field label="Offer evidence / reference" value={form.offer_evidence_ref} onChange={value => setForm(current => ({ ...current, offer_evidence_ref: value }))} />
          </section>

          <section className="grid gap-2">
            <p className="text-xs font-semibold text-slate-700">Confirmed start</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Start date" type="date" value={form.start_date} onChange={value => setForm(current => ({ ...current, start_date: value }))} />
              <Field label="Start confirmed" type="date" value={form.start_confirmed_at} onChange={value => setForm(current => ({ ...current, start_confirmed_at: value }))} />
            </div>
            <Field label="Start evidence / reference" value={form.start_evidence_ref} onChange={value => setForm(current => ({ ...current, start_evidence_ref: value }))} />
          </section>

          <section className="grid gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"><ReceiptText size={13} /> Invoice</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Invoice number" value={form.invoice_number} onChange={value => setForm(current => ({ ...current, invoice_number: value }))} />
              <Field label="Invoice amount" type="number" value={form.invoice_amount} onChange={value => setForm(current => ({ ...current, invoice_amount: value }))} />
              <Field label="Issued date" type="date" value={form.invoice_issued_at} onChange={value => setForm(current => ({ ...current, invoice_issued_at: value }))} />
              <Field label="Due date" type="date" value={form.invoice_due_date} onChange={value => setForm(current => ({ ...current, invoice_due_date: value }))} />
            </div>
            <Field label="Invoice evidence / reference" value={form.invoice_evidence_ref} onChange={value => setForm(current => ({ ...current, invoice_evidence_ref: value }))} />
          </section>

          <section className="grid gap-2">
            <p className="text-xs font-semibold text-slate-700">Cleared payment</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Payment received" type="date" value={form.payment_received_at} onChange={value => setForm(current => ({ ...current, payment_received_at: value }))} />
              <Field label="Payment cleared" type="date" value={form.payment_cleared_at} onChange={value => setForm(current => ({ ...current, payment_cleared_at: value }))} />
              <Field label="Cleared amount" type="number" value={form.payment_amount} onChange={value => setForm(current => ({ ...current, payment_amount: value }))} />
            </div>
            <Field label="Payment evidence / reference" value={form.payment_evidence_ref} onChange={value => setForm(current => ({ ...current, payment_evidence_ref: value }))} />
          </section>

          {error ? <p className="text-xs text-red-700">{error}</p> : null}
          <button type="button" disabled={busy} onClick={() => void save()} className="w-full rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? 'Saving…' : 'Save placement record'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <input type={type} value={value} onChange={event => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
    </label>
  );
}
