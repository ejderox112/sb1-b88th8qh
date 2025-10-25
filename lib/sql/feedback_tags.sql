CREATE TABLE IF NOT EXISTS public.feedback_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  tag text NOT NULL,
  added_by uuid,
  added_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_tags ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_tags_tenant_topic ON public.feedback_tags(tenant_id, topic_id);

DROP POLICY IF EXISTS feedback_tags_select_policy ON public.feedback_tags;
DROP POLICY IF EXISTS feedback_tags_insert_policy ON public.feedback_tags;

CREATE POLICY feedback_tags_select_policy
  ON public.feedback_tags
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY feedback_tags_insert_policy
  ON public.feedback_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
