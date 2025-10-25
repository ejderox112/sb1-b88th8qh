-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  template_name text NOT NULL,
  subject text NOT NULL,
  body_html text,
  body_text text,
  language text DEFAULT 'en',
  category text CHECK (category IN ('system', 'marketing', 'transactional')),
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_name ON public.email_templates(tenant_id, template_name);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS email_templates_select_policy ON public.email_templates;
DROP POLICY IF EXISTS email_templates_insert_policy ON public.email_templates;
DROP POLICY IF EXISTS email_templates_update_policy ON public.email_templates;
DROP POLICY IF EXISTS email_templates_delete_policy ON public.email_templates;

CREATE POLICY email_templates_select_policy
  ON public.email_templates
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer', 'marketer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY email_templates_insert_policy
  ON public.email_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer', 'marketer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY email_templates_update_policy
  ON public.email_templates
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer', 'marketer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer', 'marketer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY email_templates_delete_policy
  ON public.email_templates
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer', 'marketer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );