-- =====================================================
-- PART 1: TEMEL TABLOLAR + XP + PREMİUM + RÜTBE
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;
CREATE EXTENSION IF NOT EXISTS cube CASCADE;

-- =====================================================
-- TEMEL TABLOLAR
-- =====================================================

-- Locations tablosu (önce sil, sonra yeniden oluştur)
DROP TABLE IF EXISTS locations CASCADE;
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  floor_count INT DEFAULT 1,
  basement_floors INT DEFAULT 0,
  ground_floor_altitude DECIMAL(8, 2),
  total_height DECIMAL(8, 2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_locations_coords ON locations(latitude, longitude);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "locations_public" ON locations;
CREATE POLICY "locations_public" ON locations FOR SELECT USING (true);

-- User profiles tablosu
DROP TABLE IF EXISTS user_profiles CASCADE;
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT,
  nickname TEXT,
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  user_role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_profiles_public" ON user_profiles;
CREATE POLICY "user_profiles_public" ON user_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "user_profiles_own" ON user_profiles;
CREATE POLICY "user_profiles_own" ON user_profiles FOR ALL USING (auth.uid() = user_id);
-- Venue suggestions tablosu
DROP TABLE IF EXISTS venue_suggestions CASCADE;
CREATE TABLE venue_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_venue_suggestions_status ON venue_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_venue_suggestions_status ON venue_suggestions(status);

ALTER TABLE venue_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "venue_suggestions_public" ON venue_suggestions;
CREATE POLICY "venue_suggestions_public" ON venue_suggestions FOR SELECT USING (true);
DROP POLICY IF EXISTS "venue_suggestions_own" ON venue_suggestions;
CREATE POLICY "venue_suggestions_own" ON venue_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
-- =====================================================
-- BİNA KÖŞE KOORDİNATLARI
-- =====================================================

DROP TABLE IF EXISTS building_corners CASCADE;
CREATE TABLE building_corners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  corner_number INT CHECK (corner_number BETWEEN 1 AND 4),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  altitude DECIMAL(8, 2),
  description TEXT,
  photo_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id, corner_number)
);

CREATE INDEX idx_building_corners_location ON building_corners(location_id);
CREATE INDEX IF NOT EXISTS idx_building_corners_location ON building_corners(location_id);

ALTER TABLE building_corners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "building_corners_public_read" ON building_corners;
CREATE POLICY "building_corners_public_read" ON building_corners FOR SELECT USING (true);
DROP POLICY IF EXISTS "building_corners_admin_all" ON building_corners;
CREATE POLICY "building_corners_admin_all" ON building_corners FOR ALL USING (
  auth.jwt() ->> 'email' = 'ejderha112@gmail.com'
);
-- =====================================================
-- ARKADAŞLIK + MESAJLAŞMA
-- =====================================================

DROP TABLE IF EXISTS friendships CASCADE;
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

CREATE INDEX idx_friendships_user ON friendships(user_id, status);
CREATE INDEX idx_friendships_friend ON friendships(friend_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id, status);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "friendships_own" ON friendships;
CREATE POLICY "friendships_own" ON friendships FOR ALL USING (
  auth.uid() = user_id OR auth.uid() = friend_id
DROP TABLE IF EXISTS messages CASCADE;
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_group ON messages(group_id, created_at DESC);
CREATE INDEX idx_messages_user ON messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_own" ON messages;
-- =====================================================
-- XP SİSTEMİ
-- =====================================================

DROP TABLE IF EXISTS xp_sources CASCADE;
CREATE TABLE xp_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  xp_amount INT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_xp_sources_user_date ON xp_sources(user_id, created_at DESC);
CREATE INDEX idx_xp_sources_type ON xp_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_xp_sources_user_date ON xp_sources(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_sources_type ON xp_sources(source_type);

ALTER TABLE xp_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "xp_sources_own" ON xp_sources;
CREATE POLICY "xp_sources_own" ON xp_sources FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "xp_sources_insert" ON xp_sources;
CREATE POLICY "xp_sources_insert" ON xp_sources FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PREMİUM SİSTEMİ
-- =====================================================

DO $$ BEGIN
  CREATE TYPE subscription_tier_enum AS ENUM ('free', 'premium', 'prestij', 'premium_plus');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier_enum DEFAULT 'free';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ;
DROP TABLE IF EXISTS subscription_transactions CASCADE;
CREATE TABLE subscription_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tier subscription_tier_enum NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT,
  transaction_status TEXT DEFAULT 'pending',
  payment_provider_id TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

CREATE INDEX idx_subscription_transactions_user ON subscription_transactions(user_id, created_at DESC);
);

CREATE INDEX IF NOT EXISTS idx_subscription_transactions_user ON subscription_transactions(user_id, created_at DESC);

ALTER TABLE subscription_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_transactions_own" ON subscription_transactions;
CREATE POLICY "subscription_transactions_own" ON subscription_transactions FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- RÜTBE SİSTEMİ
-- =====================================================

DO $$ BEGIN
  CREATE TYPE military_rank_enum AS ENUM (
    'uzman_cavus', 'kidemli_cavus', 'bastabur', 'astsubay_1', 'astsubay_2', 
    'astsubay_3', 'astsubay_ust', 'teğmen', 'ust_tegmen', 'yuzbaşı', 
    'binbaşı', 'yarbay', 'albay', 'tuğgeneral', 'tuğamiral', 
    'tümgeneral', 'korgeneral', 'orgeneral', 'mareshal'
  );
EXCEPTION
DROP TABLE IF EXISTS military_ranks CASCADE;
CREATE TABLE military_ranks (
  rank military_rank_enum PRIMARY KEY,
  rank_name_tr TEXT NOT NULL,
  required_spending DECIMAL(10, 2) NOT NULL,
  xp_bonus_percent INT NOT NULL,
  special_badge_url TEXT,
  rank_order INT NOT NULL,
  description TEXT
);special_badge_url TEXT,
  rank_order INT NOT NULL,
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
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_spending DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS rank_upgraded_at TIMESTAMPTZ;

-- =====================================================
-- FONKSİYONLAR
-- =====================================================

-- Günlük giriş XP
CREATE OR REPLACE FUNCTION award_daily_login_xp()
RETURNS VOID AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_last_login TIMESTAMPTZ;
  v_xp_amount INT := 5;
  v_premium_bonus DECIMAL := 0;
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  
  SELECT MAX(created_at) INTO v_last_login
  FROM xp_sources
  WHERE user_id = v_user_id 
    AND source_type = 'daily_login'
    AND created_at > now() - INTERVAL '24 hours';
  
  IF v_last_login IS NOT NULL THEN RETURN; END IF;
  
  SELECT 
    CASE 
      WHEN subscription_tier = 'premium_plus' THEN 0.10
      WHEN subscription_tier = 'premium' THEN 0.05
      ELSE 0
    END INTO v_premium_bonus
  FROM user_profiles
  WHERE user_id = v_user_id;
  
  v_xp_amount := FLOOR(v_xp_amount * (1 + v_premium_bonus));
  
  INSERT INTO xp_sources (user_id, source_type, xp_amount, description)
  VALUES (v_user_id, 'daily_login', v_xp_amount, 'Günlük giriş bonusu');
  
  UPDATE user_profiles SET xp = xp + v_xp_amount WHERE user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Arkadaş ekleme XP
CREATE OR REPLACE FUNCTION award_friend_add_xp()
RETURNS TRIGGER AS $$
DECLARE
  v_friend_count INT;
  v_xp_amount INT := 20;
  v_premium_bonus DECIMAL := 0;
BEGIN
  SELECT COUNT(*) INTO v_friend_count
  FROM friendships WHERE user_id = NEW.user_id AND status = 'accepted';
  
  IF v_friend_count > 5 THEN RETURN NEW; END IF;
  
  SELECT 
    CASE 
      WHEN subscription_tier = 'premium_plus' THEN 0.10
      WHEN subscription_tier = 'premium' THEN 0.05
      ELSE 0
    END INTO v_premium_bonus
  FROM user_profiles WHERE user_id = NEW.user_id;
  
  v_xp_amount := FLOOR(v_xp_amount * (1 + v_premium_bonus));
  
  INSERT INTO xp_sources (user_id, source_type, xp_amount, description)
  VALUES (NEW.user_id, 'friend_add', v_xp_amount, 'İlk 5 arkadaş ekleme bonusu');
  
  UPDATE user_profiles SET xp = xp + v_xp_amount WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_friend_add_xp ON friendships;
CREATE TRIGGER trigger_friend_add_xp
AFTER UPDATE OF status ON friendships
FOR EACH ROW
WHEN (NEW.status = 'accepted' AND OLD.status != 'accepted')
EXECUTE FUNCTION award_friend_add_xp();

-- Premium satın alma
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
  
  v_amount := CASE p_tier
    WHEN 'premium' THEN 79.00 * p_duration_months
    WHEN 'prestij' THEN 500.00 * p_duration_months
    WHEN 'premium_plus' THEN 1000.00 * p_duration_months
    ELSE 0
  END;
  
  v_end_date := v_start_date + (p_duration_months || ' months')::INTERVAL;
  
  INSERT INTO subscription_transactions (
    user_id, subscription_tier, amount, payment_method, 
    transaction_status, start_date, end_date
  )
  VALUES (
    v_user_id, p_tier, v_amount, p_payment_method,
    'completed', v_start_date, v_end_date
  )
  RETURNING id INTO v_transaction_id;
  
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
    'amount', v_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rütbe güncelleme
CREATE OR REPLACE FUNCTION update_military_rank()
RETURNS TRIGGER AS $$
DECLARE
  v_total_spending DECIMAL;
  v_new_rank military_rank_enum;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_spending
  FROM subscription_transactions
  WHERE user_id = NEW.user_id AND transaction_status = 'completed';
  
  SELECT rank INTO v_new_rank
  FROM military_ranks
  WHERE required_spending <= v_total_spending
  ORDER BY rank_order DESC LIMIT 1;
  
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

-- GRANTs
GRANT SELECT ON building_corners TO authenticated;
GRANT SELECT ON xp_sources TO authenticated;
GRANT SELECT ON subscription_transactions TO authenticated;
GRANT SELECT ON military_ranks TO authenticated;
GRANT ALL ON building_corners TO authenticated;
GRANT ALL ON xp_sources TO authenticated;
GRANT ALL ON subscription_transactions TO authenticated;

SELECT 'PART 1 kurulumu tamamlandı! ✅' AS status;
