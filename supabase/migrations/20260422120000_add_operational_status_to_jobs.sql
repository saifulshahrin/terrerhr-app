/*
  # Add operational status to jobs

  Separates Terrer's execution state from:
  - source: origin / provenance of the job record
  - status: market / client lifecycle (Open | Closed | On Hold)
*/

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS operational_status text NOT NULL DEFAULT 'not_started';
