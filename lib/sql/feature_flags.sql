-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  flag_key text NOT NULL, -- e.g. 'new_dashboard', 'ai_assistant', 'beta_export'
  is_enabled boolean DEFAULT false,
  rollout_percentage int CHECK (rollout_percentage BETWEEN 0 AND 100),
  targeting_rules jsonb, -- e.g. { "region": ["EU", "TR"], "user_role": ["admin"] }
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant_key ON public.feature_flags(tenant_id, flag_key);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS feature_flags_select_policy ON public.feature_flags;
DROP POLICY IF EXISTS feature_flags_insert_policy ON public.feature_flags;
DROP POLICY IF EXISTS feature_flags_update_policy ON public.feature_flags;
DROP POLICY IF EXISTS feature_flags_delete_policy ON public.feature_flags;

CREATE POLICY feature_flags_select_policy
  ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY feature_flags_insert_policy
  ON public.feature_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY feature_flags_update_policy
  ON public.feature_flags
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY feature_flags_delete_policy
  ON public.feature_flags
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );