-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.shortcuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  label text NOT NULL,
  target_url text NOT NULL,
  icon text DEFAULT '🔗',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.shortcuts ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_shortcuts_user_tenant ON public.shortcuts(user_id, tenant_id);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS shortcuts_select_policy ON public.shortcuts;
DROP POLICY IF EXISTS shortcuts_insert_policy ON public.shortcuts;
DROP POLICY IF EXISTS shortcuts_update_policy ON public.shortcuts;
DROP POLICY IF EXISTS shortcuts_delete_policy ON public.shortcuts;

CREATE POLICY shortcuts_select_policy
  ON public.shortcuts
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY shortcuts_insert_policy
  ON public.shortcuts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY shortcuts_update_policy
  ON public.shortcuts
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY shortcuts_delete_policy
  ON public.shortcuts
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );