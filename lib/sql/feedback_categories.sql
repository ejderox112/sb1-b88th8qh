CREATE TABLE IF NOT EXISTS public.feedback_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  category_key text NOT NULL,
  label text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_categories ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_categories_tenant_key ON public.feedback_categories(tenant_id, category_key);

DROP POLICY IF EXISTS feedback_categories_select_policy ON public.feedback_categories;
DROP POLICY IF EXISTS feedback_categories_insert_policy ON public.feedback_categories;

CREATE POLICY feedback_categories_select_policy
  ON public.feedback_categories
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY feedback_categories_insert_policy
  ON public.feedback_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
