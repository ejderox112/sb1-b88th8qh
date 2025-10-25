CREATE TABLE IF NOT EXISTS public.feedback_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  user_id uuid NOT NULL,
  followed_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_followers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_followers_tenant_topic ON public.feedback_followers(tenant_id, topic_id);

DROP POLICY IF EXISTS feedback_followers_select_policy ON public.feedback_followers;
DROP POLICY IF EXISTS feedback_followers_insert_policy ON public.feedback_followers;

CREATE POLICY feedback_followers_select_policy
  ON public.feedback_followers
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );

CREATE POLICY feedback_followers_insert_policy
  ON public.feedback_followers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );
