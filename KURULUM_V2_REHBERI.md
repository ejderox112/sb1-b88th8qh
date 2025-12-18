# 🚀 COMPLETE_SYSTEM_V2 Kurulum Rehberi

Bu rehber, tüm yeni özellikleri içeren sistemin nasıl kurulacağını adım adım açıklar.

## 📋 İçindekiler

1. [Yeni Özellikler](#yeni-özellikler)
2. [SQL Kurulumu](#sql-kurulumu)
3. [Expo Paketleri](#expo-paketleri)
4. [Özellik Detayları](#özellik-detayları)
5. [Test Senaryoları](#test-senaryoları)

---

## 🎯 Yeni Özellikler

### 1. **Bina 4 Köşe Koordinatları** (AdminMapEditorScreen)
- Google Maps'te 4 köşe pin ile bina sınırları belirleme
- Bodrum katlar için negatif değer desteği (-5 = 5 bodrum kat)
- Bina alanı otomatik hesaplama (Shoelace formula)

### 2. **XP Kazanma Kaynakları**
- ✅ **Günlük Giriş**: 5 XP (24 saatte bir)
- ✅ **İlk 5 Arkadaş**: 20 XP/arkadaş
- ✅ **Chat Mesajları**: 1 XP (karşılıklı konuşma)
- ✅ **Reklam İzleme**: 5 XP (minimum 5 saniye)
- ✅ **Fotoğraf Yükleme**: 10 XP
- ✅ **Premium Bonus**: %5 (Premium), %10 (Premium Plus)

### 3. **Premium Sistemi**
| Paket | Fiyat | Özellikler |
|-------|-------|-----------|
| **🆓 Free** | 0 TL | Temel özellikler |
| **⭐ Premium** | 79 TL/ay | +%5 XP bonusu |
| **🏅 Prestij** | 500 TL/ay | Extra özellik yok, destek amaçlı |
| **💎 Premium Plus** | 1000 TL/ay | Extra özellik yok, prestij + destek amaçlı |

### 4. **Bağışçı Profili + Rütbe Sistemi**
500 TL ile başlar, toplam harcamaya göre otomatik rütbe yükseltme:

| Rütbe | Gerekli Harcama | XP Bonusu |
|-------|----------------|-----------|
| Uzman Çavuş | 500 TL | %10 |
| Kıdemli Çavuş | 1,000 TL | %12 |
| Baştabur | 1,500 TL | %13 |
| Astsubay (1. sınıf) | 2,000 TL | %15 |
| Astsubay (2. sınıf) | 3,000 TL | %17 |
| ... | ... | ... |
| **Mareşal** | 200,000 TL | %100 |

**Rütbe Atlama**: 500 TL ödeyerek bir üst rütbeye hemen geç.

### 5. **Reklam Sistemi**
- **Konum Bazlı**: 5km yarıçap içinde gösterim
- **Video Platformları**: YouTube, Instagram, Facebook
- **Fiyatlandırma**:
  - İzlenme (Impression): 0.10 TL
  - Tıklama (Click): 0.50 TL
- **5 Saniye Skip**: İlk 5 saniye sonra atlanabilir
- **Kullanıcıya 5 XP**: Her reklam izleyen kullanıcı XP kazanır
- **Detaylı İstatistikler**:
  - Saatlere göre dağılım (0-23)
  - Günlere göre dağılım (Pazartesi-Pazar)
  - Konum bazlı tıklama haritası
  - Skip oranı, ortalama izlenme süresi

### 6. **Indoor Fotoğraf Yükleme**
- **GPS Konumu**: Otomatik alınır
- **EXIF Verileri**: Fotoğraftan konum bilgisi çıkarılır
- **Küçültme Politikası**: Otomatik compression
- **Moderasyon**: Admin onayı sonrası yayına girer
- **10 XP Kazanç**: Onaylanan her fotoğraf için

### 7. **Pornografik İçerik Bildirimi**
- **Acil Bildirim**: Admin'e anlık bildirim
- **Kanıt Sistemi**: Ekran görüntüleri eklenebilir
- **Hızlı Moderasyon**: Öncelik sistemi (urgent, high, normal, low)
- **Otomatik İşlem**: Belirli eşik sonrası otomatik ban

---

## 💾 SQL Kurulumu

### Adım 1: Supabase Dashboard'a Giriş

```
https://supabase.com/dashboard
Project: cwbwxidnarcklxtsxtkf
```

### Adım 2: SQL Editor'ü Aç

Sol menüden **SQL Editor** → **New Query**

### Adım 3: COMPLETE_SYSTEM_V2.sql'i Çalıştır

```bash
# Dosya konumu
supabase/COMPLETE_SYSTEM_V2.sql
```

**Kopyala-Yapıştır-Çalıştır** → **RUN**

### Adım 4: Doğrulama Sorguları

```sql
-- 1. Tabloları kontrol et
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'building_corners',
  'xp_sources',
  'subscription_transactions',
  'military_ranks',
  'indoor_photos',
  'content_reports'
);

-- 2. Fonksiyonları kontrol et
SELECT routines.routine_name
FROM information_schema.routines
WHERE routines.specific_schema = 'public'
AND routines.routine_name IN (
  'award_daily_login_xp',
  'award_ad_watch_xp',
  'purchase_subscription',
  'skip_to_next_rank',
  'record_ad_view_with_skip',
  'upload_indoor_photo',
  'report_inappropriate_content'
);

-- 3. Rütbe tablosunu kontrol et
SELECT rank, rank_name_tr, required_spending, xp_bonus_percent 
FROM military_ranks 
ORDER BY rank_order;

-- 4. Test: Bina köşesi ekle
INSERT INTO building_corners (location_id, corner_number, latitude, longitude, description)
VALUES (
  (SELECT id FROM locations LIMIT 1),
  1, 38.4613, 27.2069, 'Test Köşe'
);

-- Başarılı sonuç: "INSERT 0 1"
```

---

## 📦 Expo Paketleri

### Gerekli Paketler

```bash
# Konum servisleri
npx expo install expo-location

# Fotoğraf işleme
npx expo install expo-image-picker expo-image-manipulator

# Video oynatma (reklamlar için)
npm install react-native-webview --legacy-peer-deps
```

### Verification

```bash
# package.json kontrol
cat package.json | grep -E "expo-location|expo-image-picker|expo-image-manipulator|react-native-webview"
```

Beklenen çıktı:
```json
"expo-image-manipulator": "~12.0.0",
"expo-image-picker": "~15.0.0",
"expo-location": "~17.0.0",
"react-native-webview": "^13.6.0"
```

---

## 🔧 Özellik Detayları

### 1. Admin Harita Editör (4 Köşe Sistemi)

**Kullanım:**
```
http://localhost:8081/AdminMapEditorScreen
```

**Adımlar:**
1. Lokasyon listesinde herhangi bir binayı seç
2. **"📍 4 Köşe"** butonuna tıkla
3. Google Maps'te binanın 4 köşesine pin koy
4. Her köşenin enlem/boylam koordinatlarını gir
5. **"💾 Köşeleri Kaydet"**

**SQL Sorgusu:**
```sql
-- Bir binanın köşelerini görüntüle
SELECT 
  bc.corner_number,
  bc.latitude,
  bc.longitude,
  bc.description
FROM building_corners bc
JOIN locations l ON l.id = bc.location_id
WHERE l.name = 'İzmir Şehir Hastanesi'
ORDER BY bc.corner_number;

-- Bina alanını hesapla
SELECT calculate_building_area(
  (SELECT id FROM locations WHERE name = 'İzmir Şehir Hastanesi')
) AS area_m2;
```

---

### 2. XP Sistemi Test

**Günlük Giriş XP:**
```typescript
import { awardDailyLoginXP } from '@/lib/premiumAdService';

// Her app açılışında çağır
await awardDailyLoginXP();
```

**SQL Test:**
```sql
-- Kullanıcının bugün aldığı günlük giriş XP'sini kontrol et
SELECT * FROM xp_sources
WHERE user_id = auth.uid()
  AND source_type = 'daily_login'
  AND created_at > now() - INTERVAL '24 hours';

-- Kullanıcının toplam XP'sini görüntüle
SELECT 
  user_id,
  xp,
  subscription_tier,
  military_rank
FROM user_profiles
WHERE user_id = auth.uid();
```

---

### 3. Premium Satın Alma

**UI:**
```
http://localhost:8081/BusinessAdPanelScreen
```

**Kod:**
```typescript
import { purchaseSubscription } from '@/lib/premiumAdService';

// Premium Al (79 TL/ay)
const result = await purchaseSubscription('premium', 1);

// Prestij Al (500 TL/ay)
const result = await purchaseSubscription('prestij', 1);

// Premium Plus Al (1000 TL/ay)
const result = await purchaseSubscription('premium_plus', 1);

if (result.success) {
  console.log('Abonelik aktif:', result.tier);
  console.log('Tutar:', result.amount, 'TL');
}
```

**SQL Test:**
```sql
-- Kullanıcının aboneliğini görüntüle
SELECT 
  subscription_tier,
  subscription_start_date,
  subscription_end_date
FROM user_profiles
WHERE user_id = auth.uid();

-- Abonelik işlemlerini görüntüle
SELECT * FROM subscription_transactions
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;
```

---

### 4. Rütbe Sistemi

**Rütbe Atlama:**
```typescript
import { skipToNextRank } from '@/lib/premiumAdService';

const result = await skipToNextRank();
// { success: true, old_rank: 'uzman_cavus', new_rank: 'kidemli_cavus', amount_paid: 500 }
```

**SQL Test:**
```sql
-- Kullanıcının rütbesini görüntüle
SELECT 
  up.military_rank,
  up.total_spending,
  mr.rank_name_tr,
  mr.xp_bonus_percent || '%' AS xp_bonus
FROM user_profiles up
JOIN military_ranks mr ON mr.rank = up.military_rank
WHERE up.user_id = auth.uid();

-- Tüm rütbeleri listele
SELECT 
  rank_order,
  rank_name_tr,
  required_spending || ' TL' AS required_spending,
  xp_bonus_percent || '%' AS xp_bonus
FROM military_ranks
ORDER BY rank_order;
```

---

### 5. Reklam Sistemi

**İşletme Profili Oluşturma:**
```typescript
import { createBusinessProfile } from '@/lib/premiumAdService';

await createBusinessProfile({
  businessName: 'Starbucks Bornova',
  description: 'Kahve ve içecek',
  category: 'cafe',
  address: 'Bornova, İzmir',
  latitude: 38.4613,
  longitude: 27.2069,
  phone: '+90 555 123 4567',
  email: 'bornova@starbucks.com',
  website: 'https://www.starbucks.com.tr'
});
```

**Reklam Kampanyası Başlatma:**
```typescript
import { createBusinessAd } from '@/lib/premiumAdService';

await createBusinessAd({
  businessId: 'uuid-of-business',
  title: '%30 İndirim!',
  description: 'Tüm içeceklerde geçerli',
  videoPlatform: 'youtube',
  videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  budgetTotal: 1000, // 1000 TL bütçe
  targetRadius: 5000, // 5km yarıçap
});
```

**Reklam İzleme Kaydı:**
```typescript
import { recordAdView } from '@/lib/premiumAdService';

const result = await recordAdView(
  'ad-uuid',
  8, // 8 saniye izlendi
  false, // skip edilmedi
  { latitude: 38.4613, longitude: 27.2069 }
);

// { success: true, xp_earned: 5, watch_duration: 8, distance_meters: 123.45 }
```

**SQL Test:**
```sql
-- Yakındaki reklamları getir
SELECT * FROM get_nearby_ads(38.4613, 27.2069, 5000);

-- Reklam performans analizi
SELECT * FROM ad_performance_analysis
WHERE ad_id = 'ad-uuid';

-- Saatlere göre dağılım
SELECT 
  hour_of_day,
  COUNT(*) AS interaction_count
FROM ad_interactions
WHERE ad_id = 'ad-uuid'
GROUP BY hour_of_day
ORDER BY hour_of_day;
```

---

### 6. Indoor Fotoğraf Yükleme

**UI:**
```
http://localhost:8081/IndoorContributeScreen
```

**Kod:**
```typescript
import { uploadIndoorPhoto } from '@/lib/premiumAdService';
import * as Location from 'expo-location';

// GPS konumu al
const location = await Location.getCurrentPositionAsync();

// Fotoğraf yükle
const result = await uploadIndoorPhoto(
  'location-uuid',
  3, // Kat numarası
  'photo-url',
  {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    altitude: location.coords.altitude
  },
  undefined, // Photo EXIF location
  { x: 105, y: 6 }, // Indoor koordinatlar
  'room',
  'Kardiyoloji 112'
);

// { success: true, photo_id: 'uuid', xp_earned: 10, moderation_status: 'pending' }
```

**SQL Test:**
```sql
-- Bekleyen fotoğrafları görüntüle
SELECT 
  ip.label,
  ip.floor_number,
  ip.user_latitude,
  ip.user_longitude,
  ip.created_at
FROM indoor_photos ip
WHERE ip.moderation_status = 'pending'
ORDER BY ip.created_at DESC;

-- Fotoğraf onayla
UPDATE indoor_photos
SET 
  moderation_status = 'approved',
  moderated_by = auth.uid(),
  moderated_at = now()
WHERE id = 'photo-uuid';
```

---

### 7. İçerik Bildirimi

**Kod:**
```typescript
import { reportInappropriateContent } from '@/lib/premiumAdService';

const result = await reportInappropriateContent(
  'message', // content type
  'message-uuid',
  'reported-user-uuid',
  'Pornografik içerik paylaştı',
  ['screenshot-url-1', 'screenshot-url-2']
);

// { success: true, report_id: 'uuid', message: 'Raporunuz admin'e iletildi', admin_notified: true }
```

**Admin Panel:**
```sql
-- Bekleyen raporları görüntüle
SELECT * FROM admin_content_reports_dashboard
ORDER BY priority, created_at;

-- Rapor çöz
UPDATE content_reports
SET 
  status = 'resolved',
  resolution = 'user_banned',
  reviewed_by = auth.uid(),
  reviewed_at = now(),
  admin_notes = 'Kullanıcı 7 gün banlandı'
WHERE id = 'report-uuid';
```

---

## ✅ Test Senaryoları

### Senaryo 1: Yeni Kullanıcı Premium Alıyor

1. Kullanıcı kayıt olur
2. Günlük giriş XP alır (5 XP)
3. 5 arkadaş ekler (5 x 20 = 100 XP)
4. Premium satın alır (79 TL/ay)
5. Artık tüm XP'lere %5 bonus kazanır

**Test:**
```sql
-- Kullanıcının XP geçmişi
SELECT 
  source_type,
  xp_amount,
  description,
  created_at
FROM xp_sources
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

### Senaryo 2: İşletme Reklam Veriyor

1. İşletme profili oluşturur
2. YouTube video reklam yükler (1000 TL bütçe)
3. Admin onaylar
4. Yakındaki kullanıcılar reklamı görür
5. Kullanıcı 8 saniye izler → 5 XP kazanır
6. İşletme 0.10 TL ödeme yapar

**Test:**
```sql
-- Reklam istatistikleri
SELECT 
  total_impressions,
  total_views,
  total_clicks,
  budget_remaining,
  avg_watch_duration,
  skip_rate_percent
FROM ad_performance_analysis
WHERE ad_id = 'ad-uuid';
```

### Senaryo 3: Kullanıcı Mareşal Rütbesine Ulaşıyor

1. 500 TL ile Bağışçı profili alır → Uzman Çavuş
2. Her ay 500 TL daha ödeyerek rütbe atlar
3. Toplam 200,000 TL harcama sonrası → **Mareşal**
4. %100 XP bonusu kazanır

**Test:**
```sql
-- Rütbe progression
SELECT 
  rank_name_tr,
  required_spending,
  xp_bonus_percent
FROM military_ranks
WHERE rank_order <= (
  SELECT rank_order FROM military_ranks mr
  JOIN user_profiles up ON up.military_rank = mr.rank
  WHERE up.user_id = 'user-uuid'
)
ORDER BY rank_order;
```

---

## 🎉 Tamamlandı!

Tüm özellikler başarıyla kuruldu! 

### Sırada Ne Var?

- [ ] Storage bucket oluştur: `chat-photos`, `indoor-photos`, `business-logos`
- [ ] Google OAuth redirect URI'leri ekle
- [ ] Test kullanıcılarını CREATE_TEST_USERS.sql ile oluştur
- [ ] Expo uygulamasını başlat: `npx expo start`
- [ ] Özellikleri test et

### Destek

Herhangi bir sorunla karşılaşırsanız:
1. SQL hatalarını kontrol edin: `get_errors` tool
2. Supabase Dashboard'dan logları inceleyin
3. Terminal çıktılarını kontrol edin

---

**🍫 Sistem sorunsuz çalışıyor! Çikolatanız hazır! 🍫**
