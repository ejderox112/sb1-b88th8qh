-- =====================================================
-- KURULUM KONTROLÜ - PART1 + PART2
-- Supabase SQL Editor'da çalıştır
-- =====================================================

-- 1. TÜM TABLOLAR
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. USER_PROFILES KOLONU KONTROLÜ
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 3. TÜM FONKSİYONLAR
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;

-- 4. BUSINESS TABLES KONTROLÜ
SELECT 
  'business_profiles' as tablo,
  COUNT(*) as kayit_sayisi
FROM business_profiles
UNION ALL
SELECT 
  'business_ads' as tablo,
  COUNT(*) as kayit_sayisi
FROM business_ads
UNION ALL
SELECT 
  'ad_interactions' as tablo,
  COUNT(*) as kayit_sayisi
FROM ad_interactions;

-- 5. INDOOR PHOTOS KONTROLÜ
SELECT 
  'indoor_photos' as tablo,
  COUNT(*) as kayit_sayisi
FROM indoor_photos
UNION ALL
SELECT 
  'content_reports' as tablo,
  COUNT(*) as kayit_sayisi
FROM content_reports;

-- 6. XP VE PREMIUM KONTROLÜ
SELECT 
  'locations' as tablo,
  COUNT(*) as kayit_sayisi
FROM locations
UNION ALL
SELECT 
  'user_profiles' as tablo,
  COUNT(*) as kayit_sayisi
FROM user_profiles
UNION ALL
SELECT 
  'xp_sources' as tablo,
  COUNT(*) as kayit_sayisi
FROM xp_sources
UNION ALL
SELECT 
  'subscription_transactions' as tablo,
  COUNT(*) as kayit_sayisi
FROM subscription_transactions
UNION ALL
SELECT 
  'military_ranks' as tablo,
  COUNT(*) as kayit_sayisi
FROM military_ranks;

-- 7. FONKSİYON TEST - XP Sistemi
SELECT 
  routine_name,
  CASE 
    WHEN routine_name IN ('award_daily_login_xp', 'award_friend_add_xp', 'award_ad_watch_xp') THEN '✅ XP fonksiyonu'
    WHEN routine_name IN ('purchase_subscription', 'update_military_rank') THEN '✅ Premium fonksiyonu'
    WHEN routine_name IN ('record_ad_view_with_skip', 'upload_indoor_photo', 'report_inappropriate_content') THEN '✅ PART2 fonksiyonu'
    ELSE '⚠️ Diğer'
  END as kategori
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY kategori, routine_name;

-- 8. RLS POLİCY KONTROLÜ
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 9. INDEX KONTROLÜ
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 10. FOREIGN KEY KONTROLÜ
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

SELECT '
=====================================================
✅ KURULUM KONTROLÜ TAMAMLANDI
=====================================================

Yukarıdaki sonuçları kontrol et:
1. Tüm tablolar var mı? (14 tablo olmalı)
2. user_profiles tablosunda user_role kolonu var mı?
3. Fonksiyonlar çalışıyor mu? (8 fonksiyon olmalı)
4. RLS policy''leri kurulmuş mu?
5. Index''ler oluşturulmuş mu?

' AS RAPOR;
