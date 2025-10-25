-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.integration_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  integration_name text NOT NULL,
  token_type text NOT NULL CHECK (token_type IN ('api_key', 'oauth', 'webhook_secret', 'client_secret')),
  token_value text NOT NULL,
  expires_at timestamptz,
  scopes text[],
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_integration_tokens_tenant_name ON public.integration_tokens(tenant_id, integration_name);

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
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY integration_tokens_insert_policy
  ON public.integration_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY integration_tokens_update_policy
  ON public.integration_tokens
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY integration_tokens_delete_policy
  ON public.integration_tokens
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
