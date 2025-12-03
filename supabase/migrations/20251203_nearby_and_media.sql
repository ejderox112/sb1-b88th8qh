-- Supabase migration: proximity toggles, reserved nicknames, parking events & room photos

-- 1) Extend user_profiles with privacy + media settings
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS nearby_visibility_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS messages_opt_in boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS photo_capture_opt_in boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS nickname_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_bypass_photo_limit boolean DEFAULT false;

ALTER TABLE IF EXISTS public.user_profiles
  DROP CONSTRAINT IF EXISTS chk_reserved_seekmap_nickname;

ALTER TABLE IF EXISTS public.user_profiles
  ADD CONSTRAINT chk_reserved_seekmap_nickname
  CHECK (nickname_locked OR lower(nickname) NOT LIKE 'seekmap%');

-- Force admin profile nickname + lock (if admin user exists)
DO $$
DECLARE
  admin_uid uuid;
BEGIN
  SELECT id INTO admin_uid FROM auth.users WHERE lower(email) = 'ejderha112@gmail.com';
  IF admin_uid IS NOT NULL THEN
    UPDATE public.user_profiles
    SET nickname = 'SeekMap', nickname_locked = true
    WHERE id = admin_uid;
  END IF;
END $$;

-- 2) Parking events table for outdoor-to-indoor transitions
CREATE TABLE IF NOT EXISTS public.parking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  confidence numeric(3,2) DEFAULT 0.75 CHECK (confidence >= 0 AND confidence <= 1),
  source text CHECK (source IN ('auto','manual','admin')) DEFAULT 'auto',
  detected_at timestamptz DEFAULT now(),
  notes text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parking_events_user_time
  ON public.parking_events(user_id, detected_at DESC);

ALTER TABLE public.parking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY parking_events_select_own ON public.parking_events
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY parking_events_mutate_own ON public.parking_events
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY parking_events_admin_all ON public.parking_events
  FOR ALL
  USING (coalesce(auth.jwt()->>'user_role','') IN ('admin','moderator'))
  WITH CHECK (coalesce(auth.jwt()->>'user_role','') IN ('admin','moderator'));

-- 3) Room photos with JPEG-only uploads + per-day quota
CREATE TABLE IF NOT EXISTS public.room_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.locations(id),
  room_label text,
  file_url text NOT NULL,
  format text NOT NULL DEFAULT 'jpg' CHECK (lower(format) = 'jpg'),
  file_size_bytes integer CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
  gps_lat double precision,
  gps_lng double precision,
  gps_accuracy double precision,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejection_reason text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_photos_user_time
  ON public.room_photos(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_room_photos_status
  ON public.room_photos(status, created_at DESC);

ALTER TABLE public.room_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY room_photos_user_select ON public.room_photos
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY room_photos_user_insert ON public.room_photos
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY room_photos_user_update ON public.room_photos
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY room_photos_user_delete ON public.room_photos
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY room_photos_admin_all ON public.room_photos
  FOR ALL
  USING (coalesce(auth.jwt()->>'user_role','') IN ('admin','moderator'))
  WITH CHECK (coalesce(auth.jwt()->>'user_role','') IN ('admin','moderator'));

-- Trigger to enforce max 5 uploads/day unless bypass flag set
CREATE OR REPLACE FUNCTION public.enforce_room_photo_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_start timestamptz := date_trunc('day', timezone('UTC', now()));
  today_end timestamptz := today_start + interval '1 day';
  upload_count integer;
  bypass boolean := false;
BEGIN
  SELECT can_bypass_photo_limit INTO bypass
  FROM public.user_profiles
  WHERE id = NEW.user_id;

  IF bypass THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO upload_count
  FROM public.room_photos
  WHERE user_id = NEW.user_id
    AND created_at >= today_start
    AND created_at < today_end;

  IF upload_count >= 5 THEN
    RAISE EXCEPTION 'Günlük maksimum 5 fotoğraf yükleyebilirsiniz.' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- generic helper to stamp updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_room_photos_daily_limit ON public.room_photos;
CREATE TRIGGER trg_room_photos_daily_limit
  BEFORE INSERT ON public.room_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_room_photo_limit();

-- Automatically maintain updated_at
DROP TRIGGER IF EXISTS trg_room_photos_set_updated ON public.room_photos;
CREATE TRIGGER trg_room_photos_set_updated
  BEFORE UPDATE ON public.room_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 4) Live location metadata + discovery policy
ALTER TABLE IF EXISTS public.live_locations
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

DROP POLICY IF EXISTS ll_select_nearby_opt_in ON public.live_locations;

CREATE POLICY ll_select_nearby_opt_in ON public.live_locations
  FOR SELECT
  TO authenticated
  USING (
    is_sharing = true
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = public.live_locations.user_id
        AND coalesce(up.location_sharing, true)
        AND coalesce(up.nearby_visibility_enabled, true)
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles viewer
      WHERE viewer.id = public.current_auth_uid()
        AND coalesce(viewer.location_sharing, true)
        AND coalesce(viewer.nearby_visibility_enabled, true)
    )
  );
