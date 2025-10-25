CREATE TABLE IF NOT EXISTS public.satisfaction_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  score int CHECK (score >= 1 AND score <= 10) NOT NULL,
  comment text,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.satisfaction_scores ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_satisfaction_scores_tenant_user ON public.satisfaction_scores(tenant_id, user_id);

DROP POLICY IF EXISTS satisfaction_scores_select_policy ON public.satisfaction_scores;
DROP POLICY IF EXISTS satisfaction_scores_insert_policy ON public.satisfaction_scores;

CREATE POLICY satisfaction_scores_select_policy
  ON public.satisfaction_scores
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );

CREATE POLICY satisfaction_scores_insert_policy
  ON public.satisfaction_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );
