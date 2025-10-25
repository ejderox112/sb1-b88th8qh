-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid,
  experiment_key text NOT NULL, -- e.g. 'new_onboarding_flow'
  variant text NOT NULL, -- e.g. 'control', 'variant_a', 'variant_b'
  assigned_at timestamptz DEFAULT now(),
  metadata jsonb, -- e.g. { "source": "web", "cohort": "beta_users" }
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_experiments_tenant_key ON public.experiments(tenant_id, experiment_key);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS experiments_select_policy ON public.experiments;
DROP POLICY IF EXISTS experiments_insert_policy ON public.experiments;
DROP POLICY IF EXISTS experiments_delete_policy ON public.experiments;

CREATE POLICY experiments_select_policy
  ON public.experiments
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND (
        user_id IS NULL
        OR user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      )
    )
  );

CREATE POLICY experiments_insert_policy
  ON public.experiments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND (
        user_id IS NULL
        OR user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      )
    )
  );

CREATE POLICY experiments_delete_policy
  ON public.experiments
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
  );