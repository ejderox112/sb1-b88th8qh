CREATE TABLE IF NOT EXISTS public.feedback_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  commented_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_comments_tenant_topic ON public.feedback_comments(tenant_id, topic_id);

DROP POLICY IF EXISTS feedback_comments_select_policy ON public.feedback_comments;
DROP POLICY IF EXISTS feedback_comments_insert_policy ON public.feedback_comments;

CREATE POLICY feedback_comments_select_policy
  ON public.feedback_comments
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );

CREATE POLICY feedback_comments_insert_policy
  ON public.feedback_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );
