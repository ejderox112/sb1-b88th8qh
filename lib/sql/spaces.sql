-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_spaces_tenant_visibility ON public.spaces(tenant_id, visibility);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT (admin, tenant üyeleri veya public olanlar görebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'spaces' AND policyname = 'spaces_select_tenant_or_public_or_admin'
  ) THEN
    CREATE POLICY spaces_select_tenant_or_public_or_admin
      ON public.spaces
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR visibility = 'public'
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
      );
  END IF;

  -- INSERT (sadece kendi tenant’ı için oluşturabilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'spaces' AND policyname = 'spaces_insert_creator_and_tenant'
  ) THEN
    CREATE POLICY spaces_insert_creator_and_tenant
      ON public.spaces
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          created_by = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- UPDATE (sadece oluşturucu veya admin güncelleyebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'spaces' AND policyname = 'spaces_update_creator_or_admin'
  ) THEN
    CREATE POLICY spaces_update_creator_or_admin
      ON public.spaces
      FOR UPDATE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          created_by = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      )
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          created_by = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;
END;
$$;
