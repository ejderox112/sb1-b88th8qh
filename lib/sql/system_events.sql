-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid,
  event_type text NOT NULL, -- e.g. 'login', 'setting.updated', 'integration.connected'
  context jsonb, -- e.g. { "ip": "1.2.3.4", "device": "mobile" }
  metadata jsonb, -- e.g. { "field": "timezone", "old": "UTC", "new": "Europe/Istanbul" }
  severity text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_system_events_tenant_type ON public.system_events(tenant_id, event_type);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS system_events_select_policy ON public.system_events;
DROP POLICY IF EXISTS system_events_insert_policy ON public.system_events;

CREATE POLICY system_events_select_policy
  ON public.system_events
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY system_events_insert_policy
  ON public.system_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );