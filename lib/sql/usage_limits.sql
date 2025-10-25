-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  limit_type text NOT NULL CHECK (limit_type IN (
    'api_calls', 'sessions', 'storage_mb', 'recordings', 'users', 'features'
  )),
  limit_value int NOT NULL CHECK (limit_value >= 0),
  period text CHECK (period IN ('daily', 'monthly', 'yearly')),
  is_enforced boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_usage_limits_tenant_type ON public.usage_limits(tenant_id, limit_type);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS usage_limits_select_policy ON public.usage_limits;
DROP POLICY IF EXISTS usage_limits_insert_policy ON public.usage_limits;
DROP POLICY IF EXISTS usage_limits_update_policy ON public.usage_limits;
DROP POLICY IF EXISTS usage_limits_delete_policy ON public.usage_limits;

CREATE POLICY usage_limits_select_policy
  ON public.usage_limits
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer', 'finance')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY usage_limits_insert_policy
  ON public.usage_limits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'finance')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY usage_limits_update_policy
  ON public.usage_limits
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'finance')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'finance')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY usage_limits_delete_policy
  ON public.usage_limits
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'finance')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
