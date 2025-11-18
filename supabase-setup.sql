-- user_profiles tablosuna eksik kolonları ekle
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS nickname text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS level integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS show_gender boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_age boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS gender_change_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_gender_change timestamp with time zone,
ADD COLUMN IF NOT EXISTS requires_gender_approval boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS user_code text;

-- gender_change_log tablosunu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS public.gender_change_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_gender text,
  new_gender text,
  changed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gender_change_log_pkey PRIMARY KEY (id),
  CONSTRAINT gender_change_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- badges tablosunu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_name text NOT NULL,
  icon_url text,
  earned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT badges_pkey PRIMARY KEY (id),
  CONSTRAINT badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- RLS politikaları: Kullanıcılar kendi profillerini görebilir/düzenleyebilir
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- badges ve gender_change_log için RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gender_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own badges" ON public.badges;
DROP POLICY IF EXISTS "Users can view their own gender change log" ON public.gender_change_log;
DROP POLICY IF EXISTS "Users can insert their own gender change log" ON public.gender_change_log;

CREATE POLICY "Users can view their own badges" ON public.badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own gender change log" ON public.gender_change_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gender change log" ON public.gender_change_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
