-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid,
  flag_key text NOT NULL, -- e.g. 'new_dashboard', 'ai_assistant'
  is_enabled boolean DEFAULT false,
  source text DEFAULT 'manual', -- e.g. 'manual', 'experiment', 'cohort'
  metadata jsonb, -- e.g. { "rollout": "25%", "region": "EU" }
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant_flag ON public.feature_flags(tenant_id, flag_key);

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
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND (
        user_id IS NULL
        OR user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      )
    )
  );

CREATE POLICY feature_flags_insert_policy
  ON public.feature_flags
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

CREATE POLICY feature_flags_update_policy
  ON public.feature_flags
  FOR UPDATE
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
  )
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

CREATE POLICY feature_flags_delete_policy
  ON public.feature_flags
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
  );