-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_done boolean DEFAULT false,
  owner_user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  created_at timestamp DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_checklists_task_owner ON public.checklists(task_id, tenant_id, owner_user_id);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'checklists' AND policyname = 'checklists_select_owner_or_admin'
  ) THEN
    CREATE POLICY checklists_select_owner_or_admin
      ON public.checklists
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
    WHERE schemaname = 'public' AND tablename = 'checklists' AND policyname = 'checklists_insert_owner_and_tenant'
  ) THEN
    CREATE POLICY checklists_insert_owner_and_tenant
      ON public.checklists
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND owner_user_id = auth.uid()
        )
      );
  END IF;

  -- UPDATE (örn. is_done = true yapmak için)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'checklists' AND policyname = 'checklists_update_owner_and_tenant'
  ) THEN
    CREATE POLICY checklists_update_owner_and_tenant
      ON public.checklists
      FOR UPDATE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND owner_user_id = auth.uid()
        )
      )
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
    WHERE schemaname = 'public' AND tablename = 'checklists' AND policyname = 'checklists_delete_owner_and_tenant'
  ) THEN
    CREATE POLICY checklists_delete_owner_and_tenant
      ON public.checklists
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
