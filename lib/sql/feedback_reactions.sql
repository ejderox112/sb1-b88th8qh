CREATE TABLE IF NOT EXISTS public.feedback_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reaction_type text CHECK (reaction_type IN ('like', 'dislike', 'laugh', 'confused')) NOT NULL,
  reacted_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_reactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_reactions_tenant_comment ON public.feedback_reactions(tenant_id, comment_id);

DROP POLICY IF EXISTS feedback_reactions_select_policy ON public.feedback_reactions;
DROP POLICY IF EXISTS feedback_reactions_insert_policy ON public.feedback_reactions;

CREATE POLICY feedback_reactions_select_policy
  ON public.feedback_reactions
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );

CREATE POLICY feedback_reactions_insert_policy
  ON public.feedback_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );
