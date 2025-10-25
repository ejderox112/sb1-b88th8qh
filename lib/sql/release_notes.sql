-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.release_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  version text NOT NULL, -- e.g. 'v2.1.0', '2025.10.15'
  title text NOT NULL,
  description text,
  highlights text[], -- e.g. ['New dashboard', 'Bug fix on login']
  is_public boolean DEFAULT true,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.release_notes ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_release_notes_tenant_version ON public.release_notes(tenant_id, version);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS release_notes_select_policy ON public.release_notes;
DROP POLICY IF EXISTS release_notes_insert_policy ON public.release_notes;
DROP POLICY IF EXISTS release_notes_update_policy ON public.release_notes;
DROP POLICY IF EXISTS release_notes_delete_policy ON public.release_notes;

CREATE POLICY release_notes_select_policy
  ON public.release_notes
  FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR (
      (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY release_notes_insert_policy
  ON public.release_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY release_notes_update_policy
  ON public.release_notes
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY release_notes_delete_policy
  ON public.release_notes
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );