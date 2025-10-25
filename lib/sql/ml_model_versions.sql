-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.ml_model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  model_name text NOT NULL,
  version text NOT NULL,
  description text,
  is_active boolean DEFAULT false,
  deployed_at timestamptz,
  metrics jsonb, -- e.g. { "accuracy": 0.91, "f1_score": 0.88 }
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.ml_model_versions ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_ml_model_versions_tenant_model ON public.ml_model_versions(tenant_id, model_name);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS ml_model_versions_select_policy ON public.ml_model_versions;
DROP POLICY IF EXISTS ml_model_versions_insert_policy ON public.ml_model_versions;
DROP POLICY IF EXISTS ml_model_versions_update_policy ON public.ml_model_versions;
DROP POLICY IF EXISTS ml_model_versions_delete_policy ON public.ml_model_versions;

CREATE POLICY ml_model_versions_select_policy
  ON public.ml_model_versions
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'ml_engineer', 'analyst')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY ml_model_versions_insert_policy
  ON public.ml_model_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'ml_engineer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY ml_model_versions_update_policy
  ON public.ml_model_versions
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'ml_engineer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'ml_engineer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY ml_model_versions_delete_policy
  ON public.ml_model_versions
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'ml_engineer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
