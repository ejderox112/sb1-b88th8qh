-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  key text NOT NULL,
  scopes text[] DEFAULT ARRAY[]::text[], -- e.g. ['read', 'write', 'admin']
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_user ON public.api_keys(tenant_id, user_id);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS api_keys_select_policy ON public.api_keys;
DROP POLICY IF EXISTS api_keys_insert_policy ON public.api_keys;
DROP POLICY IF EXISTS api_keys_update_policy ON public.api_keys;
DROP POLICY IF EXISTS api_keys_delete_policy ON public.api_keys;

CREATE POLICY api_keys_select_policy
  ON public.api_keys
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY api_keys_insert_policy
  ON public.api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY api_keys_update_policy
  ON public.api_keys
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY api_keys_delete_policy
  ON public.api_keys
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );