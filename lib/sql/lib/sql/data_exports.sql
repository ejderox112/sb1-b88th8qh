-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.data_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  export_type text NOT NULL CHECK (export_type IN (
    'session', 'recording', 'user', 'ticket', 'audit', 'custom'
  )),
  export_format text CHECK (export_format IN ('csv', 'json', 'xlsx', 'pdf')),
  filter jsonb, -- e.g. { "date_range": {...}, "segment_id": "...", "status": "closed" }
  file_url text,
  status text CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_data_exports_tenant_type ON public.data_exports(tenant_id, export_type);

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
      OR (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'analyst')
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
