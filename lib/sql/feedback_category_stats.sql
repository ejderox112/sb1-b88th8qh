CREATE TABLE IF NOT EXISTS public.feedback_category_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  category_id uuid NOT NULL,
  total_topics int DEFAULT 0,
  total_comments int DEFAULT 0,
  total_votes int DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_category_stats ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_category_stats_tenant_category ON public.feedback_category_stats(tenant_id, category_id);

DROP POLICY IF EXISTS feedback_category_stats_select_policy ON public.feedback_category_stats;
DROP POLICY IF EXISTS feedback_category_stats_update_policy ON public.feedback_category_stats;

CREATE POLICY feedback_category_stats_select_policy
  ON public.feedback_category_stats
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY feedback_category_stats_update_policy
  ON public.feedback_category_stats
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
