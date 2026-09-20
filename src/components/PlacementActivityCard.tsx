import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { fetchPlacementActivity, type PlacementActivityEvent } from '../lib/placementActivity';

const labels: Record<string, string> = {
  submissions: 'Pipeline',
  placement_job_orders: 'Placement order',
  candidate_submission_consents: 'Candidate consent',
  placement_commercial_records: 'Commercial record',
  placement_guarantee_trackers: 'Guarantee tracker',
  placement_replacement_claims: 'Replacement claim',
};

function formatField(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function PlacementActivityCard({ submissionId }: { submissionId: string }) {
  const [events, setEvents] = useState<PlacementActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchPlacementActivity(submissionId)
      .then(rows => { if (active) setEvents(rows); })
      .catch(loadError => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load activity.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [submissionId]);

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-3 py-3">
      <div className="flex items-center gap-2">
        <History size={14} className="text-slate-500" />
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Placement activity</p>
      </div>
      <p className="mt-1 text-xs text-slate-600">System-recorded events. These entries cannot be edited or deleted from the app.</p>

      {loading ? <p className="mt-3 text-xs text-slate-500">Loading activity…</p> : null}
      {error ? <p className="mt-3 text-xs text-red-700">{error}</p> : null}
      {!loading && !error && events.length === 0 ? <p className="mt-3 text-xs text-slate-500">No recorded placement events yet.</p> : null}

      {events.length > 0 ? (
        <div className="mt-3 space-y-2">
          {events.map(event => (
            <div key={event.id} className="rounded-lg border border-slate-200 px-2.5 py-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold text-slate-800">
                  {labels[event.entity_table] ?? formatField(event.entity_table)} {event.event_type}
                </p>
                <p className="shrink-0 text-[11px] text-slate-500">{formatWhen(event.occurred_at)}</p>
              </div>
              <p className="mt-1 text-[11px] text-slate-600">
                {event.changed_fields.length > 0 ? event.changed_fields.map(formatField).join(', ') : 'Record created'}
                {event.actor_role ? ' · ' + formatField(event.actor_role) : ''}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
