-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.ab_test_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  test_name text NOT NULL,
  variant_name text NOT NULL,
  description text,
  is_control boolean DEFAULT false,
  rollout_percentage int CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.ab_test_variants ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_tenant_test ON public.ab_test_variants(tenant_id, test_name);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS ab_test_variants_select_policy ON public.ab_test_variants;
DROP POLICY IF EXISTS ab_test_variants_insert_policy ON public.ab_test_variants;
DROP POLICY IF EXISTS ab_test_variants_update_policy ON public.ab_test_variants;
DROP POLICY IF EXISTS ab_test_variants_delete_policy ON public.ab_test_variants;

CREATE POLICY ab_test_variants_select_policy
  ON public.ab_test_variants
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'product', 'analyst')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY ab_test_variants_insert_policy
  ON public.ab_test_variants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'product')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY ab_test_variants_update_policy
  ON public.ab_test_variants
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'product')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'product')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY ab_test_variants_delete_policy
  ON public.ab_test_variants
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'product')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );