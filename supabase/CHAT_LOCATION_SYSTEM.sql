-- =============================================================================
-- CHAT KONUM PAYLASIMI VE 3D HARITA ENTEGRASYONU
-- =============================================================================
-- Ozellikler:
-- 1. Chat'te konum paylasimi
-- 2. 3D haritada arkadaslari goruntuleme (avatar ile)
-- 3. "Git" secenegi (navigasyon)
-- 4. Foto limitleri (ucretsiz: 4/gun, premium: 200MB/hafta)
-- =============================================================================

-- ============================================================
-- 1. MESSAGES TABLOSU GUNCELLEME (KONUM + MEDYA)
-- ============================================================

-- Mevcut messages tablosuna yeni kolonlar ekle
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' 
  CHECK (message_type IN ('text', 'image', 'location', 'audio', 'video', 'file'));

ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS location_data JSONB;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS media_size BIGINT; -- bytes
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS media_duration INTEGER; -- seconds (audio/video icin)
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Location data JSON yapisi:
-- {
--   "latitude": 38.4192,
--   "longitude": 27.1287,
--   "accuracy": 10.5,
--   "altitude": 120,
--   "heading": 45,
--   "speed": 5.2,
--   "address": "Izmir Sehir Hastanesi",
--   "share_duration": 3600, // Kac saniye paylasim yapilacak (1 saat)
--   "is_live": true // Canli konum mu yoksa tek seferlik mi
-- }

CREATE INDEX IF NOT EXISTS idx_messages_type ON group_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_location ON group_messages 
  USING GIN (location_data) WHERE message_type = 'location';

-- ============================================================
-- 2. LIVE_LOCATIONS TABLOSU GUNCELLEME (3D HARITA ICIN)
-- ============================================================

-- Arkadas konumlarini 3D haritada goster
ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;
ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS is_friend BOOLEAN DEFAULT false;
ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT now();

-- Canli konum suresini ayarla
ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS share_duration INTEGER DEFAULT 3600; -- 1 saat
ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ DEFAULT now();

-- Konum paylasimi bitmis mi kontrol et
CREATE OR REPLACE FUNCTION is_location_expired(share_duration INT, shared_at TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (NOW() - shared_at) > (share_duration || ' seconds')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Suresi dolan konumlari temizle (her 5 dakikada bir cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_locations()
RETURNS void AS $$
BEGIN
  DELETE FROM live_locations
  WHERE is_location_expired(share_duration, shared_at);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. CHAT MEDIA LIMITS TABLOSU
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_media_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  daily_photo_count INTEGER DEFAULT 0,
  daily_photo_limit INTEGER DEFAULT 4, -- Ucretsiz: 4 foto/gun
  weekly_data_used BIGINT DEFAULT 0, -- bytes
  weekly_data_limit BIGINT DEFAULT 209715200, -- Premium: 200MB/hafta
  last_photo_date DATE DEFAULT CURRENT_DATE,
  last_week_reset TIMESTAMPTZ DEFAULT NOW(),
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_limits_user ON chat_media_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_limits_photo_date ON chat_media_limits(last_photo_date);

-- Premium kullanicilari otomatik guncelle
CREATE OR REPLACE FUNCTION sync_premium_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Subscription veya supporter tablosundan premium durumunu kontrol et
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
      WHEN is_premium THEN 999999 -- Premium sinirsiz foto
      ELSE 4 
    END,
    weekly_data_limit = CASE 
      WHEN is_premium THEN 209715200 -- 200MB
      ELSE 10485760 -- Ucretsiz: 10MB
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
-- 4. FOTO LIMIT KONTROL FONKSIYONU
-- ============================================================

CREATE OR REPLACE FUNCTION check_chat_photo_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_limits RECORD;
  file_size BIGINT;
BEGIN
  -- Sadece foto mesajlari icin
  IF NEW.message_type != 'image' THEN
    RETURN NEW;
  END IF;

  -- Kullanicinin limitlerini al
  SELECT * INTO user_limits
  FROM chat_media_limits
  WHERE user_id = NEW.sender_id;
  
  -- Limit kaydi yoksa olustur
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

  -- GUNLUK FOTO LIMITI KONTROLU
  IF user_limits.daily_photo_count >= user_limits.daily_photo_limit THEN
    RAISE EXCEPTION 'Gunluk foto limiti asildi. Premium uyelik icin yukseltme yapin.';
  END IF;

  -- HAFTALIK DATA LIMITI KONTROLU
  file_size := COALESCE(NEW.media_size, 0);
  IF (user_limits.weekly_data_used + file_size) > user_limits.weekly_data_limit THEN
    RAISE EXCEPTION 'Haftalik veri limiti asildi. Kalan: % MB', 
      ((user_limits.weekly_data_limit - user_limits.weekly_data_used) / 1048576)::NUMERIC(10,2);
  END IF;

  -- Limitleri guncelle
  UPDATE chat_media_limits
  SET 
    daily_photo_count = daily_photo_count + 1,
    weekly_data_used = weekly_data_used + file_size,
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
-- 5. KONUM PAYLASIMI FONKSIYONU
-- ============================================================

CREATE OR REPLACE FUNCTION share_location_in_chat(
  p_sender_id UUID,
  p_group_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_accuracy DOUBLE PRECISION DEFAULT 10.0,
  p_address TEXT DEFAULT NULL,
  p_share_duration INTEGER DEFAULT 3600, -- 1 saat
  p_is_live BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  message_id UUID;
BEGIN
  -- Konum mesaji olustur
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

  -- Canli konum ise live_locations tablosuna da ekle
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
-- 6. 3D HARITADA ARKADASLARI GORUNTULEME VIEW
-- ============================================================

CREATE OR REPLACE VIEW nearby_friends_3d AS
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
  -- Mesafe hesaplama (metre cinsinden)
  earth_distance(
    ll_to_earth(ll.lat, ll.lng),
    ll_to_earth(
      (SELECT lat FROM live_locations WHERE user_id = auth.uid()),
      (SELECT lng FROM live_locations WHERE user_id = auth.uid())
    )
  ) AS distance_meters
FROM live_locations ll
WHERE 
  ll.user_id != auth.uid()
  AND ll.is_sharing = true
  AND ll.expires_at > NOW()
  AND (
    -- Sadece arkadaslarin konumunu gor
    EXISTS (
      SELECT 1 FROM friends 
      WHERE (user_id = auth.uid() AND friend_id = ll.user_id)
         OR (user_id = ll.user_id AND friend_id = auth.uid())
    )
    -- Veya ayni gruptaki uyeler
    OR EXISTS (
      SELECT 1 FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() AND gm2.user_id = ll.user_id
    )
  )
ORDER BY distance_meters;

GRANT SELECT ON nearby_friends_3d TO authenticated;

-- ============================================================
-- 7. CHAT MEDIA ISTATISTIKLERI VIEW
-- ============================================================

CREATE OR REPLACE VIEW user_chat_media_stats AS
SELECT 
  cml.user_id,
  cml.is_premium,
  cml.daily_photo_count,
  cml.daily_photo_limit,
  cml.daily_photo_limit - cml.daily_photo_count AS photos_remaining,
  cml.weekly_data_used / 1048576.0 AS weekly_mb_used,
  cml.weekly_data_limit / 1048576.0 AS weekly_mb_limit,
  (cml.weekly_data_limit - cml.weekly_data_used) / 1048576.0 AS mb_remaining,
  (cml.weekly_data_used * 100.0 / NULLIF(cml.weekly_data_limit, 0)) AS usage_percentage,
  CASE 
    WHEN cml.is_premium THEN 'Premium - Sinirsiz'
    WHEN cml.daily_photo_count >= cml.daily_photo_limit THEN 'Limit Asildi'
    WHEN cml.weekly_data_used >= cml.weekly_data_limit THEN 'Data Limiti Asildi'
    ELSE 'Aktif'
  END AS status,
  cml.last_photo_date,
  cml.last_week_reset
FROM chat_media_limits cml
WHERE cml.user_id = auth.uid();

GRANT SELECT ON user_chat_media_stats TO authenticated;

-- ============================================================
-- 8. RLS POLITIKALARI
-- ============================================================

-- live_locations icin ek policy (arkadaslar gorebilsin)
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

-- chat_media_limits politikalari
ALTER TABLE chat_media_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media limits" ON chat_media_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own media limits" ON chat_media_limits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can manage media limits" ON chat_media_limits
  FOR ALL USING (true); -- Trigger'lar icin

GRANT ALL ON chat_media_limits TO authenticated;

-- ============================================================
-- 9. KULLANICI INIT FONKSIYONU (YENI KULLANICI ICIN)
-- ============================================================

CREATE OR REPLACE FUNCTION init_chat_media_limits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_media_limits (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS init_media_limits_on_user ON auth.users;
CREATE TRIGGER init_media_limits_on_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION init_chat_media_limits();

-- ============================================================
-- STORAGE > NEW BUCKET
-- ============================================================

-- CREATE BUCKET chat-photos (public: true)

-- ============================================================
-- BASARI MESAJI
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE ' CHAT KONUM SISTEMI BASARIYLA KURULDU!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Yeni Ozellikler:';
  RAISE NOTICE '  1. Chat te konum paylasimi (tek + canli)';
  RAISE NOTICE '  2. 3D haritada arkadaslari goruntuleme';
  RAISE NOTICE '  3. Avatar + profil fotografi destegi';
  RAISE NOTICE '  4. Foto limitleri:';
  RAISE NOTICE '     - Ucretsiz: 4 foto/gun';
  RAISE NOTICE '     - Premium: 200MB/hafta';
  RAISE NOTICE '  5. Otomatik limit kontrolu';
  RAISE NOTICE '  6. Premium durumu senkronizasyonu';
  RAISE NOTICE '';
  RAISE NOTICE 'Yeni Tablolar:';
  RAISE NOTICE '  - chat_media_limits';
  RAISE NOTICE '';
  RAISE NOTICE 'Yeni Fonksiyonlar:';
  RAISE NOTICE '  - share_location_in_chat()';
  RAISE NOTICE '  - check_chat_photo_limit()';
  RAISE NOTICE '  - cleanup_expired_locations()';
  RAISE NOTICE '';
  RAISE NOTICE 'Yeni View ler:';
  RAISE NOTICE '  - nearby_friends_3d';
  RAISE NOTICE '  - user_chat_media_stats';
  RAISE NOTICE '';
  RAISE NOTICE 'KULLANIM:';
  RAISE NOTICE '  SELECT * FROM share_location_in_chat(';
  RAISE NOTICE '    auth.uid(),';
  RAISE NOTICE '    group_id,';
  RAISE NOTICE '    38.4192,';
  RAISE NOTICE '    27.1287,';
  RAISE NOTICE '    10.0,';
  RAISE NOTICE '    Izmir Sehir Hastanesi,';
  RAISE NOTICE '    3600,';
  RAISE NOTICE '    true';
  RAISE NOTICE '  );';
  RAISE NOTICE '============================================';
END $$;
