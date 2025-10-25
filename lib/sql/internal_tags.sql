-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.internal_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  tag text NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('user', 'session', 'ticket', 'recording', 'event')),
  target_id uuid NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.internal_tags ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_internal_tags_tenant_target ON public.internal_tags(tenant_id, target_type, target_id);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS internal_tags_select_policy ON public.internal_tags;
DROP POLICY IF EXISTS internal_tags_insert_policy ON public.internal_tags;
DROP POLICY IF EXISTS internal_tags_delete_policy ON public.internal_tags;

CREATE POLICY internal_tags_select_policy
  ON public.internal_tags
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support', 'analyst')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY internal_tags_insert_policy
  ON public.internal_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support', 'analyst')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY internal_tags_delete_policy
  ON public.internal_tags
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support', 'analyst')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );