CREATE TABLE IF NOT EXISTS public.feedback_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reason text,
  flagged_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_flags ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_flags_tenant_comment ON public.feedback_flags(tenant_id, comment_id);

DROP POLICY IF EXISTS feedback_flags_select_policy ON public.feedback_flags;
DROP POLICY IF EXISTS feedback_flags_insert_policy ON public.feedback_flags;

CREATE POLICY feedback_flags_select_policy
  ON public.feedback_flags
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );

CREATE POLICY feedback_flags_insert_policy
  ON public.feedback_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );
