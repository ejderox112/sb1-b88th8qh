-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE, -- e.g. 'default_locale', 'max_upload_size'
  value jsonb NOT NULL, -- e.g. "en", 10485760, true
  description text,
  is_active boolean DEFAULT true,
  updated_by uuid,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_system_settings_key_active ON public.system_settings(key, is_active);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS system_settings_select_policy ON public.system_settings;
DROP POLICY IF EXISTS system_settings_update_policy ON public.system_settings;

CREATE POLICY system_settings_select_policy
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
  );

CREATE POLICY system_settings_update_policy
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
  );