CREATE TABLE IF NOT EXISTS public.feedback_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  topic_key text NOT NULL,
  label text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_topics ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_topics_tenant_key ON public.feedback_topics(tenant_id, topic_key);

DROP POLICY IF EXISTS feedback_topics_select_policy ON public.feedback_topics;
DROP POLICY IF EXISTS feedback_topics_insert_policy ON public.feedback_topics;

CREATE POLICY feedback_topics_select_policy
  ON public.feedback_topics
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY feedback_topics_insert_policy
  ON public.feedback_topics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
