import { supabase } from './supabase';

export type PlacementCommercialStatus =
  | 'offer_pending'
  | 'offer_accepted'
  | 'started'
  | 'invoiced'
  | 'payment_cleared';

export interface PlacementCommercialRecord {
  id: string;
  placement_reference: string;
  submission_id: string;
  commercial_status: PlacementCommercialStatus;
  offer_made_at: string | null;
  offer_accepted_at: string | null;
  offer_evidence_ref: string | null;
  start_date: string | null;
  start_confirmed_at: string | null;
  start_evidence_ref: string | null;
  invoice_number: string | null;
  invoice_issued_at: string | null;
  invoice_due_date: string | null;
  invoice_amount: number | null;
  invoice_evidence_ref: string | null;
  payment_received_at: string | null;
  payment_cleared_at: string | null;
  payment_amount: number | null;
  payment_evidence_ref: string | null;
}

export interface SavePlacementCommercialRecordInput {
  submission_id: string;
  offer_made_at: string | null;
  offer_accepted_at: string | null;
  offer_evidence_ref: string | null;
  start_date: string | null;
  start_confirmed_at: string | null;
  start_evidence_ref: string | null;
  invoice_number: string | null;
  invoice_issued_at: string | null;
  invoice_due_date: string | null;
  invoice_amount: number | null;
  invoice_evidence_ref: string | null;
  payment_received_at: string | null;
  payment_cleared_at: string | null;
  payment_amount: number | null;
  payment_evidence_ref: string | null;
}

const fields = 'id,placement_reference,submission_id,commercial_status,offer_made_at,offer_accepted_at,offer_evidence_ref,start_date,start_confirmed_at,start_evidence_ref,invoice_number,invoice_issued_at,invoice_due_date,invoice_amount,invoice_evidence_ref,payment_received_at,payment_cleared_at,payment_amount,payment_evidence_ref';

export async function fetchPlacementCommercialRecord(
  submissionId: string
): Promise<PlacementCommercialRecord | null> {
  const { data, error } = await supabase
    .from('placement_commercial_records')
    .select(fields)
    .eq('submission_id', submissionId)
    .maybeSingle();

  if (error) throw error;
  return data as PlacementCommercialRecord | null;
}

export async function savePlacementCommercialRecord(
  input: SavePlacementCommercialRecordInput
): Promise<PlacementCommercialRecord> {
  const { data, error } = await supabase
    .from('placement_commercial_records')
    .upsert(input, { onConflict: 'submission_id' })
    .select(fields)
    .single();

  if (error) throw error;
  return data as PlacementCommercialRecord;
}
