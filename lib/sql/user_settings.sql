-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tenant_id uuid NOT NULL,
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  language text DEFAULT 'en',
  notifications_enabled boolean DEFAULT true,
  timezone text DEFAULT 'UTC',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_user_settings_user_tenant ON public.user_settings(user_id, tenant_id);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT (sadece kendi ayarlarını görebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'user_settings_select_self_or_admin'
  ) THEN
    CREATE POLICY user_settings_select_self_or_admin
      ON public.user_settings
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          user_id = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- INSERT (ilk ayar oluşturulurken)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'user_settings_insert_self_and_tenant'
  ) THEN
    CREATE POLICY user_settings_insert_self_and_tenant
      ON public.user_settings
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          user_id = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- UPDATE (kendi ayarlarını değiştirebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'user_settings_update_self_and_tenant'
  ) THEN
    CREATE POLICY user_settings_update_self_and_tenant
      ON public.user_settings
      FOR UPDATE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          user_id = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      )
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          user_id = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;
END;
$$;
