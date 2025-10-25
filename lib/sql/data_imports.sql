-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.data_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  import_type text NOT NULL, -- e.g. 'users', 'projects', 'transactions'
  format text DEFAULT 'csv', -- e.g. 'csv', 'json', 'xml'
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url text,
  error text,
  metadata jsonb, -- e.g. { "columns": [...], "source": "dropbox" }
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.data_imports ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_data_imports_tenant_status ON public.data_imports(tenant_id, status);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS data_imports_select_policy ON public.data_imports;
DROP POLICY IF EXISTS data_imports_insert_policy ON public.data_imports;
DROP POLICY IF EXISTS data_imports_update_policy ON public.data_imports;
DROP POLICY IF EXISTS data_imports_delete_policy ON public.data_imports;

CREATE POLICY data_imports_select_policy
  ON public.data_imports
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY data_imports_insert_policy
  ON public.data_imports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY data_imports_update_policy
  ON public.data_imports
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
  );

CREATE POLICY data_imports_delete_policy
  ON public.data_imports
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
  );