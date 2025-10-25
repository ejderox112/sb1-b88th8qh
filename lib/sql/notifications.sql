-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.notifications_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid,
  channel text NOT NULL CHECK (channel IN ('email', 'push', 'sms')),
  payload jsonb NOT NULL, -- e.g. { "subject": "...", "body": "...", "target": "..." }
  scheduled_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.notifications_queue ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_notifications_queue_tenant_status ON public.notifications_queue(tenant_id, status);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS notifications_queue_select_policy ON public.notifications_queue;
DROP POLICY IF EXISTS notifications_queue_insert_policy ON public.notifications_queue;
DROP POLICY IF EXISTS notifications_queue_update_policy ON public.notifications_queue;
DROP POLICY IF EXISTS notifications_queue_delete_policy ON public.notifications_queue;

CREATE POLICY notifications_queue_select_policy
  ON public.notifications_queue
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND (
        user_id IS NULL
        OR user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      )
    )
  );

CREATE POLICY notifications_queue_insert_policy
  ON public.notifications_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND (
        user_id IS NULL
        OR user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      )
    )
  );

CREATE POLICY notifications_queue_update_policy
  ON public.notifications_queue
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
  );

CREATE POLICY notifications_queue_delete_policy
  ON public.notifications_queue
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
  );