-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'status' CHECK (type IN ('status', 'priority', 'category')),
  color text DEFAULT '#999999',
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_labels_tenant_type_name ON public.labels(tenant_id, type, name);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS labels_select_policy ON public.labels;
DROP POLICY IF EXISTS labels_insert_policy ON public.labels;
DROP POLICY IF EXISTS labels_update_policy ON public.labels;
DROP POLICY IF EXISTS labels_delete_policy ON public.labels;

CREATE POLICY labels_select_policy
  ON public.labels
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid)
  );

CREATE POLICY labels_insert_policy
  ON public.labels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY labels_update_policy
  ON public.labels
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

CREATE POLICY labels_delete_policy
  ON public.labels
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );