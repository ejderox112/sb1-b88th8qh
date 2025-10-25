-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  category text DEFAULT 'general', -- e.g. 'email', 'notification', 'document'
  content text NOT NULL,
  metadata jsonb, -- e.g. { "subject": "Welcome", "language": "en" }
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_templates_tenant_category ON public.templates(tenant_id, category);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS templates_select_policy ON public.templates;
DROP POLICY IF EXISTS templates_insert_policy ON public.templates;
DROP POLICY IF EXISTS templates_update_policy ON public.templates;
DROP POLICY IF EXISTS templates_delete_policy ON public.templates;

CREATE POLICY templates_select_policy
  ON public.templates
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid)
  );

CREATE POLICY templates_insert_policy
  ON public.templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY templates_update_policy
  ON public.templates
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

CREATE POLICY templates_delete_policy
  ON public.templates
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );