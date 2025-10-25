-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.feedback_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  category text DEFAULT 'general', -- e.g. 'bug', 'suggestion', 'praise', 'complaint'
  message text NOT NULL,
  rating int CHECK (rating BETWEEN 1 AND 5),
  metadata jsonb, -- e.g. { "source": "mobile", "screen": "dashboard" }
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_feedback_entries_tenant_category ON public.feedback_entries(tenant_id, category);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS feedback_entries_select_policy ON public.feedback_entries;
DROP POLICY IF EXISTS feedback_entries_insert_policy ON public.feedback_entries;
DROP POLICY IF EXISTS feedback_entries_delete_policy ON public.feedback_entries;

CREATE POLICY feedback_entries_select_policy
  ON public.feedback_entries
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY feedback_entries_insert_policy
  ON public.feedback_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY feedback_entries_delete_policy
  ON public.feedback_entries
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
  );