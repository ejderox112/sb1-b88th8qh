-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.user_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  filter jsonb NOT NULL, -- e.g. { "country": "TR", "plan": ["pro", "enterprise"], "last_seen": { "gte": "2023-01-01" } }
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.user_segments ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_user_segments_tenant_active ON public.user_segments(tenant_id, is_active);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS user_segments_select_policy ON public.user_segments;
DROP POLICY IF EXISTS user_segments_insert_policy ON public.user_segments;
DROP POLICY IF EXISTS user_segments_update_policy ON public.user_segments;
DROP POLICY IF EXISTS user_segments_delete_policy ON public.user_segments;

CREATE POLICY user_segments_select_policy
  ON public.user_segments
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'analyst')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY user_segments_insert_policy
  ON public.user_segments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'analyst')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY user_segments_update_policy
  ON public.user_segments
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'analyst')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'analyst')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY user_segments_delete_policy
  ON public.user_segments
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'analyst')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );