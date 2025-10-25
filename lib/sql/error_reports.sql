-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid,
  error_type text NOT NULL CHECK (error_type IN (
    'frontend', 'backend', 'integration', 'network', 'data', 'unknown'
  )),
  message text NOT NULL,
  stack_trace text,
  metadata jsonb, -- e.g. { "browser": "Chrome", "screen": "dashboard", "api": "/v1/users" }
  status text CHECK (status IN ('new', 'investigating', 'resolved', 'ignored')) DEFAULT 'new',
  reported_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_error_reports_tenant_type ON public.error_reports(tenant_id, error_type);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS error_reports_select_policy ON public.error_reports;
DROP POLICY IF EXISTS error_reports_insert_policy ON public.error_reports;
DROP POLICY IF EXISTS error_reports_update_policy ON public.error_reports;

CREATE POLICY error_reports_select_policy
  ON public.error_reports
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      OR (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer', 'support')
    )
  );

CREATE POLICY error_reports_insert_policy
  ON public.error_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY error_reports_update_policy
  ON public.error_reports
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer', 'support')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer', 'support')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
