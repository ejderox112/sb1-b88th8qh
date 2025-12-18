-- =============================================================================
-- KOMPLE FINAL SISTEM - TEK SEFERDE YUKLE
-- =============================================================================
-- Ozellikler:
-- 1. Chat konum paylasimi + 3D harita entegrasyonu
-- 2. Foto limitleri (ucretsiz: 4/gun, premium: 200MB/hafta)
-- 3. Otomatik image compression
-- 4. REKLAM SISTEMI (foto + kullanici goruntulemek icin)
-- 5. 500m yakin 10 kullanici/reklam
-- =============================================================================

-- ============================================================
-- PART 1: IMAGE COMPRESSION SYSTEM
-- ============================================================

-- Compression stats tablosu
CREATE TABLE IF NOT EXISTS compression_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_upload_id UUID REFERENCES file_uploads(id) ON DELETE CASCADE,
  original_size BIGINT NOT NULL,
  compressed_size BIGINT NOT NULL,
  compression_ratio NUMERIC(5,2) GENERATED ALWAYS AS 
    (ROUND((1 - (compressed_size::NUMERIC / NULLIF(original_size, 0))) * 100, 2)) STORED,
  format_original TEXT NOT NULL,
  format_compressed TEXT DEFAULT 'webp',
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compression_file ON compression_stats(file_upload_id);
CREATE INDEX IF NOT EXISTS idx_compression_created ON compression_stats(created_at);

-- Compression performance view
CREATE OR REPLACE VIEW compression_performance AS
SELECT 
  fu.upload_type,
  COUNT(*) as total_files,
  AVG(cs.compression_ratio) as avg_compression_ratio,
  SUM(cs.original_size) / 1048576.0 as total_original_mb,
  SUM(cs.compressed_size) / 1048576.0 as total_compressed_mb,
  SUM(cs.original_size - cs.compressed_size) / 1048576.0 as total_saved_mb
FROM compression_stats cs
JOIN file_uploads fu ON cs.file_upload_id = fu.id
GROUP BY fu.upload_type;

GRANT SELECT ON compression_performance TO authenticated;

-- ============================================================
-- PART 2: CHAT LOCATION + MEDIA SYSTEM
-- ============================================================

-- Messages tablosunu guncelle
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' 
  CHECK (message_type IN ('text', 'image', 'location', 'audio', 'video', 'file'));

ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS location_data JSONB;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS media_size BIGINT;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS media_duration INTEGER;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_type ON group_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_location ON group_messages 
  USING GIN (location_data) WHERE message_type = 'location';

-- Live locations guncelle
ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;
ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS is_friend BOOLEAN DEFAULT false;
ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT now();
ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS share_duration INTEGER DEFAULT 3600;
ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- PART 3: REKLAM SISTEMI
-- ============================================================

CREATE TABLE IF NOT EXISTS ad_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('photo_limit', 'user_visibility', 'feature_unlock')),
  ad_provider TEXT DEFAULT 'admob', -- admob, unity, custom
  ad_unit_id TEXT,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('extra_photo', 'visibility_boost', 'premium_trial')),
  reward_amount INTEGER NOT NULL, -- Kac foto veya kac kullanici
  watched_at TIMESTAMPTZ DEFAULT now(),
  watch_duration INTEGER, -- saniye
  reward_claimed BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_watches_user ON ad_watches(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_watches_type ON ad_watches(ad_type);
CREATE INDEX IF NOT EXISTS idx_ad_watches_claimed ON ad_watches(reward_claimed);
CREATE INDEX IF NOT EXISTS idx_ad_watches_expires ON ad_watches(expires_at);

-- Kullanici reklam istatistikleri
CREATE TABLE IF NOT EXISTS user_ad_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_ads_watched INTEGER DEFAULT 0,
  last_ad_watched_at TIMESTAMPTZ,
  extra_photos_earned INTEGER DEFAULT 0,
  extra_photos_used INTEGER DEFAULT 0,
  visibility_boosts_active INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_ad_stats_user ON user_ad_stats(user_id);

-- ============================================================
-- PART 4: CHAT MEDIA LIMITS (REKLAM DESTEKLI)
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_media_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  daily_photo_count INTEGER DEFAULT 0,
  daily_photo_limit INTEGER DEFAULT 4, -- Ucretsiz: 4 foto/gun
  extra_photos_from_ads INTEGER DEFAULT 0, -- REKLAM ILE KAZANILAN FOTOLAR
  weekly_data_used BIGINT DEFAULT 0,
  weekly_data_limit BIGINT DEFAULT 209715200, -- Premium: 200MB/hafta
  last_photo_date DATE DEFAULT CURRENT_DATE,
  last_week_reset TIMESTAMPTZ DEFAULT NOW(),
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_limits_user ON chat_media_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_limits_photo_date ON chat_media_limits(last_photo_date);

-- ============================================================
-- PART 5: USER VISIBILITY LIMITS (REKLAM DESTEKLI)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_visibility_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  base_visible_users INTEGER DEFAULT 10, -- Varsayilan 10 kullanici
  extra_visible_from_ads INTEGER DEFAULT 0, -- Reklam ile kazanilan
  total_visible_users INTEGER GENERATED ALWAYS AS 
    (base_visible_users + extra_visible_from_ads) STORED,
  visibility_radius INTEGER DEFAULT 500, -- metre
  last_ad_boost_at TIMESTAMPTZ,
  ad_boost_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visibility_user ON user_visibility_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_visibility_expires ON user_visibility_limits(ad_boost_expires_at);

-- ============================================================
-- FONKSIYON: REKLAM IZLE VE FOTO KAZAN
-- ============================================================

CREATE OR REPLACE FUNCTION watch_ad_for_extra_photos(
  p_ad_provider TEXT DEFAULT 'admob',
  p_ad_unit_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_ad_id UUID;
  v_extra_photos INTEGER := 2; -- Her reklam 2 foto verir
  v_expires_at TIMESTAMPTZ := NOW() + INTERVAL '24 hours';
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Kullanici giris yapmamis';
  END IF;

  -- Reklam kaydi olustur
  INSERT INTO ad_watches (
    user_id,
    ad_type,
    ad_provider,
    ad_unit_id,
    reward_type,
    reward_amount,
    expires_at
  ) VALUES (
    v_user_id,
    'photo_limit',
    p_ad_provider,
    p_ad_unit_id,
    'extra_photo',
    v_extra_photos,
    v_expires_at
  ) RETURNING id INTO v_ad_id;

  -- Chat media limits'e ekle
  INSERT INTO chat_media_limits (user_id, extra_photos_from_ads)
  VALUES (v_user_id, v_extra_photos)
  ON CONFLICT (user_id) DO UPDATE SET
    extra_photos_from_ads = chat_media_limits.extra_photos_from_ads + v_extra_photos,
    updated_at = NOW();

  -- User ad stats guncelle
  INSERT INTO user_ad_stats (user_id, total_ads_watched, extra_photos_earned, last_ad_watched_at)
  VALUES (v_user_id, 1, v_extra_photos, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    total_ads_watched = user_ad_stats.total_ads_watched + 1,
    extra_photos_earned = user_ad_stats.extra_photos_earned + v_extra_photos,
    last_ad_watched_at = NOW(),
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'ad_id', v_ad_id,
    'reward_type', 'extra_photo',
    'reward_amount', v_extra_photos,
    'expires_at', v_expires_at,
    'message', format('Tebrikler! %s ekstra foto kazandiniz', v_extra_photos)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION watch_ad_for_extra_photos TO authenticated;

-- ============================================================
-- FONKSIYON: REKLAM IZLE VE DAHA FAZLA KULLANICI GOR
-- ============================================================

CREATE OR REPLACE FUNCTION watch_ad_for_user_visibility(
  p_ad_provider TEXT DEFAULT 'admob',
  p_ad_unit_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_ad_id UUID;
  v_extra_users INTEGER := 10; -- Her reklam 10 kullanici daha
  v_boost_duration INTERVAL := INTERVAL '1 hour';
  v_expires_at TIMESTAMPTZ := NOW() + v_boost_duration;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Kullanici giris yapmamis';
  END IF;

  -- Reklam kaydi olustur
  INSERT INTO ad_watches (
    user_id,
    ad_type,
    ad_provider,
    ad_unit_id,
    reward_type,
    reward_amount,
    expires_at
  ) VALUES (
    v_user_id,
    'user_visibility',
    p_ad_provider,
    p_ad_unit_id,
    'visibility_boost',
    v_extra_users,
    v_expires_at
  ) RETURNING id INTO v_ad_id;

  -- User visibility limits'e ekle
  INSERT INTO user_visibility_limits (
    user_id, 
    extra_visible_from_ads,
    last_ad_boost_at,
    ad_boost_expires_at
  )
  VALUES (
    v_user_id, 
    v_extra_users,
    NOW(),
    v_expires_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    extra_visible_from_ads = user_visibility_limits.extra_visible_from_ads + v_extra_users,
    last_ad_boost_at = NOW(),
    ad_boost_expires_at = GREATEST(user_visibility_limits.ad_boost_expires_at, v_expires_at),
    updated_at = NOW();

  -- User ad stats guncelle
  INSERT INTO user_ad_stats (user_id, total_ads_watched, visibility_boosts_active, last_ad_watched_at)
  VALUES (v_user_id, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    total_ads_watched = user_ad_stats.total_ads_watched + 1,
    visibility_boosts_active = user_ad_stats.visibility_boosts_active + 1,
    last_ad_watched_at = NOW(),
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'ad_id', v_ad_id,
    'reward_type', 'visibility_boost',
    'reward_amount', v_extra_users,
    'boost_duration_minutes', EXTRACT(EPOCH FROM v_boost_duration) / 60,
    'expires_at', v_expires_at,
    'message', format('Tebrikler! %s saat boyunca %s kullanici daha gorebilirsiniz', 
                      EXTRACT(EPOCH FROM v_boost_duration) / 3600, v_extra_users)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION watch_ad_for_user_visibility TO authenticated;

-- ============================================================
-- FONKSIYON: FOTO LIMIT KONTROLU (REKLAM DAHIL)
-- ============================================================

CREATE OR REPLACE FUNCTION check_chat_photo_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_limits RECORD;
  file_size BIGINT;
  total_available_photos INTEGER;
BEGIN
  IF NEW.message_type != 'image' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO user_limits
  FROM chat_media_limits
  WHERE user_id = NEW.sender_id;
  
  IF NOT FOUND THEN
    INSERT INTO chat_media_limits (user_id)
    VALUES (NEW.sender_id)
    RETURNING * INTO user_limits;
  END IF;

  -- Gun degistiyse sayaci sifirla
  IF user_limits.last_photo_date < CURRENT_DATE THEN
    UPDATE chat_media_limits
    SET 
      daily_photo_count = 0,
      last_photo_date = CURRENT_DATE
    WHERE user_id = NEW.sender_id;
    
    user_limits.daily_photo_count := 0;
  END IF;

  -- Hafta degistiyse data kullanimini sifirla
  IF NOW() - user_limits.last_week_reset > INTERVAL '7 days' THEN
    UPDATE chat_media_limits
    SET 
      weekly_data_used = 0,
      last_week_reset = NOW()
    WHERE user_id = NEW.sender_id;
    
    user_limits.weekly_data_used := 0;
  END IF;

  -- TOPLAM KULLLANILABILIR FOTO (NORMAL + REKLAM)
  total_available_photos := user_limits.daily_photo_limit + user_limits.extra_photos_from_ads;

  -- GUNLUK FOTO LIMITI KONTROLU
  IF user_limits.daily_photo_count >= total_available_photos THEN
    RAISE EXCEPTION 'FOTO_LIMIT_EXCEEDED|Gunluk foto limiti asildi. Reklam izleyerek devam edebilirsiniz!';
  END IF;

  -- HAFTALIK DATA LIMITI KONTROLU
  file_size := COALESCE(NEW.media_size, 0);
  IF (user_limits.weekly_data_used + file_size) > user_limits.weekly_data_limit THEN
    RAISE EXCEPTION 'DATA_LIMIT_EXCEEDED|Haftalik veri limiti asildi. Kalan: % MB', 
      ((user_limits.weekly_data_limit - user_limits.weekly_data_used) / 1048576)::NUMERIC(10,2);
  END IF;

  -- Limitleri guncelle
  UPDATE chat_media_limits
  SET 
    daily_photo_count = daily_photo_count + 1,
    weekly_data_used = weekly_data_used + file_size,
    -- Reklam fotolarini once kullan
    extra_photos_from_ads = GREATEST(0, extra_photos_from_ads - 
      CASE WHEN daily_photo_count >= daily_photo_limit THEN 1 ELSE 0 END),
    updated_at = NOW()
  WHERE user_id = NEW.sender_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_photo_limit_before_send ON group_messages;
CREATE TRIGGER check_photo_limit_before_send
  BEFORE INSERT ON group_messages
  FOR EACH ROW
  WHEN (NEW.message_type = 'image')
  EXECUTE FUNCTION check_chat_photo_limit();

-- ============================================================
-- FONKSIYON: KONUM PAYLASIMI
-- ============================================================

CREATE OR REPLACE FUNCTION share_location_in_chat(
  p_sender_id UUID,
  p_group_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_accuracy DOUBLE PRECISION DEFAULT 10.0,
  p_address TEXT DEFAULT NULL,
  p_share_duration INTEGER DEFAULT 3600,
  p_is_live BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  message_id UUID;
BEGIN
  INSERT INTO group_messages (
    sender_id,
    group_id,
    message_type,
    content,
    location_data,
    created_at
  ) VALUES (
    p_sender_id,
    p_group_id,
    'location',
    COALESCE(p_address, 'Konum paylasti'),
    jsonb_build_object(
      'latitude', p_latitude,
      'longitude', p_longitude,
      'accuracy', p_accuracy,
      'address', p_address,
      'share_duration', p_share_duration,
      'is_live', p_is_live
    ),
    NOW()
  ) RETURNING id INTO message_id;

  IF p_is_live THEN
    INSERT INTO live_locations (
      user_id,
      group_id,
      lat,
      lng,
      accuracy,
      is_sharing,
      share_duration,
      shared_at,
      expires_at,
      avatar_url,
      nickname,
      level,
      is_friend
    )
    SELECT 
      p_sender_id,
      p_group_id,
      p_latitude,
      p_longitude,
      p_accuracy,
      true,
      p_share_duration,
      NOW(),
      NOW() + (p_share_duration || ' seconds')::INTERVAL,
      up.avatar_url,
      up.nickname,
      up.level,
      EXISTS (
        SELECT 1 FROM friends 
        WHERE (user_id = auth.uid() AND friend_id = p_sender_id)
           OR (user_id = p_sender_id AND friend_id = auth.uid())
      )
    FROM user_profiles up
    WHERE up.auth_user_id = p_sender_id
    ON CONFLICT (user_id, group_id)
    DO UPDATE SET
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      accuracy = EXCLUDED.accuracy,
      shared_at = EXCLUDED.shared_at,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW();
  END IF;

  RETURN message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION share_location_in_chat TO authenticated;

-- ============================================================
-- VIEW: 3D HARITADA YAKIN ARKADASLAR (REKLAM LIMITI DAHIL)
-- ============================================================

CREATE OR REPLACE VIEW nearby_friends_3d AS
WITH user_limits AS (
  SELECT 
    user_id,
    COALESCE(total_visible_users, 10) as max_visible,
    COALESCE(visibility_radius, 500) as radius_meters
  FROM user_visibility_limits
  WHERE user_id = auth.uid()
)
SELECT 
  ll.user_id,
  ll.lat,
  ll.lng,
  ll.accuracy,
  ll.avatar_url,
  ll.nickname,
  ll.level,
  ll.is_friend,
  ll.last_updated,
  ll.expires_at,
  ll.is_sharing,
  earth_distance(
    ll_to_earth(ll.lat, ll.lng),
    ll_to_earth(
      (SELECT lat FROM live_locations WHERE user_id = auth.uid()),
      (SELECT lng FROM live_locations WHERE user_id = auth.uid())
    )
  ) AS distance_meters
FROM live_locations ll
CROSS JOIN user_limits ul
WHERE 
  ll.user_id != auth.uid()
  AND ll.is_sharing = true
  AND ll.expires_at > NOW()
  AND earth_distance(
    ll_to_earth(ll.lat, ll.lng),
    ll_to_earth(
      (SELECT lat FROM live_locations WHERE user_id = auth.uid()),
      (SELECT lng FROM live_locations WHERE user_id = auth.uid())
    )
  ) <= ul.radius_meters
  AND (
    EXISTS (
      SELECT 1 FROM friends 
      WHERE (user_id = auth.uid() AND friend_id = ll.user_id)
         OR (user_id = ll.user_id AND friend_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() AND gm2.user_id = ll.user_id
    )
  )
ORDER BY distance_meters
LIMIT (SELECT max_visible FROM user_limits);

GRANT SELECT ON nearby_friends_3d TO authenticated;

-- ============================================================
-- VIEW: KULLANICI MEDYA ISTATISTIKLERI (REKLAM DAHIL)
-- ============================================================

CREATE OR REPLACE VIEW user_chat_media_stats AS
SELECT 
  cml.user_id,
  cml.is_premium,
  cml.daily_photo_count,
  cml.daily_photo_limit,
  cml.extra_photos_from_ads,
  (cml.daily_photo_limit + cml.extra_photos_from_ads - cml.daily_photo_count) AS photos_remaining,
  cml.weekly_data_used / 1048576.0 AS weekly_mb_used,
  cml.weekly_data_limit / 1048576.0 AS weekly_mb_limit,
  (cml.weekly_data_limit - cml.weekly_data_used) / 1048576.0 AS mb_remaining,
  (cml.weekly_data_used * 100.0 / NULLIF(cml.weekly_data_limit, 0)) AS usage_percentage,
  COALESCE(uas.total_ads_watched, 0) as total_ads_watched,
  COALESCE(uas.extra_photos_earned, 0) as lifetime_photos_from_ads,
  CASE 
    WHEN cml.is_premium THEN 'Premium - Sinirsiz'
    WHEN (cml.daily_photo_count >= cml.daily_photo_limit + cml.extra_photos_from_ads) THEN 'Limit Asildi - Reklam Izle'
    WHEN cml.weekly_data_used >= cml.weekly_data_limit THEN 'Data Limiti Asildi'
    ELSE 'Aktif'
  END AS status,
  cml.last_photo_date,
  cml.last_week_reset
FROM chat_media_limits cml
LEFT JOIN user_ad_stats uas ON cml.user_id = uas.user_id
WHERE cml.user_id = auth.uid();

GRANT SELECT ON user_chat_media_stats TO authenticated;

-- ============================================================
-- VIEW: KULLANICI GORUNURLUK ISTATISTIKLERI
-- ============================================================

CREATE OR REPLACE VIEW user_visibility_stats AS
SELECT 
  uvl.user_id,
  uvl.base_visible_users,
  uvl.extra_visible_from_ads,
  uvl.total_visible_users,
  uvl.visibility_radius,
  uvl.ad_boost_expires_at,
  CASE 
    WHEN uvl.ad_boost_expires_at IS NULL OR uvl.ad_boost_expires_at < NOW() 
    THEN false 
    ELSE true 
  END as boost_active,
  CASE 
    WHEN uvl.ad_boost_expires_at > NOW() 
    THEN EXTRACT(EPOCH FROM (uvl.ad_boost_expires_at - NOW())) / 60 
    ELSE 0 
  END as boost_remaining_minutes
FROM user_visibility_limits uvl
WHERE uvl.user_id = auth.uid();

GRANT SELECT ON user_visibility_stats TO authenticated;

-- ============================================================
-- PREMIUM STATUS SYNC
-- ============================================================

CREATE OR REPLACE FUNCTION sync_premium_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_media_limits
  SET 
    is_premium = EXISTS (
      SELECT 1 FROM subscriptions 
      WHERE user_id = NEW.user_id 
        AND plan IN ('premium', 'pro')
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
    ) OR EXISTS (
      SELECT 1 FROM supporters 
      WHERE user_id = NEW.user_id 
        AND date > NOW() - INTERVAL '30 days'
    ),
    daily_photo_limit = CASE 
      WHEN is_premium THEN 999999
      ELSE 4 
    END,
    weekly_data_limit = CASE 
      WHEN is_premium THEN 209715200
      ELSE 10485760
    END
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_premium_on_subscription ON subscriptions;
CREATE TRIGGER sync_premium_on_subscription
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION sync_premium_status();

DROP TRIGGER IF EXISTS sync_premium_on_support ON supporters;
CREATE TRIGGER sync_premium_on_support
  AFTER INSERT ON supporters
  FOR EACH ROW EXECUTE FUNCTION sync_premium_status();

-- ============================================================
-- INIT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION init_user_limits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_media_limits (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO user_visibility_limits (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO user_ad_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS init_limits_on_user ON auth.users;
CREATE TRIGGER init_limits_on_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION init_user_limits();

-- ============================================================
-- SURESI DOLAN BOOSTLARI TEMIZLE
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_expired_boosts()
RETURNS void AS $$
BEGIN
  -- Suresi dolan visibility boostlari sifirla
  UPDATE user_visibility_limits
  SET 
    extra_visible_from_ads = 0,
    ad_boost_expires_at = NULL
  WHERE ad_boost_expires_at < NOW()
    AND extra_visible_from_ads > 0;

  -- Suresi dolan reklam kayitlarini isaretele
  UPDATE ad_watches
  SET reward_claimed = false
  WHERE expires_at < NOW()
    AND reward_claimed = true;

  -- Suresi dolan konumlari sil
  DELETE FROM live_locations
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS POLITIKALARI
-- ============================================================

-- ad_watches
ALTER TABLE ad_watches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ad watches" ON ad_watches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own ad watches" ON ad_watches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

GRANT ALL ON ad_watches TO authenticated;

-- user_ad_stats
ALTER TABLE user_ad_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ad stats" ON user_ad_stats
  FOR SELECT USING (auth.uid() = user_id);

GRANT ALL ON user_ad_stats TO authenticated;

-- chat_media_limits
ALTER TABLE chat_media_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media limits" ON chat_media_limits
  FOR SELECT USING (auth.uid() = user_id);

GRANT ALL ON chat_media_limits TO authenticated;

-- user_visibility_limits
ALTER TABLE user_visibility_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own visibility limits" ON user_visibility_limits
  FOR SELECT USING (auth.uid() = user_id);

GRANT ALL ON user_visibility_limits TO authenticated;

-- compression_stats
ALTER TABLE compression_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view compression stats" ON compression_stats
  FOR SELECT USING (true);

GRANT SELECT ON compression_stats TO authenticated;

-- live_locations ek policy
DROP POLICY IF EXISTS "Friends can view each others live locations" ON live_locations;
CREATE POLICY "Friends can view each others live locations" ON live_locations
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM friends 
      WHERE (user_id = auth.uid() AND friend_id = live_locations.user_id)
         OR (user_id = live_locations.user_id AND friend_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() 
        AND gm2.user_id = live_locations.user_id
    )
  );

-- ============================================================
-- BASARI MESAJI
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE ' KOMPLE SISTEM BASARIYLA KURULDU!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'YENI OZELLIKLER:';
  RAISE NOTICE '  1. Chat konum paylasimi (tek + canli)';
  RAISE NOTICE '  2. 3D haritada arkadaslar (avatar + level)';
  RAISE NOTICE '  3. Foto limitleri:';
  RAISE NOTICE '     - Ucretsiz: 4 foto/gun';
  RAISE NOTICE '     - Premium: 200MB/hafta';
  RAISE NOTICE '     - REKLAM ile ekstra 2 foto';
  RAISE NOTICE '  4. Kullanici gorunurlugu:';
  RAISE NOTICE '     - Varsayilan: 500m yakinlikta 10 kullanici';
  RAISE NOTICE '     - REKLAM ile +10 kullanici (1 saat)';
  RAISE NOTICE '  5. Otomatik image compression';
  RAISE NOTICE '';
  RAISE NOTICE 'YENI TABLOLAR:';
  RAISE NOTICE '  - ad_watches (reklam takibi)';
  RAISE NOTICE '  - user_ad_stats (kullanici reklam istatistikleri)';
  RAISE NOTICE '  - chat_media_limits (foto limitleri)';
  RAISE NOTICE '  - user_visibility_limits (gorunurluk limitleri)';
  RAISE NOTICE '  - compression_stats (sikistirma istatistikleri)';
  RAISE NOTICE '';
  RAISE NOTICE 'YENI FONKSIYONLAR:';
  RAISE NOTICE '  - watch_ad_for_extra_photos() --> 2 ekstra foto';
  RAISE NOTICE '  - watch_ad_for_user_visibility() --> 10 ekstra kullanici';
  RAISE NOTICE '  - share_location_in_chat()';
  RAISE NOTICE '  - cleanup_expired_boosts()';
  RAISE NOTICE '';
  RAISE NOTICE 'YENI VIEW LER:';
  RAISE NOTICE '  - nearby_friends_3d (reklam limiti dahil)';
  RAISE NOTICE '  - user_chat_media_stats (reklam fotolar dahil)';
  RAISE NOTICE '  - user_visibility_stats';
  RAISE NOTICE '  - compression_performance';
  RAISE NOTICE '';
  RAISE NOTICE 'KULLANIM ORNEKLERI:';
  RAISE NOTICE '  -- Foto icin reklam izle:';
  RAISE NOTICE '  SELECT watch_ad_for_extra_photos(admob, ca-app-pub-xxx);';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Kullanici gorunurlugu icin reklam izle:';
  RAISE NOTICE '  SELECT watch_ad_for_user_visibility(admob, ca-app-pub-xxx);';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Limitlerimi gor:';
  RAISE NOTICE '  SELECT * FROM user_chat_media_stats;';
  RAISE NOTICE '  SELECT * FROM user_visibility_stats;';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'SUPABASE ISLERINIZ TAMAMLANDI! ';
  RAISE NOTICE '============================================';
END $$;
