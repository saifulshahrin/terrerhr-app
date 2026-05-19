import { useState } from 'react';
import { Sparkles, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { TerrerAIReview, Recommendation } from '../lib/terrerAI';

interface Props {
  review: TerrerAIReview | null;
  running: boolean;
  onRun: () => void;
  hasExisting?: boolean;
  canRun?: boolean;
}

const recommendationConfig: Record<Recommendation, { label: string; style: string; dot: string }> = {
  'Strong Fit': {
    label: 'Strong Fit',
    style: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    dot: 'bg-emerald-500',
  },
  'Potential Fit': {
    label: 'Potential Fit',
    style: 'bg-sky-50 text-sky-700 ring-sky-200/60',
    dot: 'bg-sky-500',
  },
  'Low Fit': {
    label: 'Low Fit',
    style: 'bg-red-50 text-red-700 ring-red-200/60',
    dot: 'bg-red-400',
  },
};

const decisionConfig: Record<NonNullable<TerrerAIReview['decision']>, { label: string; style: string }> = {
  Proceed: { label: 'Proceed', style: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60' },
  Review: { label: 'Review', style: 'bg-sky-50 text-sky-700 ring-sky-200/60' },
  Reject: { label: 'Reject', style: 'bg-red-50 text-red-700 ring-red-200/60' },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TerrerAIReviewPanel({ review, running, onRun, hasExisting, canRun = true }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!review && !running) {
    return (
      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-inset ring-slate-200/70">
            <Sparkles size={13} className="text-slate-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">Terrer AI Review</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Not yet run for this candidate</p>
          </div>
        </div>
        {canRun && (
          <button
            onClick={onRun}
            className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <Sparkles size={11} />
            {hasExisting ? 'Re-run Terrer AI Review' : 'Run Terrer AI Review'}
          </button>
        )}
      </div>
    );
  }

  if (running) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white/70 px-4 py-4">
        <Loader2 size={15} className="flex-shrink-0 animate-spin text-slate-400" />
        <div>
          <p className="text-xs font-semibold text-slate-700">Terrer AI Review</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Analysing candidate against role requirements...</p>
        </div>
      </div>
    );
  }

  const rec = recommendationConfig[review!.recommendation];
  const decision = decisionConfig[review!.decision];

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/70 bg-white/85 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <button
        onClick={() => setExpanded(e => !e)}
        className="group flex w-full items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-inset ring-slate-200/70">
            <Sparkles size={12} className="text-slate-500" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-800 leading-none">Terrer AI Review</p>
            <p className="mt-0.5 text-[11px] leading-none text-slate-400">
              Run at {formatTime(review!.generatedAt)}
              {review!.confidence ? (
                <>
                  {' '}
                  <span className="text-slate-300">&middot;</span> Confidence {review!.confidence}
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${decision.style}`}>
            {decision.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${rec.style}`}>
            <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${rec.dot}`} />
            {rec.label}
          </span>
          {expanded ? (
            <ChevronUp size={14} className="text-slate-400 transition-colors group-hover:text-slate-600" />
          ) : (
            <ChevronDown size={14} className="text-slate-400 transition-colors group-hover:text-slate-600" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-200/70 bg-white px-4 pb-5 pt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50/70 px-3 py-2.5 ring-1 ring-inset ring-slate-200/60">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Recommendation</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${rec.style}`}>
                  <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${rec.dot}`} />
                  {rec.label}
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${decision.style}`}>
                  Decision {decision.label}
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50/70 px-3 py-2.5 ring-1 ring-inset ring-slate-200/60">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Confidence</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {review!.confidence ?? 'Not provided'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">Instrument signal, not a final decision.</p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Why</p>
            <p className="text-sm leading-relaxed text-slate-700">{review!.summary}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-emerald-50/70 px-3 py-3 ring-1 ring-inset ring-emerald-200/60">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800">Strengths</p>
              {review!.strengths.length === 0 ? (
                <p className="text-xs text-emerald-800/60 italic">No explicit strengths noted.</p>
              ) : (
                <ul className="space-y-1.5">
                  {review!.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                      <CheckCircle size={12} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div
              className={`rounded-lg px-3 py-3 ring-1 ring-inset ${
                review!.concerns.length === 0
                  ? 'bg-slate-50/70 ring-slate-200/60'
                  : 'bg-amber-50/70 ring-amber-200/60'
              }`}
            >
              <p
                className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                  review!.concerns.length === 0 ? 'text-slate-500' : 'text-amber-800'
                }`}
              >
                Risks / Missing Info
              </p>
              {review!.concerns.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No significant risks flagged.</p>
              ) : (
                <ul className="space-y-1.5">
                  {review!.concerns.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                      <AlertTriangle size={12} className="mt-0.5 flex-shrink-0 text-amber-600" />
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-slate-400">Terrer AI Review is advisory, not a replacement for recruiter judgment.</p>
            <button
              onClick={onRun}
              className="text-[11px] font-semibold text-slate-500 underline underline-offset-2 transition-colors hover:text-slate-700"
            >
              Re-run review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
