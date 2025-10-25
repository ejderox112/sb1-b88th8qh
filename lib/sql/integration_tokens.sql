-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.integration_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  service_name text NOT NULL, -- e.g. 'slack', 'stripe', 'dropbox'
  token text NOT NULL,
  token_type text DEFAULT 'api_key' CHECK (token_type IN ('api_key', 'oauth', 'jwt')),
  scopes text[], -- e.g. ['read', 'write']
  expires_at timestamptz,
  revoked boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_integration_tokens_tenant_service ON public.integration_tokens(tenant_id, service_name);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS integration_tokens_select_policy ON public.integration_tokens;
DROP POLICY IF EXISTS integration_tokens_insert_policy ON public.integration_tokens;
DROP POLICY IF EXISTS integration_tokens_update_policy ON public.integration_tokens;
DROP POLICY IF EXISTS integration_tokens_delete_policy ON public.integration_tokens;

CREATE POLICY integration_tokens_select_policy
  ON public.integration_tokens
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY integration_tokens_insert_policy
  ON public.integration_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY integration_tokens_update_policy
  ON public.integration_tokens
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

CREATE POLICY integration_tokens_delete_policy
  ON public.integration_tokens
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );