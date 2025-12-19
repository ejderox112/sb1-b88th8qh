# Java 21 Upgrade Plan

- Migration Session ID: e0d75d8f-1a96-4ca4-9356-8cb85ab5c6ef
- Plan created: 2025-12-19  (local time)
- Uncommitted Changes Policy: Always Stash
- Target branch: appmod/java-migration-20251219224649
- Programming language: java

## Summary
Bu plan, çalışma alanındaki Maven projelerini Java 21 (LTS) ile uyumlu hale getirmeyi amaçlar. Mevcut durumda bazı alt projeler zaten Java 21 kullanıyor; diğerleri Java 17'den yükseltilecek.

## Projeler ve mevcut Java sürümleri
- ngrok-java-demo/pom.xml → maven.compiler.source: 21 (zaten 21)
- java-service-17/pom.xml → maven.compiler.source: 17 (hedef: 21)
- java-service/pom.xml → maven.compiler.source: 17 (hedef: 21)

## Dosyalar (tahmini değişecekler, bağımlılık analizine bağlı olarak artabilir)
- java-service/pom.xml
- java-service-17/pom.xml
- (gerekirse) ilgili `maven-compiler-plugin` konfigürasyonları

## JDK Ayarları
- Mevcut yüklü JDK'lar tespit edildi: 8 (`C:\Users\cocobongo\.jdk\jdk-8\bin`), 17 (`C:\jdk-17\jdk-17.0.17+10\bin`), 21 (`C:\Program Files\Android\Android Studio\jbr\bin`).
- Seçim: Kullanılacak JDK → Java 21 (C:\Program Files\Android\Android Studio\jbr). Gerekçe: Zaten sistemde mevcut ve proje hedefi LTS 21.
- Need to install new JDK: false (yüklü 21 bulundu)
- JAVA_HOME önerisi: `C:\Program Files\Android\Android Studio\jbr` (veya kullanıcı tercih ederse başka JDK21 kurulumu)

## Build tool ayarları
- Tespit edilen build aracı: Maven
- Maven wrapper: `ngrok-java-demo/mvnw.cmd` bulundu (wrapper var) — tercih: wrapper varsa onu kullanmak güvenli; fakat sistem Maven (`C:\Users\cocobongo\.maven\maven-3.9.12\bin`) da mevcut.
- Öneri: Proje kökünde wrapper yoksa sistem Maven kullanılacak; `ngrok-java-demo` için wrapper kullanılabilir.

## Versiyon kontrol ve ön onay gereksinimleri
- UncommittedChangesAction: `Always Stash` → otomatik olarak stash uygulanacak (plan bunu kullanacaktır).
- Branch oluşturma: `appmod/java-migration-20251219224649` (otomatik oluşturulacak).

## Onay isteği (toplu): lütfen aşağıdakilerden seçim yapın
1) Versiyon kontrol üzerinde işlem için izin verilsin mi? (evet → otomatik stash, branch oluşturma, commit adımları yapılacak)  
2) Kullanılacak JDK yolu onaylanıyor mu? (önerilen: `C:\Program Files\Android\Android Studio\jbr`)  
3) Maven kullanım tercihi: (a) Her proje için varsa `mvnw` kullanılsın, yoksa sistem Maven kullanılsın,  (b) sistem Maven her projede kullanılsın

Lütfen 1-3 maddeleri tek seferde onaylayın veya farklı tercih belirtin. Onay aldığımda otomatik olarak sıradaki adım olan "Set up environment and install JDK 21" ve sonrasında sürüm kontrol adımlarını çalıştıracağım.

## Kaydetme ve sonraki adımlar
- Bu plan `c:\Users\cocobongo\yeni sayfff\sb1-b88th8qh\.github\appmod\code-migration\20251219224649/plan.md` olarak kaydedildi.
- Sonraki adımlar (onay sonrası):
  1. Versiyon kontrol temizliği (policy'e göre stash)
  2. Branch oluşturma
  3. JDK ortam değişkenlerinin ayarlanması (JAVA_HOME)
  4. `build_java_project` ile derleme denemesi (session e0d75d8f... kullanılarak)
  5. Test çalıştırma ve hataların düzeltilmesi

