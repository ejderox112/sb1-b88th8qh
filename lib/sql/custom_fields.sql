-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'boolean', 'date', 'select')),
  options jsonb, -- only for 'select' type, e.g. ["Gold", "Silver", "Bronze"]
  is_required boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_custom_fields_tenant_name ON public.custom_fields(tenant_id, name);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS custom_fields_select_policy ON public.custom_fields;
DROP POLICY IF EXISTS custom_fields_insert_policy ON public.custom_fields;
DROP POLICY IF EXISTS custom_fields_update_policy ON public.custom_fields;
DROP POLICY IF EXISTS custom_fields_delete_policy ON public.custom_fields;

CREATE POLICY custom_fields_select_policy
  ON public.custom_fields
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid)
  );

CREATE POLICY custom_fields_insert_policy
  ON public.custom_fields
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY custom_fields_update_policy
  ON public.custom_fields
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

CREATE POLICY custom_fields_delete_policy
  ON public.custom_fields
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );