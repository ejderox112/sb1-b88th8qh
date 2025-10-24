-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  owner_user_id uuid,
  tenant_id uuid,
  created_at timestamp DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_comments_task_owner ON public.comments(task_id, tenant_id, owner_user_id);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'comments_select_owner_or_admin'
  ) THEN
    CREATE POLICY comments_select_owner_or_admin
      ON public.comments
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
    WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'comments_insert_owner_and_tenant'
  ) THEN
    CREATE POLICY comments_insert_owner_and_tenant
      ON public.comments
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
    WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'comments_update_owner_and_tenant'
  ) THEN
    CREATE POLICY comments_update_owner_and_tenant
      ON public.comments
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
    WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'comments_delete_owner_and_tenant'
  ) THEN
    CREATE POLICY comments_delete_owner_and_tenant
      ON public.comments
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
