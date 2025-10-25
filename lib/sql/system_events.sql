-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  value_type text CHECK (value_type IN ('boolean', 'number', 'string', 'json')),
  description text,
  is_active boolean DEFAULT true,
  updated_by uuid,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_system_settings_tenant_key ON public.system_settings(tenant_id, key);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS system_settings_select_policy ON public.system_settings;
DROP POLICY IF EXISTS system_settings_insert_policy ON public.system_settings;
DROP POLICY IF EXISTS system_settings_update_policy ON public.system_settings;
DROP POLICY IF EXISTS system_settings_delete_policy ON public.system_settings;

CREATE POLICY system_settings_select_policy
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY system_settings_insert_policy
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY system_settings_update_policy
  ON public.system_settings
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

CREATE POLICY system_settings_delete_policy
  ON public.system_settings
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );