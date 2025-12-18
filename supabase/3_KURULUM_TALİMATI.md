# 📋 SUPABASE SQL KURULUM KILAVUZU

## ⚠️ ÖNEMLİ UYARILAR

1. **Eski veriler silinecek!** Bu SQL dosyaları `DROP TABLE IF EXISTS ... CASCADE` kullanır
2. **Sırayla çalıştır!** PART2, PART1'e bağımlı (locations, user_profiles referansları var)
3. **Admin emaili kontrol et:** Kodda `ejderha112@gmail.com` hardcoded

---

## 🚀 KURULUM ADIMLARI

### 1️⃣ Supabase Dashboard'a Gir
```
https://supabase.com/dashboard/project/cwbwxidnarcklxtsxtkf
```

### 2️⃣ SQL Editor'ü Aç
Sol menüden **SQL Editor** → **New Query**

### 3️⃣ İlk Dosyayı Kopyala
`1_TEMIZ_PART1.sql` dosyasının **TÜM içeriğini** kopyala (Ctrl+A, Ctrl+C)

### 4️⃣ SQL Editor'e Yapıştır ve Çalıştır
- Yapıştır (Ctrl+V)
- **RUN** butonuna bas (veya Ctrl+Enter)
- Beklenen sonuç: `"PART 1 kurulumu tamamlandı! ✅"`

### 5️⃣ İkinci Dosyayı Çalıştır
- SQL Editor'ü temizle (yeni query aç)
- `2_TEMIZ_PART2.sql` dosyasının **TÜM içeriğini** kopyala
- Yapıştır ve **RUN**
- Beklenen sonuç: `"PART 2 kurulumu tamamlandı! ✅"`

---

## ✅ DOĞRULAMA

### Tablolar Kontrol
Supabase Dashboard → **Table Editor** → Şu tabloları görmeli:

**PART 1:**
- ✅ locations
- ✅ user_profiles
- ✅ venue_suggestions
- ✅ building_corners
- ✅ friendships
- ✅ messages
- ✅ xp_sources
- ✅ subscription_transactions
- ✅ military_ranks

**PART 2:**
- ✅ business_profiles
- ✅ business_ads
- ✅ ad_interactions
- ✅ indoor_photos
- ✅ content_reports

### Fonksiyonlar Kontrol
Database → Functions → Şu fonksiyonları görmeli:
- award_daily_login_xp()
- award_friend_add_xp()
- purchase_subscription()
- update_military_rank()
- award_ad_watch_xp()
- record_ad_view_with_skip()
- upload_indoor_photo()
- report_inappropriate_content()

---

## ❌ HATA ALDIYSAN

### Hata 1: "relation does not exist"
**Sebep:** PART2'yi PART1'den önce çalıştırdın  
**Çözüm:** Önce PART1'i çalıştır, sonra PART2

### Hata 2: "column already exists"
**Sebep:** user_profiles tablosu zaten var ve kolonu duplicate  
**Çözüm:** SQL'i yeniden çalıştır (DROP CASCADE temizler)

### Hata 3: "syntax error"
**Sebep:** SQL kopyalarken bozuldu  
**Çözüm:** Dosyayı VS Code'da aç, oradan kopyala (Notepad bozabilir)

### Hata 4: "type already exists"
**Sebep:** subscription_tier_enum veya military_rank_enum zaten var  
**Çözüm:** Sorun yok! `DO $$ EXCEPTION WHEN duplicate_object THEN null` bunu handle ediyor

---

## 📊 ÖZELLİKLER

### PART 1 İçeriği
- 🗺️ **Locations:** Bina bilgileri + 4 köşe pin sistemi
- 👤 **User Profiles:** Email, nickname, level, XP, subscription, military rank
- ⭐ **XP Sistemi:** Günlük giriş (5 XP), arkadaş ekleme (20 XP)
- 💰 **Premium:** Free / Premium (79 TL) / Prestij (500 TL) / Premium Plus (1000 TL)
- 🎖️ **Rütbeler:** 19 askeri rütbe (Uzman Çavuş → Mareşal), harcama bazlı

### PART 2 İçeriği
- 📢 **Reklamlar:** Business profiles, video ads, bütçe sistemi
- 📊 **Ad Analytics:** İzlenme süresi, skip oranı, konum bazlı stats
- 📸 **Indoor Fotoğraflar:** GPS + EXIF + kat bilgisi + 10 XP
- 🚨 **İçerik Raporlama:** Pornografik içerik bildirimi (urgent priority)
- 💸 **5sn Skip Sistemi:** 5 saniye izlersen 5 XP kazanırsın

---

## 🔐 GÜVENLİK

- **RLS (Row Level Security):** Tüm tablolarda aktif
- **Admin Email:** `ejderha112@gmail.com` (hardcoded)
- **Policies:** 
  - `auth.uid()` ile kullanıcı kontrolü
  - `auth.jwt() ->> 'email'` ile admin kontrolü
  - `user_role IN ('admin', 'moderator')` ile moderator kontrolü

---

## 📞 DESTEK

Hata alırsan:
1. Hatanın tam metnini kopyala
2. Hangi dosyada hata olduğunu belirt (PART1 veya PART2)
3. Supabase Dashboard'da Table Editor'ü kontrol et (hangi tablolar var?)

**Başarılı kurulum sonrası:**
- Admin paneli çalışacak (ejderha112@gmail.com ile giriş)
- Premium satın alma aktif olacak
- XP sistemi çalışacak
- Reklam sistemi hazır olacak
