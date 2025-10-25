-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  locale_code text NOT NULL, -- e.g. 'en', 'tr', 'de'
  key text NOT NULL, -- e.g. 'welcome.title', 'error.404.message'
  value text NOT NULL,
  context text, -- optional grouping, e.g. 'onboarding', 'errors'
  is_active boolean DEFAULT true,
  updated_by uuid,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_translations_tenant_locale_key ON public.translations(tenant_id, locale_code, key);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS translations_select_policy ON public.translations;
DROP POLICY IF EXISTS translations_insert_policy ON public.translations;
DROP POLICY IF EXISTS translations_update_policy ON public.translations;
DROP POLICY IF EXISTS translations_delete_policy ON public.translations;

CREATE POLICY translations_select_policy
  ON public.translations
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid)
  );

CREATE POLICY translations_insert_policy
  ON public.translations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid)
  );

CREATE POLICY translations_update_policy
  ON public.translations
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid)
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid)
  );

CREATE POLICY translations_delete_policy
  ON public.translations
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid)
  );