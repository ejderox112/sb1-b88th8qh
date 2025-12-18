# 🚀 COMPLETE SYSTEM V2 - Kurulum Rehberi

## 📋 Yeni Özellikler Özeti

### 1. **Bina 4 Köşe Koordinat Sistemi** 📍
- AdminMapEditorScreen'de her bina için 4 köşe (Google Maps pin) girme
- Bodrum kat desteği (negatif floor_count: -5 = 5 bodrum kat)
- Otomatik bina alanı hesaplama (Shoelace formula)
- Kat planı temel altyapısı

### 2. **XP Kazanma Kaynakları** ⭐
- **Günlük Giriş**: 5 XP (24 saatte bir)
- **İlk 5 Arkadaş**: Her arkadaş için 20 XP
- **Chat Mesajları**: Karşılıklı konuşmada her mesaja 1 XP
- **Reklam İzleme**: Her reklam için 5 XP (en az 5sn izleme)
- **Fotoğraf Yükleme**: 10 XP (indoor photo upload)
- Premium üyeler tüm XP kazançlarında bonus alır (%5 veya %10)

### 3. **Premium Abonelik Sistemi** 💎
- **Premium (79 TL/ay)**: %5 XP bonusu
- **Premium Plus (1000 TL/ay)**: %10 XP bonusu + özel rozet
- **Bağışçı Profili (500 TL)**: Uzman Çavuş rütbesi + %10 XP
- Otomatik yenileme desteği
- Ödeme entegrasyonu hazır (Stripe/iyzico)

### 4. **Rütbe Sistemi (Türk Silahlı Kuvvetleri)** 🎖️
Toplam harcamaya göre otomatik rütbe yükseltme:
- **500 TL** → Uzman Çavuş (%10 XP bonus)
- **1000 TL** → Kıdemli Çavuş (%12 XP bonus)
- **2000 TL** → Astsubay 1. Sınıf (%15 XP bonus)
- **5000 TL** → Üstsubay (%20 XP bonus)
- **10000 TL** → Yüzbaşı (%25 XP bonus)
- **20000 TL** → Yarbay (%30 XP bonus)
- **30000 TL** → Albay (%35 XP bonus)
- **100000 TL** → Korgeneral (%60 XP bonus)
- **200000 TL** → Mareşal (%100 XP bonus - en üst rütbe!)

**Rütbe Atlama**: 500 TL ödeyerek bir üst rütbeye hemen geçiş

### 5. **Reklam Sistemi (İşletmeler İçin)** 📢
- YouTube/Instagram/Facebook video entegrasyonu
- **Fiyatlandırma**:
  - İzlenme (Impression): 0.10 TL
  - Tıklama (Click): 0.50 TL
- **5 saniye skip sistemi**: İlk 5sn sonra atlanabilir
- Kullanıcılar her reklam için 5 XP kazanır
- **Detaylı İstatistikler**:
  - Konum bazlı analiz (hangi konumlarda çok tıklanmış)
  - Saat bazlı dağılım (hangi saatlerde izlenmiş)
  - Gün bazlı dağılım (hangi günlerde aktif)
  - Skip oranı
  - Ortalama izleme süresi
  - Ortalama mesafe
- Admin onay sistemi

### 6. **Indoor Fotoğraf Yükleme + Konum** 📸
- GPS konum otomatik alınır
- EXIF verileri (fotoğrafın çekim konumu) kontrol edilir
- Küçültme politikası uygulanır
- Moderasyon sistemi (pending → approved/rejected)
- 10 XP kazanım
- Kat, koordinat, POI tipi ile etiketleme

### 7. **Pornografik İçerik Bildirimi** 🚨
- Mesaj/Fotoğraf/Profil/Reklam için rapor sistemi
- Otomatik admin bildirimi (urgent priority)
- Kanıt fotoğrafları ekleme
- Admin dashboard ile hızlı inceleme
- Spam koruması

---

## 🗄️ VERİTABANI KURULUMU

### Adım 1: SQL Dosyasını Çalıştır

**Dosya**: `supabase/COMPLETE_SYSTEM_V2.sql`

Supabase Dashboard → SQL Editor → Paste → **RUN**

```sql
-- Toplam 8 ana bölüm:
-- 1. building_corners (4 köşe pin sistemi)
-- 2. xp_sources (XP kazanma kaynakları)
-- 3. subscription_transactions (Premium abonelikler)
-- 4. military_ranks (Rütbe sistemi)
-- 5. ad_interactions (Reklam istatistikleri)
-- 6. indoor_photos (Fotoğraf yükleme)
-- 7. content_reports (İçerik raporlama)
-- 8. Views & Functions (35+ fonksiyon)
```

### Adım 2: Doğrulama Sorguları

```sql
-- 1. Tabloları kontrol et
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'building_corners',
    'xp_sources',
    'subscription_transactions',
    'military_ranks',
    'indoor_photos',
    'content_reports'
  );

-- 2. Fonksiyonları kontrol et
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'award_daily_login_xp',
    'purchase_subscription',
    'skip_to_next_rank',
    'record_ad_view_with_skip',
    'upload_indoor_photo',
    'report_inappropriate_content'
  );

-- 3. Rütbeleri listele
SELECT * FROM military_ranks ORDER BY rank_order;

-- 4. View'leri kontrol et
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN (
    'ad_performance_analysis',
    'admin_content_reports_dashboard'
  );
```

---

## 📦 NPM PAKETLERİ KURULUMU

```powershell
# React Native paketi kurulumu
npm install expo-location expo-image-picker expo-image-manipulator --legacy-peer-deps

# Alternatif (hata alırsanız)
npx expo install expo-location expo-image-picker expo-image-manipulator
```

**Kurulan Paketler**:
- `expo-location`: GPS konum alma
- `expo-image-picker`: Galeri/kamera erişimi
- `expo-image-manipulator`: Fotoğraf küçültme/sıkıştırma

---

## 🎨 FRONTEND DOSYALARI

### Oluşturulan/Güncellenen Dosyalar

1. **AdminMapEditorScreen.tsx** ✅
   - 4 köşe pin sistemi eklendi
   - "📍 4 Köşe" butonu ile düzenleme modu
   - Google Maps koordinatları ile bina sınırları belirleme

2. **app/(tabs)/locations.tsx** ✅
   - "📢 Konumunuza Özel Reklam Verin" bölümü eklendi
   - BusinessAdPanelScreen'e yönlendirme
   - Reklam özellikleri ve fiyatlandırma bilgilendirmesi

3. **BusinessAdPanelScreen.tsx** 🆕
   - İşletme profili oluşturma
   - Video reklam kampanyası başlatma
   - Premium satın alma ekranı
   - Rütbe atlama butonu
   - Reklam istatistikleri görüntüleme

4. **IndoorContributeScreen.tsx** ✅
   - GPS konum otomatik alma
   - Fotoğraf seçme + yükleme
   - EXIF konum bilgisi işleme
   - Moderasyon sistemi entegrasyonu
   - 10 XP kazanım bildirimi

5. **lib/premiumAdService.ts** 🆕
   - `createBusinessAd()`: Reklam oluşturma
   - `recordAdView()`: 5sn skip + XP sistemi
   - `getNearbyAds()`: Yakındaki reklamlar
   - `purchaseSubscription()`: Premium satın alma
   - `skipToNextRank()`: Rütbe atlama
   - `reportInappropriateContent()`: Pornografik içerik bildirimi
   - `uploadIndoorPhoto()`: Fotoğraf yükleme + konum
   - `awardDailyLoginXP()`: Günlük giriş XP

---

## 🔧 KULLANIM ÖRNEKLERİ

### 1. Günlük Giriş XP (Otomatik)

```typescript
import { awardDailyLoginXP } from '@/lib/premiumAdService';

// App.tsx veya _layout.tsx içinde
useEffect(() => {
  awardDailyLoginXP(); // 5 XP (24 saatte bir)
}, []);
```

### 2. Premium Satın Alma

```typescript
import { purchaseSubscription } from '@/lib/premiumAdService';

const handleBuyPremium = async () => {
  const result = await purchaseSubscription('premium', 1); // 79 TL/ay
  
  if (result.success) {
    console.log('Premium aktif:', result.transaction_id);
    console.log('Bitiş tarihi:', result.end_date);
  }
};
```

### 3. Reklam İzleme (5sn Skip + XP)

```typescript
import { recordAdView } from '@/lib/premiumAdService';

const handleAdWatch = async (adId: string, watchDuration: number, skipped: boolean) => {
  const result = await recordAdView(
    adId,
    watchDuration, // saniye
    skipped,
    { latitude: 38.4613, longitude: 27.2069 }
  );
  
  if (result.success) {
    console.log(`${result.xp_earned} XP kazandınız!`);
    console.log(`Mesafe: ${result.distance_meters}m`);
  }
};
```

### 4. Indoor Fotoğraf Yükleme

```typescript
import { uploadIndoorPhoto } from '@/lib/premiumAdService';
import * as Location from 'expo-location';

const uploadPhoto = async (photoUri: string) => {
  // Konum al
  const location = await Location.getCurrentPositionAsync();
  
  const result = await uploadIndoorPhoto(
    'location-id-123',
    3, // 3. kat
    photoUri,
    {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude,
    },
    undefined, // EXIF konum (optional)
    { x: 105, y: 50 }, // Indoor koordinatlar
    'room',
    'Kardiyoloji 210'
  );
  
  if (result.success) {
    console.log(`Fotoğraf yüklendi! ${result.xp_earned} XP kazandınız`);
  }
};
```

### 5. Pornografik İçerik Bildirimi

```typescript
import { reportInappropriateContent } from '@/lib/premiumAdService';

const reportUser = async (messageId: string, reportedUserId: string) => {
  const result = await reportInappropriateContent(
    'message', // 'message' | 'photo' | 'profile' | 'ad'
    messageId,
    reportedUserId,
    'Pornografik içerik gönderdi',
    ['https://evidence1.jpg', 'https://evidence2.jpg']
  );
  
  if (result.success) {
    Alert.alert('✅', 'Raporunuz admin\'e iletildi. En kısa sürede incelenecek.');
  }
};
```

### 6. Rütbe Atlama

```typescript
import { skipToNextRank } from '@/lib/premiumAdService';

const skipRank = async () => {
  const result = await skipToNextRank(); // 500 TL
  
  if (result.success) {
    Alert.alert(
      '🎖️ Tebrikler!',
      `Eski rütbe: ${result.old_rank}\nYeni rütbe: ${result.new_rank}`
    );
  }
};
```

---

## 🎯 EKRAN NAVİGASYONU

### Yeni Ekranlar

1. **AdminMapEditorScreen** → 4 Köşe Pin Düzenleme
   - URL: `/AdminMapEditorScreen`
   - Admin only (ejderha112@gmail.com)
   - Lokasyon listesi → "📍 4 Köşe" butonu

2. **BusinessAdPanelScreen** → Reklam & Premium Panel
   - URL: `/BusinessAdPanelScreen`
   - locations ekranından "🚀 Reklam Kampanyası Başlat" butonu
   - İşletme profili + reklam kampanyası yönetimi
   - Premium satın alma + rütbe atlama

3. **IndoorContributeScreen** → Fotoğraf Yükleme
   - URL: `/IndoorContributeScreen`
   - GPS konum + fotoğraf seçme
   - 10 XP kazanım sistemi

---

## 📊 ADMIN PANELİ

### Reklam Onaylama

```sql
-- Admin: Reklam onaylama
SELECT * FROM ad_review_queue WHERE status = 'pending';

-- Onay fonksiyonu
SELECT admin_approve_ad('<ad-id>', true, NULL);
```

### İçerik Raporlarını İnceleme

```sql
-- Acil raporları listele
SELECT * FROM admin_content_reports_dashboard 
WHERE priority = 'urgent' 
ORDER BY created_at ASC;

-- Rapor detayları
SELECT 
  report_type,
  reported_user_email,
  reporter_email,
  description,
  evidence_urls,
  minutes_since_report
FROM admin_content_reports_dashboard
WHERE status = 'pending';
```

### Reklam İstatistikleri

```sql
-- En iyi performans gösteren reklamlar
SELECT 
  title,
  business_name,
  views,
  clicks,
  avg_watch_duration,
  skip_rate_percent
FROM ad_performance_analysis
ORDER BY clicks DESC
LIMIT 10;

-- Konum bazlı analiz
SELECT 
  title,
  top_locations
FROM ad_performance_analysis
WHERE top_locations IS NOT NULL;
```

---

## ⚙️ EXPO ÇALIŞTIRMA

```powershell
# Geliştirme sunucusu
npx expo start

# Port 8081'de çalıştır
npx expo start --port 8081

# Offline mod (bearer token hatası için)
npx expo start --offline

# Cache temizle
npx expo start -c
```

---

## ✅ TEST ADIMLARI

### 1. SQL Testleri

```sql
-- XP sistemi test
SELECT award_daily_login_xp();
SELECT * FROM xp_sources WHERE user_id = auth.uid() ORDER BY created_at DESC;

-- Premium satın alma test
SELECT purchase_subscription('premium', 1);
SELECT subscription_tier, subscription_end_date FROM user_profiles WHERE user_id = auth.uid();

-- Rütbe test
SELECT military_rank, total_spending FROM user_profiles WHERE user_id = auth.uid();
SELECT * FROM military_ranks ORDER BY rank_order;
```

### 2. Frontend Testleri

1. **Admin Map Editor**:
   - AdminMapEditorScreen aç
   - Bir lokasyon seç → "📍 4 Köşe"
   - 4 köşe koordinatı gir → Kaydet
   - building_corners tablosunu kontrol et

2. **Reklam Sistemi**:
   - Locations ekranı → "🚀 Reklam Kampanyası Başlat"
   - İşletme profili oluştur
   - Video reklam kampanyası başlat
   - business_ads tablosunu kontrol et

3. **Indoor Photo Upload**:
   - IndoorContributeScreen aç
   - GPS konum alınmasını bekle
   - Fotoğraf seç → Bilgileri gir → Gönder
   - indoor_photos tablosunu kontrol et

4. **Premium Satın Alma**:
   - BusinessAdPanelScreen aç
   - "⭐ Premium Al (79 TL/ay)" butonu
   - Onay ver
   - subscription_transactions tablosunu kontrol et

---

## 🐛 SORUN GİDERME

### Konum Alınamıyor

```typescript
// expo-location izni kontrol et
const { status } = await Location.requestForegroundPermissionsAsync();
console.log('Location permission:', status);
```

### Fotoğraf Seçilemiyor

```typescript
// expo-image-picker izni kontrol et
const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
console.log('Gallery permission:', status);
```

### SQL Fonksiyon Hatası

```sql
-- Fonksiyon var mı kontrol et
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'award_daily_login_xp';

-- RLS policy kontrol
SELECT * FROM pg_policies WHERE tablename = 'xp_sources';
```

---

## 🎉 TAMAMLANAN ÖZELLİKLER

✅ Bina 4 köşe koordinat sistemi (AdminMapEditorScreen)  
✅ XP kazanma kaynakları (günlük giriş, arkadaş, chat, reklam)  
✅ Premium abonelik sistemi (79 TL, 1000 TL)  
✅ Rütbe sistemi (Uzman Çavuş → Mareşal)  
✅ Reklam sistemi (video, 5sn skip, istatistikler)  
✅ Indoor fotoğraf yükleme + konum  
✅ Pornografik içerik bildirimi  
✅ BusinessAdPanelScreen (reklam yönetimi)  
✅ Locations ekranı reklam butonu  
✅ SQL migrations (35+ fonksiyon, 10+ tablo)  

---

## 📞 DESTEK

Herhangi bir sorun yaşarsanız:
1. `supabase/COMPLETE_SYSTEM_V2.sql` dosyasını kontrol edin
2. Expo logs'u inceleyin: `npx expo start`
3. Supabase logs: Dashboard → Logs → Edge Functions / Postgres

---

**Kurulum Tarihi**: 10 Aralık 2025  
**Versiyon**: COMPLETE_SYSTEM_V2  
**Durum**: ✅ Tüm özellikler hazır ve test edildi
