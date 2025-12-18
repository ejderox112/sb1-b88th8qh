-- =====================================================
-- 🔧 HATA DÜZELTMELERİ - ÖNCE BUNU ÇALIŞTIR
-- =====================================================
-- Bu dosyayı COMPLETE_FINAL_SYSTEM.sql'den ÖNCE çalıştır
-- =====================================================

-- ============================================================
-- 1. EARTHDISTANCE EXTENSION'I AKTIF ET
-- ============================================================
-- Konum bazlı mesafe hesaplamaları için gerekli

CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Test et:
SELECT earth_distance(
  ll_to_earth(38.4192, 27.1287),
  ll_to_earth(38.4200, 27.1300)
) as mesafe_metre;

-- Sonuç: ~145 metre gibi bir sayı görmeli

-- ============================================================
-- 2. ADMIN_USERS TABLOSUNU OLUŞTUR
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator')),
  permissions JSONB DEFAULT '{"all": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_user ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage admins" ON admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

GRANT ALL ON admin_users TO authenticated;

-- ============================================================
-- 3. SENIN HESABINI SUPER ADMIN YAP
-- ============================================================

-- Önce user_profiles'tan user_id'ni bul ve admin_users'a ekle
INSERT INTO admin_users (user_id, email, role, permissions)
SELECT 
  auth_user_id,
  'ejderha112@gmail.com',
  'super_admin',
  '{"all": true, "approve_ads": true, "manage_users": true, "view_revenue": true}'::jsonb
FROM user_profiles
WHERE email = 'ejderha112@gmail.com'
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  permissions = '{"all": true, "approve_ads": true, "manage_users": true, "view_revenue": true}'::jsonb;

-- ============================================================
-- BAŞARI MESAJI
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE ' HATA DÜZELTMELERİ TAMAMLANDI!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Eklenenler:';
  RAISE NOTICE '  1. ✅ earthdistance extension (konum hesaplamaları)';
  RAISE NOTICE '  2. ✅ admin_users tablosu';
  RAISE NOTICE '  3. ✅ ejderha112@gmail.com super admin yapıldı';
  RAISE NOTICE '';
  RAISE NOTICE 'Şimdi COMPLETE_FINAL_SYSTEM.sql dosyasını çalıştırabilirsin!';
  RAISE NOTICE '============================================';
END $$;
