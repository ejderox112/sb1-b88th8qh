-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.translation_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  namespace text NOT NULL, -- e.g. 'auth', 'dashboard', 'settings'
  key text NOT NULL,       -- e.g. 'login.title', 'error.unauthorized'
  default_text text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.translation_keys ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_translation_keys_tenant_namespace ON public.translation_keys(tenant_id, namespace);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS translation_keys_select_policy ON public.translation_keys;
DROP POLICY IF EXISTS translation_keys_insert_policy ON public.translation_keys;
DROP POLICY IF EXISTS translation_keys_update_policy ON public.translation_keys;
DROP POLICY IF EXISTS translation_keys_delete_policy ON public.translation_keys;

CREATE POLICY translation_keys_select_policy
  ON public.translation_keys
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer', 'translator')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY translation_keys_insert_policy
  ON public.translation_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer', 'translator')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY translation_keys_update_policy
  ON public.translation_keys
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer', 'translator')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer', 'translator')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY translation_keys_delete_policy
  ON public.translation_keys
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer', 'translator')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );