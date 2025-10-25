-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  performed_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  category text DEFAULT 'general', -- e.g. 'update', 'restart', 'cleanup'
  status text DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'failed')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_tenant_status ON public.maintenance_logs(tenant_id, status);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS maintenance_logs_select_policy ON public.maintenance_logs;
DROP POLICY IF EXISTS maintenance_logs_insert_policy ON public.maintenance_logs;
DROP POLICY IF EXISTS maintenance_logs_update_policy ON public.maintenance_logs;
DROP POLICY IF EXISTS maintenance_logs_delete_policy ON public.maintenance_logs;

CREATE POLICY maintenance_logs_select_policy
  ON public.maintenance_logs
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY maintenance_logs_insert_policy
  ON public.maintenance_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY maintenance_logs_update_policy
  ON public.maintenance_logs
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND performed_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND performed_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );

CREATE POLICY maintenance_logs_delete_policy
  ON public.maintenance_logs
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND performed_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );