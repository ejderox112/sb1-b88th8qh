# 🔧 Troubleshooting Guide - Supabase Migration

## ❓ Sık Karşılaşılan Hatalar ve Çözümleri

---

### 1️⃣ Hata: `table "admin_notifications" does not exist`

**Sebep:** TODO_MIGRATIONS.sql'deki TODO #17 çalıştırılmamış

**Çözüm:**
```sql
-- Önce şu tabloları oluştur:
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK(type IN ('user_report', 'venue_suggestion', 'indoor_suggestion', 'general_feedback', 'system_alert')),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK(severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT CHECK(status IN ('unread', 'read', 'resolved', 'archived')) DEFAULT 'unread',
  related_user_id UUID REFERENCES auth.users(id),
  related_item_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sonra MASTER_MIGRATION.sql'i çalıştır
```

---

### 2️⃣ Hata: `table "locations" does not exist`

**Sebep:** TODO_MIGRATIONS.sql'deki TODO #18 çalıştırılmamış

**Çözüm:**
```sql
-- Önce locations tablosunu oluştur:
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  floor_count INTEGER DEFAULT 1,
  building_type TEXT CHECK(building_type IN ('hospital', 'mall', 'airport', 'office', 'university', 'hotel', 'other')),
  is_active BOOLEAN DEFAULT true,
  has_indoor_map BOOLEAN DEFAULT false,
  indoor_map_data JSONB DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_coordinates 
  ON locations USING GIST (ll_to_earth(latitude, longitude));

-- Sonra MASTER_MIGRATION.sql'i çalıştır
```

---

### 3️⃣ Hata: `table "user_reports" does not exist`

**Sebep:** User report tablosu henüz oluşturulmamış

**Çözüm:**
```sql
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK(category IN (
    'harassment', 'offensive_language', 'spam', 'threat', 
    'inappropriate_content', 'fake_profile', 'impersonation', 'other'
  )),
  severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  description TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'under_review', 'resolved', 'dismissed')) DEFAULT 'pending',
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
```

---

### 4️⃣ Hata: `policy "..." already exists`

**Sebep:** Migration daha önce çalıştırılmış

**Çözüm:** 
Bu normal! DROP IF EXISTS komutu zaten var, tekrar çalıştırabilirsin. Hata olmaz.

---

### 5️⃣ Hata: `function "auth.email()" does not exist`

**Sebep:** Supabase auth helper fonksiyonları yüklü değil

**Çözüm:**
```sql
-- Auth helper fonksiyonlarını manuel ekle:
CREATE OR REPLACE FUNCTION auth.email() 
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'email',
    (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'email')
  )::text;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.uid() 
RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::json->>'sub')
  )::uuid;
$$ LANGUAGE SQL STABLE;
```

---

### 6️⃣ Hata: `trigger "..." already exists on table`

**Sebep:** Trigger daha önce oluşturulmuş

**Çözüm:**
Migration dosyasında zaten `DROP TRIGGER IF EXISTS` var. Güvenle çalıştırabilirsin.

---

### 7️⃣ Hata: Rate limit çalışmıyor (Frontend'de exception yakalanmıyor)

**Sebep:** Trigger doğru şekilde oluşturulmamış veya tablo yok

**Kontrol:**
```sql
-- Trigger'ları kontrol et
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname LIKE '%rate_limit%';
```

**Beklenen Sonuç:** 3 trigger görmelisin:
- report_rate_limit_trigger (user_reports)
- venue_rate_limit_trigger (venue_suggestions)
- indoor_rate_limit_trigger (indoor_map_suggestions)

---

### 8️⃣ Hata: `permission denied for table ...`

**Sebep:** RLS politikaları çakışıyor veya yanlış yapılandırılmış

**Çözüm:**
```sql
-- Tüm RLS politikalarını temizle ve yeniden oluştur
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own rate limits" ON ' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Admin can view all rate limits" ON ' || r.tablename;
    -- Diğer politikalar...
  END LOOP;
END $$;

-- Sonra MASTER_MIGRATION.sql'i tekrar çalıştır
```

---

### 9️⃣ Hata: Admin paneline girerken "Erişim Engellendi" mesajı

**Sebep 1:** Email yanlış veya farklı bir hesapla giriş yapılmış

**Kontrol:**
```sql
-- Şu anki kullanıcının email'ini kontrol et
SELECT auth.email() as my_email;
```
**Beklenen:** `ejderha112@gmail.com` görmelisin

**Çözüm:** Doğru hesapla (ejderha112@gmail.com) giriş yap

---

**Sebep 2:** Frontend'de email kontrolü hatalı

**Kontrol:** `app/AdminNotificationPanel.tsx` dosyasını aç, şunu gör:
```typescript
if (userEmail !== 'ejderha112@gmail.com') {
  Alert.alert('Erişim Engellendi');
  return;
}
```

**Çözüm:** Email'in tam olarak `ejderha112@gmail.com` olduğundan emin ol (boşluk yok, büyük/küçük harf duyarlı DEĞİL)

---

### 🔟 Hata: Rate limit exception frontend'de gösterilmiyor

**Sebep:** Error handling eksik veya yanlış

**Frontend Kontrolü:** `app/ReportUserScreen.tsx` içinde şu kod olmalı:
```typescript
const submitReport = async () => {
  try {
    const { error } = await supabase
      .from('user_reports')
      .insert({...});
    
    if (error) {
      // Rate limit hatası burada yakalanır
      if (error.message.includes('Rate limit')) {
        setMessage('❌ ' + error.message);
      } else {
        setMessage('❌ Şikayet gönderilemedi: ' + error.message);
      }
    }
  } catch (e) {
    console.error(e);
  }
};
```

---

## 🧪 Test Komutları

### Rate Limiting Test (Dikkatli!)
```sql
-- Mevcut limitlerini gör
SELECT * FROM get_my_rate_limits();

-- Manuel rate limit ekle (test için)
INSERT INTO rate_limits (user_id, action_type, action_count, window_start)
VALUES (auth.uid(), 'user_report', 4, now());

-- Şimdi 1 şikayet daha atabilirsin, 2. şikayette rate limit alırsın
```

### RLS Test
```sql
-- Admin olarak admin_notifications'a eriş
SELECT COUNT(*) FROM admin_notifications;
-- ✅ Başarılı olmalı (admin isen)
-- ❌ Permission denied olmalı (admin değilsen)
```

### Trigger Test
```sql
-- user_reports'a veri ekle (rate limit çalışacak)
INSERT INTO user_reports (reporter_id, reported_user_id, category, severity, description)
VALUES (
  auth.uid(), 
  'RANDOM_UUID_HERE', 
  'spam', 
  'low', 
  'Test şikayeti minimum 20 karakter'
);
-- İlk 5 başarılı, 6. seferde exception
```

---

## 📊 Sistem Sağlık Kontrolü

Migration'dan sonra bu sorguyu çalıştır:
```sql
-- Tüm sistem durumunu kontrol et
SELECT 
  'admin_notifications' as table_name,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'admin_notifications'
UNION ALL
SELECT 'locations', COUNT(*) FROM pg_policies WHERE tablename = 'locations'
UNION ALL
SELECT 'user_reports', COUNT(*) FROM pg_policies WHERE tablename = 'user_reports'
UNION ALL
SELECT 'rate_limits', COUNT(*) FROM pg_policies WHERE tablename = 'rate_limits';
```

**Beklenen Sonuç:**
```
table_name            | policy_count
----------------------|-------------
admin_notifications   | 3
locations            | 4
user_reports         | 3
rate_limits          | 2
```

---

## 🆘 Hala Çalışmıyor mu?

### Son Çare: Temizlik ve Yeniden Kurulum

```sql
-- 1. Tüm rate limit verilerini temizle
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP FUNCTION IF EXISTS check_rate_limit CASCADE;
DROP FUNCTION IF EXISTS enforce_report_rate_limit CASCADE;
DROP FUNCTION IF EXISTS enforce_venue_rate_limit CASCADE;
DROP FUNCTION IF EXISTS enforce_indoor_rate_limit CASCADE;
DROP FUNCTION IF EXISTS get_my_rate_limits CASCADE;

-- 2. Tüm RLS politikalarını temizle
DROP POLICY IF EXISTS "Only main admin can read admin_notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Only main admin can update admin_notifications" ON admin_notifications;
-- (Tüm politikalar için tekrarla)

-- 3. MASTER_MIGRATION.sql'i yeniden çalıştır
```

---

## ✅ Başarı Kriterleri

Migration başarılıysa:
- ✅ Admin paneline sadece ejderha112@gmail.com girebilir
- ✅ Diğer kullanıcılar "Erişim Engellendi" görür
- ✅ 24 saatte 5. şikayetten sonra rate limit hatası alınır
- ✅ RLS politikaları frontend bypass'ını engelliyor
- ✅ Veritabanında admin_users tablosu yok
- ✅ Trigger'lar otomatik çalışıyor

---

## 📞 Yardım

Hala sorun mu var?
1. Error mesajını tam olarak kopyala
2. Hangi sorguyu çalıştırdığını not et
3. Supabase Dashboard > Settings > Database > Connection String kontrol et
4. `get_errors` tool'u ile TypeScript hatalarını kontrol et

**Not:** MASTER_MIGRATION.sql baştan sona çalıştırılabilir, hiçbir zarar vermez. DROP IF EXISTS komutları mevcut. 🔒
