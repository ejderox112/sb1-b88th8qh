-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#cccccc',
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_tags_tenant_name ON public.tags(tenant_id, name);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS tags_select_policy ON public.tags;
DROP POLICY IF EXISTS tags_insert_policy ON public.tags;
DROP POLICY IF EXISTS tags_update_policy ON public.tags;
DROP POLICY IF EXISTS tags_delete_policy ON public.tags;

CREATE POLICY tags_select_policy
  ON public.tags
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid)
  );

CREATE POLICY tags_insert_policy
  ON public.tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY tags_update_policy
  ON public.tags
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY tags_delete_policy
  ON public.tags
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );