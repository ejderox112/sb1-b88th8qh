-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.maintenance_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_global boolean DEFAULT false,
  is_cancelled boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.maintenance_windows ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_tenant_time ON public.maintenance_windows(tenant_id, start_time, end_time);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS maintenance_windows_select_policy ON public.maintenance_windows;
DROP POLICY IF EXISTS maintenance_windows_insert_policy ON public.maintenance_windows;
DROP POLICY IF EXISTS maintenance_windows_update_policy ON public.maintenance_windows;
DROP POLICY IF EXISTS maintenance_windows_delete_policy ON public.maintenance_windows;

CREATE POLICY maintenance_windows_select_policy
  ON public.maintenance_windows
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY maintenance_windows_insert_policy
  ON public.maintenance_windows
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY maintenance_windows_update_policy
  ON public.maintenance_windows
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

CREATE POLICY maintenance_windows_delete_policy
  ON public.maintenance_windows
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );