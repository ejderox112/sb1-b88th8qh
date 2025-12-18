-- Test kullanıcısı oluştur (OAuth olmadan direkt giriş)

-- 1. Test email/password kullanıcısı
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  crypt('test123456', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- 2. Admin kullanıcısı (senin için)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'ejderha112@gmail.com',
  crypt('admin123456', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Sonuç
SELECT 
  email,
  email_confirmed_at,
  'Şifre: test123456 veya admin123456' as bilgi
FROM auth.users
WHERE email IN ('test@example.com', 'ejderha112@gmail.com');
