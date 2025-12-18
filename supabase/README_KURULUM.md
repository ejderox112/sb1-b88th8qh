# Supabase V2 Kurulum Rehberi

## ✅ PART 1 - TAMAMLANDI
PART1 başarıyla kuruldu. Bu kısımda şunlar eklendi:
- ✅ locations (mekan bilgileri)
- ✅ user_profiles (kullanıcı profilleri + **user_role** kolonu)
- ✅ friendships (arkadaşlık sistemi)
- ✅ messages (mesajlaşma)
- ✅ xp_sources (XP takip)
- ✅ subscription_transactions (premium abonelikler)
- ✅ military_ranks (askeri rütbeler)
- ✅ building_corners (4 köşe sistemi)

## 🔄 PART 2 - KURULUM ADIMLARı

### Önemli Düzeltmeler Yapıldı:
- ✅ `user_role` kolon referansları tam tablo adıyla düzeltildi
- ✅ RLS policy'leri optimize edildi
- ✅ Syntax hataları temizlendi

### Kurulum:
1. Supabase Dashboard'a git: https://supabase.com/dashboard
2. Sol menüden **SQL Editor**'ü aç
3. `2_TEMIZ_PART2.sql` dosyasının içeriğini kopyala
4. SQL Editor'e yapıştır
5. Sağ üstteki **RUN** butonuna bas
6. Başarılı mesajını gör: `PART 2 kurulumu tamamlandı! ✅`

### PART 2'de Eklenecekler:
- 📊 business_profiles (işletme profilleri)
- 📺 business_ads (video reklamlar)
- 👁️ ad_interactions (reklam etkileşimleri)
- 📸 indoor_photos (iç mekan fotoğrafları)
- 🚨 content_reports (içerik şikayetleri)
- ⚡ award_ad_watch_xp() (reklam XP fonksiyonu)
- ⚡ record_ad_view_with_skip() (reklam takip fonksiyonu)
- ⚡ upload_indoor_photo() (fotoğraf yükleme fonksiyonu)
- ⚡ report_inappropriate_content() (şikayet fonksiyonu)

## 🔍 Kurulum Sonrası Kontrol

Kurulum başarılı oldu mu kontrol etmek için:

```sql
-- Tüm tabloları listele
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Fonksiyonları listele
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;
```

Beklenen tablolar:
- ✅ ad_interactions
- ✅ building_corners
- ✅ business_ads
- ✅ business_profiles
- ✅ content_reports
- ✅ friendships
- ✅ indoor_photos
- ✅ locations
- ✅ messages
- ✅ military_ranks
- ✅ subscription_transactions
- ✅ user_profiles
- ✅ venue_suggestions
- ✅ xp_sources

## 🎯 Özellikler

### Premium Sistemi (PART1 ✅)
- Free (0 TL)
- Premium (79 TL/ay)
- Prestij (500 TL/ay)
- Premium Plus (1000 TL/ay)

### Askeri Rütbeler (PART1 ✅)
19 rütbe, toplam harcamaya göre otomatik yükselme

### Reklam Sistemi (PART2)
- İşletmeler video reklam yükleyebilir
- Kullanıcılar 5+ saniye izlerse XP kazanır
- Mesafe tabanlı gösterim
- Bütçe takibi

### İç Mekan Fotoğrafları (PART2)
- Kat bazında fotoğraf yükleme
- GPS + EXIF verisi
- Moderasyon sistemi
- 10 XP ödülü

### İçerik Şikayet Sistemi (PART2)
- Pornografik içerik (acil öncelik)
- Şiddet
- Spam
- Admin bildirim sistemi

## 🚀 Sonraki Adımlar

PART2 kurulumundan sonra:
1. AdminCentralPanel'den işletme profili oluştur
2. Reklam yükle ve onayla
3. İç mekan fotoğrafı test et
4. XP sistemini kontrol et

## 📞 Destek

Hata alırsan:
1. `KONTROL_ET.sql` dosyasını çalıştır
2. `user_profiles` tablosunda `user_role` kolonunun olduğunu doğrula
3. Eğer `user_code` varsa `KOLON_DUZELT.sql` çalıştır
