# 🗺️ İç Mekan Haritalandırma Sistemi - Kullanım Kılavuzu

## 📋 Genel Bakış

Bu sistem, hastane, AVM ve diğer büyük binalarda iç mekan navigasyonu için harita verisi oluşturmanızı sağlar.

## 🎯 Admin Kullanıcı: ejderha112@gmail.com

Sadece bu email adresi tüm haritalama özelliklerine erişebilir.

---

## 🚀 Başlangıç Adımları

### 1. Supabase Veritabanını Hazırlama

#### A. Tabloları Oluştur
Supabase Dashboard > SQL Editor'da şu dosyayı çalıştır:
```sql
supabase/indoor-mapping-schema.sql
```

Bu dosya şunları oluşturur:
- `indoor_venues` - Mekan bilgileri (hastane, AVM)
- `indoor_floors` - Kat bilgileri
- `indoor_nodes` - Odalar, koridorlar, vb.
- `indoor_edges` - Noktalar arası bağlantılar
- `admin_users` - Admin yetkilendirme
- `indoor_tracking_logs` - GPS tracking (opsiyonel)

#### B. Admin Kullanıcısını Ekle
1. Supabase Dashboard > Authentication > Users
2. ejderha112@gmail.com ile yeni kullanıcı oluştur (Email + Password)
3. User ID'yi kopyala
4. SQL Editor'da çalıştır:
```sql
supabase/add-admin-user.sql
```

---

## 📱 Admin Panel Kullanımı

### Erişim
1. Uygulamaya `ejderha112@gmail.com` ile giriş yap
2. Profil sekmesine git
3. "🗺️ Admin: Harita Editörü" butonuna bas

### İş Akışı

#### Adım 1: Mekan Oluştur
```
Mekan Adı: İzmir Şehir Hastanesi
Adres: Başak Mah. 1756/1 Sok. No:1 Bayraklı/İzmir
Enlem: 38.4613
Boylam: 27.2069
Kat Sayısı: 3
```
**Nasıl Bulunur?**
- Google Maps'te mekanı bul
- Sağ tık > "Bu Konumun Ne Olduğu?" tıkla
- Koordinatları kopyala

#### Adım 2: Kat Ekle
```
Kat No: 0 (Zemin Kat)
Kat Adı: Zemin Kat - Acil Servis

Kat No: 1
Kat Adı: 1. Kat - Poliklinikler

Kat No: -1
Kat Adı: Bodrum - Laboratuvar
```

#### Adım 3: Kroki Yükle (Opsiyonel)
- Kat planı JPG/PNG dosyasını yükle
- Sistem şu anda geliştirme aşamasında
- Gelecekte: Kroki üzerine tıklayarak nokta ekleyebileceksin

#### Adım 4: Noktaları Ekle
Her oda, koridor ve önemli nokta için:

**Örnek: Acil Servis Girişi**
```
X: 100
Y: 150
Tip: 🚪 Giriş
Adı: Acil Servis Girişi
```

**Örnek: Koridor**
```
X: 120
Y: 150
Tip: 🚶 Koridor
Adı: Ana Koridor
```

**Örnek: Oda**
```
X: 200
Y: 180
Tip: 🚪 Oda
Adı: Oda 101 - Kardiyoloji
```

**Örnek: Asansör**
```
X: 150
Y: 200
Tip: 🛗 Asansör
Adı: Asansör 1
```

---

## 📐 Koordinat Sistemi

### X, Y Nedir?
- **X**: Sağa doğru artar (yatay eksen)
- **Y**: Aşağı doğru artar (dikey eksen)
- **Birim**: Pixel (kroki üzerinde)

### Koordinat Bulma Yöntemleri

#### Yöntem 1: Kroki Üzerinde (Gelecekte)
- Kroki JPG'yi yükle
- Tıkladığın nokta otomatik X,Y verir

#### Yöntem 2: Manuel (Şimdilik)
- Kroki resmini image editor'de aç (Paint, Photoshop, vb.)
- Cursor pozisyonu pixel cinsinden gösterir
- Örnek: (100, 150) → X=100, Y=150

#### Yöntem 3: GPS ile (Fiziksel Haritalama)
- Gelecekte: Telefon ile yürü, otomatik X,Y hesapla
- GPS koordinatları → Venue'nun başlangıç noktasına göre offset

---

## 🎨 Nokta Tipleri

| Tip | Icon | Kullanım |
|-----|------|----------|
| **corridor** | 🚶 | Ana koridorlar, yürüme yolları |
| **room** | 🚪 | Odalar, ofisler, muayene odaları |
| **entrance** | 🚪 | Giriş/çıkış kapıları |
| **elevator** | 🛗 | Asansörler |
| **stairs** | 🪜 | Merdivenler |

---

## 📊 Örnek Senaryo: Hastane Haritalandırma

### 1. Mekan Oluştur
```
İzmir Şehir Hastanesi
38.4613, 27.2069
5 kat
```

### 2. Zemin Katı Ekle
```
Kat 0: Zemin Kat
Noktalar:
- (50, 50) - Giriş - Ana Giriş
- (100, 50) - Koridor - Ana Koridor
- (150, 50) - Oda - Danışma
- (200, 50) - Koridor - Acil Servis Koridoru
- (250, 50) - Oda - Acil Servis
- (150, 100) - Asansör - Asansör 1
```

### 3. Bağlantıları Ekle (Gelecekte)
Hangi noktaların birbirine bağlı olduğunu belirt:
```
Ana Giriş → Ana Koridor → Danışma
Ana Koridor → Acil Servis Koridoru → Acil Servis
Ana Koridor → Asansör 1
```

---

## 🔮 Gelecek Özellikler

### Faz 1: Manuel Haritalama (ŞİMDİ)
- ✅ Admin panel
- ✅ Mekan/kat/nokta ekleme
- ✅ Manuel koordinat girişi
- ⏳ Kroki yükleme (geliştiriliyor)

### Faz 2: Görsel Editör (YAKINDA)
- 📸 Kroki JPG üzerine tıklayarak nokta ekleme
- 🖱️ Drag & drop ile nokta konumlandırma
- 🔗 Noktalar arası çizgi çekerek bağlantı oluşturma
- 📏 Otomatik mesafe hesaplama

### Faz 3: Fiziksel Haritalama (İLERİDE)
- 📱 Telefon kamerası + GPS ile yürüme
- 🧭 Gyroscope ile yön algılama
- 🗺️ Otomatik koridor tespiti
- 📍 Gerçek zamanlı harita oluşturma

### Faz 4: Akıllı Özellikler
- 🤖 AI ile kroki analizi (duvar, kapı tespiti)
- 🏃 Rota optimizasyonu
- ♿ Engelli erişimi rotaları
- 🚨 Acil çıkış yolları

---

## 🛠️ Teknik Detaylar

### Veritabanı Yapısı
```
indoor_venues (mekan)
  ↓
indoor_floors (kat)
  ↓
indoor_nodes (nokta)
  ↓
indoor_edges (bağlantı)
```

### Koordinat Dönüşümleri
```typescript
// Pixel → Metre
const meters = pixels * scale_meters_per_pixel;

// GPS → Pixel (venue başlangıç noktasına göre)
const deltaLat = currentLat - venue.latitude;
const deltaLng = currentLng - venue.longitude;
const x = deltaLng * metersPerDegree / scale_meters_per_pixel;
const y = deltaLat * metersPerDegree / scale_meters_per_pixel;
```

### RLS Politikaları
- **Okuma**: Herkes (public erişim)
- **Yazma**: Sadece `ejderha112@gmail.com`
- **Admin Kontrol**: `admin_users` tablosu

---

## 📞 Sorun Giderme

### "Erişim Engellendi" Hatası
- `ejderha112@gmail.com` ile giriş yaptığınızdan emin olun
- Supabase'de admin kullanıcısının eklendiğini kontrol edin:
  ```sql
  SELECT * FROM admin_users WHERE email = 'ejderha112@gmail.com';
  ```

### "Venue Oluşturulamadı" Hatası
- GPS koordinatlarının doğru formatta olduğunu kontrol edin (örn: 38.4613)
- RLS politikalarının aktif olduğunu kontrol edin
- Supabase bağlantısının çalıştığını test edin

### Koordinatlar Yanlış Görünüyor
- X,Y değerlerini kontrol edin (0'dan büyük olmalı)
- Kroki scale değerini ayarlayın (`scale_meters_per_pixel`)
- Başlangıç noktasını (0,0) doğru konumlandırın

---

## 📚 Kaynaklar

- [Supabase Documentation](https://supabase.com/docs)
- [Indoor Positioning Systems](https://en.wikipedia.org/wiki/Indoor_positioning_system)
- [OpenStreetMap Indoor Mapping](https://wiki.openstreetmap.org/wiki/Indoor_Mapping)

---

## 🎯 Sonraki Adımlar

1. ✅ Supabase tablolarını oluştur
2. ✅ Admin kullanıcısını ekle
3. ✅ Uygulamaya giriş yap
4. 📍 İlk mekanını ekle
5. 🏢 Katları tanımla
6. 🚪 Odaları ve koridorları işaretle
7. 🗺️ 3D navigasyon sistemini test et

---

💡 **İpucu**: İlk mekan için basit bir yapı seç (3-5 oda) ve sistemi test et. Sonra büyük hastane/AVM projelerine geç!
