-- SADECE KOLON İSMİNİ DÜZ0LT (PART2'den önce çalıştır)
-- user_code → user_role
ALTER TABLE user_profiles RENAME COLUMN user_code TO user_role;

SELECT 'Kolon adı düzeltildi! Şimdi PART2 çalıştır.' AS status;
