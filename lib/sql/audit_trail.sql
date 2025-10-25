-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  actor_id uuid,
  actor_role text,
  action text NOT NULL, -- e.g. 'create', 'update', 'delete', 'access'
  target_table text,
  target_id uuid,
  changes jsonb, -- e.g. { "before": {...}, "after": {...} }
  context jsonb, -- e.g. { "ip": "1.2.3.4", "device": "mobile" }
  severity text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_audit_trail_tenant_action ON public.audit_trail(tenant_id, action);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS audit_trail_select_policy ON public.audit_trail;
DROP POLICY IF EXISTS audit_trail_insert_policy ON public.audit_trail;

CREATE POLICY audit_trail_select_policy
  ON public.audit_trail
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'auditor')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY audit_trail_insert_policy
  ON public.audit_trail
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'auditor')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );