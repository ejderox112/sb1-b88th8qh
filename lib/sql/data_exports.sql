-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.data_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  export_type text NOT NULL, -- e.g. 'user_list', 'transactions', 'audit_log'
  format text NOT NULL CHECK (format IN ('csv', 'json', 'pdf')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  file_url text,
  filters jsonb, -- e.g. { "date_range": "last_30_days", "region": "EU" }
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_data_exports_tenant_status ON public.data_exports(tenant_id, status);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS data_exports_select_policy ON public.data_exports;
DROP POLICY IF EXISTS data_exports_insert_policy ON public.data_exports;

CREATE POLICY data_exports_select_policy
  ON public.data_exports
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      OR (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    )
  );

CREATE POLICY data_exports_insert_policy
  ON public.data_exports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );