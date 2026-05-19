import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type RunRow = {
  id: string;
  created_at: string | null;
  run_timestamp: string | null;
  mode: string | null;
  iteration_mode?: boolean | null;
  iteration_count?: number | null;
  best_iteration?: number | null;
  stopping_reason?: string | null;
  iteration_summary?: unknown | null;
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
  recruiter_confidence_level: string | null;
  recruiter_confidence_score: number | null;
  sourcing_signal_summary: string | null;
  sourcing_signal_flags: unknown | null;
  sourcing_risk_flags: unknown | null;
  app_demo_summary?: unknown | null;
};

type MemoryRow = {
  id: string;
  created_at: string | null;
  memory_type: string | null;
  role_family: string | null;
  job_title: string | null;
  skills: string | null;
  location: string | null;
  successful_strategy: string | null;
  failed_strategy: string | null;
  recommended_query_pattern: string | null;
  recommended_next_move: string | null;
  recruiter_confidence_level: string | null;
  recruiter_confidence_score: number | null;
  sourcing_signal_flags: unknown | null;
  sourcing_risk_flags: unknown | null;
  total_candidates: number | null;
  successful_run: boolean | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function stringifySkills(skills: string | null | undefined) {
  if (!skills) return '-';
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
          if (v == null) return `${k}: -`;
          if (typeof v === 'string') return `${k}: ${v}`;
          if (typeof v === 'number' || typeof v === 'boolean') return `${k}: ${String(v)}`;
          return `${k}: ${JSON.stringify(v)}`;
        })
        .map(s => s.trim())
        .filter(Boolean)
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
  return 'bg-slate-50 text-slate-700 ring-1 ring-slate-200';
}

function badgeForQuality(label: string | null | undefined) {
  const s = (label ?? '').toLowerCase();
  if (['strong', 'good', 'high'].includes(s)) return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (['weak', 'low', 'poor'].includes(s)) return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
  if (['medium', 'moderate', 'unknown'].includes(s)) return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200';
  return 'bg-slate-50 text-slate-700 ring-1 ring-slate-200';
}

function badgeForConfidence(level: string | null | undefined) {
  const s = (level ?? '').toLowerCase();
  if (s === 'high') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (s === 'medium') return 'bg-sky-50 text-sky-800 ring-1 ring-sky-200';
  if (s === 'low') return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200';
  if (s === 'weak') return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
  return 'bg-slate-50 text-slate-700 ring-1 ring-slate-200';
}

function confidenceLabel(level: string | null | undefined) {
  const s = (level ?? '').toLowerCase();
  if (s === 'high') return 'High sourcing confidence';
  if (s === 'medium') return 'Moderate sourcing confidence';
  if (s === 'low') return 'Low sourcing confidence';
  if (s === 'weak') return 'Weak sourcing confidence';
  return 'Sourcing confidence';
}

function isAutoIterate(row: RunRow | null | undefined) {
  if (!row) return false;
  if (row.iteration_mode === true) return true;
  const mode = (row.mode ?? '').toLowerCase();
  return mode === 'auto_iterate' || mode === 'auto-iterate';
}

function getIterationRows(iterationSummary: unknown): Array<Record<string, unknown>> {
  if (!iterationSummary || typeof iterationSummary !== 'object') return [];
  const maybeIterations = (iterationSummary as Record<string, unknown>).iterations;
  if (!Array.isArray(maybeIterations)) return [];
  return maybeIterations.filter(v => v && typeof v === 'object') as Array<Record<string, unknown>>;
}

function pill(label: string, className: string) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

function TerrerCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        'rounded-2xl border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export default function AutonomousRecruiterRuns() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [memory, setMemory] = useState<MemoryRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAllRuns, setShowAllRuns] = useState(false);
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

        // Recruiter memory signals (read-only, for dashboard context)
        const { data: memData, error: memErr } = await supabase
          .from('autonomous_recruiter_memory')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (memErr) throw memErr;
        if (cancelled) return;
        setMemory((memData ?? []) as MemoryRow[]);
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

  const selected = useMemo(() => runs.find(r => r.id === selectedId) ?? null, [runs, selectedId]);
  const latest = runs[0] ?? null;

  const summary = useMemo(() => {
    const totalRuns = runs.length;
    const completedRuns = runs.filter(r => (r.run_status ?? '').toLowerCase() === 'completed').length;
    const latestTotalCandidates = latest?.total_candidates ?? null;
    const latestWinnerOrBest =
      (latest?.mode ?? '').toLowerCase() === 'batch_experiment'
        ? latest?.winning_variant ?? '-'
        : latest?.best_strategy ?? '-';

    return { totalRuns, completedRuns, latestTotalCandidates, latestWinnerOrBest };
  }, [runs, latest]);

  const totalCandidatesAllRuns = useMemo(
    () => runs.reduce((acc, r) => acc + (typeof r.total_candidates === 'number' ? r.total_candidates : 0), 0),
    [runs],
  );

  const latestSignal = useMemo(() => {
    if (!latest) return null;
    return {
      confidenceLevel: latest.recruiter_confidence_level ?? null,
      confidenceScore: typeof latest.recruiter_confidence_score === 'number' ? latest.recruiter_confidence_score : null,
      signalSummary: latest.sourcing_signal_summary ?? null,
      signalFlags: toBulletItems(latest.sourcing_signal_flags),
      riskFlags: toBulletItems(latest.sourcing_risk_flags),
    };
  }, [latest]);

  const memorySignals = useMemo(() => {
    const successfulPatterns = memory
      .filter(m => (m.successful_run === true) || (m.memory_type ?? '').toLowerCase().includes('success'))
      .map(m => (m.recommended_query_pattern || m.successful_strategy || '').trim())
      .filter(Boolean)
      .slice(0, 6);

    const nextMoves = memory
      .map(m => (m.recommended_next_move || '').trim())
      .filter(Boolean)
      .slice(0, 6);

    const riskFlagCounts = new Map<string, number>();
    for (const m of memory) {
      for (const item of toBulletItems(m.sourcing_risk_flags)) {
        riskFlagCounts.set(item, (riskFlagCounts.get(item) ?? 0) + 1);
      }
    }
    const repeatedRiskFlags = Array.from(riskFlagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([flag]) => flag);

    return { successfulPatterns, repeatedRiskFlags, nextMoves };
  }, [memory]);

  const selectedRunIndex = useMemo(() => {
    if (!selectedId) return -1;
    return runs.findIndex(r => r.id === selectedId);
  }, [runs, selectedId]);

  const mission = useMemo(() => {
    const run = selected ?? latest ?? null;
    if (!run) return null;

    const created = run.created_at ?? run.run_timestamp ?? null;
    const createdDate = created ? new Date(created) : null;
    const daysOpen =
      createdDate && !Number.isNaN(createdDate.getTime())
        ? Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)))
        : null;

    const priority = (run.next_run_priority ?? '').trim() || 'normal';
    const status = (run.run_status ?? '').trim() || 'unknown';
    const quality = (run.query_quality_label ?? '').trim() || null;
    const confidenceLevel = (run.recruiter_confidence_level ?? '').trim() || null;
    const confidenceScore = typeof run.recruiter_confidence_score === 'number' ? run.recruiter_confidence_score : null;
    const totalCandidates = typeof run.total_candidates === 'number' ? run.total_candidates : 0;

    const targetShortlist = 12;
    const progress = Math.max(0, Math.min(100, Math.round((totalCandidates / targetShortlist) * 100)));

    return {
      run,
      createdLabel: formatDate(created),
      daysOpen,
      priority,
      status,
      quality,
      confidenceLevel,
      confidenceScore,
      totalCandidates,
      targetShortlist,
      progress,
    };
  }, [selected, latest]);

  const activityFeed = useMemo(() => {
    if (!mission?.run) return [];
    const r = mission.run;

    const baseTs = r.created_at ?? r.run_timestamp ?? null;
    const baseLabel = formatDate(baseTs);

    const items: Array<{ tsLabel: string; kind: 'ok' | 'warn' | 'risk' | 'info'; title: string; detail?: string }> = [];

    items.push({
      tsLabel: baseLabel,
      kind: 'info',
      title: 'Hiring mission updated',
      detail: r.job_title ? `Focus: ${r.job_title}` : undefined,
    });

    if (typeof r.total_candidates === 'number') {
      items.push({
        tsLabel: baseLabel,
        kind: (r.total_candidates ?? 0) >= 12 ? 'ok' : 'info',
        title: 'Candidate discovery completed',
        detail: `Discovered ${r.total_candidates ?? 0} candidates`,
      });
    }

    if (r.query_quality_label) {
      items.push({
        tsLabel: baseLabel,
        kind: (r.query_quality_label ?? '').toLowerCase().includes('weak') ? 'warn' : 'ok',
        title: 'Strategy quality evaluated',
        detail: `Quality: ${r.query_quality_label}`,
      });
    }

    if (r.recommended_next_search_focus || r.recommended_next_action) {
      items.push({
        tsLabel: baseLabel,
        kind: 'info',
        title: 'Next sourcing move prepared',
        detail: r.recommended_next_search_focus ?? r.recommended_next_action ?? undefined,
      });
    }

    const riskFlags = toBulletItems(r.sourcing_risk_flags).slice(0, 3);
    for (const rf of riskFlags) {
      items.push({
        tsLabel: baseLabel,
        kind: 'risk',
        title: 'Risk signal detected',
        detail: rf,
      });
    }

    const signalFlags = toBulletItems(r.sourcing_signal_flags).slice(0, 3);
    for (const sf of signalFlags) {
      items.push({
        tsLabel: baseLabel,
        kind: 'ok',
        title: 'Positive signal detected',
        detail: sf,
      });
    }

    // Auto-iterate journey if available
    const iters = getIterationRows(r).slice(0, 6);
    for (const it of iters) {
      const iterNo = String(it.iteration ?? it.iter ?? '');
      const cand = String(it.total_candidates ?? it.candidates ?? '');
      const conf = String(it.recruiter_confidence_level ?? it.confidence_level ?? '');
      const pr = String(it.next_run_priority ?? it.priority ?? '');
      if (!iterNo) continue;
      items.push({
        tsLabel: baseLabel,
        kind: 'info',
        title: `Iteration ${iterNo} completed`,
        detail: `candidates: ${cand || '-'}, confidence: ${conf || '-'}, priority: ${pr || '-'}`,
      });
    }

    return items.slice(0, 12);
  }, [mission]);

  const recommendedCandidates = useMemo(() => {
    const run = mission?.run ?? null;
    const summaryObj = run?.app_demo_summary;
    if (!summaryObj || typeof summaryObj !== 'object') return [];

    const obj = summaryObj as Record<string, unknown>;
    const possibleKeys = [
      'candidates',
      'shortlist',
      'top_candidates',
      'recommended_candidates',
      'topCandidates',
      'recommendedCandidates',
    ];

    let list: unknown[] = [];
    for (const k of possibleKeys) {
      const v = obj[k];
      if (Array.isArray(v) && v.length) {
        list = v;
        break;
      }
    }
    if (!list.length) return [];

    const normalized = list
      .filter(v => v && typeof v === 'object')
      .slice(0, 8)
      .map(v => v as Record<string, unknown>);

    return normalized.map((c, idx) => {
      const nameRaw = c['display_name'] ?? c['name'] ?? c['full_name'] ?? '';
      const roleRaw = c['current_role'] ?? c['role'] ?? c['title'] ?? '';
      const locationRaw = c['location'] ?? '';
      const reasonRaw = c['reason'] ?? c['ai_reason'] ?? c['summary'] ?? '';
      const fitRaw = c['fit_label'] ?? c['fit'] ?? c['match_label'] ?? '';

      const skills = Array.isArray(c['skills']) ? (c['skills'] as unknown[]).map(s => String(s)).slice(0, 6) : [];

      return {
        name: String(nameRaw || `Candidate ${idx + 1}`),
        role: String(roleRaw || '-'),
        location: String(locationRaw || '-'),
        reason: String(reasonRaw || ''),
        fit: String(fitRaw || ''),
        skills,
      };
    });
  }, [mission]);

  return (
    <div className="space-y-8">
      {/* CURRENT HIRING MISSION HERO PANEL */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-sky-50 p-7 shadow-[0_10px_30px_rgba(2,6,23,0.06)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                Recruiter Mission Control
              </span>
              {mission?.status ? pill(mission.status, badgeForRunStatus(mission.status)) : null}
              {mission?.quality ? pill(`quality: ${mission.quality}`, badgeForQuality(mission.quality)) : null}
              {mission?.confidenceLevel ? pill(confidenceLabel(mission.confidenceLevel), badgeForConfidence(mission.confidenceLevel)) : null}
              {mission?.run?.mode ? pill(`mode: ${mission.run.mode}`, 'bg-slate-50 text-slate-700 ring-1 ring-slate-200') : null}
              {isAutoIterate(mission?.run) ? pill('auto-iterate', 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200') : null}
            </div>

            <h1 className="mt-4 truncate text-3xl font-semibold tracking-tight text-slate-900">
              {mission?.run?.job_title ?? 'Autonomous Recruiter'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              AI-assisted recruiter operations for building a credible shortlist, fast.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <TerrerCard className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Location</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{mission?.run?.location ?? '-'}</p>
                <p className="mt-1 text-xs text-slate-500">{mission?.run?.seniority ?? '-'}</p>
              </TerrerCard>
              <TerrerCard className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Priority</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{mission?.priority ?? '-'}</p>
                <p className="mt-1 text-xs text-slate-500">Updated: {mission?.createdLabel ?? '-'}</p>
              </TerrerCard>
              <TerrerCard className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">AI confidence</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {typeof mission?.confidenceScore === 'number' ? `${mission.confidenceScore}/100` : '-'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {mission?.daysOpen != null ? `${mission.daysOpen} day(s) open` : '-'}
                </p>
              </TerrerCard>
            </div>
          </div>

          <TerrerCard className="w-full max-w-xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sourcing status</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {mission?.status ? mission.status : 'unknown'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target shortlist</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {mission?.totalCandidates ?? 0}/{mission?.targetShortlist ?? 12}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Shortlist progress</span>
                <span>{mission?.progress ?? 0}%</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                  style={{ width: `${mission?.progress ?? 0}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {mission?.run?.sourcing_signal_summary ?? latestSignal?.signalSummary ?? 'Select a run to view mission details.'}
              </p>
            </div>
          </TerrerCard>
        </div>
      </div>

      {/* RECRUITER CONTROL BAR (display-only, not wired) */}
      <TerrerCard className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-[280px]">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Job mission selector
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sky-200"
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(e.target.value || null)}
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {(r.job_title ?? 'Untitled') + '  •  ' + formatDate(r.created_at ?? r.run_timestamp ?? null)}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[220px]">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Sourcing mode
              </label>
              <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {mission?.run?.mode ?? '-'}
              </div>
            </div>

            <div className="min-w-[220px]">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Target shortlist
              </label>
              <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {mission?.targetShortlist ?? 12}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              title="Run trigger is not wired in this build."
              className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white opacity-60 shadow-[0_8px_18px_rgba(2,132,199,0.25)]"
            >
              Run Autonomous Recruiter
            </button>
            <button
              type="button"
              onClick={() => setShowAllRuns(v => !v)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              {showAllRuns ? 'Show less history' : 'Show full history'}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Controls are display-only for demo: they reflect the selected run but do not trigger new sourcing yet.
        </p>
      </TerrerCard>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading autonomous recruiter runs...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && runs.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          No autonomous recruiter runs yet.
        </div>
      )}

      {!loading && !error && runs.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT: activity + run list + memory */}
          <div className="lg:col-span-5 space-y-6">
            {/* AUTONOMOUS SOURCING ACTIVITY FEED */}
            <TerrerCard className="p-5">
              <SectionHeader
                title="Autonomous Sourcing Activity"
                subtitle="Recruiter-readable sourcing telemetry for the selected mission"
                right={
                  selectedRunIndex >= 0 ? (
                    <span className="text-xs text-slate-500">Run #{runs.length - selectedRunIndex}</span>
                  ) : null
                }
              />

              <div className="mt-4 space-y-3">
                {activityFeed.length ? (
                  activityFeed.map((item, idx) => {
                    const tone =
                      item.kind === 'ok'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : item.kind === 'warn'
                          ? 'border-amber-200 bg-amber-50 text-amber-900'
                          : item.kind === 'risk'
                            ? 'border-rose-200 bg-rose-50 text-rose-900'
                            : 'border-slate-200 bg-slate-50 text-slate-900';
                    return (
                      <div key={`${idx}`} className={`rounded-xl border p-3 ${tone} shadow-[0_1px_0_rgba(15,23,42,0.04)]`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{item.title}</p>
                            {item.detail ? (
                              <p className="mt-1 text-xs opacity-90 break-words">{item.detail}</p>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-[11px] font-semibold opacity-80">{item.tsLabel}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-600">No activity signals available yet.</p>
                )}
              </div>
            </TerrerCard>

            {/* RUNS LIST */}
            <TerrerCard className="p-5">
              <SectionHeader
                title="Run history"
                subtitle="Select a run to view mission state, signals, and next move"
                right={pill(`${runs.length} loaded`, 'bg-slate-50 text-slate-700 ring-1 ring-slate-200')}
              />

              <div className="mt-4 space-y-2">
                {(showAllRuns ? runs : runs.slice(0, 8)).map((r) => {
                  const isSelected = r.id === selectedId;
                  const title = r.job_title ?? '(untitled)';
                  const candidates = typeof r.total_candidates === 'number' ? r.total_candidates : null;
                  const quality = r.query_quality_label ?? null;

                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition shadow-[0_1px_0_rgba(15,23,42,0.04)] ${
                        isSelected ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
                          <p className="mt-0.5 text-xs text-slate-600">
                            {formatDate(r.created_at ?? r.run_timestamp ?? null)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {r.run_status ? pill(r.run_status, badgeForRunStatus(r.run_status)) : null}
                          {quality ? pill(quality, badgeForQuality(quality)) : null}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-700">
                        <span className="text-slate-500">Candidates</span>
                        <span className="font-semibold text-slate-900">{candidates ?? '-'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </TerrerCard>

            {/* RECRUITER MEMORY SIGNALS */}
            <TerrerCard className="p-5">
              <SectionHeader
                title="Recruiter Memory Signals"
                subtitle="Learning patterns and risks from past sourcing missions"
              />

              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Successful patterns</p>
                  {memorySignals.successfulPatterns.length ? (
                    <ul className="mt-2 space-y-1 text-sm text-slate-800">
                      {memorySignals.successfulPatterns.map((p, idx) => (
                        <li key={`${p}-${idx}`} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                          <span className="min-w-0 break-words">{p}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">-</p>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Repeated risk flags</p>
                  {memorySignals.repeatedRiskFlags.length ? (
                    <ul className="mt-2 space-y-1 text-sm text-slate-800">
                      {memorySignals.repeatedRiskFlags.map((p, idx) => (
                        <li key={`${p}-${idx}`} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                          <span className="min-w-0 break-words">{p}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">-</p>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next move trends</p>
                  {memorySignals.nextMoves.length ? (
                    <ul className="mt-2 space-y-1 text-sm text-slate-800">
                      {memorySignals.nextMoves.map((p, idx) => (
                        <li key={`${p}-${idx}`} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                          <span className="min-w-0 break-words">{p}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">-</p>
                  )}
                </div>
              </div>
            </TerrerCard>
          </div>

          {/* RIGHT: candidates + intelligence insights */}
          <div className="lg:col-span-7 space-y-6">
            {/* AI RECOMMENDED CANDIDATES */}
            <TerrerCard className="p-6">
              <SectionHeader
                title="AI Recommended Candidates"
                subtitle="Recruiter-usable shortlist candidates from the selected mission"
                right={pill(`${mission?.totalCandidates ?? 0} viable`, 'bg-slate-50 text-slate-700 ring-1 ring-slate-200')}
              />

              {recommendedCandidates.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6">
                  <p className="text-sm font-semibold text-slate-900">No shortlist generated yet.</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Run results will show shortlisted candidates here when they are included in the run summary payload.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                      <span className="text-sm font-bold">AI</span>
                    </span>
                    <p className="text-xs text-slate-500">
                      This page is read-only today. Actions become enabled once the run trigger is wired.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {recommendedCandidates.slice(0, 6).map((c, idx) => (
                    <div key={`${c.name}-${idx}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{c.name}</p>
                          <p className="mt-0.5 text-xs text-slate-600">{c.role}</p>
                          <p className="mt-1 text-xs text-slate-500">{c.location}</p>
                        </div>
                        {c.fit ? pill(c.fit, 'bg-sky-50 text-sky-800 ring-1 ring-sky-200') : null}
                      </div>
                      {c.skills.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {c.skills.map((s) => (
                            <span
                              key={s}
                              className="rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {c.reason ? (
                        <p className="mt-3 line-clamp-3 text-xs text-slate-600">{c.reason}</p>
                      ) : null}
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled
                          title="Candidate actions are not wired on this dashboard page yet."
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 opacity-70"
                        >
                          View Profile
                        </button>
                        <button
                          type="button"
                          disabled
                          title="Candidate actions are not wired on this dashboard page yet."
                          className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white opacity-60 shadow-[0_10px_20px_rgba(2,132,199,0.18)]"
                        >
                          Push to Pipeline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TerrerCard>

            {/* SOURCING INTELLIGENCE INSIGHTS */}
            <TerrerCard className="p-6">
              <SectionHeader
                title="Sourcing Intelligence Insights"
                subtitle="Signals that support recruiter decisions, not raw telemetry"
              />

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Runs tracked</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.totalRuns}</p>
                  <p className="mt-1 text-xs text-slate-500">Completed: {summary.completedRuns}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Candidates discovered</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{totalCandidatesAllRuns || 0}</p>
                  <p className="mt-1 text-xs text-slate-500">Latest: {summary.latestTotalCandidates ?? '-'}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Best strategy</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{mission?.run?.best_strategy ?? '-'}</p>
                  <p className="mt-1 text-xs text-slate-500">Strategies generated: {mission?.run?.strategy_count ?? '-'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Weakest strategy</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{mission?.run?.weakest_strategy ?? '-'}</p>
                  <p className="mt-1 text-xs text-slate-500">Quality label: {mission?.run?.query_quality_label ?? '-'}</p>
                </div>
              </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next sourcing move</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {mission?.run?.recommended_next_search_focus ?? mission?.run?.recommended_next_action ?? '-'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Priority: {mission?.run?.next_run_priority ?? '-'} | Winner/best: {summary.latestWinnerOrBest}
                    </p>
                    {mission?.run?.reason_winning_variant ? (
                      <p className="mt-2 text-xs text-slate-600">{mission.run.reason_winning_variant}</p>
                    ) : null}
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Signal quality</p>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Confidence</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">{mission?.confidenceScore ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">{mission?.status ?? '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Signal flags</p>
                    {toBulletItems(mission?.run?.sourcing_signal_flags).length ? (
                      <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
                        {toBulletItems(mission?.run?.sourcing_signal_flags).slice(0, 8).map((item, idx) => (
                          <li key={`${item}-${idx}`} className="flex gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                            <span className="min-w-0 break-words">{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600">-</p>
                    )}
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risk flags</p>
                    {toBulletItems(mission?.run?.sourcing_risk_flags).length ? (
                      <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
                        {toBulletItems(mission?.run?.sourcing_risk_flags).slice(0, 8).map((item, idx) => (
                          <li key={`${item}-${idx}`} className="flex gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                            <span className="min-w-0 break-words">{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600">-</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Artifacts</p>
                  <div className="mt-2 space-y-1 text-xs text-slate-700">
                    <p className="break-words">Recruiter report: {mission?.run?.recruiter_report_path ?? '-'}</p>
                    <p className="break-words">Candidates: {mission?.run?.candidates_path ?? '-'}</p>
                    <p className="break-words">Agent report: {mission?.run?.agent_report_path ?? '-'}</p>
                    <p className="break-words">Refinement: {mission?.run?.strategy_refinement_path ?? '-'}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended query adjustments</p>
                  {toBulletItems(mission?.run?.recommended_query_adjustments).length ? (
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
                      {toBulletItems(mission?.run?.recommended_query_adjustments).slice(0, 10).map((item, idx) => (
                        <li key={`${item}-${idx}`} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                          <span className="min-w-0 break-words">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">-</p>
                  )}
                </div>
              </div>
            </TerrerCard>

            {/* Recruiter memory section already on left; keeping right clean for demo */}
          </div>
        </div>
      )}
    </div>
  );
}
