-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid,
  feedback_type text NOT NULL CHECK (feedback_type IN ('bug', 'suggestion', 'praise', 'other')),
  rating int CHECK (rating BETWEEN 1 AND 5),
  message text,
  context jsonb, -- e.g. { "screen": "settings", "device": "mobile" }
  responded boolean DEFAULT false,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_user_feedback_tenant_type ON public.user_feedback(tenant_id, feedback_type);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS user_feedback_select_policy ON public.user_feedback;
DROP POLICY IF EXISTS user_feedback_insert_policy ON public.user_feedback;
DROP POLICY IF EXISTS user_feedback_update_policy ON public.user_feedback;

CREATE POLICY user_feedback_select_policy
  ON public.user_feedback
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      OR (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    )
  );

CREATE POLICY user_feedback_insert_policy
  ON public.user_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY user_feedback_update_policy
  ON public.user_feedback
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );