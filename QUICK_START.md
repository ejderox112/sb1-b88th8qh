# 🎯 Hızlı Başlangıç: İç Mekan Haritalama

## 🚀 Şimdi Kullanılabilir Özellikler

### ✅ Yöntem 1: Manuel Koordinat Girişi
**Ne zaman kullanılır:** Kat planı kağıtta/PDF'te, hızlı test
```
1. Mekan oluştur
2. Kat ekle
3. X,Y koordinatlarını manuel yaz
4. Nokta tipini seç (oda/koridor/asansör)
5. İsim ver ve kaydet
```

### ✅ Yöntem 2: Görsel Kroki Editörü (YENİ!)
**Ne zaman kullanılır:** JPG/PNG kat planı var, görsel çalışma
```
1. Mekan oluştur
2. Kat ekle
3. "📷 Kroki" butonuna bas
4. Galeriden JPG/PNG seç
5. "👁️ Görüntüle" ile editörü aç
6. "➕ Nokta Ekle" moduna geç
7. Kroki üzerinde istediğin yere dokun
8. Koordinatlar otomatik dolar
9. Tip seç, isim ver, kaydet
```

---

## 📱 Adım Adım Kullanım

### A. İlk Kurulum (Bir kere)

#### 1. Supabase SQL'leri Çalıştır
```sql
-- Supabase Dashboard > SQL Editor
1. supabase/indoor-mapping-schema.sql
2. supabase/add-admin-user.sql
```

#### 2. Admin Hesabı Oluştur
```
Supabase > Authentication > Users
Email: ejderha112@gmail.com
Password: (güçlü şifre)
```

### B. Uygulama Kullanımı

#### 1. Admin Panele Giriş
```
1. Uygulamayı aç
2. ejderha112@gmail.com ile giriş yap
3. Profil sekmesine git
4. "🗺️ Admin: Harita Editörü" butonuna bas
```

#### 2. Mekan Oluştur
```
Mekan Adı: İzmir Şehir Hastanesi
Adres: Başak Mah. 1756/1 Sok. Bayraklı/İzmir
Enlem: 38.4613 (Google Maps'ten kopyala)
Boylam: 27.2069
Kat Sayısı: 3
```

#### 3. Kat Ekle
```
Kat No: 0
Kat Adı: Zemin Kat
[+ Ekle]
```

#### 4A. Manuel Yöntem
```
X: 100
Y: 150
Tip: 🚪 Giriş
Adı: Ana Giriş
[+ Nokta Ekle]
```

#### 4B. Görsel Yöntem (Önerilen!)
```
1. [📷 Kroki] butonuna bas
2. Kat planı JPG'yi seç
3. [👁️ Görüntüle] ile açılan editörde:
   - [➕ Nokta Ekle] moduna geç
   - Kroki üzerinde odaya dokun
   - Koordinatlar otomatik X,Y'ye yazılır
4. Editörü kapat [✓ Tamam]
5. Tip seç: 🚪 Oda
6. İsim yaz: Acil Servis
7. [+ Nokta Ekle]
```

---

## 🎨 Görsel Editör Özellikleri

### Modlar
- **👁️ Görüntüle**: Mevcut noktaları gör
- **➕ Nokta Ekle**: Tıklayarak yeni nokta ekle

### Marker Renkleri
- 🟢 Yeşil: Giriş
- 🔵 Mavi: Oda
- 🟣 Mor: Asansör
- 🟠 Turuncu: Merdiven
- ⚫ Gri: Koridor

### İpuçları
- Kroki üzerinde mevcut noktalar emoji ile gösterilir
- Nokta üzerine gelince isim görünür
- Zoom için resmi pinch yapabilirsiniz
- Her tıklama X,Y'yi otomatik doldurur

---

## 📊 Örnek Proje: Hastane

### Zemin Kat Haritası
```
Kroki: zemin-kat.jpg (1920x1080 pixel)

Noktalar:
1. (100, 200) - Giriş - "Ana Giriş"
2. (200, 200) - Koridor - "Ana Koridor"
3. (300, 150) - Oda - "Danışma"
4. (300, 250) - Oda - "Acil Servis"
5. (400, 200) - Asansör - "Asansör 1"
6. (500, 200) - Koridor - "Laboratuvar Koridoru"
7. (600, 200) - Oda - "Laboratuvar"
```

### 1. Kat Haritası
```
Kroki: 1-kat.jpg (1920x1080 pixel)

Noktalar:
1. (400, 200) - Asansör - "Asansör 1"
2. (500, 200) - Koridor - "Poliklinik Koridoru"
3. (600, 150) - Oda - "Kardiyoloji"
4. (600, 250) - Oda - "Nöroloji"
5. (700, 200) - Oda - "İç Hastalıkları"
```

---

## 🔄 İş Akışı Karşılaştırması

| Özellik | Manuel | Görsel Editör |
|---------|--------|---------------|
| **Hız** | Yavaş (her koordinat elle) | Hızlı (tıkla-ekle) |
| **Hassasiyet** | Düşük (tahmin) | Yüksek (piksel hassas) |
| **Kroki Gerekli** | Hayır | Evet (JPG/PNG) |
| **Öğrenme** | Kolay | Çok Kolay |
| **Kullanım** | Test için ideal | Gerçek projeler için |

---

## 💡 Pro İpuçları

### 1. Kroki Hazırlama
```
İdeal kroki özellikleri:
- Format: JPG veya PNG
- Boyut: 1920x1080 veya benzeri
- Netlik: Odalar/koridorlar görünür
- Ölçek: Mümkünse ölçekli plan
```

### 2. Koordinat Sistemi
```
Ekranın sol üst köşesi: (0, 0)
Sağa gittikçe X artar
Aşağı gittikçe Y artar

Örnek:
Ana Giriş (sol üst)     → (50, 50)
Acil Servis (sağ alt)   → (800, 600)
```

### 3. Verimli Haritalama
```
Sıralama:
1. Ana girişler
2. Koridorlar (navigasyon omurgası)
3. Önemli odalar (Acil, Laboratuvar)
4. Asansörler/Merdivenler
5. Diğer odalar
```

### 4. Kroki Kalitesi
```
✅ İyi: Mimari kat planı (AutoCAD çıktısı)
✅ Orta: El çizimi kroki (net çizimler)
❌ Kötü: Bulanık foto, düzensiz çizim
```

---

## 🐛 Sorun Giderme

### Kroki Yüklenmiyor
```
- Dosya boyutunu kontrol et (<10MB)
- JPG veya PNG formatında mı?
- Galeri iznini ver (Ayarlar)
```

### Koordinatlar Yanlış
```
- Editörü kapat-aç (reset)
- Kroki scale'ini ayarla
- Manuel düzeltme yap X,Y inputlarında
```

### Noktalar Kroki Üzerinde Görünmüyor
```
- Floor'u yeniden seç
- "👁️ Görüntüle" butonuna tekrar bas
- Noktaların X,Y'si kroki sınırları içinde mi kontrol et
```

---

## 🎯 Başarı Kriterleri

Bir kat başarıyla haritalandırıldı sayılır:
- ✅ Kroki yüklü ve net görünüyor
- ✅ Tüm girişler işaretli
- ✅ Ana koridorlar çizilmiş
- ✅ Önemli odalar (Acil, vb.) eklenmiş
- ✅ Asansör/merdiven bağlantıları var
- ✅ Oda isimleri doğru ve anlaşılır

---

## 📞 Destek

Sorunlarla karşılaşırsan:
1. INDOOR_MAPPING_GUIDE.md oku
2. Supabase SQL loglarını kontrol et
3. Admin panel mesajlarını oku (ekranın üstünde)

---

💪 **Şimdi hazırsın! İlk mekanını oluştur ve görsel editörü dene!**
