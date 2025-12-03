-- Canonical user profile schema: drop legacy tables, ensure columns/defaults/policies

-- Remove obsolete public.profiles table to avoid schema drift
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create user_profiles table if it does not exist
DO $$
BEGIN
  IF to_regclass('public.user_profiles') IS NULL THEN
    CREATE TABLE public.user_profiles (
      id uuid PRIMARY KEY DEFAULT auth.uid(),
      email text,
      full_name text,
      nickname text,
      user_code text,
      avatar_url text,
      level integer DEFAULT 1,
      xp integer DEFAULT 0,
      trust_score integer DEFAULT 0,
      location_sharing boolean DEFAULT true,
      nearby_visibility_enabled boolean DEFAULT true,
      messages_opt_in boolean DEFAULT true,
      photo_capture_opt_in boolean DEFAULT false,
      profile_visible boolean DEFAULT true,
      indoor_nav_enabled boolean DEFAULT false,
      city_visible boolean DEFAULT true,
      dominant_city text,
      dominant_city_hours numeric,
      gender text,
      age smallint,
      show_gender boolean DEFAULT true,
      show_age boolean DEFAULT true,
      nickname_locked boolean DEFAULT false,
      can_bypass_photo_limit boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Ensure the primary key references auth.users and cascades on delete
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add/align required columns
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS user_code text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS level integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS location_sharing boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS nearby_visibility_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS messages_opt_in boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS photo_capture_opt_in boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_visible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS indoor_nav_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS city_visible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS dominant_city text,
  ADD COLUMN IF NOT EXISTS dominant_city_hours numeric,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS age smallint,
  ADD COLUMN IF NOT EXISTS show_gender boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_age boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS nickname_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_bypass_photo_limit boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Enforce defaults in case the columns already existed without them
ALTER TABLE public.user_profiles ALTER COLUMN level SET DEFAULT 1;
ALTER TABLE public.user_profiles ALTER COLUMN xp SET DEFAULT 0;
ALTER TABLE public.user_profiles ALTER COLUMN trust_score SET DEFAULT 0;
ALTER TABLE public.user_profiles ALTER COLUMN location_sharing SET DEFAULT true;
ALTER TABLE public.user_profiles ALTER COLUMN nearby_visibility_enabled SET DEFAULT true;
ALTER TABLE public.user_profiles ALTER COLUMN messages_opt_in SET DEFAULT true;
ALTER TABLE public.user_profiles ALTER COLUMN photo_capture_opt_in SET DEFAULT false;
ALTER TABLE public.user_profiles ALTER COLUMN profile_visible SET DEFAULT true;
ALTER TABLE public.user_profiles ALTER COLUMN indoor_nav_enabled SET DEFAULT false;
ALTER TABLE public.user_profiles ALTER COLUMN city_visible SET DEFAULT true;
ALTER TABLE public.user_profiles ALTER COLUMN show_gender SET DEFAULT true;
ALTER TABLE public.user_profiles ALTER COLUMN show_age SET DEFAULT true;
ALTER TABLE public.user_profiles ALTER COLUMN nickname_locked SET DEFAULT false;
ALTER TABLE public.user_profiles ALTER COLUMN can_bypass_photo_limit SET DEFAULT false;
ALTER TABLE public.user_profiles ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.user_profiles ALTER COLUMN updated_at SET DEFAULT now();

-- Deduplicate NULLs for boolean flags so policies behave consistently
UPDATE public.user_profiles SET location_sharing = true WHERE location_sharing IS NULL;
UPDATE public.user_profiles SET nearby_visibility_enabled = true WHERE nearby_visibility_enabled IS NULL;
UPDATE public.user_profiles SET messages_opt_in = true WHERE messages_opt_in IS NULL;
UPDATE public.user_profiles SET profile_visible = true WHERE profile_visible IS NULL;
UPDATE public.user_profiles SET city_visible = true WHERE city_visible IS NULL;

-- Helpful indexes for lookups
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_profiles_code ON public.user_profiles(user_code) WHERE user_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_profiles_nickname ON public.user_profiles(nickname) WHERE nickname IS NOT NULL;

-- RLS setup
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_select_self ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_update_self ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_insert_self ON public.user_profiles;

CREATE POLICY user_profiles_select_self ON public.user_profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR coalesce(auth.jwt() ->> 'user_role', '') IN ('admin','moderator')
  );

CREATE POLICY user_profiles_update_self ON public.user_profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR coalesce(auth.jwt() ->> 'user_role', '') IN ('admin','moderator')
  )
  WITH CHECK (
    auth.uid() = id
    OR coalesce(auth.jwt() ->> 'user_role', '') IN ('admin','moderator')
  );

CREATE POLICY user_profiles_insert_self ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id
    OR coalesce(auth.jwt() ->> 'user_role', '') IN ('admin','moderator')
  );
