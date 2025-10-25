-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  step_key text NOT NULL, -- e.g. 'welcome', 'connect_calendar', 'invite_team'
  completed boolean DEFAULT false,
  completed_at timestamptz,
  metadata jsonb, -- e.g. { "skipped": true, "source": "mobile" }
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_user_tenant ON public.onboarding_steps(user_id, tenant_id);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS onboarding_steps_select_policy ON public.onboarding_steps;
DROP POLICY IF EXISTS onboarding_steps_insert_policy ON public.onboarding_steps;
DROP POLICY IF EXISTS onboarding_steps_update_policy ON public.onboarding_steps;
DROP POLICY IF EXISTS onboarding_steps_delete_policy ON public.onboarding_steps;

CREATE POLICY onboarding_steps_select_policy
  ON public.onboarding_steps
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY onboarding_steps_insert_policy
  ON public.onboarding_steps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY onboarding_steps_update_policy
  ON public.onboarding_steps
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY onboarding_steps_delete_policy
  ON public.onboarding_steps
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );