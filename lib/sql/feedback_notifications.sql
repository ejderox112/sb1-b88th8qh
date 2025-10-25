CREATE TABLE IF NOT EXISTS public.feedback_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  topic_id uuid,
  notification_type text CHECK (notification_type IN ('mention', 'comment', 'resolution')) NOT NULL,
  is_read boolean DEFAULT false,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feedback_notifications_tenant_user ON public.feedback_notifications(tenant_id, user_id);

DROP POLICY IF EXISTS feedback_notifications_select_policy ON public.feedback_notifications;
DROP POLICY IF EXISTS feedback_notifications_insert_policy ON public.feedback_notifications;

CREATE POLICY feedback_notifications_select_policy
  ON public.feedback_notifications
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );

CREATE POLICY feedback_notifications_insert_policy
  ON public.feedback_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );
