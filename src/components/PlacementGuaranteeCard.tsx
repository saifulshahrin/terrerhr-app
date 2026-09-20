import { useEffect, useState } from 'react';
import { BadgeAlert, ShieldCheck } from 'lucide-react';
import {
  fetchPlacementGuaranteeTracker,
  fetchReplacementClaim,
  savePlacementGuaranteeCheckins,
  saveReplacementClaim,
  type PlacementGuaranteeTracker,
  type ReplacementClaim,
} from '../lib/placementGuarantee';

type CheckinForm = {
  day7_completed_on: string; day7_evidence_ref: string; day7_outcome: string;
  day30_completed_on: string; day30_evidence_ref: string; day30_outcome: string;
  day45_completed_on: string; day45_evidence_ref: string; day45_outcome: string;
};

const blankCheckins: CheckinForm = {
  day7_completed_on: '', day7_evidence_ref: '', day7_outcome: '',
  day30_completed_on: '', day30_evidence_ref: '', day30_outcome: '',
  day45_completed_on: '', day45_evidence_ref: '', day45_outcome: '',
};

function toCheckinForm(tracker: PlacementGuaranteeTracker): CheckinForm {
  return {
    day7_completed_on: tracker.day7_completed_on ?? '', day7_evidence_ref: tracker.day7_evidence_ref ?? '', day7_outcome: tracker.day7_outcome ?? '',
    day30_completed_on: tracker.day30_completed_on ?? '', day30_evidence_ref: tracker.day30_evidence_ref ?? '', day30_outcome: tracker.day30_outcome ?? '',
    day45_completed_on: tracker.day45_completed_on ?? '', day45_evidence_ref: tracker.day45_evidence_ref ?? '', day45_outcome: tracker.day45_outcome ?? '',
  };
}

function formatDate(value: string) {
  return new Date(value + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

function checkinState(due: string, completed: string) {
  if (completed) return 'complete';
  const today = new Date().toISOString().slice(0, 10);
  return due < today ? 'overdue' : due === today ? 'today' : 'upcoming';
}

export default function PlacementGuaranteeCard({ submissionId }: { submissionId: string }) {
  const [tracker, setTracker] = useState<PlacementGuaranteeTracker | null>(null);
  const [claim, setClaim] = useState<ReplacementClaim | null>(null);
  const [form, setForm] = useState<CheckinForm>(blankCheckins);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimDraft, setClaimDraft] = useState({
    claim_status: 'reported' as ReplacementClaim['claim_status'],
    reported_at: new Date().toISOString().slice(0, 10),
    reason: '', client_evidence_ref: '', decision_at: '', decision_evidence_ref: '', resolution_evidence_ref: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setTracker(null); setClaim(null); setForm(blankCheckins); setClaimOpen(false); setError(null);
    void fetchPlacementGuaranteeTracker(submissionId)
      .then(async next => {
        if (!active) return;
        setTracker(next);
        if (next) {
          setForm(toCheckinForm(next));
          const savedClaim = await fetchReplacementClaim(next.id);
          if (!active) return;
          setClaim(savedClaim);
          if (savedClaim) setClaimDraft({
            claim_status: savedClaim.claim_status, reported_at: savedClaim.reported_at, reason: savedClaim.reason,
            client_evidence_ref: savedClaim.client_evidence_ref, decision_at: savedClaim.decision_at ?? '',
            decision_evidence_ref: savedClaim.decision_evidence_ref ?? '', resolution_evidence_ref: savedClaim.resolution_evidence_ref ?? '',
          });
        }
      })
      .catch(loadError => { if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load guarantee tracker.'); });
    return () => { active = false; };
  }, [submissionId]);

  const saveCheckins = async () => {
    if (!tracker) return;
    setBusy(true); setError(null);
    try {
      const saved = await savePlacementGuaranteeCheckins(tracker.id, Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value.trim() || null])
      ) as CheckinForm);
      setTracker(saved); setForm(toCheckinForm(saved));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save check-ins.');
    } finally { setBusy(false); }
  };

  const saveClaim = async () => {
    if (!tracker) return;
    setBusy(true); setError(null);
    try {
      const saved = await saveReplacementClaim({
        guarantee_tracker_id: tracker.id,
        claim_status: claimDraft.claim_status,
        reported_at: claimDraft.reported_at,
        reason: claimDraft.reason.trim(),
        client_evidence_ref: claimDraft.client_evidence_ref.trim(),
        decision_at: claimDraft.decision_at || null,
        decision_evidence_ref: claimDraft.decision_evidence_ref.trim() || null,
        resolution_evidence_ref: claimDraft.resolution_evidence_ref.trim() || null,
      });
      setClaim(saved); setClaimOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save replacement claim.');
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-slate-500" /><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">60-Day Guarantee</p></div>
          <p className="mt-1 text-sm font-semibold text-slate-900">{tracker ? `${tracker.guarantee_reference} · ends ${formatDate(tracker.guarantee_end_date)}` : 'Starts after confirmed start'}</p>
        </div>
        {tracker ? <button type="button" onClick={() => setClaimOpen(value => !value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold">{claim ? 'View claim' : 'Replacement claim'}</button> : null}
      </div>

      {!tracker ? <p className="mt-2 text-xs text-amber-700">Confirm the candidate’s start first. The tracker will then be created automatically from the agreed guarantee term.</p> : (
        <>
          <p className="mt-2 text-xs text-slate-600">Check-ins due: Day 7 {formatDate(tracker.day7_due_on)} · Day 30 {formatDate(tracker.day30_due_on)} · Day 45 {formatDate(tracker.day45_due_on)}</p>
          <div className="mt-3 space-y-3">
            {([
              ['Day 7', 'day7', tracker.day7_due_on],
              ['Day 30', 'day30', tracker.day30_due_on],
              ['Day 45', 'day45', tracker.day45_due_on],
            ] as const).map(([label, key, due]) => {
              const completionKey = `${key}_completed_on` as keyof CheckinForm;
              const evidenceKey = `${key}_evidence_ref` as keyof CheckinForm;
              const outcomeKey = `${key}_outcome` as keyof CheckinForm;
              const state = checkinState(due, form[completionKey]);
              return <div key={key} className="rounded-lg border border-slate-200 p-2.5">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-700">{label} check-in</p><span className={`text-[11px] font-semibold ${state === 'complete' ? 'text-emerald-700' : state === 'overdue' ? 'text-red-700' : 'text-slate-500'}`}>{state === 'complete' ? 'Recorded' : state === 'overdue' ? 'Overdue' : `Due ${formatDate(due)}`}</span></div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[130px_1fr]">
                  <input type="date" value={form[completionKey]} onChange={e => setForm(current => ({ ...current, [completionKey]: e.target.value }))} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
                  <input value={form[evidenceKey]} onChange={e => setForm(current => ({ ...current, [evidenceKey]: e.target.value }))} placeholder="Evidence / reference" className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
                </div>
                <input value={form[outcomeKey]} onChange={e => setForm(current => ({ ...current, [outcomeKey]: e.target.value }))} placeholder="Outcome / notes" className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
              </div>;
            })}
          </div>
          <button type="button" disabled={busy} onClick={() => void saveCheckins()} className="mt-3 w-full rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Save check-ins'}</button>
        </>
      )}

      {tracker && claimOpen ? <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
        <div className="flex items-center gap-2"><BadgeAlert size={14} className="text-red-600" /><p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Replacement claim</p>{claim ? <span className="text-xs text-slate-500">{claim.claim_reference}</span> : null}</div>
        <select value={claimDraft.claim_status} onChange={e => setClaimDraft(current => ({ ...current, claim_status: e.target.value as ReplacementClaim['claim_status'] }))} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
          <option value="reported">Reported</option><option value="accepted">Accepted</option><option value="declined">Declined</option><option value="replacement_in_progress">Replacement in progress</option><option value="resolved">Resolved</option><option value="withdrawn">Withdrawn</option>
        </select>
        <input type="date" value={claimDraft.reported_at} onChange={e => setClaimDraft(current => ({ ...current, reported_at: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
        <input value={claimDraft.reason} onChange={e => setClaimDraft(current => ({ ...current, reason: e.target.value }))} placeholder="Claim reason (required)" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
        <input value={claimDraft.client_evidence_ref} onChange={e => setClaimDraft(current => ({ ...current, client_evidence_ref: e.target.value }))} placeholder="Client evidence / reference (required)" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
        <div className="grid grid-cols-2 gap-2"><input type="date" value={claimDraft.decision_at} onChange={e => setClaimDraft(current => ({ ...current, decision_at: e.target.value }))} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" /><input value={claimDraft.decision_evidence_ref} onChange={e => setClaimDraft(current => ({ ...current, decision_evidence_ref: e.target.value }))} placeholder="Decision evidence" className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" /></div>
        <input value={claimDraft.resolution_evidence_ref} onChange={e => setClaimDraft(current => ({ ...current, resolution_evidence_ref: e.target.value }))} placeholder="Resolution evidence" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
        <button type="button" disabled={busy} onClick={() => void saveClaim()} className="w-full rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : claim ? 'Update claim' : 'Open replacement claim'}</button>
      </div> : null}
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
