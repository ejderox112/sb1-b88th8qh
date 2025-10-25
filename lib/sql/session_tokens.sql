-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.session_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  device_info text,
  ip_address text,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.session_tokens ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_session_tokens_user_tenant ON public.session_tokens(user_id, tenant_id);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS session_tokens_select_policy ON public.session_tokens;
DROP POLICY IF EXISTS session_tokens_insert_policy ON public.session_tokens;
DROP POLICY IF EXISTS session_tokens_update_policy ON public.session_tokens;
DROP POLICY IF EXISTS session_tokens_delete_policy ON public.session_tokens;

CREATE POLICY session_tokens_select_policy
  ON public.session_tokens
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY session_tokens_insert_policy
  ON public.session_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY session_tokens_update_policy
  ON public.session_tokens
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

CREATE POLICY session_tokens_delete_policy
  ON public.session_tokens
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );