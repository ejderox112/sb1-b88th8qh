-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- e.g. 'login', 'update_profile', 'delete_project'
  user_id uuid,
  tenant_id uuid,
  context jsonb, -- optional metadata about the event
  ip_address text,
  user_agent text,
  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_tenant ON public.audit_logs(user_id, tenant_id);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS audit_logs_select_policy ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_delete_policy ON public.audit_logs;

CREATE POLICY audit_logs_select_policy
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id IS NOT NULL
      AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY audit_logs_insert_policy
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id IS NOT NULL
      AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY audit_logs_delete_policy
  ON public.audit_logs
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
  );