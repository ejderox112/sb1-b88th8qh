-- =====================================================
-- DEMO DATA - TEST İÇİN
-- =====================================================

-- 1. Test lokasyonu ekle (Eğer yoksa)
INSERT INTO locations (name, address, latitude, longitude, floor_count, basement_floors, ground_floor_altitude, total_height)
VALUES 
  ('İzmir Şehir Hastanesi', 'Şehir Hastanesi Cad. No:1, Bornova/İzmir', 38.4613, 27.2069, 10, 2, 50.0, 45.0),
  ('Ege Üniversitesi Tıp Fakültesi', 'Bornova/İzmir', 38.4400, 27.2100, 8, 1, 45.0, 30.0),
  ('Forum Bornova AVM', 'Kazımdirik Mah. Bornova/İzmir', 38.4520, 27.2180, 4, 1, 40.0, 20.0)
ON CONFLICT DO NOTHING;

-- 2. Test business profile ekle
DO $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
BEGIN
  -- Auth user'dan ilk kullanıcıyı al
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Business profile ekle
    INSERT INTO business_profiles (owner_user_id, name, business_name, category, address, latitude, longitude, phone, email)
    VALUES 
      (v_user_id, 'Test İşletmesi', 'Test Market', 'perakende', 'Bornova/İzmir', 38.4613, 27.2069, '05551234567', 'test@example.com')
    RETURNING id INTO v_business_id;
    
    -- Bekleyen test reklamı ekle
    INSERT INTO business_ads (business_profile_id, ad_title, ad_description, video_platform, video_url, budget, budget_remaining, radius, status)
    VALUES 
      (v_business_id, 'Yeni Kampanya!', 'Tüm ürünlerde %50 indirim', 'youtube', 'https://youtube.com/watch?v=demo', 100.00, 100.00, 1000, 'pending'),
      (v_business_id, 'Açılış Özel', 'İlk 100 müşteriye hediye', 'youtube', 'https://youtube.com/watch?v=demo2', 50.00, 50.00, 500, 'pending');
    
    RAISE NOTICE 'Demo reklamlar oluşturuldu!';
  ELSE
    RAISE NOTICE 'Auth user bulunamadı. Önce giriş yapın.';
  END IF;
END $$;

-- 3. Test indoor photo ekle (bekleyen moderasyon)
DO $$
DECLARE
  v_user_id UUID;
  v_location_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  SELECT id INTO v_location_id FROM locations WHERE name = 'İzmir Şehir Hastanesi' LIMIT 1;
  
  IF v_user_id IS NOT NULL AND v_location_id IS NOT NULL THEN
    INSERT INTO indoor_photos (
      location_id, floor_number, photo_url, 
      user_latitude, user_longitude, user_altitude,
      poi_type, label, moderation_status, uploaded_by
    )
    VALUES 
      (v_location_id, 0, 'https://example.com/photo1.jpg', 38.4613, 27.2069, 50.0, 'entrance', 'Ana Giriş', 'pending', v_user_id),
      (v_location_id, 1, 'https://example.com/photo2.jpg', 38.4613, 27.2069, 55.0, 'corridor', 'Koridor', 'pending', v_user_id),
      (v_location_id, 2, 'https://example.com/photo3.jpg', 38.4613, 27.2069, 60.0, 'room', 'Oda 201', 'pending', v_user_id);
    
    RAISE NOTICE 'Demo indoor fotoğraflar oluşturuldu!';
  END IF;
END $$;

-- 4. Test venue suggestion ekle
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO venue_suggestions (
      suggested_by, name, address, latitude, longitude, 
      category, description, status
    )
    VALUES 
      (v_user_id, 'Yeni Kafe', 'Bornova Merkez', 38.4500, 27.2150, 'kafe', 'Harika bir mekan', 'pending'),
      (v_user_id, 'Spor Salonu', 'Karşıyaka', 38.4600, 27.1800, 'spor', 'Yeni açılan spor merkezi', 'pending');
    
    RAISE NOTICE 'Demo mekan önerileri oluşturuldu!';
  END IF;
END $$;

-- 5. Test content report ekle
DO $$
DECLARE
  v_reporter_id UUID;
  v_reported_id UUID;
BEGIN
  SELECT id INTO v_reporter_id FROM auth.users LIMIT 1;
  SELECT id INTO v_reported_id FROM auth.users OFFSET 1 LIMIT 1;
  
  IF v_reported_id IS NULL THEN
    v_reported_id := v_reporter_id; -- Tek kullanıcı varsa
  END IF;
  
  IF v_reporter_id IS NOT NULL THEN
    INSERT INTO content_reports (
      report_type, reported_content_type, reported_content_id,
      reported_user_id, reporter_user_id, description, status, priority
    )
    VALUES 
      ('spam', 'photo', gen_random_uuid(), v_reported_id, v_reporter_id, 'Spam içerik', 'pending', 'normal'),
      ('pornographic', 'photo', gen_random_uuid(), v_reported_id, v_reporter_id, 'Uygunsuz içerik', 'pending', 'urgent');
    
    RAISE NOTICE 'Demo içerik raporları oluşturuldu!';
  END IF;
END $$;

-- 6. Özet rapor
SELECT 
  'business_ads' as tablo,
  status,
  COUNT(*) as adet
FROM business_ads
GROUP BY status
UNION ALL
SELECT 
  'indoor_photos' as tablo,
  moderation_status as status,
  COUNT(*) as adet
FROM indoor_photos
GROUP BY moderation_status
UNION ALL
SELECT 
  'venue_suggestions' as tablo,
  status,
  COUNT(*) as adet
FROM venue_suggestions
GROUP BY status
UNION ALL
SELECT 
  'content_reports' as tablo,
  status,
  COUNT(*) as adet
FROM content_reports
GROUP BY status
ORDER BY tablo, status;

SELECT '
=====================================================
✅ DEMO DATA OLUŞTURULDU!
=====================================================

Admin Panelde görebilirsin:
- 2 bekleyen reklam
- 3 bekleyen indoor fotoğraf
- 2 bekleyen mekan önerisi
- 2 içerik şikayeti (1 urgent)

Şimdi AdminCentralPanel ekranına git!
' AS DURUM;
