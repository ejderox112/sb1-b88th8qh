-- =====================================================
-- COMPLETE SYSTEM V2 - Tüm Yeni Özellikler
-- =====================================================
-- 1. Bina köşe koordinatları (4 pin sistemi)
-- 2. XP kazanma kaynakları (günlük giriş, arkadaş, chat, reklam)
-- 3. Premium sistemi (79 TL, 1000 TL Premium Plus)
-- 4. Bağışçı profili + Rütbe sistemi (Uzman Çavuş → Mareşal)
-- 5. Reklam istatistikleri (konum, zaman, tıklama analizi)
-- 6. Reklam 5 sn skip sistemi + her reklam 5 XP
-- 7. Indoor fotoğraf yükleme + konum bilgisi
-- 8. Pornografik içerik bildirimi sistemi
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================

-- PostGIS extension (mesafe hesaplamaları için)
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;
CREATE EXTENSION IF NOT EXISTS cube CASCADE;

-- =====================================================
-- TEMEL TABLOLAR (eksikse oluştur)
-- =====================================================

-- Locations tablosu
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  floor_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "locations_public" ON locations;
CREATE POLICY "locations_public" ON locations FOR SELECT USING (true);

-- User profiles tablosu
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT,
  nickname TEXT,
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  user_role TEXT DEFAULT 'user', -- 'user', 'moderator', 'admin'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_profiles_public" ON user_profiles;
CREATE POLICY "user_profiles_public" ON user_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "user_profiles_own" ON user_profiles;
CREATE POLICY "user_profiles_own" ON user_profiles FOR ALL USING (auth.uid() = user_id);

-- Venue suggestions tablosu
CREATE TABLE IF NOT EXISTS venue_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'spam'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_suggestions_status ON venue_suggestions(status);

ALTER TABLE venue_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "venue_suggestions_public" ON venue_suggestions;
CREATE POLICY "venue_suggestions_public" ON venue_suggestions FOR SELECT USING (true);
DROP POLICY IF EXISTS "venue_suggestions_own" ON venue_suggestions;
CREATE POLICY "venue_suggestions_own" ON venue_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 1. BİNA KÖŞE KOORDİNATLARI (4 PİN SİSTEMİ)
-- =====================================================

-- Binaların 4 köşe koordinatları (Google Maps pin)
CREATE TABLE IF NOT EXISTS building_corners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  corner_number INT CHECK (corner_number BETWEEN 1 AND 4),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  altitude DECIMAL(8, 2), -- Deniz seviyesinden yükseklik (metre)
  description TEXT, -- "Kuzey-Batı Köşe", "Ana Giriş Köşesi" vb
  photo_url TEXT, -- Köşenin fotoğrafı
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id, corner_number)
);

-- Index
CREATE INDEX idx_building_corners_location ON building_corners(location_id);

-- RLS
ALTER TABLE building_corners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "building_corners_public_read" ON building_corners FOR SELECT USING (true);
CREATE POLICY "building_corners_admin_all" ON building_corners FOR ALL USING (
  auth.jwt() ->> 'email' = 'ejderha112@gmail.com'
);

-- Bina kat bilgisi genişletme (bodrum katlar için negatif değerler)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS basement_floors INT DEFAULT 0; -- Bodrum kat sayısı (-5 kat = 5 bodrum)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS ground_floor_altitude DECIMAL(8, 2); -- Zemin kat yüksekliği
ALTER TABLE locations ADD COLUMN IF NOT EXISTS total_height DECIMAL(8, 2); -- Toplam bina yüksekliği (metre)

-- Hesaplama fonksiyonu: Bina alanı (m²)
CREATE OR REPLACE FUNCTION calculate_building_area(p_location_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_area DECIMAL;
  v_corners RECORD;
BEGIN
  -- 4 köşeden poligon alanı hesaplama (Shoelace formula)
  SELECT 
    ABS(SUM(
      (c1.latitude * c2.longitude - c2.latitude * c1.longitude)
    )) / 2.0 * 111320 * 111320 AS area -- lat/lng to meters approximation
  INTO v_area
  FROM (
    SELECT 
      latitude, 
      longitude,
      corner_number,
      LEAD(latitude) OVER (ORDER BY corner_number) AS next_lat,
      LEAD(longitude) OVER (ORDER BY corner_number) AS next_lng
    FROM building_corners
    WHERE location_id = p_location_id
  ) c1
  JOIN building_corners c2 ON c2.location_id = p_location_id AND c2.corner_number = 1
  WHERE c1.next_lat IS NOT NULL;
  
  RETURN COALESCE(v_area, 0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. XP KAZANMA KAYNAKLARI
-- =====================================================

-- Arkadaşlık sistemi (friendships tablosu eksikse oluştur)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'blocked'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id, status);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "friendships_own" ON friendships;
CREATE POLICY "friendships_own" ON friendships FOR ALL USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);

-- Mesajlar tablosu (messages tablosu eksikse oluştur)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID, -- NULL ise 1-1 mesaj, değilse grup
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_own" ON messages;
CREATE POLICY "messages_own" ON messages FOR ALL USING (auth.uid() = user_id);

-- XP kaynakları tablosu
CREATE TABLE IF NOT EXISTS xp_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'daily_login', 'friend_add', 'chat_message', 'ad_watch', 'task_complete', 'photo_upload'
  xp_amount INT NOT NULL,
  description TEXT,
  metadata JSONB, -- Ekstra bilgiler
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_xp_sources_user_date ON xp_sources(user_id, created_at DESC);
CREATE INDEX idx_xp_sources_type ON xp_sources(source_type);

-- RLS
ALTER TABLE xp_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_sources_own" ON xp_sources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "xp_sources_insert" ON xp_sources FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Günlük giriş XP (5 XP)
CREATE OR REPLACE FUNCTION award_daily_login_xp()
RETURNS VOID AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_last_login TIMESTAMPTZ;
  v_xp_amount INT := 5;
  v_premium_bonus DECIMAL := 0;
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  
  -- Son günlük giriş kontrolü
  SELECT MAX(created_at) INTO v_last_login
  FROM xp_sources
  WHERE user_id = v_user_id 
    AND source_type = 'daily_login'
    AND created_at > now() - INTERVAL '24 hours';
  
  IF v_last_login IS NOT NULL THEN
    RETURN; -- Bugün zaten giriş XP'si aldı
  END IF;
  
  -- Premium bonus kontrol
  SELECT 
    CASE 
      WHEN subscription_tier = 'premium_plus' THEN 0.10 -- %10 bonus
      WHEN subscription_tier = 'premium' THEN 0.05 -- %5 bonus
      ELSE 0
    END INTO v_premium_bonus
  FROM user_profiles
  WHERE user_id = v_user_id;
  
  v_xp_amount := FLOOR(v_xp_amount * (1 + v_premium_bonus));
  
  -- XP kaydı
  INSERT INTO xp_sources (user_id, source_type, xp_amount, description)
  VALUES (v_user_id, 'daily_login', v_xp_amount, 'Günlük giriş bonusu');
  
  -- Profil XP güncelleme
  UPDATE user_profiles
  SET xp = xp + v_xp_amount
  WHERE user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- İlk 5 arkadaş eklemeye 20 XP
CREATE OR REPLACE FUNCTION award_friend_add_xp()
RETURNS TRIGGER AS $$
DECLARE
  v_friend_count INT;
  v_xp_amount INT := 20;
  v_premium_bonus DECIMAL := 0;
BEGIN
  -- İlk 5 arkadaş için XP ver
  SELECT COUNT(*) INTO v_friend_count
  FROM friendships
  WHERE user_id = NEW.user_id AND status = 'accepted';
  
  IF v_friend_count > 5 THEN
    RETURN NEW;
  END IF;
  
  -- Premium bonus
  SELECT 
    CASE 
      WHEN subscription_tier = 'premium_plus' THEN 0.10
      WHEN subscription_tier = 'premium' THEN 0.05
      ELSE 0
    END INTO v_premium_bonus
  FROM user_profiles
  WHERE user_id = NEW.user_id;
  
  v_xp_amount := FLOOR(v_xp_amount * (1 + v_premium_bonus));
  
  -- XP kaydı
  INSERT INTO xp_sources (user_id, source_type, xp_amount, description)
  VALUES (NEW.user_id, 'friend_add', v_xp_amount, 'İlk 5 arkadaş ekleme bonusu');
  
  UPDATE user_profiles
  SET xp = xp + v_xp_amount
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_friend_add_xp ON friendships;
CREATE TRIGGER trigger_friend_add_xp
AFTER UPDATE OF status ON friendships
FOR EACH ROW
WHEN (NEW.status = 'accepted' AND OLD.status != 'accepted')
EXECUTE FUNCTION award_friend_add_xp();

-- Chat mesaj karşılıklı konuşma XP (her karşılıklı mesaja 1 XP)
CREATE OR REPLACE FUNCTION award_chat_message_xp()
RETURNS TRIGGER AS $$
DECLARE
  v_last_sender UUID;
  v_xp_amount INT := 1;
  v_premium_bonus DECIMAL := 0;
BEGIN
  -- Son mesajı kim gönderdi?
  SELECT user_id INTO v_last_sender
  FROM messages
  WHERE group_id = NEW.group_id
    AND id != NEW.id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Karşılıklı konuşma değilse XP yok
  IF v_last_sender = NEW.user_id OR v_last_sender IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Premium bonus
  SELECT 
    CASE 
      WHEN subscription_tier = 'premium_plus' THEN 0.10
      WHEN subscription_tier = 'premium' THEN 0.05
      ELSE 0
    END INTO v_premium_bonus
  FROM user_profiles
  WHERE user_id = NEW.user_id;
  
  v_xp_amount := FLOOR(v_xp_amount * (1 + v_premium_bonus));
  
  -- XP kaydı
  INSERT INTO xp_sources (user_id, source_type, xp_amount, description)
  VALUES (NEW.user_id, 'chat_message', v_xp_amount, 'Karşılıklı sohbet');
  
  UPDATE user_profiles
  SET xp = xp + v_xp_amount
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_chat_xp ON messages;
CREATE TRIGGER trigger_chat_xp
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION award_chat_message_xp();

-- Reklam izleme XP (5 XP per ad)
-- Bu fonksiyon businessAdService.ts'den çağrılacak
CREATE OR REPLACE FUNCTION award_ad_watch_xp(p_ad_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_xp_amount INT := 5;
  v_premium_bonus DECIMAL := 0;
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Premium bonus
  SELECT 
    CASE 
      WHEN subscription_tier = 'premium_plus' THEN 0.10
      WHEN subscription_tier = 'premium' THEN 0.05
      ELSE 0
    END INTO v_premium_bonus
  FROM user_profiles
  WHERE user_id = v_user_id;
  
  v_xp_amount := FLOOR(v_xp_amount * (1 + v_premium_bonus));
  
  -- XP kaydı
  INSERT INTO xp_sources (user_id, source_type, xp_amount, description, metadata)
  VALUES (v_user_id, 'ad_watch', v_xp_amount, 'Reklam izleme', jsonb_build_object('ad_id', p_ad_id));
  
  UPDATE user_profiles
  SET xp = xp + v_xp_amount
  WHERE user_id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'xp_earned', v_xp_amount,
    'premium_bonus', v_premium_bonus * 100 || '%'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. PREMİUM SİSTEMİ (79 TL + 1000 TL)
-- =====================================================

-- Abonelik paketleri
CREATE TYPE subscription_tier_enum AS ENUM ('free', 'premium', 'prestij', 'premium_plus');

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier_enum DEFAULT 'free';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_auto_renew BOOLEAN DEFAULT false;

-- Abonelik işlemleri
CREATE TABLE IF NOT EXISTS subscription_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tier subscription_tier_enum NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT, -- 'credit_card', 'paypal', 'apple_pay', 'google_pay'
  transaction_status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  payment_provider_id TEXT, -- Stripe, iyzico vb ID
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

CREATE INDEX idx_subscription_transactions_user ON subscription_transactions(user_id, created_at DESC);

-- RLS
ALTER TABLE subscription_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscription_transactions_own" ON subscription_transactions FOR SELECT USING (auth.uid() = user_id);

-- Premium satın alma fonksiyonu
CREATE OR REPLACE FUNCTION purchase_subscription(
  p_tier subscription_tier_enum,
  p_duration_months INT DEFAULT 1,
  p_payment_method TEXT DEFAULT 'credit_card'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_amount DECIMAL;
  v_start_date TIMESTAMPTZ := now();
  v_end_date TIMESTAMPTZ;
  v_transaction_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Fiyat hesaplama
  v_amount := CASE p_tier
    WHEN 'premium' THEN 79.00 * p_duration_months
    WHEN 'prestij' THEN 500.00 * p_duration_months
    WHEN 'premium_plus' THEN 1000.00 * p_duration_months
    ELSE 0
  END;
  
  v_end_date := v_start_date + (p_duration_months || ' months')::INTERVAL;
  
  -- Transaction kaydı
  INSERT INTO subscription_transactions (
    user_id, subscription_tier, amount, payment_method, 
    transaction_status, start_date, end_date
  )
  VALUES (
    v_user_id, p_tier, v_amount, p_payment_method,
    'completed', v_start_date, v_end_date
  )
  RETURNING id INTO v_transaction_id;
  
  -- Profil güncelleme
  UPDATE user_profiles
  SET 
    subscription_tier = p_tier,
    subscription_start_date = v_start_date,
    subscription_end_date = v_end_date,
    subscription_auto_renew = false
  WHERE user_id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'tier', p_tier,
    'amount', v_amount,
    'start_date', v_start_date,
    'end_date', v_end_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. BAĞIŞÇI PROFİLİ + RÜTBE SİSTEMİ
-- =====================================================

-- Rütbe sistemi (Türk Silahlı Kuvvetleri rütbeleri)
CREATE TYPE military_rank_enum AS ENUM (
  'uzman_cavus',      -- 500 TL (başlangıç)
  'kidemli_cavus',    -- 1000 TL
  'bastabur',         -- 1500 TL
  'astsubay_1',       -- 2000 TL (Astsubay)
  'astsubay_2',       -- 3000 TL
  'astsubay_3',       -- 4000 TL
  'astsubay_ust',     -- 5000 TL
  'teğmen',           -- 6000 TL (Subay)
  'ust_tegmen',       -- 8000 TL
  'yuzbaşı',          -- 10000 TL
  'binbaşı',          -- 15000 TL
  'yarbay',           -- 20000 TL
  'albay',            -- 30000 TL
  'tuğgeneral',       -- 40000 TL (General)
  'tuğamiral',        -- 50000 TL
  'tümgeneral',       -- 75000 TL
  'korgeneral',       -- 100000 TL
  'orgeneral',        -- 150000 TL
  'mareshal'          -- 200000 TL (en üst rütbe)
);

-- Rütbe bilgileri
CREATE TABLE IF NOT EXISTS military_ranks (
  rank military_rank_enum PRIMARY KEY,
  rank_name_tr TEXT NOT NULL,
  required_spending DECIMAL(10, 2) NOT NULL,
  xp_bonus_percent INT NOT NULL, -- %10, %15 vb
  special_badge_url TEXT,
  rank_order INT NOT NULL, -- Sıralama için
  description TEXT
);

INSERT INTO military_ranks (rank, rank_name_tr, required_spending, xp_bonus_percent, rank_order, description) VALUES
('uzman_cavus', 'Uzman Çavuş', 500, 10, 1, 'Bağışçı sistemine giriş rütbesi'),
('kidemli_cavus', 'Kıdemli Çavuş', 1000, 12, 2, 'Deneyimli bağışçı'),
('bastabur', 'Baştabur', 1500, 13, 3, 'Lider bağışçı'),
('astsubay_1', 'Astsubay (1. sınıf)', 2000, 15, 4, 'Astsubay rütbesi'),
('astsubay_2', 'Astsubay (2. sınıf)', 3000, 17, 5, 'Üst düzey astsubay'),
('astsubay_3', 'Astsubay (3. sınıf)', 4000, 18, 6, 'Kıdemli astsubay'),
('astsubay_ust', 'Üstsubay', 5000, 20, 7, 'En üst astsubay rütbesi'),
('teğmen', 'Teğmen', 6000, 22, 8, 'Subay sınıfına geçiş'),
('ust_tegmen', 'Üsteğmen', 8000, 24, 9, 'Deneyimli subay'),
('yuzbaşı', 'Yüzbaşı', 10000, 25, 10, 'Orta kademeli subay'),
('binbaşı', 'Binbaşı', 15000, 27, 11, 'Üst düzey subay'),
('yarbay', 'Yarbay', 20000, 30, 12, 'Kıdemli subay'),
('albay', 'Albay', 30000, 35, 13, 'Yüksek rütbeli subay'),
('tuğgeneral', 'Tuğgeneral', 40000, 40, 14, 'General sınıfı'),
('tuğamiral', 'Tuğamiral', 50000, 45, 15, 'Amiral rütbesi'),
('tümgeneral', 'Tümgeneral', 75000, 50, 16, 'Üst düzey general'),
('korgeneral', 'Korgeneral', 100000, 60, 17, 'Kolordu generali'),
('orgeneral', 'Orgeneral', 150000, 75, 18, 'Ordu generali'),
('mareshal', 'Mareşal', 200000, 100, 19, 'En yüksek rütbe - Efsane bağışçı')
ON CONFLICT (rank) DO NOTHING;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS military_rank military_rank_enum DEFAULT NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_spending DECIMAL(10, 2) DEFAULT 0; -- Toplam harcama
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS rank_upgraded_at TIMESTAMPTZ;

-- Rütbe otomatik yükseltme fonksiyonu
CREATE OR REPLACE FUNCTION update_military_rank()
RETURNS TRIGGER AS $$
DECLARE
  v_total_spending DECIMAL;
  v_new_rank military_rank_enum;
  v_xp_bonus INT;
BEGIN
  -- Toplam harcama hesapla
  SELECT COALESCE(SUM(amount), 0) INTO v_total_spending
  FROM subscription_transactions
  WHERE user_id = NEW.user_id 
    AND transaction_status = 'completed';
  
  -- Yeni rütbe belirle
  SELECT rank, xp_bonus_percent INTO v_new_rank, v_xp_bonus
  FROM military_ranks
  WHERE required_spending <= v_total_spending
  ORDER BY rank_order DESC
  LIMIT 1;
  
  -- Profil güncelle
  UPDATE user_profiles
  SET 
    military_rank = v_new_rank,
    total_spending = v_total_spending,
    rank_upgraded_at = CASE 
      WHEN military_rank != v_new_rank THEN now()
      ELSE rank_upgraded_at
    END
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_rank_update ON subscription_transactions;
CREATE TRIGGER trigger_rank_update
AFTER INSERT OR UPDATE ON subscription_transactions
FOR EACH ROW
WHEN (NEW.transaction_status = 'completed')
EXECUTE FUNCTION update_military_rank();

-- Rütbe atlama fonksiyonu (500 TL ile bir üst rütbeye geç)
CREATE OR REPLACE FUNCTION skip_to_next_rank()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_rank military_rank_enum;
  v_next_rank military_rank_enum;
  v_amount DECIMAL := 500.00;
  v_current_order INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Mevcut rütbe
  SELECT military_rank INTO v_current_rank
  FROM user_profiles
  WHERE user_id = v_user_id;
  
  IF v_current_rank IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Önce bağışçı profili satın almalısınız');
  END IF;
  
  -- Mareşal ise zaten en üst rütbe
  IF v_current_rank = 'mareshal' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Zaten en yüksek rütbedesiniz!');
  END IF;
  
  -- Bir sonraki rütbe
  SELECT rank_order INTO v_current_order
  FROM military_ranks
  WHERE rank = v_current_rank;
  
  SELECT rank INTO v_next_rank
  FROM military_ranks
  WHERE rank_order = v_current_order + 1;
  
  -- Transaction kaydı
  INSERT INTO subscription_transactions (
    user_id, subscription_tier, amount, payment_method,
    transaction_status, start_date, end_date, metadata
  )
  VALUES (
    v_user_id, 'prestij', v_amount, 'rank_upgrade',
    'completed', now(), now() + INTERVAL '30 days',
    jsonb_build_object('type', 'rank_skip', 'from_rank', v_current_rank, 'to_rank', v_next_rank)
  );
  
  -- Rütbe güncelle
  UPDATE user_profiles
  SET 
    military_rank = v_next_rank,
    total_spending = total_spending + v_amount,
    rank_upgraded_at = now()
  WHERE user_id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'old_rank', v_current_rank,
    'new_rank', v_next_rank,
    'amount_paid', v_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. REKLAM İSTATİSTİKLERİ (KONUM, ZAMAN, TIKLAMA)
-- =====================================================

-- Business profiles tablosu (eksikse oluştur)
CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_name TEXT,
  category TEXT,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone TEXT,
  email TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_profiles_owner ON business_profiles(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_location ON business_profiles(latitude, longitude);

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "business_profiles_public" ON business_profiles;
CREATE POLICY "business_profiles_public" ON business_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "business_profiles_own" ON business_profiles;
CREATE POLICY "business_profiles_own" ON business_profiles FOR ALL USING (auth.uid() = owner_user_id);

-- Business ads tablosu (eksikse oluştur)
CREATE TABLE IF NOT EXISTS business_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  ad_title TEXT NOT NULL,
  ad_description TEXT,
  video_platform TEXT,
  video_url TEXT,
  budget DECIMAL(10, 2) DEFAULT 0,
  budget_remaining DECIMAL(10, 2) DEFAULT 0,
  radius INT DEFAULT 1000,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'active', 'paused'
  total_impressions INT DEFAULT 0,
  total_views INT DEFAULT 0,
  total_clicks INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_ads_profile ON business_ads(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_business_ads_status ON business_ads(status);

ALTER TABLE business_ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "business_ads_public" ON business_ads;
CREATE POLICY "business_ads_public" ON business_ads FOR SELECT USING (status = 'approved');
DROP POLICY IF EXISTS "business_ads_own" ON business_ads;
CREATE POLICY "business_ads_own" ON business_ads FOR ALL USING (
  EXISTS (SELECT 1 FROM business_profiles WHERE id = business_ads.business_profile_id AND owner_user_id = auth.uid())
);

-- Ad interactions tablosu (eksikse oluştur)
CREATE TABLE IF NOT EXISTS ad_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES business_ads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'impression', 'view', 'click'
  cost DECIMAL(10, 2) DEFAULT 0,
  distance_meters DECIMAL(10, 2),
  user_latitude DECIMAL(10, 8),
  user_longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_interactions_ad ON ad_interactions(ad_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_interactions_user ON ad_interactions(user_id, created_at DESC);

ALTER TABLE ad_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ad_interactions_own" ON ad_interactions;
CREATE POLICY "ad_interactions_own" ON ad_interactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ad_interactions_insert" ON ad_interactions;
CREATE POLICY "ad_interactions_insert" ON ad_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reklam detaylı istatistikleri
ALTER TABLE ad_interactions ADD COLUMN IF NOT EXISTS watch_duration INT; -- İzleme süresi (saniye)
ALTER TABLE ad_interactions ADD COLUMN IF NOT EXISTS skipped_at INT; -- Kaç saniyede skip edildi
ALTER TABLE ad_interactions ADD COLUMN IF NOT EXISTS watched_full BOOLEAN DEFAULT false; -- Tam izlendi mi
ALTER TABLE ad_interactions ADD COLUMN IF NOT EXISTS hour_of_day INT; -- Saat (0-23)
ALTER TABLE ad_interactions ADD COLUMN IF NOT EXISTS day_of_week INT; -- Gün (1-7)

-- Reklam izlenme fonksiyonu (5sn skip + XP)
CREATE OR REPLACE FUNCTION record_ad_view_with_skip(
  p_ad_id UUID,
  p_watch_duration INT,
  p_skipped BOOLEAN,
  p_user_latitude DECIMAL DEFAULT NULL,
  p_user_longitude DECIMAL DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_ad_location RECORD;
  v_distance_meters DECIMAL;
  v_xp_earned INT := 0;
  v_cost DECIMAL := 0.10; -- İmpression maliyeti
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Reklam bilgisi
  SELECT bp.latitude AS latitude, bp.longitude AS longitude, ba.budget_remaining AS budget_remaining
  INTO v_ad_location
  FROM business_ads ba
  JOIN business_profiles bp ON bp.id = ba.business_profile_id
  WHERE ba.id = p_ad_id;
  
  -- Bütçe kontrolü
  IF v_ad_location.budget_remaining < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reklam bütçesi tükendi');
  END IF;
  
  -- Mesafe hesaplama
  IF p_user_latitude IS NOT NULL AND p_user_longitude IS NOT NULL THEN
    v_distance_meters := earth_distance(
      ll_to_earth(v_ad_location.latitude, v_ad_location.longitude),
      ll_to_earth(p_user_latitude, p_user_longitude)
    );
  END IF;
  
  -- XP hesaplama (en az 5sn izlediyse 5 XP)
  IF p_watch_duration >= 5 THEN
    v_xp_earned := 5;
    
    -- Premium bonus ekle
    SELECT 
      CASE 
        WHEN subscription_tier = 'premium_plus' THEN FLOOR(v_xp_earned * 1.10)
        WHEN subscription_tier = 'premium' THEN FLOOR(v_xp_earned * 1.05)
        ELSE v_xp_earned
      END INTO v_xp_earned
    FROM user_profiles
    WHERE user_id = v_user_id;
    
    -- XP ver
    PERFORM award_ad_watch_xp(p_ad_id);
  END IF;
  
  -- İnteraction kaydı
  INSERT INTO ad_interactions (
    ad_id, user_id, interaction_type, cost, distance_meters,
    watch_duration, skipped_at, watched_full,
    hour_of_day, day_of_week,
    user_latitude, user_longitude
  )
  VALUES (
    p_ad_id, v_user_id, 
    CASE WHEN p_watch_duration >= 5 THEN 'view' ELSE 'impression' END,
    v_cost, v_distance_meters,
    p_watch_duration, 
    CASE WHEN p_skipped THEN p_watch_duration ELSE NULL END,
    NOT p_skipped,
    EXTRACT(HOUR FROM now()),
    EXTRACT(DOW FROM now()) + 1
  );
  
  -- Bütçe güncelle
  UPDATE business_ads
  SET 
    budget_remaining = budget_remaining - v_cost,
    total_impressions = total_impressions + 1,
    total_views = total_views + CASE WHEN p_watch_duration >= 5 THEN 1 ELSE 0 END
  WHERE id = p_ad_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'xp_earned', v_xp_earned,
    'watch_duration', p_watch_duration,
    'skipped', p_skipped,
    'distance_meters', ROUND(v_distance_meters, 2)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reklam performans analizi view
CREATE OR REPLACE VIEW ad_performance_analysis AS
SELECT 
  ba.id AS ad_id,
  ba.ad_title AS title,
  bp.name AS business_name,
  COUNT(*) AS total_interactions,
  COUNT(*) FILTER (WHERE ai.interaction_type = 'impression') AS impressions,
  COUNT(*) FILTER (WHERE ai.interaction_type = 'view') AS views,
  COUNT(*) FILTER (WHERE ai.interaction_type = 'click') AS clicks,
  ROUND(AVG(ai.watch_duration), 2) AS avg_watch_duration,
  ROUND(AVG(ai.distance_meters), 2) AS avg_distance,
  COUNT(*) FILTER (WHERE ai.skipped_at IS NOT NULL) AS skip_count,
  ROUND(COUNT(*) FILTER (WHERE ai.skipped_at IS NOT NULL)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 2) AS skip_rate_percent,
  -- Saatlere göre dağılım
  jsonb_object_agg(DISTINCT ai.hour_of_day, COUNT(*) FILTER (WHERE ai.hour_of_day IS NOT NULL)) AS hourly_distribution,
  -- Günlere göre dağılım
  jsonb_object_agg(DISTINCT ai.day_of_week, COUNT(*) FILTER (WHERE ai.day_of_week IS NOT NULL)) AS daily_distribution,
  -- En çok tıklanan konumlar (5km grid)
  jsonb_agg(DISTINCT jsonb_build_object(
    'lat', ROUND(ai.user_latitude::numeric, 2),
    'lng', ROUND(ai.user_longitude::numeric, 2),
    'count', COUNT(*) FILTER (WHERE ai.user_latitude IS NOT NULL)
  )) AS top_locations
FROM business_ads ba
JOIN business_profiles bp ON bp.id = ba.business_profile_id
LEFT JOIN ad_interactions ai ON ai.ad_id = ba.id
GROUP BY ba.id, ba.ad_title, bp.name;

GRANT SELECT ON ad_performance_analysis TO authenticated;

-- =====================================================
-- 6. INDOOR FOTOĞRAF YÜKLEME + KONUM BİLGİSİ
-- =====================================================

-- Indoor fotoğraf yükleme tablosu
CREATE TABLE IF NOT EXISTS indoor_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  floor_number INT,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  -- Kullanıcının konumu (GPS)
  user_latitude DECIMAL(10, 8),
  user_longitude DECIMAL(11, 8),
  user_altitude DECIMAL(8, 2),
  user_accuracy DECIMAL(8, 2), -- GPS doğruluğu (metre)
  -- Fotoğrafın EXIF konum bilgisi
  photo_latitude DECIMAL(10, 8),
  photo_longitude DECIMAL(11, 8),
  photo_altitude DECIMAL(8, 2),
  photo_timestamp TIMESTAMPTZ, -- Fotoğraf çekim zamanı
  -- Indoor koordinatlar
  indoor_x DECIMAL(10, 2),
  indoor_y DECIMAL(10, 2),
  poi_type TEXT, -- 'room', 'corridor', 'brand', 'signage'
  label TEXT, -- "Oda 210", "Kardiyoloji", "Starbucks"
  description TEXT,
  -- Moderasyon
  moderation_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  moderation_reason TEXT,
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMPTZ,
  -- Meta
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_size_bytes BIGINT,
  compressed_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_indoor_photos_location ON indoor_photos(location_id, floor_number);
CREATE INDEX idx_indoor_photos_user ON indoor_photos(uploaded_by, created_at DESC);
CREATE INDEX idx_indoor_photos_moderation ON indoor_photos(moderation_status);

-- RLS
ALTER TABLE indoor_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "indoor_photos_read_approved" ON indoor_photos FOR SELECT USING (moderation_status = 'approved');
CREATE POLICY "indoor_photos_own" ON indoor_photos FOR SELECT USING (auth.uid() = uploaded_by);
CREATE POLICY "indoor_photos_insert" ON indoor_photos FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "indoor_photos_moderate" ON indoor_photos FOR UPDATE USING (
  auth.jwt() ->> 'email' = 'ejderha112@gmail.com' OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND user_role IN ('admin', 'moderator')
  )
);

-- Indoor fotoğraf yükleme fonksiyonu
CREATE OR REPLACE FUNCTION upload_indoor_photo(
  p_location_id UUID,
  p_floor_number INT,
  p_photo_url TEXT,
  p_user_lat DECIMAL,
  p_user_lng DECIMAL,
  p_user_altitude DECIMAL DEFAULT NULL,
  p_photo_lat DECIMAL DEFAULT NULL,
  p_photo_lng DECIMAL DEFAULT NULL,
  p_indoor_x DECIMAL DEFAULT NULL,
  p_indoor_y DECIMAL DEFAULT NULL,
  p_poi_type TEXT DEFAULT 'room',
  p_label TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_photo_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Fotoğraf kaydı
  INSERT INTO indoor_photos (
    location_id, floor_number, photo_url,
    user_latitude, user_longitude, user_altitude,
    photo_latitude, photo_longitude,
    indoor_x, indoor_y, poi_type, label,
    uploaded_by
  )
  VALUES (
    p_location_id, p_floor_number, p_photo_url,
    p_user_lat, p_user_lng, p_user_altitude,
    p_photo_lat, p_photo_lng,
    p_indoor_x, p_indoor_y, p_poi_type, p_label,
    v_user_id
  )
  RETURNING id INTO v_photo_id;
  
  -- XP ver (5-15 XP)
  INSERT INTO xp_sources (user_id, source_type, xp_amount, description, metadata)
  VALUES (v_user_id, 'photo_upload', 10, 'Indoor fotoğraf yükleme', jsonb_build_object('photo_id', v_photo_id));
  
  UPDATE user_profiles
  SET xp = xp + 10
  WHERE user_id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'photo_id', v_photo_id,
    'xp_earned', 10,
    'moderation_status', 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. PORNOGRAFİK İÇERİK BİLDİRİMİ SİSTEMİ
-- =====================================================

-- İçerik raporlama tablosu
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL, -- 'pornographic', 'violence', 'spam', 'harassment', 'other'
  reported_content_type TEXT NOT NULL, -- 'message', 'photo', 'profile', 'ad'
  reported_content_id UUID NOT NULL, -- İlgili içeriğin ID'si
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Şikayet edilen kullanıcı
  reporter_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Şikayeti yapan
  description TEXT,
  evidence_urls TEXT[], -- Kanıt fotoğraflar/ekran görüntüleri
  -- Admin panel
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewing', 'resolved', 'dismissed'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  resolution TEXT, -- 'content_removed', 'user_warned', 'user_banned', 'false_report'
  -- Otomatik bildirim
  admin_notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_content_reports_status ON content_reports(status, priority, created_at DESC);
CREATE INDEX idx_content_reports_reported_user ON content_reports(reported_user_id);
CREATE INDEX idx_content_reports_reporter ON content_reports(reporter_user_id);

-- RLS
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_reports_own" ON content_reports FOR SELECT USING (
  auth.uid() = reporter_user_id OR
  auth.uid() = reported_user_id OR
  auth.jwt() ->> 'email' = 'ejderha112@gmail.com'
);
CREATE POLICY "content_reports_insert" ON content_reports FOR INSERT WITH CHECK (
  auth.uid() = reporter_user_id
);
CREATE POLICY "content_reports_admin" ON content_reports FOR ALL USING (
  auth.jwt() ->> 'email' = 'ejderha112@gmail.com' OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND user_role IN ('admin', 'moderator')
  )
);

-- Pornografik içerik bildirimi fonksiyonu
CREATE OR REPLACE FUNCTION report_inappropriate_content(
  p_content_type TEXT,
  p_content_id UUID,
  p_reported_user_id UUID,
  p_report_type TEXT DEFAULT 'pornographic',
  p_description TEXT DEFAULT NULL,
  p_evidence_urls TEXT[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_reporter_id UUID := auth.uid();
  v_report_id UUID;
  v_admin_email TEXT := 'ejderha112@gmail.com';
BEGIN
  IF v_reporter_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Kendini şikayet edemez
  IF v_reporter_id = p_reported_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kendinizi şikayet edemezsiniz');
  END IF;
  
  -- Rapor kaydı
  INSERT INTO content_reports (
    report_type, reported_content_type, reported_content_id,
    reported_user_id, reporter_user_id, description, evidence_urls,
    priority, admin_notified, notification_sent_at
  )
  VALUES (
    p_report_type, p_content_type, p_content_id,
    p_reported_user_id, v_reporter_id, p_description, p_evidence_urls,
    CASE WHEN p_report_type = 'pornographic' THEN 'urgent' ELSE 'normal' END,
    true, now()
  )
  RETURNING id INTO v_report_id;
  
  -- Admin'e bildirim gönder (Supabase Realtime ile)
  PERFORM pg_notify(
    'admin_notifications',
    json_build_object(
      'type', 'urgent_report',
      'report_id', v_report_id,
      'report_type', p_report_type,
      'reported_user_id', p_reported_user_id,
      'reporter_user_id', v_reporter_id,
      'content_type', p_content_type,
      'timestamp', now()
    )::text
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'report_id', v_report_id,
    'message', 'Raporunuz admin''e iletildi. En kısa sürede incelenecek.',
    'admin_notified', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin panel için raporlar view
CREATE OR REPLACE VIEW admin_content_reports_dashboard AS
SELECT 
  cr.*,
  u_reported.email AS reported_user_email,
  u_reporter.email AS reporter_email,
  CASE 
    WHEN cr.report_type = 'pornographic' THEN '🔞'
    WHEN cr.report_type = 'violence' THEN '⚠️'
    WHEN cr.report_type = 'spam' THEN '📧'
    WHEN cr.report_type = 'harassment' THEN '😡'
    ELSE '❓'
  END AS type_icon,
  EXTRACT(EPOCH FROM (now() - cr.created_at)) / 60 AS minutes_since_report
FROM content_reports cr
LEFT JOIN auth.users u_reported ON u_reported.id = cr.reported_user_id
LEFT JOIN auth.users u_reporter ON u_reporter.id = cr.reporter_user_id
WHERE cr.status IN ('pending', 'reviewing')
ORDER BY 
  CASE cr.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'normal' THEN 3
    ELSE 4
  END,
  cr.created_at ASC;

GRANT SELECT ON admin_content_reports_dashboard TO authenticated;

-- =====================================================
-- GRANTs
-- =====================================================

GRANT SELECT ON building_corners TO authenticated;
GRANT SELECT ON xp_sources TO authenticated;
GRANT SELECT ON subscription_transactions TO authenticated;
GRANT SELECT ON military_ranks TO authenticated;
GRANT SELECT ON indoor_photos TO authenticated;
GRANT SELECT ON content_reports TO authenticated;

GRANT ALL ON building_corners TO authenticated;
GRANT ALL ON xp_sources TO authenticated;
GRANT ALL ON subscription_transactions TO authenticated;
GRANT ALL ON indoor_photos TO authenticated;
GRANT ALL ON content_reports TO authenticated;

-- =====================================================
-- Son
-- =====================================================

-- Tüm fonksiyonlar oluşturuldu ✅
SELECT 'COMPLETE_SYSTEM_V2 kurulumu tamamlandı! 🎉' AS status;
