CREATE TABLE IF NOT EXISTS public.candidate_intent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id text NOT NULL,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('matches_viewed', 'interest_clicked', 'job_saved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_intent_events_job_id
  ON public.candidate_intent_events (job_id);

CREATE INDEX IF NOT EXISTS idx_candidate_intent_events_candidate_id
  ON public.candidate_intent_events (candidate_id);

CREATE INDEX IF NOT EXISTS idx_candidate_intent_events_action_type
  ON public.candidate_intent_events (action_type);

CREATE INDEX IF NOT EXISTS idx_candidate_intent_events_created_at
  ON public.candidate_intent_events (created_at DESC);

ALTER TABLE public.candidate_intent_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow read candidate intent events" ON public.candidate_intent_events;
CREATE POLICY "allow read candidate intent events"
ON public.candidate_intent_events
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "allow write candidate intent events" ON public.candidate_intent_events;
CREATE POLICY "allow write candidate intent events"
ON public.candidate_intent_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
