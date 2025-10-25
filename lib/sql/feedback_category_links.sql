CREATE TABLE IF NOT EXISTS public.feedback_category_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  category_id uuid NOT NULL,
  linked_by uuid,
  linked_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_category_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_category_links_tenant_topic ON public.feedback_category_links(tenant_id, topic_id);

DROP POLICY IF EXISTS feedback_category_links_select_policy ON public.feedback_category_links;
DROP POLICY IF EXISTS feedback_category_links_insert_policy ON public.feedback_category_links;

CREATE POLICY feedback_category_links_select_policy
  ON public.feedback_category_links
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY feedback_category_links_insert_policy
  ON public.feedback_category_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
