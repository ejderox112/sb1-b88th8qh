CREATE TABLE IF NOT EXISTS public.feedback_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  comment_id uuid NOT NULL,
  mentioned_user_id uuid NOT NULL,
  mentioned_by uuid,
  mentioned_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_mentions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_mentions_tenant_comment ON public.feedback_mentions(tenant_id, comment_id);

DROP POLICY IF EXISTS feedback_mentions_select_policy ON public.feedback_mentions;
DROP POLICY IF EXISTS feedback_mentions_insert_policy ON public.feedback_mentions;

CREATE POLICY feedback_mentions_select_policy
  ON public.feedback_mentions
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND mentioned_user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );

CREATE POLICY feedback_mentions_insert_policy
  ON public.feedback_mentions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
