CREATE TABLE IF NOT EXISTS public.feedback_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  status text CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  updated_by uuid,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_status ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_status_tenant_topic ON public.feedback_status(tenant_id, topic_id);

DROP POLICY IF EXISTS feedback_status_select_policy ON public.feedback_status;
DROP POLICY IF EXISTS feedback_status_update_policy ON public.feedback_status;

CREATE POLICY feedback_status_select_policy
  ON public.feedback_status
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY feedback_status_update_policy
  ON public.feedback_status
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support')
  )
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
