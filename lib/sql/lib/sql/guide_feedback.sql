CREATE TABLE IF NOT EXISTS public.guide_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  guide_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating int CHECK (rating >= 1 AND rating <= 5),
  comment text,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.guide_feedback ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_guide_feedback_tenant_guide ON public.guide_feedback(tenant_id, guide_id);

DROP POLICY IF EXISTS guide_feedback_select_policy ON public.guide_feedback;
DROP POLICY IF EXISTS guide_feedback_insert_policy ON public.guide_feedback;

CREATE POLICY guide_feedback_select_policy
  ON public.guide_feedback
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      OR (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support')
    )
  );

CREATE POLICY guide_feedback_insert_policy
  ON public.guide_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );
