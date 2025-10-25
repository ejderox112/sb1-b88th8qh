-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  author_id uuid NOT NULL,
  entity_type text NOT NULL, -- e.g. 'user', 'project', 'invoice'
  entity_id uuid NOT NULL,
  note text NOT NULL,
  visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'team')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_admin_notes_tenant_entity ON public.admin_notes(tenant_id, entity_type, entity_id);

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
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY admin_notes_insert_policy
  ON public.admin_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY admin_notes_update_policy
  ON public.admin_notes
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND author_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND author_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );

CREATE POLICY admin_notes_delete_policy
  ON public.admin_notes
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND author_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );