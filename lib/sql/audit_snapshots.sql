-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.audit_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  snapshot_type text NOT NULL CHECK (snapshot_type IN (
    'user', 'settings', 'segment', 'flag', 'template', 'policy'
  )),
  target_id uuid NOT NULL,
  snapshot jsonb NOT NULL,
  captured_by uuid,
  captured_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.audit_snapshots ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_audit_snapshots_tenant_type ON public.audit_snapshots(tenant_id, snapshot_type);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS audit_snapshots_select_policy ON public.audit_snapshots;
DROP POLICY IF EXISTS audit_snapshots_insert_policy ON public.audit_snapshots;

CREATE POLICY audit_snapshots_select_policy
  ON public.audit_snapshots
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'compliance', 'analyst')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY audit_snapshots_insert_policy
  ON public.audit_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'compliance')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );