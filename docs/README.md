# Proje Dokümantasyonu

Bu doküman, uygulamanın ana modülleri, API uçları, iş akışları ve entegrasyonları hakkında bilgi verir.

## Ana Modüller
- Destekçi ve bağış sistemi
- Rozet ve ödül sistemi
- Moderasyon ve raporlama
- Google login ve demo kullanıcı akışı
- Bildirim ve e-posta entegrasyonu
- Analytics ve loglama

## API Uçları
- `/supporters` → Bağış işlemleri
- `/supporter_badges` → Rozet işlemleri
- `/user_reports` → Rapor/moderasyon işlemleri

## Güvenlik
- Supabase RLS ve policy’ler aktif
- Her kullanıcı sadece kendi verisini görebilir

## Test ve CI/CD
- Otomatik testler için Jest
- CI/CD pipeline için GitHub Actions

## Sürdürülebilirlik
- Versiyonlama ve changelog
- Kullanıcıdan uygulama içi geri bildirim

---
Daha fazla detay için ilgili modülün alt dokümanına bakınız.
