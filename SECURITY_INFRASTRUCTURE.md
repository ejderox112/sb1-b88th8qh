# 🔒 Güvenlik Altyapısı - Security Infrastructure

## Genel Bakış

Bu belge, sisteme kullanıcılar tarafından yüklenen dosyaların (kroki/blueprint, fotoğraf, avatar) ve önerilen mekanların güvenliğini sağlamak için oluşturulan katmanlı güvenlik sistemini açıklar.

---

## 1. Dosya Yükleme Güvenliği

### 1.1 Dosya Hash Kontrolü (SHA-256)

**Amaç:** Aynı dosyanın tekrar tekrar yüklenmesini engellemek, depolama alanını optimize etmek.

```sql
-- file_uploads tablosunda her dosya için SHA-256 hash tutuyoruz
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  file_hash TEXT NOT NULL, -- SHA-256 hash
  file_type TEXT CHECK (file_type IN ('blueprint', 'avatar', 'task_photo', 'venue_photo')),
  file_size BIGINT NOT NULL,
  virus_scan_status TEXT CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'error')),
  storage_path TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  scanned_at TIMESTAMPTZ
);

-- Hash üzerinde index performans için
CREATE INDEX idx_file_uploads_hash ON file_uploads(file_hash);
```

**İstemci tarafında kullanım:**
```typescript
import CryptoJS from 'crypto-js';

async function calculateFileHash(fileUri: string): Promise<string> {
  const response = await fetch(fileUri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
  return CryptoJS.SHA256(wordArray).toString();
}

// Yükleme öncesi kontrol
const hash = await calculateFileHash(blueprintUri);
const { data: existing } = await supabase
  .from('file_uploads')
  .select('id')
  .eq('file_hash', hash)
  .single();

if (existing) {
  alert('Bu dosya zaten sisteme yüklenmiş!');
  return;
}
```

---

### 1.2 Virüs Tarama Sistemi

**Amaç:** Kötü amaçlı dosyaların (malware, virüs içeren JPG/PNG) sisteme girmesini engellemek.

**Mevcut Durum:** `virus_scan_status` kolonu ile takip yapısı hazır, gerçek tarama servisi entegrasyonu gerekiyor.

**Önerilen Entegrasyonlar:**

#### Seçenek 1: VirusTotal API
```typescript
// lib/virusScanner.ts
import axios from 'axios';

const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;

export async function scanFileWithVirusTotal(fileUri: string): Promise<'clean' | 'infected' | 'error'> {
  try {
    // 1. Dosyayı VirusTotal'a yükle
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: 'image/jpeg',
      name: 'upload.jpg',
    });

    const uploadResponse = await axios.post(
      'https://www.virustotal.com/api/v3/files',
      formData,
      {
        headers: {
          'x-apikey': VIRUSTOTAL_API_KEY,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    const scanId = uploadResponse.data.data.id;

    // 2. Tarama sonucunu bekle (polling)
    await new Promise(resolve => setTimeout(resolve, 15000)); // 15 saniye bekle

    const resultResponse = await axios.get(
      `https://www.virustotal.com/api/v3/analyses/${scanId}`,
      {
        headers: { 'x-apikey': VIRUSTOTAL_API_KEY },
      }
    );

    const stats = resultResponse.data.data.attributes.stats;
    
    // Eğer herhangi bir motor "malicious" derse, infected say
    if (stats.malicious > 0) {
      return 'infected';
    }

    return 'clean';
  } catch (error) {
    console.error('VirusTotal tarama hatası:', error);
    return 'error';
  }
}
```

**Kullanım:**
```typescript
// AdminIndoorMapEditorScreen.tsx içinde uploadBlueprint() fonksiyonunda:

const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  quality: 1,
});

if (!result.canceled && result.assets[0]) {
  const uri = result.assets[0].uri;
  
  // Önce hash kontrol et
  const hash = await calculateFileHash(uri);
  
  // Virüs taraması yap
  Alert.alert('🔍 Güvenlik Taraması', 'Dosyanız taranıyor, lütfen bekleyin...');
  const scanResult = await scanFileWithVirusTotal(uri);
  
  if (scanResult === 'infected') {
    Alert.alert('⛔ Güvenlik Uyarısı', 'Yüklediğiniz dosya güvenlik taramasından geçemedi!');
    return;
  }
  
  if (scanResult === 'error') {
    Alert.alert('⚠️ Uyarı', 'Güvenlik taraması yapılamadı. Yine de devam etmek ister misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Devam Et', onPress: () => proceedWithUpload(uri, hash) },
    ]);
    return;
  }
  
  // Temiz dosya, yükle
  await proceedWithUpload(uri, hash);
}
```

#### Seçenek 2: ClamAV (Supabase Edge Function)
```typescript
// supabase/functions/scan-file/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { fileUrl } = await req.json();
  
  // ClamAV API'ye dosya gönder
  const response = await fetch('http://clamav-service:3310/scan', {
    method: 'POST',
    body: JSON.stringify({ url: fileUrl }),
  });
  
  const result = await response.json();
  
  // Supabase'de file_uploads tablosunu güncelle
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  await supabase
    .from('file_uploads')
    .update({
      virus_scan_status: result.clean ? 'clean' : 'infected',
      scanned_at: new Date().toISOString(),
    })
    .eq('storage_path', fileUrl);
  
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

### 1.3 Dosya Boyutu Limitleri

**Amaç:** Depolama alanını korumak, büyük dosyalarla DoS saldırılarını engellemek.

```sql
-- Trigger ile dosya boyutu kontrolü
CREATE OR REPLACE FUNCTION check_file_size_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Blueprint: maksimum 10MB
  IF NEW.file_type = 'blueprint' AND NEW.file_size > 10485760 THEN
    RAISE EXCEPTION 'Blueprint dosyası 10MB''dan büyük olamaz';
  END IF;
  
  -- Avatar: maksimum 2MB
  IF NEW.file_type = 'avatar' AND NEW.file_size > 2097152 THEN
    RAISE EXCEPTION 'Avatar dosyası 2MB''dan büyük olamaz';
  END IF;
  
  -- Task/Venue fotoğrafları: maksimum 5MB
  IF (NEW.file_type = 'task_photo' OR NEW.file_type = 'venue_photo') 
     AND NEW.file_size > 5242880 THEN
    RAISE EXCEPTION 'Fotoğraf 5MB''dan büyük olamaz';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER file_size_check
BEFORE INSERT OR UPDATE ON file_uploads
FOR EACH ROW EXECUTE FUNCTION check_file_size_limit();
```

**İstemci tarafında pre-check:**
```typescript
// AdminIndoorMapEditorScreen.tsx
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  quality: 1,
});

if (!result.canceled && result.assets[0]) {
  const asset = result.assets[0];
  
  // Dosya boyutu kontrolü (istemci tarafında)
  const fileSize = asset.fileSize || 0;
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (fileSize > maxSize) {
    Alert.alert('⚠️ Dosya Çok Büyük', `Kroki dosyası maksimum 10MB olabilir. Seçilen dosya: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
    return;
  }
  
  // Devam et...
}
```

---

## 2. Rate Limiting (Hız Sınırlama)

### 2.1 Mekan Önerisi Limiti

**Amaç:** Spam öneri gönderimini engellemek, kötü niyetli kullanıcıların sistemi doldurmasını önlemek.

```sql
-- Rate limiting fonksiyonu
CREATE OR REPLACE FUNCTION check_venue_suggestion_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  suggestion_count INT;
BEGIN
  -- Son 1 saat içinde kaç öneri göndermiş?
  SELECT COUNT(*) INTO suggestion_count
  FROM venue_suggestions
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '1 hour';
  
  -- 5'ten fazla öneri varsa, engelle
  IF suggestion_count >= 5 THEN
    RAISE EXCEPTION 'Saatte en fazla 5 mekan önerisi yapabilirsiniz. Lütfen daha sonra tekrar deneyin.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venue_suggestion_rate_limit
BEFORE INSERT ON venue_suggestions
FOR EACH ROW EXECUTE FUNCTION check_venue_suggestion_rate_limit();
```

**Dinamik rate limit tablosu (gelişmiş):**
```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL, -- 'venue_suggestion', 'file_upload', 'friend_request', vb.
  action_count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  window_end TIMESTAMPTZ DEFAULT now() + interval '1 hour'
);

-- Cleanup eski pencereler (her gece çalışacak cron job)
DELETE FROM rate_limits WHERE window_end < now() - interval '24 hours';
```

---

### 2.2 Dosya Yükleme Limiti

```sql
-- Aynı kullanıcı 5 dakikada en fazla 3 dosya yükleyebilir
CREATE OR REPLACE FUNCTION check_file_upload_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  upload_count INT;
BEGIN
  SELECT COUNT(*) INTO upload_count
  FROM file_uploads
  WHERE user_id = NEW.user_id
    AND uploaded_at > now() - interval '5 minutes';
  
  IF upload_count >= 3 THEN
    RAISE EXCEPTION '5 dakikada en fazla 3 dosya yükleyebilirsiniz';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER file_upload_rate_limit
BEFORE INSERT ON file_uploads
FOR EACH ROW EXECUTE FUNCTION check_file_upload_rate_limit();
```

---

## 3. Kötüye Kullanım Bildirimi (Abuse Reporting)

### 3.1 Abuse Reports Tablosu

```sql
CREATE TABLE abuse_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES auth.users(id),
  reported_user_id UUID REFERENCES auth.users(id),
  reported_venue_id UUID REFERENCES venue_suggestions(id) NULL,
  report_type TEXT CHECK (report_type IN ('spam', 'harassment', 'inappropriate_content', 'fake_venue', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id) NULL,
  reviewed_at TIMESTAMPTZ NULL,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- İndeksler
CREATE INDEX idx_abuse_reports_status ON abuse_reports(status);
CREATE INDEX idx_abuse_reports_reported_user ON abuse_reports(reported_user_id);
```

### 3.2 Kullanıcı Kısıtlama Sistemi

```sql
-- Kullanıcı kısıtlama tablosu
CREATE TABLE user_restrictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  is_banned BOOLEAN DEFAULT false,
  can_suggest_venues BOOLEAN DEFAULT true,
  can_upload_files BOOLEAN DEFAULT true,
  can_send_messages BOOLEAN DEFAULT true,
  restriction_reason TEXT,
  restricted_by UUID REFERENCES auth.users(id),
  restricted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NULL -- NULL = permanent
);

-- Otomatik kısıtlama trigger
CREATE OR REPLACE FUNCTION check_user_restrictions()
RETURNS TRIGGER AS $$
DECLARE
  restriction RECORD;
BEGIN
  SELECT * INTO restriction
  FROM user_restrictions
  WHERE user_id = NEW.user_id
    AND (expires_at IS NULL OR expires_at > now());
  
  IF restriction IS NOT NULL THEN
    IF TG_TABLE_NAME = 'venue_suggestions' AND NOT restriction.can_suggest_venues THEN
      RAISE EXCEPTION 'Mekan önerisi yapma yetkiniz kısıtlanmış: %', restriction.restriction_reason;
    END IF;
    
    IF TG_TABLE_NAME = 'file_uploads' AND NOT restriction.can_upload_files THEN
      RAISE EXCEPTION 'Dosya yükleme yetkiniz kısıtlanmış: %', restriction.restriction_reason;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_venue_suggestion_restrictions
BEFORE INSERT ON venue_suggestions
FOR EACH ROW EXECUTE FUNCTION check_user_restrictions();

CREATE TRIGGER check_file_upload_restrictions
BEFORE INSERT ON file_uploads
FOR EACH ROW EXECUTE FUNCTION check_user_restrictions();
```

---

## 4. Moderasyon Sistemi

### 4.1 Venue Suggestion Workflow

**Durumlar:**
- `pending`: Yeni öneri, admin incelemesi bekliyor
- `approved`: Admin onayladı, sisteme eklendi
- `rejected`: Admin reddetti (geçersiz/yanlış bilgi)
- `spam`: Spam olarak işaretlendi (kullanıcı kısıtlanabilir)

**Admin moderasyon logic:**
```typescript
// AdminVenueModerationScreen.tsx

const handleModeration = async (
  suggestionId: string,
  newStatus: 'approved' | 'rejected' | 'spam',
  createVenue: boolean = false
) => {
  // 1. Öneriyi güncelle
  await supabase
    .from('venue_suggestions')
    .update({
      status: newStatus,
      moderation_notes: moderationNote,
      moderated_by: currentUserId,
      moderated_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);
  
  // 2. Spam ise kullanıcıyı kısıtla
  if (newStatus === 'spam') {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      // Kaç spam önerisi var?
      const { count } = await supabase
        .from('venue_suggestions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', suggestion.user_id)
        .eq('status', 'spam');
      
      // 3'ten fazla spam -> hesabı kısıtla
      if (count && count >= 3) {
        await supabase
          .from('user_restrictions')
          .upsert({
            user_id: suggestion.user_id,
            can_suggest_venues: false,
            restriction_reason: `${count} spam mekan önerisi`,
            restricted_by: currentUserId,
          });
        
        Alert.alert('⚠️ Kullanıcı Kısıtlandı', 'Bu kullanıcı artık mekan önerisi yapamayacak.');
      }
    }
  }
  
  // 3. Onaylı ise mekan oluştur
  if (newStatus === 'approved' && createVenue) {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      await supabase
        .from('indoor_venues')
        .insert({
          name: suggestion.name,
          address: suggestion.address,
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
          venue_type: suggestion.venue_type,
          floor_count: suggestion.floor_count,
          created_by: currentUserId,
        });
    }
  }
};
```

---

## 5. RLS (Row Level Security) Politikaları

### 5.1 Genel Okuma İzni

```sql
-- Herkes indoor_venues, indoor_floors, indoor_nodes okuyabilir (genel kullanım)
CREATE POLICY "Public read access"
ON indoor_venues FOR SELECT
USING (true);

CREATE POLICY "Public read access"
ON indoor_floors FOR SELECT
USING (true);

CREATE POLICY "Public read access"
ON indoor_nodes FOR SELECT
USING (true);
```

### 5.2 Admin-Only Yazma İzni

```sql
-- Sadece admin kullanıcılar (admin_users tablosunda olanlar) yazabilir
CREATE POLICY "Admin write access"
ON indoor_venues FOR INSERT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND is_active = true
  )
);

CREATE POLICY "Admin write access"
ON indoor_floors FOR INSERT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND is_active = true
  )
);

CREATE POLICY "Admin write access"
ON indoor_nodes FOR INSERT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND is_active = true
  )
);
```

### 5.3 Venue Suggestions - Kullanıcılar Kendi Önerilerini Görebilir

```sql
-- Kullanıcılar sadece kendi önerdiklerini görebilir
CREATE POLICY "Users can view own suggestions"
ON venue_suggestions FOR SELECT
USING (auth.uid() = user_id);

-- Adminler tüm önerileri görebilir
CREATE POLICY "Admins can view all suggestions"
ON venue_suggestions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND is_active = true
  )
);

-- Kullanıcılar öneri ekleyebilir
CREATE POLICY "Users can insert suggestions"
ON venue_suggestions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Adminler öneri durumunu güncelleyebilir
CREATE POLICY "Admins can update suggestions"
ON venue_suggestions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND is_active = true
  )
);
```

---

## 6. Güvenlik Kontrol Listesi

### Yapılması Gerekenler:

- [x] **File uploads tablosu**: SHA-256 hash, virus_scan_status, file_size kolonları eklendi
- [x] **Rate limiting**: Venue suggestions için saatte 5 öneri limiti (trigger)
- [ ] **Virüs tarama entegrasyonu**: VirusTotal veya ClamAV ile dosya tarama
- [x] **Dosya boyutu limitleri**: 10MB blueprint, 2MB avatar, 5MB foto (trigger hazır)
- [x] **Abuse reporting**: abuse_reports tablosu oluşturuldu
- [x] **User restrictions**: user_restrictions tablosu ile kısıtlama sistemi
- [x] **RLS policies**: Admin-only yazma, public okuma politikaları
- [x] **Venue suggestion moderation**: Admin panel oluşturuldu
- [ ] **File upload rate limiting**: 5 dakikada 3 dosya limiti (trigger hazır, test edilecek)
- [ ] **Otomatik spam detection**: 3+ spam öneri yapan kullanıcıları otomatik kısıtla
- [ ] **Email notifications**: Admin'e yeni öneri geldiğinde bildirim
- [ ] **Logs & audit trail**: Her moderasyon kararı için log kaydı

---

## 7. İleriki Geliştirmeler

### 7.1 Machine Learning Spam Detection
```typescript
// Gelecekte: OpenAI Moderation API ile spam tespit
async function detectSpamWithAI(venueData: VenueSuggestion): Promise<boolean> {
  const response = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: `${venueData.name} - ${venueData.address} - ${venueData.description}`,
    }),
  });
  
  const result = await response.json();
  return result.results[0].flagged;
}
```

### 7.2 IP-Based Rate Limiting
```sql
-- IP adresi bazlı rate limiting (Supabase Edge Functions ile)
CREATE TABLE ip_rate_limits (
  ip_address INET NOT NULL,
  action_type TEXT NOT NULL,
  request_count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (ip_address, action_type, window_start)
);
```

### 7.3 Captcha Entegrasyonu
```typescript
// reCAPTCHA v3 ile bot koruması
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const SuggestVenueScreen = () => {
  const { executeRecaptcha } = useGoogleReCaptcha();
  
  const submitSuggestion = async () => {
    if (!executeRecaptcha) {
      console.log('Captcha not ready');
      return;
    }
    
    const token = await executeRecaptcha('submit_venue');
    
    // Token'ı backend'e gönder, Google'da doğrula
    const response = await fetch('/api/verify-captcha', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    
    const { score } = await response.json();
    
    if (score < 0.5) {
      alert('Bot tespiti! Lütfen tekrar deneyin.');
      return;
    }
    
    // Devam et...
  };
};
```

---

## 8. Güvenlik İzleme ve Alertler

### 8.1 Suspicious Activity Detection
```sql
-- Şüpheli aktivite tablosu
CREATE TABLE security_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  alert_type TEXT, -- 'rate_limit_exceeded', 'virus_detected', 'spam_detected', vb.
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Örnek: Virüs tespit edildiğinde alert oluştur
CREATE OR REPLACE FUNCTION log_virus_detection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.virus_scan_status = 'infected' THEN
    INSERT INTO security_alerts (user_id, alert_type, severity, details)
    VALUES (
      NEW.user_id,
      'virus_detected',
      'critical',
      jsonb_build_object(
        'file_id', NEW.id,
        'file_type', NEW.file_type,
        'file_hash', NEW.file_hash
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER virus_detection_alert
AFTER UPDATE ON file_uploads
FOR EACH ROW
WHEN (NEW.virus_scan_status = 'infected')
EXECUTE FUNCTION log_virus_detection();
```

---

## 9. Kullanıcı Bildirimleri

```typescript
// lib/securityNotifications.ts

export async function notifyAdminOfSecurity(alertType: string, details: any) {
  // Admin kullanıcıları bul
  const { data: admins } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('is_active', true);
  
  if (!admins) return;
  
  // Her admin'e bildirim gönder
  for (const admin of admins) {
    await supabase
      .from('notifications')
      .insert({
        user_id: admin.user_id,
        type: 'security_alert',
        title: '⚠️ Güvenlik Uyarısı',
        message: `${alertType}: ${JSON.stringify(details)}`,
        data: { alert_type: alertType, ...details },
      });
  }
}

// Kullanıcıya kısıtlama bildirimi
export async function notifyUserOfRestriction(userId: string, reason: string) {
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: 'account_restriction',
      title: '🚫 Hesap Kısıtlaması',
      message: `Hesabınız kısıtlanmıştır: ${reason}`,
      data: { reason },
    });
}
```

---

## Özet

Bu güvenlik altyapısı, sistemimize yüklenen dosyaların ve kullanıcı önerilerinin güvenliğini **4 katmanlı** koruma ile sağlar:

1. **Önleme (Prevention)**: Dosya boyutu limitleri, rate limiting
2. **Tespit (Detection)**: Hash kontrolü, virüs tarama, spam detection
3. **Müdahale (Response)**: Moderasyon sistemi, kullanıcı kısıtlamaları
4. **İzleme (Monitoring)**: Güvenlik alertleri, audit logs

**Şu anda hazır olanlar:** Tüm database şeması, RLS politikaları, rate limiting, moderasyon UI
**Entegre edilmesi gerekenler:** Virüs tarama servisi (VirusTotal/ClamAV), captcha, email bildirimleri

