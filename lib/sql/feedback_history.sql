CREATE TABLE IF NOT EXISTS public.feedback_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  action text CHECK (action IN ('created', 'commented', 'voted', 'flagged', 'resolved')) NOT NULL,
  actor_id uuid,
  metadata jsonb,
  occurred_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_history_tenant_topic ON public.feedback_history(tenant_id, topic_id);

DROP POLICY IF EXISTS feedback_history_select_policy ON public.feedback_history;
DROP POLICY IF EXISTS feedback_history_insert_policy ON public.feedback_history;

CREATE POLICY feedback_history_select_policy
  ON public.feedback_history
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY feedback_history_insert_policy
  ON public.feedback_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
