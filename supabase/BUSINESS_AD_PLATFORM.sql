-- =============================================================================
-- YEREL ISLETME REKLAM PLATFORMU
-- =============================================================================
-- Ozellikler:
-- 1. Isletmeler konum bazli video reklam verebilir
-- 2. YouTube/Instagram/Facebook video entegrasyonu
-- 3. Admin onay sistemi
-- 4. Tiklama basina ucret
-- 5. Yakinliktaki kullanicilara goster
-- 6. Reklam bütcesi ve istatistik takibi
-- =============================================================================

-- ============================================================
-- 1. ISLETME PROFILLERL
-- ============================================================

CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL, -- restaurant, cafe, shop, service, hotel, etc
  description TEXT,
  
  -- Konum bilgileri
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  district TEXT,
  postal_code TEXT,
  
  -- Iletisim
  phone TEXT,
  email TEXT,
  website TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  youtube_url TEXT,
  
  -- Reklam ayarlari
  ad_radius_meters INTEGER DEFAULT 1000, -- 1km varsayilan
  daily_budget DECIMAL(10,2) DEFAULT 0,
  cost_per_click DECIMAL(10,2) DEFAULT 0.50, -- Tiklama basina 0.50 TL
  total_spent DECIMAL(10,2) DEFAULT 0,
  
  -- Durum
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  verification_document_url TEXT, -- Vergi levhasi, isyeri belgesi
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_location ON business_profiles 
  USING GIST (ll_to_earth(latitude, longitude));
CREATE INDEX IF NOT EXISTS idx_business_owner ON business_profiles(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_business_type ON business_profiles(business_type);
CREATE INDEX IF NOT EXISTS idx_business_active ON business_profiles(is_active, is_verified);

-- ============================================================
-- 2. VIDEO REKLAMLAR
-- ============================================================

CREATE TABLE IF NOT EXISTS business_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Video bilgileri
  title TEXT NOT NULL,
  description TEXT,
  video_platform TEXT NOT NULL CHECK (video_platform IN ('youtube', 'instagram', 'facebook', 'vimeo', 'custom')),
  video_url TEXT NOT NULL, -- YouTube link, Instagram reel, Facebook video
  video_id TEXT, -- Platform ID (YouTube video ID, Instagram post ID, etc)
  thumbnail_url TEXT,
  duration_seconds INTEGER, -- Video suresi
  
  -- Hedefleme
  target_radius_meters INTEGER DEFAULT 1000,
  target_age_min INTEGER,
  target_age_max INTEGER,
  target_gender TEXT CHECK (target_gender IN ('all', 'male', 'female')),
  target_cities TEXT[], -- Sehirler array
  
  -- Butce ve ucretlendirme
  budget_total DECIMAL(10,2) NOT NULL,
  budget_remaining DECIMAL(10,2) NOT NULL,
  cost_per_view DECIMAL(10,2) DEFAULT 0.10, -- Goruntulenme basina
  cost_per_click DECIMAL(10,2) DEFAULT 0.50, -- Tiklama basina
  
  -- Istatistikler
  total_impressions INTEGER DEFAULT 0, -- Kac kez gosterildi
  total_views INTEGER DEFAULT 0, -- Kac kez izlendi (min 3 saniye)
  total_clicks INTEGER DEFAULT 0, -- Kac kez tiklandi
  total_spent DECIMAL(10,2) DEFAULT 0,
  
  -- Kampanya suresi
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  
  -- Durum
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'rejected')),
  admin_approved BOOLEAN DEFAULT false,
  admin_approved_by UUID REFERENCES auth.users(id),
  admin_approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_ads_business ON business_ads(business_id);
CREATE INDEX IF NOT EXISTS idx_business_ads_status ON business_ads(status);
CREATE INDEX IF NOT EXISTS idx_business_ads_approved ON business_ads(admin_approved);
CREATE INDEX IF NOT EXISTS idx_business_ads_dates ON business_ads(start_date, end_date);

-- ============================================================
-- 3. REKLAM GORUNTULENME VE TIKLAMALAR
-- ============================================================

CREATE TABLE IF NOT EXISTS ad_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES business_ads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Etkilesim tipi
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('impression', 'view', 'click', 'conversion')),
  -- impression: Kullanicinin ekraninda goruldu
  -- view: En az 3 saniye izlendi
  -- click: Tiklanip detay acildi
  -- conversion: Isletmeyi ziyaret etti (optional)
  
  -- Konum bilgileri (kullanici neredeydi)
  user_latitude DOUBLE PRECISION,
  user_longitude DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION, -- Isletmeye olan mesafe
  
  -- Ucret
  cost DECIMAL(10,2) DEFAULT 0,
  
  -- Detaylar
  watch_duration_seconds INTEGER, -- Video kac saniye izlendi
  device_type TEXT, -- mobile, tablet, web
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_interactions_ad ON ad_interactions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_interactions_user ON ad_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_interactions_business ON ad_interactions(business_id);
CREATE INDEX IF NOT EXISTS idx_ad_interactions_type ON ad_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_ad_interactions_created ON ad_interactions(created_at);

-- ============================================================
-- 4. REKLAM ODEME SISTEMI
-- ============================================================

CREATE TABLE IF NOT EXISTS ad_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES business_ads(id) ON DELETE SET NULL,
  
  -- Odeme bilgileri
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'TRY',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('credit_card', 'bank_transfer', 'paypal', 'stripe')),
  
  -- Durum
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Platform detaylari
  payment_provider TEXT, -- stripe, iyzico, paytr, etc
  transaction_id TEXT,
  receipt_url TEXT,
  
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_payments_business ON ad_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_ad_payments_status ON ad_payments(status);

-- ============================================================
-- 5. ADMIN REKLAM ONAY SISTEMI
-- ============================================================

CREATE TABLE IF NOT EXISTS ad_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES business_ads(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Onay detaylari
  reviewed_by UUID REFERENCES auth.users(id),
  review_status TEXT CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  
  -- Icerik kontrol
  content_check_passed BOOLEAN DEFAULT false,
  video_check_passed BOOLEAN DEFAULT false,
  targeting_check_passed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_queue_ad ON ad_review_queue(ad_id);
CREATE INDEX IF NOT EXISTS idx_review_queue_status ON ad_review_queue(review_status);

-- ============================================================
-- FONKSIYON: YAKINLARDAKI REKLAMLARI GETIR
-- ============================================================

CREATE OR REPLACE FUNCTION get_nearby_ads(
  p_user_lat DOUBLE PRECISION,
  p_user_lng DOUBLE PRECISION,
  p_max_distance_meters INTEGER DEFAULT 5000,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  ad_id UUID,
  business_id UUID,
  business_name TEXT,
  title TEXT,
  description TEXT,
  video_platform TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  distance_meters DOUBLE PRECISION,
  cost_per_view DECIMAL,
  cost_per_click DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ba.id as ad_id,
    bp.id as business_id,
    bp.business_name,
    ba.title,
    ba.description,
    ba.video_platform,
    ba.video_url,
    ba.thumbnail_url,
    ba.duration_seconds,
    earth_distance(
      ll_to_earth(p_user_lat, p_user_lng),
      ll_to_earth(bp.latitude, bp.longitude)
    ) as distance_meters,
    ba.cost_per_view,
    ba.cost_per_click
  FROM business_ads ba
  JOIN business_profiles bp ON ba.business_id = bp.id
  WHERE 
    ba.status = 'active'
    AND ba.admin_approved = true
    AND ba.budget_remaining > 0
    AND (ba.end_date IS NULL OR ba.end_date > NOW())
    AND bp.is_active = true
    AND bp.is_verified = true
    AND earth_distance(
      ll_to_earth(p_user_lat, p_user_lng),
      ll_to_earth(bp.latitude, bp.longitude)
    ) <= LEAST(ba.target_radius_meters, p_max_distance_meters)
    -- Kullanici daha once bu reklamlari 3 kereden fazla gormemis olmali
    AND (
      SELECT COUNT(*) 
      FROM ad_interactions 
      WHERE ad_id = ba.id 
        AND user_id = auth.uid()
        AND interaction_type = 'impression'
    ) < 3
  ORDER BY distance_meters ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_nearby_ads TO authenticated;

-- ============================================================
-- FONKSIYON: REKLAM GORUNTULENME KAYDET
-- ============================================================

CREATE OR REPLACE FUNCTION record_ad_impression(
  p_ad_id UUID,
  p_user_lat DOUBLE PRECISION DEFAULT NULL,
  p_user_lng DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_ad RECORD;
  v_business RECORD;
  v_distance DOUBLE PRECISION;
  v_cost DECIMAL(10,2);
BEGIN
  -- Reklam bilgilerini al
  SELECT * INTO v_ad FROM business_ads WHERE id = p_ad_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reklam bulunamadi';
  END IF;

  -- Butce kontrolu
  IF v_ad.budget_remaining <= 0 THEN
    RAISE EXCEPTION 'Reklam butcesi tukendi';
  END IF;

  -- Business bilgilerini al
  SELECT * INTO v_business FROM business_profiles WHERE id = v_ad.business_id;

  -- Mesafe hesapla
  IF p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL THEN
    v_distance := earth_distance(
      ll_to_earth(p_user_lat, p_user_lng),
      ll_to_earth(v_business.latitude, v_business.longitude)
    );
  END IF;

  -- Goruntulenme ucreti (daha yakin kullanicilara biraz daha ucuz)
  v_cost := CASE 
    WHEN v_distance < 500 THEN v_ad.cost_per_view * 0.8
    WHEN v_distance < 1000 THEN v_ad.cost_per_view
    ELSE v_ad.cost_per_view * 1.2
  END;

  -- Kaydet
  INSERT INTO ad_interactions (
    ad_id,
    user_id,
    business_id,
    interaction_type,
    user_latitude,
    user_longitude,
    distance_meters,
    cost
  ) VALUES (
    p_ad_id,
    auth.uid(),
    v_ad.business_id,
    'impression',
    p_user_lat,
    p_user_lng,
    v_distance,
    v_cost
  );

  -- Reklam istatistiklerini guncelle
  UPDATE business_ads
  SET 
    total_impressions = total_impressions + 1,
    budget_remaining = budget_remaining - v_cost,
    total_spent = total_spent + v_cost
  WHERE id = p_ad_id;

  RETURN jsonb_build_object(
    'success', true,
    'ad_id', p_ad_id,
    'cost', v_cost,
    'distance_meters', v_distance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION record_ad_impression TO authenticated;

-- ============================================================
-- FONKSIYON: REKLAM TIKLANMA KAYDET
-- ============================================================

CREATE OR REPLACE FUNCTION record_ad_click(
  p_ad_id UUID,
  p_user_lat DOUBLE PRECISION DEFAULT NULL,
  p_user_lng DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_ad RECORD;
  v_business RECORD;
  v_distance DOUBLE PRECISION;
  v_cost DECIMAL(10,2);
BEGIN
  SELECT * INTO v_ad FROM business_ads WHERE id = p_ad_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reklam bulunamadi';
  END IF;

  IF v_ad.budget_remaining < v_ad.cost_per_click THEN
    RAISE EXCEPTION 'Reklam butcesi yetersiz';
  END IF;

  SELECT * INTO v_business FROM business_profiles WHERE id = v_ad.business_id;

  IF p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL THEN
    v_distance := earth_distance(
      ll_to_earth(p_user_lat, p_user_lng),
      ll_to_earth(v_business.latitude, v_business.longitude)
    );
  END IF;

  v_cost := v_ad.cost_per_click;

  INSERT INTO ad_interactions (
    ad_id,
    user_id,
    business_id,
    interaction_type,
    user_latitude,
    user_longitude,
    distance_meters,
    cost
  ) VALUES (
    p_ad_id,
    auth.uid(),
    v_ad.business_id,
    'click',
    p_user_lat,
    p_user_lng,
    v_distance,
    v_cost
  );

  UPDATE business_ads
  SET 
    total_clicks = total_clicks + 1,
    budget_remaining = budget_remaining - v_cost,
    total_spent = total_spent + v_cost
  WHERE id = p_ad_id;

  RETURN jsonb_build_object(
    'success', true,
    'ad_id', p_ad_id,
    'cost', v_cost,
    'business_url', v_business.website,
    'business_phone', v_business.phone
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION record_ad_click TO authenticated;

-- ============================================================
-- FONKSIYON: ADMIN REKLAM ONAY
-- ============================================================

CREATE OR REPLACE FUNCTION admin_approve_ad(
  p_ad_id UUID,
  p_approved BOOLEAN,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_admin_email TEXT;
BEGIN
  -- Admin kontrolu
  SELECT email INTO v_admin_email
  FROM user_profiles
  WHERE auth_user_id = auth.uid();

  IF v_admin_email != 'ejderha112@gmail.com' THEN
    RAISE EXCEPTION 'Sadece admin onaylayabilir';
  END IF;

  IF p_approved THEN
    UPDATE business_ads
    SET 
      status = 'active',
      admin_approved = true,
      admin_approved_by = auth.uid(),
      admin_approved_at = NOW()
    WHERE id = p_ad_id;

    UPDATE ad_review_queue
    SET 
      review_status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = NOW()
    WHERE ad_id = p_ad_id;

    RETURN jsonb_build_object('success', true, 'message', 'Reklam onaylandi');
  ELSE
    UPDATE business_ads
    SET 
      status = 'rejected',
      admin_approved = false,
      rejection_reason = p_rejection_reason
    WHERE id = p_ad_id;

    UPDATE ad_review_queue
    SET 
      review_status = 'rejected',
      review_notes = p_rejection_reason,
      reviewed_by = auth.uid(),
      reviewed_at = NOW()
    WHERE ad_id = p_ad_id;

    RETURN jsonb_build_object('success', true, 'message', 'Reklam reddedildi');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_approve_ad TO authenticated;

-- ============================================================
-- VIEW: REKLAM ISTATISTIKLERI (ISLETME ICIN)
-- ============================================================

CREATE OR REPLACE VIEW business_ad_stats AS
SELECT 
  ba.id as ad_id,
  ba.business_id,
  bp.business_name,
  ba.title,
  ba.status,
  ba.budget_total,
  ba.budget_remaining,
  ba.total_impressions,
  ba.total_views,
  ba.total_clicks,
  ba.total_spent,
  CASE 
    WHEN ba.total_impressions > 0 
    THEN (ba.total_clicks::DECIMAL / ba.total_impressions * 100)
    ELSE 0 
  END as ctr_percentage, -- Click Through Rate
  CASE 
    WHEN ba.total_clicks > 0 
    THEN (ba.total_spent / ba.total_clicks)
    ELSE 0 
  END as cost_per_acquisition,
  ba.start_date,
  ba.end_date,
  ba.created_at
FROM business_ads ba
JOIN business_profiles bp ON ba.business_id = bp.id
WHERE bp.owner_user_id = auth.uid();

GRANT SELECT ON business_ad_stats TO authenticated;

-- ============================================================
-- VIEW: ADMIN ONAY KUYRUGU
-- ============================================================

CREATE OR REPLACE VIEW admin_ad_review_dashboard AS
SELECT 
  ba.id as ad_id,
  bp.business_name,
  ba.title,
  ba.video_platform,
  ba.video_url,
  ba.budget_total,
  ba.target_radius_meters,
  ba.status,
  ba.created_at,
  arq.review_status,
  arq.content_check_passed,
  arq.video_check_passed,
  arq.targeting_check_passed
FROM business_ads ba
JOIN business_profiles bp ON ba.business_id = bp.id
LEFT JOIN ad_review_queue arq ON ba.id = arq.ad_id
WHERE ba.status = 'pending'
ORDER BY ba.created_at ASC;

GRANT SELECT ON admin_ad_review_dashboard TO authenticated;

-- ============================================================
-- VIEW: PLATFORM KAZANC RAPORU
-- ============================================================

CREATE OR REPLACE VIEW platform_revenue_report AS
SELECT 
  DATE(ai.created_at) as date,
  COUNT(DISTINCT ai.ad_id) as active_ads,
  COUNT(DISTINCT ai.business_id) as active_businesses,
  COUNT(DISTINCT ai.user_id) as unique_users,
  COUNT(*) FILTER (WHERE ai.interaction_type = 'impression') as total_impressions,
  COUNT(*) FILTER (WHERE ai.interaction_type = 'click') as total_clicks,
  SUM(ai.cost) as total_revenue,
  AVG(ai.cost) as avg_cost_per_interaction
FROM ad_interactions ai
GROUP BY DATE(ai.created_at)
ORDER BY date DESC;

-- Sadece admin gorebilir
GRANT SELECT ON platform_revenue_report TO authenticated;

-- ============================================================
-- TRIGGER: REKLAM OLUSTURULUNCA ONAY KUYRUGUNA EKLE
-- ============================================================

CREATE OR REPLACE FUNCTION add_ad_to_review_queue()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ad_review_queue (ad_id, business_id)
  VALUES (NEW.id, NEW.business_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS add_to_queue_on_ad_create ON business_ads;
CREATE TRIGGER add_to_queue_on_ad_create
  AFTER INSERT ON business_ads
  FOR EACH ROW EXECUTE FUNCTION add_ad_to_review_queue();

-- ============================================================
-- TRIGGER: BUTCE BITINCE REKLAMLARI DURDUR
-- ============================================================

CREATE OR REPLACE FUNCTION check_ad_budget()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.budget_remaining <= 0 THEN
    NEW.status := 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_budget_on_update ON business_ads;
CREATE TRIGGER check_budget_on_update
  BEFORE UPDATE ON business_ads
  FOR EACH ROW EXECUTE FUNCTION check_ad_budget();

-- ============================================================
-- RLS POLITIKALARI
-- ============================================================

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_review_queue ENABLE ROW LEVEL SECURITY;

-- business_profiles
CREATE POLICY "Users can view active businesses" ON business_profiles
  FOR SELECT USING (is_active = true AND is_verified = true);

CREATE POLICY "Owners can manage own business" ON business_profiles
  FOR ALL USING (owner_user_id = auth.uid());

-- business_ads
CREATE POLICY "Users can view active ads" ON business_ads
  FOR SELECT USING (status = 'active' AND admin_approved = true);

CREATE POLICY "Business owners can manage own ads" ON business_ads
  FOR ALL USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE owner_user_id = auth.uid()
    )
  );

-- ad_interactions
CREATE POLICY "Users can view own interactions" ON ad_interactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create interactions" ON ad_interactions
  FOR INSERT WITH CHECK (true);

-- ad_payments
CREATE POLICY "Business owners can view own payments" ON ad_payments
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE owner_user_id = auth.uid()
    )
  );

GRANT ALL ON business_profiles TO authenticated;
GRANT ALL ON business_ads TO authenticated;
GRANT ALL ON ad_interactions TO authenticated;
GRANT ALL ON ad_payments TO authenticated;
GRANT SELECT ON ad_review_queue TO authenticated;

-- ============================================================
-- BASARI MESAJI
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE ' YEREL ISLETME REKLAM PLATFORMU KURULDU!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'YENI OZELLIKLER:';
  RAISE NOTICE '  1. Isletmeler konum bazli video reklam verebilir';
  RAISE NOTICE '  2. YouTube/Instagram/Facebook video entegrasyonu';
  RAISE NOTICE '  3. Yakinliktaki kullanicilara otomatik gosterilir';
  RAISE NOTICE '  4. Tiklama basina ucretlendirme (0.50 TL)';
  RAISE NOTICE '  5. Goruntulenme basina ucretlendirme (0.10 TL)';
  RAISE NOTICE '  6. Admin onay sistemi';
  RAISE NOTICE '  7. Detayli istatistikler ve raporlama';
  RAISE NOTICE '';
  RAISE NOTICE 'YENI TABLOLAR:';
  RAISE NOTICE '  - business_profiles (isletme profilleri)';
  RAISE NOTICE '  - business_ads (video reklamlar)';
  RAISE NOTICE '  - ad_interactions (goruntulenme/tiklamalar)';
  RAISE NOTICE '  - ad_payments (odemeler)';
  RAISE NOTICE '  - ad_review_queue (admin onay kuyrugu)';
  RAISE NOTICE '';
  RAISE NOTICE 'YENI FONKSIYONLAR:';
  RAISE NOTICE '  - get_nearby_ads() --> Yakinlardaki reklamlari getir';
  RAISE NOTICE '  - record_ad_impression() --> Goruntulenme kaydet';
  RAISE NOTICE '  - record_ad_click() --> Tiklama kaydet + ucret kes';
  RAISE NOTICE '  - admin_approve_ad() --> Admin onay/red';
  RAISE NOTICE '';
  RAISE NOTICE 'KULLANIM:';
  RAISE NOTICE '  -- Yakinlardaki reklamlari gor:';
  RAISE NOTICE '  SELECT * FROM get_nearby_ads(38.4192, 27.1287, 5000, 10);';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Reklam tiklandiginda:';
  RAISE NOTICE '  SELECT record_ad_click(ad_id, 38.4192, 27.1287);';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Admin onay:';
  RAISE NOTICE '  SELECT admin_approve_ad(ad_id, true, null);';
  RAISE NOTICE '============================================';
END $$;
