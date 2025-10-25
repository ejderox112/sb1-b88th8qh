-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.retention_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  entity_type text NOT NULL, -- e.g. 'user', 'project', 'audit_log'
  retention_days int NOT NULL CHECK (retention_days >= 0),
  action text DEFAULT 'delete' CHECK (action IN ('delete', 'anonymize')),
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.retention_rules ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_retention_rules_tenant_entity ON public.retention_rules(tenant_id, entity_type);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS retention_rules_select_policy ON public.retention_rules;
DROP POLICY IF EXISTS retention_rules_insert_policy ON public.retention_rules;
DROP POLICY IF EXISTS retention_rules_update_policy ON public.retention_rules;
DROP POLICY IF EXISTS retention_rules_delete_policy ON public.retention_rules;

CREATE POLICY retention_rules_select_policy
  ON public.retention_rules
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY retention_rules_insert_policy
  ON public.retention_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY retention_rules_update_policy
  ON public.retention_rules
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

CREATE POLICY retention_rules_delete_policy
  ON public.retention_rules
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );