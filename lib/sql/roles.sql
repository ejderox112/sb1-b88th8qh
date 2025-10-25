-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  assigned_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_roles_user_tenant ON public.roles(user_id, tenant_id);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT (kendi rolünü görebilir, admin tümünü görebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'roles' AND policyname = 'roles_select_self_or_admin'
  ) THEN
    CREATE POLICY roles_select_self_or_admin
      ON public.roles
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          user_id = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- INSERT (admin veya owner rolündeki kullanıcılar atama yapabilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'roles' AND policyname = 'roles_insert_admin_or_owner'
  ) THEN
    CREATE POLICY roles_insert_admin_or_owner
      ON public.roles
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          (auth.jwt() ->> 'role') IN ('admin', 'owner')
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- DELETE (admin veya owner kaldırabilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'roles' AND policyname = 'roles_delete_admin_or_owner'
  ) THEN
    CREATE POLICY roles_delete_admin_or_owner
      ON public.roles
      FOR DELETE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          (auth.jwt() ->> 'role') IN ('admin', 'owner')
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;
END;
$$;
