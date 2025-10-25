-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  user_id uuid,
  email text NOT NULL,
  subject text,
  body_preview text,
  type text NOT NULL CHECK (type IN ('invite', 'reminder', 'notification', 'system', 'custom')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_email_logs_user_status ON public.email_logs(user_id, tenant_id, status, sent_at);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT (sadece admin görebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'email_logs' AND policyname = 'email_logs_select_admin_only'
  ) THEN
    CREATE POLICY email_logs_select_admin_only
      ON public.email_logs
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
      );
  END IF;

  -- INSERT (sistem veya admin tarafından yapılır)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'email_logs' AND policyname = 'email_logs_insert_admin_only'
  ) THEN
    CREATE POLICY email_logs_insert_admin_only
      ON public.email_logs
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
      );
  END IF;

  -- UPDATE (örn. status = 'sent' veya error_message güncellemesi)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'email_logs' AND policyname = 'email_logs_update_admin_only'
  ) THEN
    CREATE POLICY email_logs_update_admin_only
      ON public.email_logs
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
