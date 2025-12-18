@copilot

PR #13 için not:

- `fix/deps-and-cleanup` dalı `main` ile birleştirildi.
- Yerel Maven bootstrap çalıştırıldı; modüller için bağımlılık taraması yapıldı.
- `npm audit` sonuçları düzeltildi (otomatik `npm audit fix` uygulandı).
- Derleme çıktı dosyaları (`target/` içi, `*.class`) silindi ve `.gitignore` güncellendi.
- Geçici tarama dosyaları (`.maven/`, `*-dependency-updates.txt`, `*-dependencies.txt`, `npm-audit.json`) çalışma dizininden temizlendi.

Eğer bu PR konuşmasında @copilot'u etiketleyip bir eylem gerekiyorsa, beni tekrar etiketleyin; ilerlemek için hazırım.

— Copilot otomasyonu
