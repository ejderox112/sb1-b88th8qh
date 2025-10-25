-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid,
  alert_type text NOT NULL, -- e.g. 'login.failed', 'token.abuse', 'role.escalation'
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text,
  metadata jsonb, -- e.g. { "ip": "1.2.3.4", "location": "TR", "device": "mobile" }
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_security_alerts_tenant_severity ON public.security_alerts(tenant_id, severity);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS security_alerts_select_policy ON public.security_alerts;
DROP POLICY IF EXISTS security_alerts_insert_policy ON public.security_alerts;
DROP POLICY IF EXISTS security_alerts_update_policy ON public.security_alerts;
DROP POLICY IF EXISTS security_alerts_delete_policy ON public.security_alerts;

CREATE POLICY security_alerts_select_policy
  ON public.security_alerts
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY security_alerts_insert_policy
  ON public.security_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY security_alerts_update_policy
  ON public.security_alerts
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

CREATE POLICY security_alerts_delete_policy
  ON public.security_alerts
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );