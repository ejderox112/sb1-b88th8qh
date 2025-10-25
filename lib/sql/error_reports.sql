-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid,
  error_code text,
  error_message text NOT NULL,
  stack_trace text,
  context jsonb, -- e.g. { "screen": "dashboard", "action": "save" }
  severity text DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
  resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_error_reports_tenant_severity ON public.error_reports(tenant_id, severity);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS error_reports_select_policy ON public.error_reports;
DROP POLICY IF EXISTS error_reports_insert_policy ON public.error_reports;
DROP POLICY IF EXISTS error_reports_update_policy ON public.error_reports;
DROP POLICY IF EXISTS error_reports_delete_policy ON public.error_reports;

CREATE POLICY error_reports_select_policy
  ON public.error_reports
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY error_reports_insert_policy
  ON public.error_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY error_reports_update_policy
  ON public.error_reports
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

CREATE POLICY error_reports_delete_policy
  ON public.error_reports
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );