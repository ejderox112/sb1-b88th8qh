-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.audit_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid,
  entity_type text NOT NULL, -- e.g. 'project', 'user', 'invoice'
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  snapshot jsonb NOT NULL, -- full data before/after change
  reason text, -- optional explanation
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.audit_snapshots ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_audit_snapshots_tenant_entity ON public.audit_snapshots(tenant_id, entity_type, entity_id);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS audit_snapshots_select_policy ON public.audit_snapshots;
DROP POLICY IF EXISTS audit_snapshots_insert_policy ON public.audit_snapshots;

CREATE POLICY audit_snapshots_select_policy
  ON public.audit_snapshots
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY audit_snapshots_insert_policy
  ON public.audit_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );