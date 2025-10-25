CREATE TABLE IF NOT EXISTS public.audit_trails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  occurred_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_trails ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_trails_tenant_entity ON public.audit_trails(tenant_id, entity_type);

DROP POLICY IF EXISTS audit_trails_select_policy ON public.audit_trails;
DROP POLICY IF EXISTS audit_trails_insert_policy ON public.audit_trails;

CREATE POLICY audit_trails_select_policy
  ON public.audit_trails
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY audit_trails_insert_policy
  ON public.audit_trails
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
