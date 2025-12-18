# 🎯 SUPABASE KURULUM REHBERİ - BAŞTAN SONA
## Sırasıyla yapılacak işlemler

---

## ⚠️ ÖNCE BU: HATA DÜZELTMELERİ
**📁 Dosya:** `supabase/ONCELIKLE_BU_FIX.sql`
**🎯 Ne yapar:**
- earthdistance extension ekler (konum hesaplamaları için)
- admin_users tablosu oluşturur
- Seni super admin yapar

**📍 Nereye yapıştır:**
```
Supabase Dashboard → SQL Editor → Yeni Query
```

**🔥 Yapıştır ve çalıştır:**
1. `supabase/ONCELIKLE_BU_FIX.sql` dosyasını aç
2. CTRL+A ile tümünü seç
3. CTRL+C ile kopyala
4. Supabase Dashboard → SQL Editor → yapıştır
5. "RUN" butonuna bas
6. ✅ "Success" görmelisin

---

## ✅ ADIM 1: COMPLETE_FINAL_SYSTEM.sql (TEK SEFERDE HER ŞEY)
**📁 Dosya:** `supabase/COMPLETE_FINAL_SYSTEM.sql`
**🎯 Ne yapar:**
- Chat konum paylaşımı + 3D harita
- Foto limitleri (ücretsiz: 4/gün, premium: 200MB/hafta)
- REKLAM SİSTEMİ (foto için reklam izle +2 foto)
- Kullanıcı görünürlüğü (10 kullanıcı → reklam izle +10 daha)
- Image compression sistemi

**📍 Nereye yapıştır:**
```
Supabase Dashboard → SQL Editor → Yeni Query
```

**🔥 Yapıştır ve çalıştır:**
1. `supabase/COMPLETE_FINAL_SYSTEM.sql` dosyasını aç
2. CTRL+A ile tümünü seç
3. CTRL+C ile kopyala
4. Supabase Dashboard → SQL Editor → yapıştır
5. "RUN" butonuna bas
6. ✅ "Success. No rows returned" görmelisin

---

## ✅ ADIM 2: BUSINESS_AD_PLATFORM.sql (İŞLETME REKLAM SİSTEMİ)
**📁 Dosya:** `supabase/BUSINESS_AD_PLATFORM.sql`
**🎯 Ne yapar:**
- İşletmeler video reklam verebilir
- YouTube/Instagram/Facebook entegrasyonu
- Konum bazlı gösterim (500m-5km)
- Tıklama başına ücret (0.50 TL)
- Admin onay sistemi

**📍 Nereye yapıştır:**
```
Supabase Dashboard → SQL Editor → Yeni Query
```

**🔥 Yapıştır ve çalıştır:**
1. `supabase/BUSINESS_AD_PLATFORM.sql` dosyasını aç
2. CTRL+A ile tümünü seç
3. CTRL+C ile kopyala
4. Supabase Dashboard → SQL Editor → yapıştır
5. "RUN" butonuna bas
6. ✅ "Success. No rows returned" görmelisin

---

## ✅ ADIM 3: Storage Bucket Oluştur
**📍 Nereye git:**
```
Supabase Dashboard → Storage → Create a new bucket
```

**🔥 Yapılacaklar:**
1. Bucket name: `chat-photos`
2. Public bucket: ✅ İşaretle
3. Create bucket

---

## ✅ ADIM 4: NPM Paketlerini Kur
**📍 Terminal'de çalıştır:**
```bash
npm install expo-location expo-image-manipulator react-native-webview --legacy-peer-deps
```

---

## 📊 KONTROL: Doğru Kuruldu mu?
**Supabase Dashboard → SQL Editor → Aşağıdaki sorguyu çalıştır:**

```sql
-- Tablo kontrolü
SELECT 
  'chat_media_limits' as tablo, COUNT(*) as var_mi 
FROM information_schema.tables 
WHERE table_name = 'chat_media_limits'
UNION ALL
SELECT 
  'user_visibility_limits' as tablo, COUNT(*) as var_mi 
FROM information_schema.tables 
WHERE table_name = 'user_visibility_limits'
UNION ALL
SELECT 
  'ad_watches' as tablo, COUNT(*) as var_mi 
FROM information_schema.tables 
WHERE table_name = 'ad_watches'
UNION ALL
SELECT 
  'business_profiles' as tablo, COUNT(*) as var_mi 
FROM information_schema.tables 
WHERE table_name = 'business_profiles'
UNION ALL
SELECT 
  'business_ads' as tablo, COUNT(*) as var_mi 
FROM information_schema.tables 
WHERE table_name = 'business_ads';
```

**Beklenen sonuç:** Her tablo için `var_mi = 1` görmelisin

---

## 🎯 KULLANIMA HAZIR SERVİSLER

### 1️⃣ Chat Konum Servisi
**📁 Dosya:** `lib/chatLocationService.ts`
**Kullanım:**
```typescript
import { shareLocationInChat, getNearbyFriendsFor3D } from '@/lib/chatLocationService';

// Konum paylaş
await shareLocationInChat(groupId, { isLive: true });

// Yakındaki arkadaşları getir
const friends = await getNearbyFriendsFor3D();
```

### 2️⃣ Reklam Servisi
**📁 Dosya:** `lib/adRewardService.ts`
**Kullanım:**
```typescript
import { watchAdForPhotos, watchAdForVisibility } from '@/lib/adRewardService';

// Foto için reklam izle (+2 foto)
await watchAdForPhotos();

// Kullanıcı görünürlüğü için reklam izle (+10 kullanıcı)
await watchAdForVisibility();
```

### 3️⃣ İşletme Reklam Servisi
**📁 Dosya:** `lib/businessAdService.ts`
**Kullanım:**
```typescript
import { getNearbyBusinessAds, recordAdClick } from '@/lib/businessAdService';

// Yakındaki reklamları getir
const ads = await getNearbyBusinessAds(lat, lng, 5000);

// Tıklama kaydet (0.50 TL kesinti)
await recordAdClick(adId, lat, lng);
```

---

## 🎨 UI COMPONENT'LERİ

### 1️⃣ Limit Göstergesi
**📁 Dosya:** `components/AdRewardLimitIndicator.tsx`
**Kullanım:**
```typescript
import AdRewardLimitIndicator from '@/components/AdRewardLimitIndicator';

<AdRewardLimitIndicator />
```

### 2️⃣ 3D Harita Arkadaşlar
**📁 Dosya:** `components/Map3DFriendsLayer.tsx`
**Kullanım:**
```typescript
import Map3DFriendsLayer from '@/components/Map3DFriendsLayer';

<Map3DFriendsLayer
  currentUserLat={38.4192}
  currentUserLng={27.1287}
  onNavigateToFriend={(friend) => console.log(friend)}
/>
```

### 3️⃣ İşletme Video Reklam Oynatıcı
**📁 Dosya:** `components/BusinessAdPlayer.tsx`
**Kullanım:**
```typescript
import BusinessAdPlayer from '@/components/BusinessAdPlayer';

<BusinessAdPlayer
  userLatitude={38.4192}
  userLongitude={27.1287}
  maxDistance={5000}
  onAdComplete={() => console.log('Reklamlar bitti')}
/>
```

---

## 🎉 TAMAM, ARTIK ÇALIŞIR!

### ✅ Yapılanlar:
- ✅ Chat konum paylaşımı
- ✅ 3D haritada arkadaşları görme
- ✅ Foto limitleri (4/gün ücretsiz)
- ✅ Reklam izleyerek +2 foto kazanma
- ✅ Reklam izleyerek +10 kullanıcı görme
- ✅ İşletme reklam platformu (YouTube/Instagram/Facebook)
- ✅ Tıklama başına kazanç (0.50 TL)
- ✅ Admin onay sistemi
- ✅ Image compression

### 🚀 Sonraki Adımlar (İsteğe Bağlı):
1. AdMob entegrasyonu (gerçek reklam gösterimi)
2. Stripe/İyzico ödeme entegrasyonu
3. Push notification sistemi
4. Analytics entegrasyonu

---

## 🆘 SORUN ÇIKARSA:

### Hata: "relation does not exist"
**Çözüm:** COMPLETE_FINAL_SYSTEM.sql'i tekrar çalıştır

### Hata: "permission denied"
**Çözüm:** RLS politikalarını kontrol et:
```sql
SELECT tablename, policyname FROM pg_policies;
```

### Hata: "budget_remaining < 0"
**Çözüm:** İşletme bütçesini yeniden yükle

---

## 📞 DESTEK
Sorun çıkarsa bana söyle, hemen hallederiz! 😊
