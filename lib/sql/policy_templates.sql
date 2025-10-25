CREATE TABLE IF NOT EXISTS public.policy_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  template_name text NOT NULL,
  policy_sql text NOT NULL,
  usage_scope text CHECK (usage_scope IN ('table', 'view', 'function')) DEFAULT 'table',
  is_public boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.policy_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_policy_templates_tenant_scope ON public.policy_templates(tenant_id, usage_scope);

DROP POLICY IF EXISTS policy_templates_select_policy ON public.policy_templates;
DROP POLICY IF EXISTS policy_templates_insert_policy ON public.policy_templates;

CREATE POLICY policy_templates_select_policy
  ON public.policy_templates
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (
      is_public = true
      OR (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    )
  );

CREATE POLICY policy_templates_insert_policy
  ON public.policy_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
  );
