CREATE TABLE IF NOT EXISTS public.feedback_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  is_public boolean DEFAULT false,
  visible_to_roles text[] DEFAULT ARRAY['admin'],
  updated_by uuid,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_visibility ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_visibility_tenant_topic ON public.feedback_visibility(tenant_id, topic_id);

DROP POLICY IF EXISTS feedback_visibility_select_policy ON public.feedback_visibility;
DROP POLICY IF EXISTS feedback_visibility_update_policy ON public.feedback_visibility;

CREATE POLICY feedback_visibility_select_policy
  ON public.feedback_visibility
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (
      is_public = true
      OR (current_setting('jwt.claims', true) ->> 'user_role') = ANY(visible_to_roles)
    )
  );

CREATE POLICY feedback_visibility_update_policy
  ON public.feedback_visibility
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support')
  )
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
