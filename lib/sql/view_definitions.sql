CREATE TABLE IF NOT EXISTS public.view_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  view_name text NOT NULL,
  definition_sql text NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.view_definitions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_view_definitions_tenant_name ON public.view_definitions(tenant_id, view_name);

DROP POLICY IF EXISTS view_definitions_select_policy ON public.view_definitions;
DROP POLICY IF EXISTS view_definitions_insert_policy ON public.view_definitions;

CREATE POLICY view_definitions_select_policy
  ON public.view_definitions
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY view_definitions_insert_policy
  ON public.view_definitions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
