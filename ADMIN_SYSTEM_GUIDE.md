# 🛡️ Admin Yönetim Sistemi - Kullanım Kılavuzu

## 📋 İçerik

1. [Admin Panelleri](#admin-panelleri)
2. [Özellikler](#özellikler)
3. [Kurulum](#kurulum)
4. [Kullanım](#kullanım)
5. [Güvenlik](#güvenlik)

---

## 🎯 Admin Panelleri

### 1. 🔔 Bildirim Paneli (`AdminNotificationPanel.tsx`)
Admin'in tüm şikayetleri, önerileri ve sistem uyarılarını tek panelden görüntülemesi.

**Özellikler:**
- 📊 İstatistik kartları (bekleyen şikayetler, aktif kullanıcılar, yeni kullanıcılar)
- 🚀 Hızlı erişim butonları (şikayetler, mekanlar, iç mekan, kroki editör)
- 🔍 Bildirim arama ve filtreleme
- 👁️ Okundu/Çözüldü/Arşivle işlemleri
- 🔄 Pull-to-refresh ile yenileme

**Bildirim Tipleri:**
- 🚨 Kullanıcı Şikayeti (user_report)
- 🏥 Mekan Önerisi (venue_suggestion)
- 🏢 İç Mekan Önerisi (indoor_suggestion)
- 💬 Genel Geri Bildirim (general_feedback)
- ⚠️ Sistem Uyarısı (system_alert)

**Erişim:**
```
Profil → 🔔 Bildirim Paneli
```

---

### 2. 🗺️ Kroki & Adres Editör (`AdminMapEditorScreen.tsx`)
Lokasyon ve iç mekan haritalarını telefon üzerinden yönetme.

**Özellikler:**
- ➕ Yeni lokasyon ekleme (koordinat, adres, kat sayısı)
- ✏️ Mevcut lokasyonları düzenleme
- 🏢 7 farklı bina tipi (hastane, AVM, havaalanı, ofis, üniversite, otel, diğer)
- 🗺️ İç mekan kroki editörü:
  - Kat seçimi
  - POI (İlgi Noktası) ekleme/çıkarma
  - 14 farklı POI tipi (giriş, çıkış, asansör, WC, kafe, ATM, vb.)
  - X,Y koordinat sistemi
  - Açıklama ekleme
- 🗑️ Lokasyon silme
- 📝 Otomatik değişiklik geçmişi (location_edit_history)

**POI Tipleri:**
- 🚪 Giriş/Çıkış
- 🛗 Asansör
- 🪜 Merdiven
- 🚻 WC
- ☕ Kafe
- 💊 Eczane
- 💰 ATM
- 🛒 Mağaza
- 🍽️ Restoran
- 🏢 Ofis
- 🅿️ Park
- ℹ️ Bilgi
- ve daha fazlası...

**Erişim:**
```
Profil → 🗺️ Kroki & Adres Editör
```

---

### 3. 📊 Data Yönetim Paneli (`AdminDataManagementPanel.tsx`)
Kullanıcı verilerini toplu yönetme ve istatistikleri görüntüleme.

**4 Ana Sekme:**

#### 📊 İstatistikler
- Toplam kullanıcı
- 24 saatte aktif kullanıcı
- Banlı kullanıcı sayısı
- Bekleyen şikayetler
- Toplam mekan/iç mekan
- Toplam görev
- Toplam dağıtılan XP

#### 👥 Kullanıcılar
- Kullanıcı arama (email, nick, kod)
- Kullanıcı bilgileri (level, XP, uyarı sayısı, ban durumu)
- Çoklu seçim için checkbox
- Kayıt tarihi görüntüleme

#### ⚙️ Toplu İşlem
- ➕ XP Ekle (toplu XP dağıtımı)
- ➖ XP Çıkar (toplu XP düşürme)
- 🚫 Ban (toplu banlama)
- ✅ Ban Kaldır (toplu ban kaldırma)
- 🔄 Uyarı Sıfırla (toplu uyarı temizleme)
- Onay sistemi (geri alınamaz işlemler için)

#### 💾 Dışa Aktar
- 👥 Kullanıcı verileri (JSON)
- 🚨 Şikayet verileri (JSON)
- 🏥 Mekan verileri (JSON)

**Erişim:**
```
Profil → 📊 Data Yönetim Paneli
```

---

### 4. 🚨 Kullanıcı Şikayetleri (`AdminReportModerationScreen.tsx`)
Kullanıcı şikayetlerini görüntüleme ve moderasyon.

**Özellikler:**
- 📋 6 farklı filtre (bekleyen, inceleniyor, çözüldü, reddedildi, yükseltildi, tümü)
- 🔍 Şikayet kategorisi görüntüleme (8 kategori)
- ⚠️ Ciddiyet seviyesi (low, medium, high, critical)
- 📝 Admin notu ekleme
- ⏰ Ban süresi belirleme (saat bazında)

**Moderasyon Aksiyonları:**
- ⚠️ Uyarı Ver
- ⏰ Geçici Ban (özelleştirilebilir süre, varsayılan 7 gün)
- 🚫 Kalıcı Ban (geri alınamaz)
- 💬 Mesaj Gönderme Kısıtlama
- ❌ Şikayeti Reddet

**Otomatik Sistem:**
- 3 uyarı = Otomatik 7 günlük ban
- Rate limit: Aynı kullanıcıya 24 saatte max 3 şikayet
- Her işlem `moderation_actions` tablosuna kaydedilir

**Erişim:**
```
Profil → 🚨 Kullanıcı Şikayetleri
```

---

## ✨ Özellikler

### 🔐 Güvenlik
- ✅ Admin yetki kontrolü (`admin_users` tablosu)
- ✅ RLS (Row Level Security) politikaları
- ✅ Rate limiting (trigger tabanlı)
- ✅ Otomatik değişiklik geçmişi
- ✅ IP ban sistemi
- ✅ Self-report engelleme

### 📱 Mobil Optimizasyon
- ✅ Responsive design
- ✅ Dokunmatik kontroller
- ✅ Pull-to-refresh
- ✅ Scroll optimizasyonu
- ✅ Loading states

### 🔔 Otomatik Bildirimler
- ✅ Yeni şikayet → Admin bildirimi
- ✅ Yeni mekan önerisi → Admin bildirimi
- ✅ Yeni iç mekan önerisi → Admin bildirimi
- ✅ 3 uyarı → Otomatik ban + log

### 📊 Veri Takibi
- ✅ Tüm moderasyon aksiyonları loglanır
- ✅ Lokasyon değişiklik geçmişi
- ✅ Ban geçmişi
- ✅ Uyarı sayacı
- ✅ Rate limit takibi

---

## 🛠️ Kurulum

### 1. Supabase Migration

```bash
# Supabase Dashboard → SQL Editor'a git
# supabase/TODO_MIGRATIONS.sql dosyasını kopyala-yapıştır
# "Run" butonuna bas
```

**Sıralı Kurulum:**
```sql
-- TODO #1-18 arası tüm migration'ları sırayla çalıştır
-- Özellikle kritik olanlar:
-- TODO #2: Admin kullanıcısı (ejderha112@gmail.com)
-- TODO #15: Admin username (seekmaster)
-- TODO #16: Şikayet sistemi
-- TODO #17: Bildirim sistemi
-- TODO #18: Lokasyon yönetimi
```

### 2. Environment Variables

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Admin Oluşturma

```sql
-- 1. Önce Authentication'dan kullanıcı oluştur:
-- Email: ejderha112@gmail.com
-- Password: güvenli_şifre

-- 2. Admin tablosuna ekle:
INSERT INTO admin_users (email, is_active, role)
VALUES ('ejderha112@gmail.com', true, 'superadmin');

-- 3. Admin username ayarla:
UPDATE user_profiles
SET admin_username = 'seekmaster'
WHERE email = 'ejderha112@gmail.com';
```

---

## 📖 Kullanım

### Admin Girişi

1. Uygulamayı aç
2. `ejderha112@gmail.com` ile giriş yap
3. Profil sekmesine git
4. Admin butonları görünecek (6 adet)

### Şikayet Yönetimi

1. **Bildirim Paneli** → Yeni şikayetleri gör
2. **Kullanıcı Şikayetleri** → Detaylı inceleme
3. Şikayet kartına tıkla → Genişlet
4. Admin notu ekle
5. Aksiyon seç (uyarı/ban/kısıtla/reddet)
6. Onayla

### Lokasyon Yönetimi

1. **Kroki & Adres Editör** → Lokasyon listesi
2. **Yeni Lokasyon Ekle** → Form doldur:
   - İsim, adres, koordinat
   - Kat sayısı, bina tipi
3. **Kroki** butonuna tıkla → İç mekan editör
4. Kat seç → POI ekle (isim, tip, X, Y)
5. **Haritayı Kaydet**

### Toplu İşlem

1. **Data Yönetim Paneli** → Kullanıcılar sekmesi
2. Kullanıcı ara
3. Checkbox ile seç (veya Tümünü Seç)
4. **Toplu İşlem** sekmesi
5. İşlem tipi seç (XP ekle/çıkar, ban, vb.)
6. Parametreleri ayarla
7. **İşlemi Uygula** → Onayla

### Veri Dışa Aktarma

1. **Data Yönetim Paneli** → Dışa Aktar sekmesi
2. Veri tipi seç (kullanıcı/şikayet/mekan)
3. JSON formatında export alınır
4. Cihaza kaydedilir

---

## 🔒 Güvenlik

### RLS Politikaları

```sql
-- Kullanıcı şikayetleri: Sadece kendi şikayetlerini görebilir
CREATE POLICY "Users can view own reports" ON user_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Admin'ler her şeyi görebilir
CREATE POLICY "Admins can manage reports" ON user_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND is_active = true
    )
  );
```

### Rate Limiting

```sql
-- Aynı kullanıcıya 24 saatte max 3 şikayet
CREATE TRIGGER check_report_limit
  BEFORE INSERT ON user_reports
  FOR EACH ROW EXECUTE FUNCTION check_report_rate_limit();

-- Saatte max 5 mekan önerisi
CREATE TRIGGER check_suggestion_rate_limit
  BEFORE INSERT ON venue_suggestions
  FOR EACH ROW EXECUTE FUNCTION check_venue_suggestion_rate_limit();
```

### Otomatik Escalation

```sql
-- 3 uyarı = 7 günlük ban
CREATE TRIGGER check_warnings_for_ban ON user_restrictions
  AFTER UPDATE
  WHEN (NEW.warning_count >= 3)
  EXECUTE FUNCTION auto_ban_after_warnings();
```

---

## 📊 Veritabanı Şeması

### Yeni Tablolar

```
admin_notifications        → Admin bildirimleri
user_reports              → Kullanıcı şikayetleri
user_restrictions         → Kullanıcı kısıtlamaları (ban, uyarı)
ip_bans                   → IP yasaklama
moderation_actions        → Moderasyon işlem logu
locations                 → Lokasyonlar (adres + koordinat)
location_edit_history     → Lokasyon değişiklik geçmişi
```

### View'lar

```
admin_chat_messages       → Mesajlaşma arşivi (admin için)
user_profiles_public      → Email gizlemeli kullanıcı view'i
```

### Fonksiyonlar

```
search_users_safe()              → Email gizleme destekli arama
check_report_rate_limit()        → Şikayet rate limiti
check_venue_suggestion_rate_limit() → Mekan öneri rate limiti
increment_warning_count()        → Otomatik uyarı sayacı
auto_ban_after_warnings()        → 3 uyarı sonrası otomatik ban
create_admin_notification_*()    → Otomatik bildirim oluşturma
log_location_changes()           → Lokasyon değişiklik logu
```

---

## 🚀 Sonraki Adımlar

1. ✅ Supabase migration'ları çalıştır
2. ✅ Admin kullanıcısı oluştur (ejderha112@gmail.com)
3. ✅ Admin username ayarla (seekmaster)
4. 🔄 Test et:
   - Şikayet gönder → Bildirim panelde görünmeli
   - 3 uyarı ver → Otomatik ban tetiklenmeli
   - Lokasyon ekle → Değişiklik geçmişi kaydedilmeli
   - Toplu XP ekle → Tüm seçili kullanıcılara uygulanmalı
5. 📱 Uygulamayı yeniden başlat
6. 🎉 Admin panellerini kullanmaya başla!

---

## 📞 Destek

Herhangi bir sorun veya soru için:
- Admin: ejderha112@gmail.com
- Username: seekmaster

---

## 📝 Notlar

- Tüm admin aksiyonları `moderation_actions` tablosuna loglanır
- Toplu işlemler geri alınamaz, dikkatli kullanın
- Rate limitler trigger seviyesinde uygulanır
- Otomatik bildirimler background'da çalışır
- Admin panelleri sadece `ejderha112@gmail.com` için görünür

**Tüm sistem hazır ve kullanıma hazır! 🎉**
