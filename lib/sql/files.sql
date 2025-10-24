-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_url text NOT NULL, -- Supabase Storage URL
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  created_at timestamp DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_files_tenant_owner ON public.files(tenant_id, owner_user_id);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'files' AND policyname = 'files_select_owner_or_admin'
  ) THEN
    CREATE POLICY files_select_owner_or_admin
      ON public.files
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND owner_user_id = auth.uid()
        )
      );
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'files' AND policyname = 'files_insert_owner_and_tenant'
  ) THEN
    CREATE POLICY files_insert_owner_and_tenant
      ON public.files
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND owner_user_id = auth.uid()
        )
      );
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'files' AND policyname = 'files_delete_owner_and_tenant'
  ) THEN
    CREATE POLICY files_delete_owner_and_tenant
      ON public.files
      FOR DELETE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND owner_user_id = auth.uid()
        )
      );
  END IF;
END;
$$;
