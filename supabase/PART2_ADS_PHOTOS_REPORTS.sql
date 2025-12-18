-- =====================================================
-- PART 2: REKLAM SİSTEMİ + FOTOĞRAFLAR + RAPORLAR
-- =====================================================

-- =====================================================
-- BUSİNESS PROFİLLERİ VE REKLAMLAR
-- =====================================================

DROP TABLE IF EXISTS business_profiles CASCADE;
CREATE TABLE business_profiles (
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

CREATE INDEX idx_business_profiles_owner ON business_profiles(owner_user_id);
CREATE INDEX idx_business_profiles_location ON business_profiles(latitude, longitude);

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "business_profiles_public" ON business_profiles;
CREATE POLICY "business_profiles_public" ON business_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "business_profiles_own" ON business_profiles;
CREATE POLICY "business_profiles_own" ON business_profiles FOR ALL USING (auth.uid() = owner_user_id);

DROP TABLE IF EXISTS business_ads CASCADE;
CREATE TABLE business_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  ad_title TEXT NOT NULL,
  ad_description TEXT,
  video_platform TEXT,
  video_url TEXT,
  budget DECIMAL(10, 2) DEFAULT 0,
  budget_remaining DECIMAL(10, 2) DEFAULT 0,
  radius INT DEFAULT 1000,
  status TEXT DEFAULT 'pending',
  total_impressions INT DEFAULT 0,
  total_views INT DEFAULT 0,
  total_clicks INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_business_ads_profile ON business_ads(business_profile_id);
CREATE INDEX idx_business_ads_status ON business_ads(status);s_profile_id);
CREATE INDEX IF NOT EXISTS idx_business_ads_status ON business_ads(status);

ALTER TABLE business_ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "business_ads_public" ON business_ads;
CREATE POLICY "business_ads_public" ON business_ads FOR SELECT USING (status = 'approved');
DROP POLICY IF EXISTS "business_ads_own" ON business_ads;
CREATE POLICY "business_ads_own" ON business_ads FOR ALL USING (
  EXISTS (SELECT 1 FROM business_profiles WHERE id = business_ads.business_profile_id AND owner_user_id = auth.uid())
);

DROP TABLE IF EXISTS ad_interactions CASCADE;
CREATE TABLE ad_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES business_ads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  cost DECIMAL(10, 2) DEFAULT 0,
  distance_meters DECIMAL(10, 2),
  watch_duration INT,
  skipped_at INT,
  watched_full BOOLEAN DEFAULT false,
  hour_of_day INT,
  day_of_week INT,
  user_latitude DECIMAL(10, 8),
  user_longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ad_interactions_ad ON ad_interactions(ad_id, created_at DESC);
CREATE INDEX idx_ad_interactions_user ON ad_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_interactions_user ON ad_interactions(user_id, created_at DESC);

ALTER TABLE ad_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ad_interactions_own" ON ad_interactions;
CREATE POLICY "ad_interactions_own" ON ad_interactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ad_interactions_insert" ON ad_interactions;
CREATE POLICY "ad_interactions_insert" ON ad_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
-- =====================================================
-- INDOOR FOTOĞRAFLAR
-- =====================================================

DROP TABLE IF EXISTS indoor_photos CASCADE;
CREATE TABLE indoor_photos (
CREATE TABLE IF NOT EXISTS indoor_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  floor_number INT,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  user_latitude DECIMAL(10, 8),
  user_longitude DECIMAL(11, 8),
  user_altitude DECIMAL(8, 2),
  user_accuracy DECIMAL(8, 2),
  photo_latitude DECIMAL(10, 8),
  photo_longitude DECIMAL(11, 8),
  photo_altitude DECIMAL(8, 2),
  photo_timestamp TIMESTAMPTZ,
  indoor_x DECIMAL(10, 2),
  indoor_y DECIMAL(10, 2),
  poi_type TEXT,
  label TEXT,
  description TEXT,
  moderation_status TEXT DEFAULT 'pending',
  moderation_reason TEXT,
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_size_bytes BIGINT,
  compressed_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_indoor_photos_location ON indoor_photos(location_id, floor_number);
CREATE INDEX idx_indoor_photos_user ON indoor_photos(uploaded_by, created_at DESC);
CREATE INDEX idx_indoor_photos_moderation ON indoor_photos(moderation_status);ESC);
CREATE INDEX IF NOT EXISTS idx_indoor_photos_moderation ON indoor_photos(moderation_status);

ALTER TABLE indoor_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indoor_photos_read_approved" ON indoor_photos;
CREATE POLICY "indoor_photos_read_approved" ON indoor_photos FOR SELECT USING (moderation_status = 'approved');
DROP POLICY IF EXISTS "indoor_photos_own" ON indoor_photos;
CREATE POLICY "indoor_photos_own" ON indoor_photos FOR SELECT USING (auth.uid() = uploaded_by);
DROP POLICY IF EXISTS "indoor_photos_insert" ON indoor_photos;
CREATE POLICY "indoor_photos_insert" ON indoor_photos FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
DROP POLICY IF EXISTS "indoor_photos_moderate" ON indoor_photos;
CREATE POLICY "indoor_photos_moderate" ON indoor_photos FOR UPDATE USING (
  auth.jwt() ->> 'email' = 'ejderha112@gmail.com' OR
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND user_role IN ('admin', 'moderator'))
);
-- =====================================================
-- İÇERİK RAPORLARI
-- =====================================================

DROP TABLE IF EXISTS content_reports CASCADE;
CREATE TABLE content_reports (
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  reported_content_type TEXT NOT NULL,
  reported_content_id UUID NOT NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  evidence_urls TEXT[],
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  resolution TEXT,
  admin_notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
CREATE INDEX idx_content_reports_status ON content_reports(status, priority, created_at DESC);
CREATE INDEX idx_content_reports_reported_user ON content_reports(reported_user_id);
CREATE INDEX idx_content_reports_reporter ON content_reports(reporter_user_id);eated_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_reported_user ON content_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON content_reports(reporter_user_id);

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_reports_own" ON content_reports;
CREATE POLICY "content_reports_own" ON content_reports FOR SELECT USING (
  auth.uid() = reporter_user_id OR
  auth.uid() = reported_user_id OR
  auth.jwt() ->> 'email' = 'ejderha112@gmail.com'
);
DROP POLICY IF EXISTS "content_reports_insert" ON content_reports;
CREATE POLICY "content_reports_insert" ON content_reports FOR INSERT WITH CHECK (auth.uid() = reporter_user_id);
DROP POLICY IF EXISTS "content_reports_admin" ON content_reports;
CREATE POLICY "content_reports_admin" ON content_reports FOR ALL USING (
  auth.jwt() ->> 'email' = 'ejderha112@gmail.com' OR
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND user_role IN ('admin', 'moderator'))
);

-- =====================================================
-- FONKSİYONLAR
-- =====================================================

-- Reklam izleme XP
CREATE OR REPLACE FUNCTION award_ad_watch_xp(p_ad_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_xp_amount INT := 5;
  v_premium_bonus DECIMAL := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  SELECT 
    CASE 
      WHEN subscription_tier = 'premium_plus' THEN 0.10
      WHEN subscription_tier = 'premium' THEN 0.05
      ELSE 0
    END INTO v_premium_bonus
  FROM user_profiles WHERE user_id = v_user_id;
  
  v_xp_amount := FLOOR(v_xp_amount * (1 + v_premium_bonus));
  
  INSERT INTO xp_sources (user_id, source_type, xp_amount, description, metadata)
  VALUES (v_user_id, 'ad_watch', v_xp_amount, 'Reklam izleme', jsonb_build_object('ad_id', p_ad_id));
  
  UPDATE user_profiles SET xp = xp + v_xp_amount WHERE user_id = v_user_id;
  
  RETURN jsonb_build_object('success', true, 'xp_earned', v_xp_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reklam izlenme kaydı
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
  v_cost DECIMAL := 0.10;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  SELECT bp.latitude AS latitude, bp.longitude AS longitude, ba.budget_remaining AS budget_remaining
  INTO v_ad_location
  FROM business_ads ba
  JOIN business_profiles bp ON bp.id = ba.business_profile_id
  WHERE ba.id = p_ad_id;
  
  IF v_ad_location.budget_remaining < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reklam bütçesi tükendi');
  END IF;
  
  IF p_user_latitude IS NOT NULL AND p_user_longitude IS NOT NULL THEN
    v_distance_meters := earth_distance(
      ll_to_earth(v_ad_location.latitude, v_ad_location.longitude),
      ll_to_earth(p_user_latitude, p_user_longitude)
    );
  END IF;
  
  IF p_watch_duration >= 5 THEN
    v_xp_earned := 5;
    PERFORM award_ad_watch_xp(p_ad_id);
  END IF;
  
  INSERT INTO ad_interactions (
    ad_id, user_id, interaction_type, cost, distance_meters,
    watch_duration, skipped_at, watched_full,
    hour_of_day, day_of_week, user_latitude, user_longitude
  )
  VALUES (
    p_ad_id, v_user_id, 
    CASE WHEN p_watch_duration >= 5 THEN 'view' ELSE 'impression' END,
    v_cost, v_distance_meters, p_watch_duration, 
    CASE WHEN p_skipped THEN p_watch_duration ELSE NULL END,
    NOT p_skipped, EXTRACT(HOUR FROM now()), EXTRACT(DOW FROM now()) + 1,
    p_user_latitude, p_user_longitude
  );
  
  UPDATE business_ads
  SET 
    budget_remaining = budget_remaining - v_cost,
    total_impressions = total_impressions + 1,
    total_views = total_views + CASE WHEN p_watch_duration >= 5 THEN 1 ELSE 0 END
  WHERE id = p_ad_id;
  
  RETURN jsonb_build_object('success', true, 'xp_earned', v_xp_earned);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indoor fotoğraf yükleme
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
  
  INSERT INTO indoor_photos (
    location_id, floor_number, photo_url,
    user_latitude, user_longitude, user_altitude,
    photo_latitude, photo_longitude,
    indoor_x, indoor_y, poi_type, label, uploaded_by
  )
  VALUES (
    p_location_id, p_floor_number, p_photo_url,
    p_user_lat, p_user_lng, p_user_altitude,
    p_photo_lat, p_photo_lng,
    p_indoor_x, p_indoor_y, p_poi_type, p_label, v_user_id
  )
  RETURNING id INTO v_photo_id;
  
  INSERT INTO xp_sources (user_id, source_type, xp_amount, description, metadata)
  VALUES (v_user_id, 'photo_upload', 10, 'Indoor fotoğraf yükleme', jsonb_build_object('photo_id', v_photo_id));
  
  UPDATE user_profiles SET xp = xp + 10 WHERE user_id = v_user_id;
  
  RETURN jsonb_build_object('success', true, 'photo_id', v_photo_id, 'xp_earned', 10);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- İçerik raporlama
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
BEGIN
  IF v_reporter_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  IF v_reporter_id = p_reported_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kendinizi şikayet edemezsiniz');
  END IF;
  
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
  
  PERFORM pg_notify('admin_notifications',
    json_build_object(
      'type', 'urgent_report',
      'report_id', v_report_id,
      'report_type', p_report_type,
      'timestamp', now()
    )::text
  );
  
  RETURN jsonb_build_object('success', true, 'report_id', v_report_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GRANTs
GRANT SELECT ON indoor_photos TO authenticated;
GRANT SELECT ON content_reports TO authenticated;
GRANT ALL ON indoor_photos TO authenticated;
GRANT ALL ON content_reports TO authenticated;

SELECT 'PART 2 kurulumu tamamlandı! ✅' AS status;
