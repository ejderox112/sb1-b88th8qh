-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  ip_address text,
  user_agent text,
  device_info jsonb, -- e.g. { "type": "desktop", "os": "Windows", "browser": "Edge" }
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration_seconds int,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_admin_sessions_tenant_active ON public.admin_sessions(tenant_id, is_active);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS admin_sessions_select_policy ON public.admin_sessions;
DROP POLICY IF EXISTS admin_sessions_insert_policy ON public.admin_sessions;
DROP POLICY IF EXISTS admin_sessions_update_policy ON public.admin_sessions;
DROP POLICY IF EXISTS admin_sessions_delete_policy ON public.admin_sessions;

CREATE POLICY admin_sessions_select_policy
  ON public.admin_sessions
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY admin_sessions_insert_policy
  ON public.admin_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY admin_sessions_update_policy
  ON public.admin_sessions
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND admin_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND admin_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );

CREATE POLICY admin_sessions_delete_policy
  ON public.admin_sessions
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND admin_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );