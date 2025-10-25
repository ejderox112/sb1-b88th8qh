-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.data_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  backup_type text NOT NULL CHECK (backup_type IN ('full', 'incremental', 'differential')),
  storage_location text NOT NULL, -- e.g. 's3://bucket-name/backups/2025-10-25'
  status text DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  size_bytes bigint,
  initiated_by uuid,
  metadata jsonb, -- e.g. { "region": "eu-west-1", "encryption": "AES256" }
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.data_backups ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_data_backups_tenant_status ON public.data_backups(tenant_id, status);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS data_backups_select_policy ON public.data_backups;
DROP POLICY IF EXISTS data_backups_insert_policy ON public.data_backups;
DROP POLICY IF EXISTS data_backups_update_policy ON public.data_backups;
DROP POLICY IF EXISTS data_backups_delete_policy ON public.data_backups;

CREATE POLICY data_backups_select_policy
  ON public.data_backups
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'devops')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY data_backups_insert_policy
  ON public.data_backups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'devops')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY data_backups_update_policy
  ON public.data_backups
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'devops')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'devops')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY data_backups_delete_policy
  ON public.data_backups
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'devops')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );