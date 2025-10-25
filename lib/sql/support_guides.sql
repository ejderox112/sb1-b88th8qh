-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.support_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  category text,
  content markdown NOT NULL,
  is_published boolean DEFAULT false,
  language text DEFAULT 'en',
  tags text[],
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.support_guides ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_support_guides_tenant_slug ON public.support_guides(tenant_id, slug);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS support_guides_select_policy ON public.support_guides;
DROP POLICY IF EXISTS support_guides_insert_policy ON public.support_guides;
DROP POLICY IF EXISTS support_guides_update_policy ON public.support_guides;
DROP POLICY IF EXISTS support_guides_delete_policy ON public.support_guides;

CREATE POLICY support_guides_select_policy
  ON public.support_guides
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (
      is_published = true
      OR (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support')
    )
  );

CREATE POLICY support_guides_insert_policy
  ON public.support_guides
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY support_guides_update_policy
  ON public.support_guides
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY support_guides_delete_policy
  ON public.support_guides
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
