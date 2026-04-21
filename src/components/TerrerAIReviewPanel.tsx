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
  'Strong Fit':    { label: 'Strong Fit',    style: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  'Potential Fit': { label: 'Potential Fit', style: 'bg-sky-50 text-sky-700 border-sky-200',             dot: 'bg-sky-500' },
  'Low Fit':       { label: 'Low Fit',       style: 'bg-red-50 text-red-600 border-red-200',             dot: 'bg-red-400' },
};

const decisionConfig: Record<NonNullable<TerrerAIReview['decision']>, { label: string; style: string }> = {
  Proceed: { label: 'Proceed', style: 'bg-emerald-600 text-white' },
  Review:  { label: 'Review',  style: 'bg-sky-600 text-white' },
  Reject:  { label: 'Reject',  style: 'bg-red-600 text-white' },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TerrerAIReviewPanel({ review, running, onRun, hasExisting, canRun = true }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!review && !running) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Sparkles size={13} className="text-gray-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Terrer AI Review</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Not yet run for this candidate</p>
          </div>
        </div>
        {canRun && (
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition-colors whitespace-nowrap flex-shrink-0"
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
      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 flex items-center gap-3">
        <Loader2 size={15} className="text-gray-400 animate-spin flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-gray-600">Terrer AI Review</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Analysing candidate against role requirements...</p>
        </div>
      </div>
    );
  }

  const rec = recommendationConfig[review!.recommendation];
  const decision = decisionConfig[review!.decision];

  return (
    <div className="mt-4 rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-3 bg-gradient-to-r from-gray-900 to-gray-800 flex items-center justify-between gap-4 hover:from-gray-800 hover:to-gray-700 transition-all group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
            <Sparkles size={12} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-white leading-none">Terrer AI Review</p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-none">Run at {formatTime(review!.generatedAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${decision.style}`}>
            Decision: {decision.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${rec.style}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${rec.dot} flex-shrink-0`} />
            {rec.label}
          </span>
          {expanded
            ? <ChevronUp size={13} className="text-gray-400" />
            : <ChevronDown size={13} className="text-gray-400" />
          }
        </div>
      </button>

      {expanded && (
        <div className="bg-white px-4 pt-4 pb-5 space-y-4">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Decision</p>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${decision.style}`}>
              {decision.label}
            </span>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Summary</p>
            <p className="text-sm text-gray-700 leading-relaxed">{review!.summary}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Strengths</p>
              <ul className="space-y-1.5">
                {review!.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                    <CheckCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className={`rounded-lg border p-3 ${review!.concerns.length === 0 ? 'bg-gray-50 border-gray-100' : 'bg-amber-50 border-amber-100'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${review!.concerns.length === 0 ? 'text-gray-400' : 'text-amber-700'}`}>
                Concerns
              </p>
              {review!.concerns.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No significant concerns identified</p>
              ) : (
                <ul className="space-y-1.5">
                  {review!.concerns.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                      <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-gray-400">Recommendation:</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${rec.style}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${rec.dot}`} />
                {rec.label}
              </span>
            </div>
            <button
              onClick={onRun}
              className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
            >
              Re-run review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
