CREATE TABLE IF NOT EXISTS public.feedback_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vote_type text CHECK (vote_type IN ('up', 'down')) NOT NULL,
  voted_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_votes_tenant_topic ON public.feedback_votes(tenant_id, topic_id);

DROP POLICY IF EXISTS feedback_votes_select_policy ON public.feedback_votes;
DROP POLICY IF EXISTS feedback_votes_insert_policy ON public.feedback_votes;

CREATE POLICY feedback_votes_select_policy
  ON public.feedback_votes
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );

CREATE POLICY feedback_votes_insert_policy
  ON public.feedback_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );
