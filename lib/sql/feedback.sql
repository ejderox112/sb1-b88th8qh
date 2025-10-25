-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  category text CHECK (category IN ('bug', 'suggestion', 'praise', 'other')) DEFAULT 'other',
  message text NOT NULL,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_feedback_user_tenant ON public.feedback(user_id, tenant_id);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT (sadece admin görebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'feedback' AND policyname = 'feedback_select_admin_only'
  ) THEN
    CREATE POLICY feedback_select_admin_only
      ON public.feedback
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
      );
  END IF;

  -- INSERT (her kullanıcı kendi tenant'ı içinde geri bildirim bırakabilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'feedback' AND policyname = 'feedback_insert_user_and_tenant'
  ) THEN
    CREATE POLICY feedback_insert_user_and_tenant
      ON public.feedback
      FOR INSERT
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
