-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  author_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('user', 'ticket', 'session', 'recording', 'other')),
  target_id uuid NOT NULL,
  note text NOT NULL,
  visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_admin_notes_tenant_target ON public.admin_notes(tenant_id, target_type, target_id);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS admin_notes_select_policy ON public.admin_notes;
DROP POLICY IF EXISTS admin_notes_insert_policy ON public.admin_notes;
DROP POLICY IF EXISTS admin_notes_update_policy ON public.admin_notes;
DROP POLICY IF EXISTS admin_notes_delete_policy ON public.admin_notes;

CREATE POLICY admin_notes_select_policy
  ON public.admin_notes
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY admin_notes_insert_policy
  ON public.admin_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY admin_notes_update_policy
  ON public.admin_notes
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

CREATE POLICY admin_notes_delete_policy
  ON public.admin_notes
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );