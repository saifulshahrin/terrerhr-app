import { supabase } from './supabase';

export interface PlacementActivityEvent {
  id: string;
  submission_id: string | null;
  entity_table: string;
  entity_id: string;
  event_type: 'created' | 'updated';
  occurred_at: string;
  actor_role: string | null;
  changed_fields: string[];
}

const fields = 'id,submission_id,entity_table,entity_id,event_type,occurred_at,actor_role,changed_fields';

export async function fetchPlacementActivity(submissionId: string): Promise<PlacementActivityEvent[]> {
  const { data, error } = await supabase
    .from('placement_activity_log')
    .select(fields)
    .eq('submission_id', submissionId)
    .order('occurred_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as PlacementActivityEvent[];
}
