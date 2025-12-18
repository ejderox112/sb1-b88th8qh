-- Test: Supabase bağlantısı ve tablolar
-- Bu sorguyu Supabase SQL Editor'da çalıştır

-- 1. Tüm tablolar
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. user_profiles kolonları (user_role olmalı)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- 3. Fonksiyonlar
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;

-- 4. Demo data sayıları
SELECT 'business_ads' as tablo, COUNT(*) as sayi FROM business_ads
UNION ALL SELECT 'indoor_photos', COUNT(*) FROM indoor_photos
UNION ALL SELECT 'content_reports', COUNT(*) FROM content_reports
UNION ALL SELECT 'business_profiles', COUNT(*) FROM business_profiles
UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL SELECT 'locations', COUNT(*) FROM locations;
