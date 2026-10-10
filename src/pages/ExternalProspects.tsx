import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, HelpCircle, Search, UserPlus, XCircle } from 'lucide-react';
import { fetchExternalProspects, setProspectDecision, type ExternalProspect, type RecruiterDecision } from '../lib/externalProspects';

const decisionStyle: Record<RecruiterDecision, string> = {
  unreviewed: 'border-slate-200 bg-slate-50 text-slate-600',
  good: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  maybe: 'border-amber-200 bg-amber-50 text-amber-700',
  reject: 'border-rose-200 bg-rose-50 text-rose-700',
};

export default function ExternalProspects() {
  const [rows, setRows] = useState<ExternalProspect[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<RecruiterDecision | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [schemaReady, setSchemaReady] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setRows(await fetchExternalProspects());
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('external_prospects') || message.includes('schema cache') || message.includes('relation')) {
          setSchemaReady(false);
        } else {
          console.error(error);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(row => {
      if (status !== 'all' && row.recruiter_status !== status) return false;
      if (!q) return true;
      return [row.full_name, row.current_title, row.current_company, row.location, row.skills.join(' ')]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(q));
    });
  }, [rows, query, status]);

  const counts = useMemo(() => ({
    total: rows.length,
    good: rows.filter(row => row.recruiter_status === 'good').length,
    maybe: rows.filter(row => row.recruiter_status === 'maybe').length,
    reject: rows.filter(row => row.recruiter_status === 'reject').length,
  }), [rows]);

  async function decide(row: ExternalProspect, decision: RecruiterDecision) {
    setBusyId(row.prospect_id);
    try {
      await setProspectDecision(row.prospect_id, decision);
      setRows(current => current.map(item => item.prospect_id === row.prospect_id
        ? { ...item, recruiter_status: decision, engagement_status: decision === 'unreviewed' ? 'discovered' : 'reviewed' }
        : item));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Candidate Engine</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">External Prospect Pool</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            People discovered through sourcing are prospects first — not Terrer Candidates. Review, retain and reuse them before spending on enrichment or outreach.
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
          <span className="font-semibold">Lifecycle:</span> Discovered → Reviewed → Contacted → Responded → Terrer Candidate
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Prospects', counts.total],
          ['Good', counts.good],
          ['Maybe', counts.maybe],
          ['Rejected for this review', counts.reject],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search name, title, company, skill or location"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none ring-blue-500 focus:ring-2"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'unreviewed', 'good', 'maybe', 'reject'] as const).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${status === option ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {!schemaReady ? (
          <div className="p-8">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <p className="text-sm font-semibold text-amber-950">Preview UI is ready; production schema is not applied yet.</p>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-amber-800">
                This preview deliberately does not create fake candidates. The External Prospect migration will be applied only after this screen and workflow are approved for production.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="p-8 text-sm text-slate-500">Loading prospect pool…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <UserPlus className="mx-auto text-slate-300" size={30} />
            <p className="mt-3 text-sm font-semibold text-slate-800">No prospects in this view yet</p>
            <p className="mt-1 text-xs text-slate-500">Sourcing connectors will land lightweight profiles here before candidate promotion.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(row => (
              <div key={row.prospect_id} className="grid gap-4 p-4 lg:grid-cols-[minmax(260px,1.2fr)_minmax(240px,1fr)_minmax(260px,1fr)_auto] lg:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-950">{row.full_name}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${decisionStyle[row.recruiter_status]}`}>
                      {row.recruiter_status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{row.current_title || 'Title unknown'}{row.current_company ? ` · ${row.current_company}` : ''}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.location || 'Location unknown'} · {row.source_platform}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(row.skills ?? []).slice(0, 6).map(skill => (
                    <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{skill}</span>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Engagement</p>
                  <p className="mt-1 text-sm font-medium capitalize text-slate-700">{row.engagement_status.replace('_', ' ')}</p>
                  <p className="mt-1 text-xs text-slate-500">Enrich only when a recruiter decides the prospect is worth pursuing.</p>
                </div>
                <div className="flex gap-1.5">
                  <button disabled={busyId === row.prospect_id} onClick={() => void decide(row, 'good')} title="Good" className="rounded-lg border border-emerald-200 p-2 text-emerald-700 hover:bg-emerald-50"><CheckCircle2 size={17}/></button>
                  <button disabled={busyId === row.prospect_id} onClick={() => void decide(row, 'maybe')} title="Maybe" className="rounded-lg border border-amber-200 p-2 text-amber-700 hover:bg-amber-50"><HelpCircle size={17}/></button>
                  <button disabled={busyId === row.prospect_id} onClick={() => void decide(row, 'reject')} title="Reject for current review" className="rounded-lg border border-rose-200 p-2 text-rose-700 hover:bg-rose-50"><XCircle size={17}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
