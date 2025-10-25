-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.notifications_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  push_enabled boolean DEFAULT true,
  frequency text DEFAULT 'daily' CHECK (frequency IN ('instant', 'daily', 'weekly', 'never')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.notifications_settings ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_notifications_settings_user_tenant ON public.notifications_settings(user_id, tenant_id);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS notifications_select_policy ON public.notifications_settings;
DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications_settings;
DROP POLICY IF EXISTS notifications_update_policy ON public.notifications_settings;
DROP POLICY IF EXISTS notifications_delete_policy ON public.notifications_settings;

CREATE POLICY notifications_select_policy
  ON public.notifications_settings
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY notifications_insert_policy
  ON public.notifications_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY notifications_update_policy
  ON public.notifications_settings
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

CREATE POLICY notifications_delete_policy
  ON public.notifications_settings
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );