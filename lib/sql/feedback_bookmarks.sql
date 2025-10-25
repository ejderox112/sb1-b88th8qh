CREATE TABLE IF NOT EXISTS public.feedback_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  user_id uuid NOT NULL,
  bookmarked_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_bookmarks_tenant_topic ON public.feedback_bookmarks(tenant_id, topic_id);

DROP POLICY IF EXISTS feedback_bookmarks_select_policy ON public.feedback_bookmarks;
DROP POLICY IF EXISTS feedback_bookmarks_insert_policy ON public.feedback_bookmarks;

CREATE POLICY feedback_bookmarks_select_policy
  ON public.feedback_bookmarks
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );

CREATE POLICY feedback_bookmarks_insert_policy
  ON public.feedback_bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );
