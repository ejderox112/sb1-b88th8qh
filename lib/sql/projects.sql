-- 1) Tablo ve sütunlar
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp DEFAULT now(),
  owner_user_id uuid,
  tenant_id uuid
);

-- 2) RLS etkinleştirme
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_projects_tenant_owner ON public.projects(tenant_id, owner_user_id);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_select_owner_or_admin'
  ) THEN
    CREATE POLICY projects_select_owner_or_admin
      ON public.projects
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id IS NOT NULL
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND owner_user_id = auth.uid()
        )
      );
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_insert_owner_and_tenant'
  ) THEN
    CREATE POLICY projects_insert_owner_and_tenant
      ON public.projects
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id IS NOT NULL
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND owner_user_id = auth.uid()
        )
      );
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_update_owner_and_tenant'
  ) THEN
    CREATE POLICY projects_update_owner_and_tenant
      ON public.projects
      FOR UPDATE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id IS NOT NULL
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND owner_user_id = auth.uid()
        )
      )
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id IS NOT NULL
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND owner_user_id = auth.uid()
        )
      );
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_delete_owner_and_tenant'
  ) THEN
    CREATE POLICY projects_delete_owner_and_tenant
      ON public.projects
      FOR DELETE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id IS NOT NULL
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND owner_user_id = auth.uid()
        )
      );
  END IF;
END;
$$;
