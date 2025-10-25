-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.data_retention_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  data_type text NOT NULL CHECK (data_type IN (
    'session', 'recording', 'event', 'user', 'ticket', 'log', 'audit'
  )),
  retention_days int NOT NULL CHECK (retention_days >= 0),
  is_active boolean DEFAULT true,
  auto_delete boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.data_retention_rules ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_data_retention_rules_tenant_type ON public.data_retention_rules(tenant_id, data_type);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS data_retention_rules_select_policy ON public.data_retention_rules;
DROP POLICY IF EXISTS data_retention_rules_insert_policy ON public.data_retention_rules;
DROP POLICY IF EXISTS data_retention_rules_update_policy ON public.data_retention_rules;
DROP POLICY IF EXISTS data_retention_rules_delete_policy ON public.data_retention_rules;

CREATE POLICY data_retention_rules_select_policy
  ON public.data_retention_rules
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'compliance')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY data_retention_rules_insert_policy
  ON public.data_retention_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'compliance')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY data_retention_rules_update_policy
  ON public.data_retention_rules
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'compliance')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'compliance')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY data_retention_rules_delete_policy
  ON public.data_retention_rules
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'compliance')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );