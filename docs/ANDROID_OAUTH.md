# Android OAuth (Google) — SHA-1 ve Ayarlar

Bu doküman, Android için Google OAuth istemcisi oluşturma ve Expo projenizde kullanmak için gereken adımları açıklar. Lokal değerleri repoya koymayın — `.env.local` kullanın.

1) SHA-1 almak (zaten yapıldı)

- Debug keystore oluşturuldu (yerel): `C:\Users\<user>\.android\debug.keystore`
- Örnek alınan SHA-1 (sizin ortamda):

  SHA1: 86:84:1B:E8:54:5C:89:04:EA:43:F2:B1:FA:29:00:18:CF:7A:86:D6

2) Google Cloud Console — Android OAuth client

- Google Cloud Console → APIs & Services → Credentials → Create Credentials → OAuth client ID → Android
- Paket adı: `com.anonymous.boltexponativewind`
- SHA-1 fingerprint: yukarıdaki SHA1 değerini girin
- Kaydedin. (Değişikliklerin yayılması birkaç dakika alabilir.)

3) Yerel konfigürasyon (gizli olmayan client id)

- Proje kökünde `.env.local` oluşturun (REBPO'YA KOMİT ETMEYİN):

```
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

4) Expo tarafı — rehber

- `lib/googleConfig.ts` dosyası runtime'da `Constants.expoConfig.extra` veya `process.env` üzerinden client id'leri okur.
- `components/GoogleSignInButton.tsx` örneği client id yoksa butonu devre-dışı bırakır ve kullanıcıya açıklayıcı hata gösterir. Bu, runtime crash'lerini engeller.

5) Test ve rebuild

- Metro'yu temiz başlatın:
```powershell
npx expo start -c --localhost
```
- Emülatör veya cihaz bağlayın ve Metro portunu reverse edin (eğer Metro 8081 kullanıyorsa):
```powershell
adb reverse tcp:8081 tcp:8081
```
- Native değişiklikler (Android client id/keystore) için tam yeniden derleyin:
```powershell
npx expo run:android
```

6) Notlar
- Expo Go bazı native Google Sign-In akışlarını desteklemez; native SDK'ların test edilmesi için `expo-dev-client` ya da standalone build gerekebilir.
- Client secrets veya token'ları repoya asla koymayın.
