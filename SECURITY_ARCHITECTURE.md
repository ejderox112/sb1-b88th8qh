# 🔒 Güvenlik Mimarisi - Admin Sistemi

## 🎯 Güvenlik Prensibi

**SADECE ejderha112@gmail.com admin paneline erişebilir.**

- ❌ Veritabanı tabloları kullanılmaz
- ❌ JWT claims kullanılmaz
- ❌ Role sistemi yok
- ✅ Sadece hardcoded email kontrolü
- ✅ RLS politikaları ile SQL seviyesinde güvenlik

## 🏗️ Güvenlik Katmanları

### Katman 1: Frontend Kontrolü (UI Güvenliği)
**Dosyalar:**
- `app/AdminNotificationPanel.tsx`
- `app/AdminMapEditorScreen.tsx`
- `app/AdminDataManagementPanel.tsx`
- `app/AdminVenueModerationScreen.tsx`
- `app/AdminReportModerationScreen.tsx`
- `app/AdminIndoorMapEditorScreen.tsx`

**Kontrol Mekanizması:**
```typescript
const checkAdminAccess = async () => {
  const { data: userData } = await supabase.auth.getUser();
  const userEmail = userData.user.email || '';
  
  if (userEmail !== 'ejderha112@gmail.com') {
    Alert.alert('Erişim Engellendi', 'Yetkisiz erişim tespit edildi');
    return;
  }
  
  setIsAdmin(true);
};
```

**Amaç:** Kullanıcı arayüzünde admin butonlarını ve sayfalarını kontrol eder. Bu katman bypass edilebilir, bu yüzden asıl güvenlik backend'de.

---

### Katman 2: RLS Politikaları (SQL Güvenliği)
**Dosya:** `supabase/SECURITY_HARDENING.sql`

**Korunan Tablolar:**
1. ✅ `admin_notifications` - Sadece admin okuyabilir/güncelleyebilir
2. ✅ `locations` - Herkes okuyabilir, sadece admin yazabilir
3. ✅ `location_edit_history` - Sadece admin okuyabilir
4. ✅ `user_reports` - Kullanıcılar kendi raporlarını, admin hepsini görebilir
5. ✅ `user_restrictions` - Sadece admin erişebilir
6. ✅ `moderation_actions` - Sadece admin erişebilir
7. ✅ `venue_suggestions` - Kullanıcılar kendi önerilerini, admin hepsini yönetebilir
8. ✅ `indoor_map_suggestions` - Kullanıcılar kendi önerilerini, admin hepsini yönetebilir

**Örnek Politika:**
```sql
CREATE POLICY "Only main admin can read admin_notifications"
  ON admin_notifications
  FOR SELECT
  USING (auth.email() = 'ejderha112@gmail.com');
```

**Amaç:** Veritabanı seviyesinde erişim kontrolü. Frontend bypass edilse bile, veri alınamaz.

---

### Katman 3: Trigger Güvenliği (Otomasyon Güvenliği)
**Özellikler:**
- ✅ Admin bildirimleri otomatik oluşturulur (user_reports, venue_suggestions, indoor_suggestions)
- ✅ Lokasyon değişiklikleri otomatik loglanır (location_edit_history)
- ✅ Tetikleyiciler RLS politikalarını bypass etmez

---

## 🚫 Kaldırılan Güvenlik Açıkları

### ❌ admin_users Tablosu (KALDIRILDI)
**Neden Kaldırıldı:**
- Veritabanı manipülasyonu ile bypass edilebilirdi
- SQL injection riski
- Hacker kendini admin yapabilirdi: `INSERT INTO admin_users (email) VALUES ('hacker@evil.com')`

### ❌ JWT Claims (KULLANILMIYOR)
**Neden Kullanılmıyor:**
- JWT token'ı manipüle edilebilir
- Custom claims eklemek için backend servisi gerekir
- Daha karmaşık ve hata riskli

### ❌ Role Sistemi (YOK)
**Neden Yok:**
- "admin = 0" veya "role = 1" gibi sayısal kontroller kolayca bypass edilir
- Rol tabloları manipüle edilebilir
- Karmaşık ve gereksiz

---

## ✅ Güvenli Mimari - Nasıl Çalışır?

### Senario 1: Normal Kullanıcı Admin Paneline Erişmeye Çalışır

**Adım 1: Frontend Kontrolü**
```typescript
// user@example.com giriş yapmış
const userEmail = 'user@example.com';

if (userEmail !== 'ejderha112@gmail.com') {
  // ❌ Erişim engellendi
  Alert.alert('Erişim Engellendi');
  return;
}
```
✅ Sonuç: UI'da admin paneli görünmez, erişim engellendi

---

**Adım 2: Hacker Frontend'i Bypass Etmeye Çalışır**
```javascript
// Hacker React DevTools ile checkAdminAccess fonksiyonunu bypass eder
setIsAdmin(true); // Frontend'de admin oldu!

// Admin paneline girer, veri çekmeye çalışır
const { data } = await supabase
  .from('admin_notifications')
  .select('*');
```

**RLS Politikası Devreye Girer:**
```sql
-- Supabase bu sorguyu çalıştırmadan önce RLS kontrolü yapar
-- auth.email() = 'user@example.com' (hacker'ın emaili)
-- Politika: auth.email() = 'ejderha112@gmail.com'
-- ❌ USING clause False döndü, veri döndürülmedi
```

✅ Sonuç: Frontend bypass edildi ama RLS veri vermiyor. Hacker boş liste görür.

---

**Adım 3: Hacker Doğrudan API'ye Istek Atar**
```bash
# Postman, cURL veya custom script ile Supabase API'ye direkt istek
curl -X GET "https://yourproject.supabase.co/rest/v1/admin_notifications" \
  -H "apikey: ANON_KEY" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Supabase Yanıtı:**
```json
{
  "data": [],
  "error": null,
  "count": 0
}
```

**Neden Boş Liste?**
- RLS politikası SQL seviyesinde çalışır
- REST API bypass edilemez
- JWT token'daki email `user@example.com` olduğu için USING clause False döner

✅ Sonuç: API direkt çağrılsa bile RLS koruyor

---

**Adım 4: Hacker SQL Injection Dener**
```typescript
// Hacker email parametresine kötü niyetli SQL kodu enjekte etmeye çalışır
const hackedEmail = "user@example.com' OR '1'='1";

const { data } = await supabase
  .from('admin_notifications')
  .select('*')
  .eq('email', hackedEmail);
```

**Supabase Güvenliği:**
- Parametrize sorgular kullanır (prepared statements)
- SQL injection mümkün değil
- RLS zaten email'i JWT'den alır, parametre olarak değil

✅ Sonuç: SQL injection çalışmaz

---

### Senario 2: Hacker Veritabanına Direkt Erişir

**Adım 1: Hacker admin_users Tablosu Oluşturmaya Çalışır**
```sql
-- Hacker SQL Editor'da çalıştırmaya çalışır
CREATE TABLE admin_users (
  email TEXT PRIMARY KEY,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO admin_users (email) VALUES ('hacker@evil.com');
```

**Supabase Yanıtı:**
- Eğer hacker Supabase dashboard'a erişmediyse: ❌ Erişim yok
- Eğer erişmediyse: ✅ Tablo oluşturdu AMA...

---

**Adım 2: RLS Politikası Kontrolü**
```sql
-- Hacker admin_notifications'a erişmeye çalışır
SELECT * FROM admin_notifications;

-- RLS Politikası:
-- USING (auth.email() = 'ejderha112@gmail.com')
-- Hacker'ın emaili: hacker@evil.com
-- ❌ False, veri döndürülmez
```

✅ Sonuç: Tablo oluştursa bile RLS hardcoded email kontrolü yaptığı için hacker veri alamaz

---

**Adım 3: Hacker JWT Token Manipüle Etmeye Çalışır**
```javascript
// Hacker JWT token'ını decode eder
const token = jwt.decode(USER_JWT_TOKEN);
console.log(token);
// { email: 'hacker@evil.com', sub: 'uuid', ... }

// Email'i değiştirmeye çalışır
token.email = 'ejderha112@gmail.com';
const hackedToken = jwt.sign(token, 'SECRET_KEY');
```

**Supabase Güvenliği:**
- JWT token Supabase secret key ile imzalanır
- Hacker secret key bilmiyor
- Token signature doğrulanır, manipüle edilmiş token reddedilir

✅ Sonuç: JWT manipülasyon çalışmaz

---

## 🛡️ Savunma-in-Depth (Katmanlı Savunma)

| Katman | Teknoloji | Bypass Edilebilir mi? | Sonuç |
|--------|-----------|----------------------|-------|
| **Katman 1** | Frontend email check | ✅ Evet (React DevTools) | Admin UI görünür |
| **Katman 2** | RLS politikaları | ❌ Hayır (SQL seviye) | ❌ Veri alınamaz |
| **Katman 3** | JWT signature | ❌ Hayır (Secret key gerekli) | ❌ Token manipüle edilemez |
| **Katman 4** | Hardcoded email | ❌ Hayır (Kod değiştirilmeli) | ❌ Rol/tablo bypass edilemez |

**Sonuç:** Tüm katmanlar aşılmadıkça admin erişimi mümkün değil. Tek aşılabilir katman frontend ama o da veri döndürmüyor.

---

## 📊 Güvenlik Test Senaryoları

### Test 1: Normal Kullanıcı
```bash
# Kullanıcı: test@example.com
✅ Login yapabilir
✅ Profil sayfasını açabilir
❌ Admin butonlarını göremez
❌ Admin sayfalarına giderse Alert + geri yönlendirme
❌ API'ye direkt istek atarsa boş liste döner
```

### Test 2: Hacker Frontend Bypass
```bash
# Hacker React DevTools ile setIsAdmin(true) yapar
✅ Admin UI görünür
❌ API'den veri alamaz (RLS engeller)
❌ Tablo oluşturursa bile veri alamaz
❌ JWT manipüle edemez
```

### Test 3: Hacker SQL Injection
```bash
# Hacker parametrelere SQL kodu enjekte eder
❌ Prepared statements kullanıldığı için injection çalışmaz
❌ RLS zaten email'i JWT'den alır
```

### Test 4: Hacker Veritabanı Manipülasyonu
```bash
# Hacker admin_users tablosu oluşturur
✅ Tablo oluşturulabilir (eğer dashboard erişimi varsa)
❌ RLS hardcoded email kontrolü yaptığı için tablo anlamsız
❌ Veri hala alınamaz
```

### Test 5: Admin Kullanıcısı
```bash
# Kullanıcı: ejderha112@gmail.com
✅ Login yapabilir
✅ Profil sayfasında 6 admin butonu görür
✅ Tüm admin panellerine erişebilir
✅ API'den tüm verileri alabilir
✅ RLS politikaları admin için True döner
```

---

## 🔧 Bakım ve Güncelleme

### Yeni Admin Eklemek İstersen (İleriye Dönük)
**Seçenek 1: Email Listesi (En Güvenli)**
```typescript
const ADMIN_EMAILS = [
  'ejderha112@gmail.com',
  'ikinci-admin@example.com'
];

if (!ADMIN_EMAILS.includes(userEmail)) {
  Alert.alert('Erişim Engellendi');
  return;
}
```

**Seçenek 2: Moderatör Sistemi (Gelecekte)**
```typescript
// Farklı yetkiler için
const ROLES = {
  ADMIN: ['ejderha112@gmail.com'],
  MODERATOR: ['mod1@example.com', 'mod2@example.com']
};

if (ROLES.ADMIN.includes(userEmail)) {
  // Tüm yetkilere sahip
} else if (ROLES.MODERATOR.includes(userEmail)) {
  // Sınırlı yetkiler (sadece report onaylama)
}
```

---

## ⚠️ ÖNEMLİ NOTLAR

1. **admin_users tablosu yok** - Kaldırıldı, artık kullanılmıyor
2. **JWT claims yok** - Hardcoded email kontrolü daha güvenli
3. **Role sistemi yok** - Şu an sadece 1 admin, moderatör daha sonra eklenecek
4. **RLS politikaları kritik** - Frontend bypass edilse bile veri korumalı
5. **auth.email() fonksiyonu** - Supabase'in güvenli email alma yöntemi, manipüle edilemez
6. **Secret key korumalı** - JWT signature doğrulama, token manipülasyonu mümkün değil

---

## 🎯 Sonuç

Bu mimari ile:
- ✅ Sadece ejderha112@gmail.com admin erişimi var
- ✅ Frontend bypass edilse bile veri korumalı
- ✅ Veritabanı manipülasyonu etkisiz
- ✅ JWT token manipülasyon imkansız
- ✅ SQL injection korumalı
- ✅ Katmanlı savunma (Defense-in-Depth)
- ✅ Basit ve bakımı kolay
- ✅ Moderatör sistemi ileride kolayca eklenebilir

**Hiçbir kullanıcı veya hacker admin paneline erişemez!** 🔒
