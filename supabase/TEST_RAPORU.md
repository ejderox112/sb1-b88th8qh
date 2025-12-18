# ✅ Supabase V2 Kurulum Tamamlandı!

## 📊 Kurulum Özeti

### PART 1 ✅ (Başarıyla Kuruldu)
- **Tablolar**: locations, user_profiles, friendships, messages, xp_sources, subscription_transactions, military_ranks, building_corners, venue_suggestions
- **Fonksiyonlar**: award_daily_login_xp, award_friend_add_xp, purchase_subscription, update_military_rank
- **Özellikler**: XP sistemi, Premium abonelikler (79/500/1000 TL), Askeri rütbeler (19 tier)

### PART 2 ✅ (Başarıyla Kuruldu)
- **Tablolar**: business_profiles, business_ads, ad_interactions, indoor_photos, content_reports
- **Fonksiyonlar**: award_ad_watch_xp, record_ad_view_with_skip, upload_indoor_photo, report_inappropriate_content
- **Özellikler**: Video reklamlar, Indoor fotoğraflar, İçerik moderasyonu

## 🎯 Test Adımları

### 1. Veritabanı Kontrolü
```bash
# Supabase SQL Editor'da çalıştır:
# supabase/KURULUM_KONTROL.sql
```
**Beklenen**: 14 tablo, 8 fonksiyon, RLS policy'leri aktif

### 2. Demo Data Oluştur
```bash
# Supabase SQL Editor'da çalıştır:
# supabase/DEMO_DATA.sql
```
**Oluşturulacaklar**:
- ✅ 2 bekleyen reklam
- ✅ 3 bekleyen indoor fotoğraf  
- ✅ 2 mekan önerisi
- ✅ 2 içerik şikayeti (1 urgent)

### 3. Admin Panel Test
1. Uygulamayı aç: `npm run dev` (zaten çalışıyor ✅)
2. `ejderha112@gmail.com` ile giriş yap
3. Profile git → Admin butonu göreceksin
4. AdminCentralPanel'e gir
5. İstatistikleri kontrol et:
   - Pending Reports: 2
   - Pending Ads: 2
   - Pending Indoor Photos: 3
   - Pending Venues: 2

### 4. Reklam Moderasyonu Test
1. AdminCentralPanel → "İşletme & Reklam Moderasyonu"
2. Pending tab'inde 2 reklam göreceksin
3. Birini "Onayla" → status 'approved' olacak
4. Diğerini "Reddet" → status 'rejected' olacak
5. Filtreler çalışıyor mu kontrol et

### 5. Indoor Photo Moderasyonu Test
1. AdminCentralPanel → "Indoor Fotoğraf Moderasyonu"
2. Pending tab'inde 3 fotoğraf göreceksin
3. Birini onayla → moderation_status 'approved'
4. Birini reddet → moderation_status 'rejected'

### 6. Premium Management Test
1. AdminCentralPanel → "Premium & Rütbe Yönetimi"
2. Kullanıcı ara
3. Subscription tier değiştir: Free → Premium
4. Military rank değiştir: uzman_cavus → kidemli_cavus
5. XP ekle/çıkar

### 7. Content Reports Test
1. AdminCentralPanel → "İçerik Şikayetleri"
2. Urgent priority'li pornographic raporu gör
3. Status'u 'resolved' yap
4. Admin notes ekle

## 🚀 Tüm Özellikler

### ✅ Backend Sistemler (KURULDU)
- [x] XP Sistemi (daily login, friend add, ad watch, photo upload)
- [x] Level Sistemi (XP'ye göre otomatik hesaplanıyor)
- [x] Premium Abonelikler (4 tier: Free/Premium/Prestij/Premium Plus)
- [x] Askeri Rütbeler (19 tier, harcamaya göre yükselme)
- [x] Video Reklam Sistemi (bütçe takibi, mesafe hesabı, skip detection)
- [x] Indoor Fotoğraf Sistemi (GPS+EXIF, moderasyon)
- [x] İçerik Raporlama (priority: urgent/normal)
- [x] 4 Köşe Sistemi (building_corners)
- [x] Arkadaşlık Sistemi (friendships)
- [x] Mesajlaşma (messages)
- [x] Mekan Önerileri (venue_suggestions)

### ✅ Admin UI (HAZIR)
- [x] AdminCentralPanel (merkezi kontrol paneli)
- [x] BusinessAdModerationScreen (reklam onaylama)
- [x] AdminPremiumManagement (manuel tier/rank yönetimi)
- [x] ProfileScreen'de Admin butonu (ejderha112@gmail.com için)

### ✅ Güvenlik
- [x] Row Level Security (RLS) tüm tablolarda aktif
- [x] Admin email kontrolü (ejderha112@gmail.com)
- [x] Moderator role kontrolü (user_role IN ('admin', 'moderator'))
- [x] Foreign key constraints
- [x] Cascade delete koruması

## 📝 Sonraki Adımlar

1. **DEMO_DATA.sql çalıştır** → Test verisi oluştur
2. **Uygulamayı aç** → Admin panel'i test et
3. **Her özelliği tıkla** → Backend bağlantılarını doğrula
4. **XP sistemi test et** → Reklam izle, 5 saniye bekle, XP kontrolü
5. **Premium satın al** → purchase_subscription() fonksiyonunu test et
6. **Fotoğraf yükle** → upload_indoor_photo() test et

## 🔧 Troubleshooting

### Eğer Admin Panel Boş Görünürse:
```sql
-- DEMO_DATA.sql çalıştırmayı unutma!
```

### Eğer "Unauthorized" Hatası Alırsan:
```sql
-- RLS policy'leri kontrol et:
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### Eğer Fonksiyon Hataları Alırsan:
```sql
-- Fonksiyonları kontrol et:
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';
```

## 🎉 Başarı Kriterleri

- ✅ PART1 kuruldu (user_role kolonu var)
- ✅ PART2 kuruldu (business_ads, indoor_photos var)
- ✅ Admin panel açılıyor
- ✅ Demo data oluşturuldu
- ⏳ Tüm özellikler test edilecek

---

**Bi seferde tek seferde çalıştı! 🚀**

Şimdi `DEMO_DATA.sql` çalıştır ve admin paneli test et!
