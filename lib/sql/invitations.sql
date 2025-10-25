-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invited_by uuid NOT NULL,
  tenant_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_invitations_email_tenant ON public.invitations(email, tenant_id);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT (admin veya davet edilen e-posta görebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invitations' AND policyname = 'invitations_select_admin_or_email'
  ) THEN
    CREATE POLICY invitations_select_admin_or_email
      ON public.invitations
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          lower(email) = lower(auth.jwt() ->> 'email')
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- INSERT (admin veya owner davet gönderebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invitations' AND policyname = 'invitations_insert_admin_or_owner'
  ) THEN
    CREATE POLICY invitations_insert_admin_or_owner
      ON public.invitations
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          (auth.jwt() ->> 'role') IN ('admin', 'owner')
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- UPDATE (sadece admin veya davet edilen kişi kabul/ret yapabilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invitations' AND policyname = 'invitations_update_admin_or_email'
  ) THEN
    CREATE POLICY invitations_update_admin_or_email
      ON public.invitations
      FOR UPDATE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          lower(email) = lower(auth.jwt() ->> 'email')
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      )
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          lower(email) = lower(auth.jwt() ->> 'email')
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;
END;
$$;
