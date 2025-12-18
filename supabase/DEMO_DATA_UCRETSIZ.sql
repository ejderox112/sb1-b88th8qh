-- =====================================================
-- ÜCRETSİZ SUPABASE İÇİN DEMO DATA
-- =====================================================

-- 1. Test lokasyonları (BASIT - CONFLICT kontrolü yok)
INSERT INTO locations (name, address, latitude, longitude, floor_count, basement_floors, ground_floor_altitude, total_height)
SELECT * FROM (VALUES
  ('İzmir Şehir Hastanesi', 'Şehir Hastanesi Cad. No:1, Bornova/İzmir', 38.4613, 27.2069, 10, 2, 50.0, 45.0),
  ('Ege Üniversitesi', 'Bornova/İzmir', 38.4400, 27.2100, 8, 1, 45.0, 30.0),
  ('Forum Bornova', 'Kazımdirik Mah. Bornova/İzmir', 38.4520, 27.2180, 4, 1, 40.0, 20.0)
) AS v(name, address, latitude, longitude, floor_count, basement_floors, ground_floor_altitude, total_height)
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE name = v.name);

SELECT '✅ Lokasyonlar eklendi!' AS durum;

-- 2. Admin kullanıcı profili oluştur (yoksa)
DO $$
DECLARE
  v_admin_user_id UUID;
BEGIN
  -- ejderha112@gmail.com kullanıcısının ID'sini bul
  SELECT id INTO v_admin_user_id 
  FROM auth.users 
  WHERE email = 'ejderha112@gmail.com' 
  LIMIT 1;
  
  IF v_admin_user_id IS NOT NULL THEN
    -- user_profiles'da kayıt yoksa ekle
    INSERT INTO user_profiles (user_id, email, nickname, level, xp, user_role)
    SELECT v_admin_user_id, 'ejderha112@gmail.com', 'Admin', 50, 5000, 'admin'
    WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = v_admin_user_id);
    
    RAISE NOTICE 'Admin profil hazır!';
  ELSE
    RAISE NOTICE 'Admin kullanıcı bulunamadı. Önce giriş yapın!';
  END IF;
END $$;

-- 3. Test business profile ve reklamlar
DO $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
BEGIN
  -- İlk user'ı al (admin olabilir)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Business profile ekle
    INSERT INTO business_profiles (owner_user_id, name, business_name, category, address, latitude, longitude, phone, email)
    VALUES (v_user_id, 'Test Market', 'ABC Market', 'perakende', 'Bornova/İzmir', 38.4613, 27.2069, '05551234567', 'test@market.com')
    RETURNING id INTO v_business_id;
    
    -- 2 bekleyen reklam
    INSERT INTO business_ads (business_profile_id, ad_title, ad_description, video_platform, video_url, budget, budget_remaining, radius, status)
    VALUES 
      (v_business_id, '🎉 Yeni Kampanya', 'Tüm ürünlerde %50 indirim', 'youtube', 'https://youtube.com/watch?v=demo1', 100.00, 100.00, 1000, 'pending'),
      (v_business_id, '🎁 Açılış Özel', 'İlk 100 müşteriye hediye', 'youtube', 'https://youtube.com/watch?v=demo2', 50.00, 50.00, 500, 'pending');
    
    RAISE NOTICE '✅ Demo reklamlar oluşturuldu!';
  END IF;
END $$;

-- 4. Indoor photos (pending moderasyon)
DO $$
DECLARE
  v_user_id UUID;
  v_location_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  SELECT id INTO v_location_id FROM locations WHERE name LIKE '%Şehir Hastanesi%' LIMIT 1;
  
  IF v_user_id IS NOT NULL AND v_location_id IS NOT NULL THEN
    INSERT INTO indoor_photos (
      location_id, floor_number, photo_url, 
      user_latitude, user_longitude, user_altitude,
      poi_type, label, moderation_status, uploaded_by
    )
    VALUES 
      (v_location_id, 0, 'https://picsum.photos/400/300?random=1', 38.4613, 27.2069, 50.0, 'entrance', '🚪 Ana Giriş', 'pending', v_user_id),
      (v_location_id, 1, 'https://picsum.photos/400/300?random=2', 38.4613, 27.2069, 55.0, 'corridor', '🚶 Koridor', 'pending', v_user_id),
      (v_location_id, 2, 'https://picsum.photos/400/300?random=3', 38.4613, 27.2069, 60.0, 'room', '🏥 Oda 201', 'pending', v_user_id);
    
    RAISE NOTICE '✅ Demo fotoğraflar oluşturuldu!';
  END IF;
END $$;

-- 5. Venue suggestions (bekleyen mekan önerileri)
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO venue_suggestions (
      user_id, name, address, latitude, longitude, status
    )
    VALUES 
      (v_user_id, '☕ Yeni Kafe', 'Bornova Merkez', 38.4500, 27.2150, 'pending'),
      (v_user_id, '🏋️ Spor Salonu', 'Karşıyaka', 38.4600, 27.1800, 'pending');
    
    RAISE NOTICE '✅ Demo mekan önerileri oluşturuldu!';
  END IF;
END $$;

-- 6. Content reports (içerik şikayetleri)
DO $$
DECLARE
  v_reporter_id UUID;
  v_dummy_id UUID := gen_random_uuid();
BEGIN
  SELECT id INTO v_reporter_id FROM auth.users LIMIT 1;
  
  IF v_reporter_id IS NOT NULL THEN
    INSERT INTO content_reports (
      report_type, reported_content_type, reported_content_id,
      reported_user_id, reporter_user_id, description, status, priority
    )
    VALUES 
      ('spam', 'photo', v_dummy_id, v_reporter_id, v_reporter_id, '📧 Spam içerik tespit edildi', 'pending', 'normal'),
      ('pornographic', 'photo', v_dummy_id, v_reporter_id, v_reporter_id, '🚫 Uygunsuz içerik - ACİL', 'pending', 'urgent');
    
    RAISE NOTICE '✅ Demo raporlar oluşturuldu!';
  END IF;
END $$;

-- =====================================================
-- ÖZET RAPOR
-- =====================================================

SELECT '
╔════════════════════════════════════════════════════╗
║      ✅ DEMO DATA BAŞARIYLA OLUŞTURULDU!          ║
╚════════════════════════════════════════════════════╝
' AS baslik;

SELECT 
  '📊 TABLO ÖZETİ' as kategori,
  'business_ads' as tablo,
  status,
  COUNT(*) as adet
FROM business_ads
GROUP BY status

UNION ALL

SELECT 
  '📊 TABLO ÖZETİ',
  'indoor_photos',
  moderation_status,
  COUNT(*)
FROM indoor_photos
GROUP BY moderation_status

UNION ALL

SELECT 
  '📊 TABLO ÖZETİ',
  'venue_suggestions',
  status,
  COUNT(*)
FROM venue_suggestions
GROUP BY status

UNION ALL

SELECT 
  '📊 TABLO ÖZETİ',
  'content_reports',
  status || ' (' || priority || ')',
  COUNT(*)
FROM content_reports
GROUP BY status, priority

ORDER BY kategori, tablo, status;

SELECT '
╔════════════════════════════════════════════════════╗
║             🎯 ADMIN PANEL HAZIR!                 ║
╚════════════════════════════════════════════════════╝

Admin Panel İstatistikleri:
- ⏳ Bekleyen Reklamlar: 2
- 📸 Bekleyen Fotoğraflar: 3
- 📍 Bekleyen Mekanlar: 2
- 🚨 İçerik Şikayetleri: 2 (1 urgent)

Şimdi yapman gerekenler:
1. Uygulamayı aç (expo start)
2. ejderha112@gmail.com ile giriş yap
3. Profile → Admin butonuna tıkla
4. AdminCentralPanel açılacak
5. Her özelliği test et!

🚀 Başarılar!
' AS sonuc;
