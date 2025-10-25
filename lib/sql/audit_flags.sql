-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.audit_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flagged_by uuid NOT NULL,
  tenant_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('task', 'project', 'comment', 'user')),
  target_id uuid NOT NULL,
  reason text,
  severity text CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'low',
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.audit_flags ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_audit_flags_target_tenant ON public.audit_flags(target_type, target_id, tenant_id);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT (sadece admin görebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_flags' AND policyname = 'audit_flags_select_admin_only'
  ) THEN
    CREATE POLICY audit_flags_select_admin_only
      ON public.audit_flags
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
      );
  END IF;

  -- INSERT (her kullanıcı kendi tenant'ı içinde flag ekleyebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_flags' AND policyname = 'audit_flags_insert_user_and_tenant'
  ) THEN
    CREATE POLICY audit_flags_insert_user_and_tenant
      ON public.audit_flags
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          flagged_by = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- UPDATE (sadece admin çözümleyebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_flags' AND policyname = 'audit_flags_update_admin_only'
  ) THEN
    CREATE POLICY audit_flags_update_admin_only
      ON public.audit_flags
      FOR UPDATE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
      )
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
      );
  END IF;
END;
$$;
