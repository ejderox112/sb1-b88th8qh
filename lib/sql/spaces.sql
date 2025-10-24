-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  tenant_id uuid,
  owner_user_id uuid,
  created_at timestamp DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_spaces_tenant_owner ON public.spaces(tenant_id, owner_user_id);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'spaces' AND policyname = 'spaces_select_owner_or_admin'
  ) THEN
    CREATE POLICY spaces_select_owner_or_admin
      ON public.spaces
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
    WHERE schemaname = 'public' AND tablename = 'spaces' AND policyname = 'spaces_insert_owner_and_tenant'
  ) THEN
    CREATE POLICY spaces_insert_owner_and_tenant
      ON public.spaces
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
    WHERE schemaname = 'public' AND tablename = 'spaces' AND policyname = 'spaces_update_owner_and_tenant'
  ) THEN
    CREATE POLICY spaces_update_owner_and_tenant
      ON public.spaces
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
    WHERE schemaname = 'public' AND tablename = 'spaces' AND policyname = 'spaces_delete_owner_and_tenant'
  ) THEN
    CREATE POLICY spaces_delete_owner_and_tenant
      ON public.spaces
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
