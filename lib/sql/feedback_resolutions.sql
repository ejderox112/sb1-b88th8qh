CREATE TABLE IF NOT EXISTS public.feedback_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  resolved_by uuid NOT NULL,
  resolution text NOT NULL,
  resolved_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_resolutions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_resolutions_tenant_topic ON public.feedback_resolutions(tenant_id, topic_id);

DROP POLICY IF EXISTS feedback_resolutions_select_policy ON public.feedback_resolutions;
DROP POLICY IF EXISTS feedback_resolutions_insert_policy ON public.feedback_resolutions;

CREATE POLICY feedback_resolutions_select_policy
  ON public.feedback_resolutions
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support')
  );

CREATE POLICY feedback_resolutions_insert_policy
  ON public.feedback_resolutions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support')
  );
