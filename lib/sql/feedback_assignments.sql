CREATE TABLE IF NOT EXISTS public.feedback_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  assigned_to uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_assignments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_assignments_tenant_topic ON public.feedback_assignments(tenant_id, topic_id);

DROP POLICY IF EXISTS feedback_assignments_select_policy ON public.feedback_assignments;
DROP POLICY IF EXISTS feedback_assignments_insert_policy ON public.feedback_assignments;

CREATE POLICY feedback_assignments_select_policy
  ON public.feedback_assignments
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (
      assigned_to = (
