import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { JobListRow } from '../lib/jobs';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';

type OrderStatus = 'draft' | 'pending_founder_approval' | 'approved';

type PlacementOrder = {
  id: string;
  order_number: string;
  approval_status: OrderStatus;
};

type FormValues = {
  authorised_contact_name: string;
  authorised_contact_title: string;
  authorised_contact_email: string;
  authorisation_channel: 'signed_agreement' | 'email' | 'whatsapp' | 'other';
  authorisation_evidence_ref: string;
  fee_model: 'percentage_of_annual_base_salary' | 'fixed_fee' | 'retained' | 'other';
  fee_value: string;
  payment_terms_days: string;
  guarantee_days: string;
  terms_evidence_ref: string;
};

const emptyForm: FormValues = {
  authorised_contact_name: '',
  authorised_contact_title: '',
  authorised_contact_email: '',
  authorisation_channel: 'email',
  authorisation_evidence_ref: '',
  fee_model: 'percentage_of_annual_base_salary',
  fee_value: '',
  payment_terms_days: '30',
  guarantee_days: '60',
  terms_evidence_ref: '',
};

const orderFields = 'id,order_number,approval_status';

function labelForStatus(status: OrderStatus) {
  return status.replace(/_/g, ' ');
}

export default function PlacementOrderCard({ job }: { job: JobListRow }) {
  const { canonicalRole } = useAuth();
  const [order, setOrder] = useState<PlacementOrder | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setOrder(null);
    setForm(emptyForm);
    setIsOpen(false);
    setError(null);

    void supabase
      .from('placement_job_orders')
      .select(orderFields)
      .eq('job_id', job.id)
      .in('approval_status', ['draft', 'pending_founder_approval', 'approved'])
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setError(loadError.message);
          return;
        }
        setOrder(data as PlacementOrder | null);
      });

    return () => { active = false; };
  }, [job.id]);

  function updateForm<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveDraft() {
    setIsBusy(true);
    setError(null);

    const { data, error: saveError } = await supabase
      .from('placement_job_orders')
      .insert({
        job_id: job.id,
        client_company_name: job.company_name,
        ...form,
        fee_value: Number(form.fee_value),
        payment_terms_days: Number(form.payment_terms_days),
        guarantee_days: Number(form.guarantee_days),
      })
      .select(orderFields)
      .single();

    setIsBusy(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setOrder(data as PlacementOrder);
    setIsOpen(false);
  }

  async function changeStatus(status: 'pending_founder_approval' | 'approved') {
    if (!order) return;

    setIsBusy(true);
    setError(null);

    const update = status === 'pending_founder_approval'
      ? { approval_status: status, terms_confirmed_at: new Date().toISOString() }
      : { approval_status: status };
    const { data, error: updateError } = await supabase
      .from('placement_job_orders')
      .update(update)
      .eq('id', order.id)
      .select(orderFields)
      .single();

    setIsBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setOrder(data as PlacementOrder);
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-slate-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Placement Order</p>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {order ? `${order.order_number} · ${labelForStatus(order.approval_status)}` : 'Not set up'}
          </p>
        </div>
        {!order && (
          <button onClick={() => setIsOpen((open) => !open)} className="rounded-lg bg-slate-950 px-2 py-1.5 text-xs font-semibold text-white">
            Set up
          </button>
        )}
      </div>

      {order?.approval_status === 'approved' ? (
        <p className="mt-2 text-xs text-emerald-700">Approved for placement. Client submission is enabled.</p>
      ) : (
        <p className="mt-2 text-xs text-amber-700">Client submission remains blocked until founder approval.</p>
      )}

      {order?.approval_status === 'draft' && (
        <button disabled={isBusy} onClick={() => void changeStatus('pending_founder_approval')} className="mt-3 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold">
          Request founder approval
        </button>
      )}
      {order?.approval_status === 'pending_founder_approval' && canonicalRole === 'admin' && (
        <button disabled={isBusy} onClick={() => void changeStatus('approved')} className="mt-3 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white">
          Approve order
        </button>
      )}

      {isOpen && (
        <div className="mt-3 grid gap-2 border-t pt-3">
          <Field label="Authorised contact" value={form.authorised_contact_name} onChange={(value) => updateForm('authorised_contact_name', value)} />
          <Field label="Contact title" value={form.authorised_contact_title} onChange={(value) => updateForm('authorised_contact_title', value)} />
          <Field label="Contact email" type="email" value={form.authorised_contact_email} onChange={(value) => updateForm('authorised_contact_email', value)} />
          <SelectField label="Authority evidence type" value={form.authorisation_channel} onChange={(value) => updateForm('authorisation_channel', value as FormValues['authorisation_channel'])} options={[['signed_agreement', 'Signed agreement'], ['email', 'Email'], ['whatsapp', 'WhatsApp'], ['other', 'Other']]} />
          <Field label="Authority evidence / reference" value={form.authorisation_evidence_ref} onChange={(value) => updateForm('authorisation_evidence_ref', value)} />
          <SelectField label="Fee model" value={form.fee_model} onChange={(value) => updateForm('fee_model', value as FormValues['fee_model'])} options={[['percentage_of_annual_base_salary', '% of annual base salary'], ['fixed_fee', 'Fixed fee'], ['retained', 'Retained'], ['other', 'Other']]} />
          <Field label="Fee value" type="number" value={form.fee_value} onChange={(value) => updateForm('fee_value', value)} />
          <Field label="Payment terms (days)" type="number" value={form.payment_terms_days} onChange={(value) => updateForm('payment_terms_days', value)} />
          <Field label="Guarantee (days)" type="number" value={form.guarantee_days} onChange={(value) => updateForm('guarantee_days', value)} />
          <Field label="Terms evidence / reference" value={form.terms_evidence_ref} onChange={(value) => updateForm('terms_evidence_ref', value)} />
          <button disabled={isBusy} onClick={() => void saveDraft()} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
            {isBusy ? 'Saving…' : 'Save draft order'}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}

function Field({ label, type = 'text', value, onChange }: { label: string; type?: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <input required type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}
