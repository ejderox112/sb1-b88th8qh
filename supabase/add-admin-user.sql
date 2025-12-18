-- ADIM 1: Admin kullanıcısını manuel olarak ekleyin
-- Supabase Dashboard > Authentication > Users sayfasından
-- ejderha112@gmail.com için bir kullanıcı oluşturun ve user_id'sini kopyalayın

-- ADIM 2: Admin tablosuna ekleyin (user_id'yi değiştirin!)
-- Bu SQL'i Supabase SQL Editor'da çalıştırın:

-- Örnek (user_id'yi gerçek ID ile değiştirin):
-- INSERT INTO admin_users (user_id, email, role, permissions)
-- VALUES (
--   'BURAYA-USER-ID-YAZIN',  -- Supabase Auth'tan alınan gerçek UUID
--   'ejderha112@gmail.com',
--   'super_admin',
--   '{"can_create_venues": true, "can_edit_venues": true, "can_delete_venues": true, "can_manage_users": true}'::jsonb
-- )
-- ON CONFLICT (email) DO UPDATE SET
--   role = EXCLUDED.role,
--   permissions = EXCLUDED.permissions;

-- ADIM 3: Alternatif - Email'e göre otomatik ekleme
-- Eğer kullanıcı zaten auth.users'da varsa:
INSERT INTO admin_users (user_id, email, role, permissions)
SELECT 
  id,
  email,
  'super_admin',
  '{"can_create_venues": true, "can_edit_venues": true, "can_delete_venues": true, "can_manage_users": true}'::jsonb
FROM auth.users
WHERE email = 'ejderha112@gmail.com'
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions;

-- Kontrol sorgusu (admin kullanıcısı eklenmiş mi?)
SELECT * FROM admin_users WHERE email = 'ejderha112@gmail.com';
