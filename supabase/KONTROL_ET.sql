-- PART1'in başarıyla kurulup kurulmadığını kontrol et
-- Bu sorguları Supabase SQL Editor'da çalıştır

-- 1. user_profiles tablosu var mı ve kolonları neler?
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. Hangi tablolar kurulmuş?
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 3. Hangi fonksiyonlar var?
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
