import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type RunRow = {
  id: string;
  created_at: string | null;
  run_timestamp: string | null;
  mode: string | null;
  job_title: string | null;
  skills: string | null;
  location: string | null;
  seniority: string | null;
  total_candidates: number | null;
  strategy_count: number | null;
  best_strategy: string | null;
  weakest_strategy: string | null;
  query_quality_label: string | null;
  next_run_priority: string | null;
  recommended_next_search_focus: string | null;
  recommended_query_adjustments: unknown | null;
  winning_variant: string | null;
  reason_winning_variant: string | null;
  recommended_next_action: string | null;
  run_status: string | null;
  recruiter_report_path: string | null;
  candidates_path: string | null;
  agent_report_path: string | null;
  strategy_refinement_path: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function stringifySkills(skills: string | null | undefined) {
  if (!skills) return '—';
  return skills;
}

function toBulletItems(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map(v => (typeof v === 'string' ? v : JSON.stringify(v)))
      .map(v => v.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return [];
    return [s];
  }
  if (typeof value === 'object') {
    try {
      const entries = Object.entries(value as Record<string, unknown>);
      return entries
        .map(([k, v]) => {
          if (v == null) return `${k}: —`;
          if (typeof v === 'string') return `${k}: ${v}`;
          if (typeof v === 'number' || typeof v === 'boolean') return `${k}: ${String(v)}`;
          return `${k}: ${JSON.stringify(v)}`;
        })
        .slice(0, 12);
    } catch {
      return [String(value)];
    }
  }
  return [String(value)];
}

function badgeForRunStatus(status: string | null | undefined) {
  const s = (status ?? '').toLowerCase();
  if (s === 'completed') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (s === 'partial_failed') return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200';
  if (s === 'failed') return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
  return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
}

function badgeForQuality(label: string | null | undefined) {
  const s = (label ?? '').toLowerCase();
  if (['strong', 'good', 'high'].includes(s)) return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (['weak', 'low', 'poor'].includes(s)) return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
  if (['medium', 'moderate', 'unknown'].includes(s)) return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200';
  return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
}

function pill(label: string, className: string) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

export default function AutonomousRecruiterRuns() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: qErr } = await supabase
          .from('autonomous_recruiter_runs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(25);

        if (qErr) throw qErr;
        if (cancelled) return;

        const rows = (data ?? []) as RunRow[];
        setRuns(rows);
        setSelectedId(rows[0]?.id ?? null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load autonomous recruiter runs.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => runs.find(r => r.id === selectedId) ?? null,
    [runs, selectedId],
  );

  const summary = useMemo(() => {
    const totalRuns = runs.length;
    const completedRuns = runs.filter(r => (r.run_status ?? '').toLowerCase() === 'completed').length;
    const latest = runs[0] ?? null;
    const latestTotalCandidates = latest?.total_candidates ?? null;
    const latestWinnerOrBest =
      (latest?.mode ?? '').toLowerCase() === 'batch_experiment'
        ? latest?.winning_variant ?? '—'
        : latest?.best_strategy ?? '—';

    return { totalRuns, completedRuns, latestTotalCandidates, latestWinnerOrBest };
  }, [runs]);

  const latest = runs[0] ?? null;
  const totalCandidatesAllRuns = useMemo(
    () => runs.reduce((acc, r) => acc + (typeof r.total_candidates === 'number' ? r.total_candidates : 0), 0),
    [runs],
  );

  const latestIntelligence = useMemo(() => {
    if (!latest) return null;
    const nextMove = latest.recommended_next_search_focus ?? latest.recommended_next_action ?? '—';
    const priority = latest.next_run_priority ?? '—';
    const best = latest.best_strategy ?? '—';
    const weak = latest.weakest_strategy ?? '—';
    return { best, weak, nextMove, priority };
  }, [latest]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Autonomous Recruiter</h1>
            <p className="mt-1 text-sm text-gray-600">
              AI sourcing experiments, strategy quality, and next sourcing moves
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {latest?.run_status ? pill(latest.run_status, badgeForRunStatus(latest.run_status)) : null}
              {latest?.query_quality_label
                ? pill(`quality: ${latest.query_quality_label}`, badgeForQuality(latest.query_quality_label))
                : null}
              <span className="text-xs text-gray-500">
                Latest run: {formatDate(latest?.created_at ?? latest?.run_timestamp ?? null)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {latest?.mode ? pill(`mode: ${latest.mode}`, 'bg-gray-50 text-gray-700 ring-1 ring-gray-200') : null}
            {latest?.job_title ? pill(latest.job_title, 'bg-blue-50 text-blue-800 ring-1 ring-blue-200') : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total runs</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.totalRuns}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Completed runs</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.completedRuns}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Candidates discovered</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {totalCandidatesAllRuns || 0}
          </p>
          <p className="mt-1 text-xs text-gray-500">Latest: {summary.latestTotalCandidates ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Latest quality</p>
          <div className="mt-2 flex items-center gap-2">
            {latest?.query_quality_label ? pill(latest.query_quality_label, badgeForQuality(latest.query_quality_label)) : pill('—', 'bg-gray-50 text-gray-700 ring-1 ring-gray-200')}
            <span className="text-xs text-gray-500">Winner/best: {summary.latestWinnerOrBest}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Latest Sourcing Intelligence</p>
            <p className="mt-1 text-xs text-gray-500">Best/weakest signals and the next sourcing move.</p>
          </div>
          {latest?.id ? (
            <button
              type="button"
              onClick={() => setSelectedId(latest.id)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Open latest run
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Best strategy</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{latestIntelligence?.best ?? '—'}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Weakest strategy</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{latestIntelligence?.weak ?? '—'}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Next move</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{latestIntelligence?.nextMove ?? '—'}</p>
            <p className="mt-1 text-xs text-gray-500">Priority: {latestIntelligence?.priority ?? '—'}</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Loading autonomous recruiter runs…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && runs.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          No autonomous recruiter runs yet.
        </div>
      )}

      {!loading && !error && runs.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white lg:col-span-2">
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="text-sm font-semibold text-gray-900">Runs</p>
              <p className="mt-1 text-xs text-gray-500">Select a run to review strategy quality and next moves.</p>
            </div>
            <div className="space-y-3 p-4">
              {runs.map(r => {
                const isSelected = r.id === selectedId;
                const created = r.created_at ?? r.run_timestamp;
                const title = r.job_title ?? 'Untitled role';
                const skills = stringifySkills(r.skills);
                const candidates = typeof r.total_candidates === 'number' ? r.total_candidates : null;

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                      isSelected
                        ? 'border-blue-200 bg-blue-50/40'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{title}</p>
                          {r.mode ? pill(r.mode, 'bg-gray-50 text-gray-700 ring-1 ring-gray-200') : null}
                          {r.run_status ? pill(r.run_status, badgeForRunStatus(r.run_status)) : null}
                          {r.query_quality_label
                            ? pill(r.query_quality_label, badgeForQuality(r.query_quality_label))
                            : null}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{formatDate(created)}</p>
                        <p className="mt-2 text-xs text-gray-600">
                          <span className="font-semibold text-gray-700">Skills:</span>{' '}
                          <span className="inline-block max-w-[40rem] align-bottom">{skills}</span>
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                        <div className="rounded-xl bg-gray-50 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Candidates</p>
                          <p className="mt-0.5 text-sm font-semibold text-gray-900">{candidates ?? '—'}</p>
                        </div>
                        {r.next_run_priority ? (
                          <div className="rounded-xl bg-gray-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Next</p>
                            <p className="mt-0.5 text-sm font-semibold text-gray-900">{r.next_run_priority}</p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="text-sm font-semibold text-gray-900">Run Detail</p>
              <p className="mt-1 text-xs text-gray-500">Job brief, strategy performance, next move, artifacts.</p>
            </div>
            <div className="space-y-5 px-5 py-5 text-sm">
              {!selected ? (
                <p className="text-gray-600">Select a run to view details.</p>
              ) : (
                <>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Job brief</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {selected.run_status ? pill(selected.run_status, badgeForRunStatus(selected.run_status)) : null}
                        {selected.query_quality_label
                          ? pill(selected.query_quality_label, badgeForQuality(selected.query_quality_label))
                          : null}
                      </div>
                    </div>
                    <p className="mt-2 text-base font-semibold text-gray-900">{selected.job_title ?? '—'}</p>
                    <p className="mt-1 text-sm text-gray-600">{stringifySkills(selected.skills)}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      {selected.location ?? '—'}{selected.seniority ? ` • ${selected.seniority}` : ''}{' '}
                      {selected.mode ? ` • ${selected.mode}` : ''}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Candidates</p>
                      <p className="mt-1 text-base font-semibold text-gray-900">
                        {selected.total_candidates ?? '—'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quality</p>
                      <p className="mt-1 text-base font-semibold text-gray-900">
                        {selected.query_quality_label ?? '—'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Strategy performance</p>
                    <div className="mt-2 space-y-2">
                      <p className="text-gray-900">
                        Best strategy:{' '}
                        <span className="font-semibold">{selected.best_strategy ?? '—'}</span>
                      </p>
                      <p className="text-gray-900">
                        Weakest strategy:{' '}
                        <span className="font-semibold">{selected.weakest_strategy ?? '—'}</span>
                      </p>
                      {selected.winning_variant ? (
                        <p className="text-gray-900">
                          Winning variant:{' '}
                          <span className="font-semibold">{selected.winning_variant}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Next sourcing move</p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {selected.recommended_next_search_focus ?? selected.recommended_next_action ?? '—'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Priority: {selected.next_run_priority ?? '—'}</p>
                    {selected.reason_winning_variant ? (
                      <p className="mt-2 text-xs text-gray-600">{selected.reason_winning_variant}</p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recommended query adjustments</p>
                    {toBulletItems(selected.recommended_query_adjustments).length === 0 ? (
                      <p className="mt-2 text-sm text-gray-600">—</p>
                    ) : (
                      <ul className="mt-2 space-y-1.5 text-sm text-gray-800">
                        {toBulletItems(selected.recommended_query_adjustments).map((item, idx) => (
                          <li key={`${item}-${idx}`} className="flex gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                            <span className="min-w-0 break-words">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recommended next action</p>
                    <p className="mt-2 text-sm text-gray-900">{selected.recommended_next_action ?? '—'}</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Artifacts</p>
                    <div className="mt-2 space-y-1 text-xs text-gray-700">
                      <p className="break-words">Recruiter report: {selected.recruiter_report_path ?? '—'}</p>
                      <p className="break-words">Candidates: {selected.candidates_path ?? '—'}</p>
                      <p className="break-words">Agent report: {selected.agent_report_path ?? '—'}</p>
                      <p className="break-words">Refinement: {selected.strategy_refinement_path ?? '—'}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
