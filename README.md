# 🚀 Bolt Expo Starter

Bu proje, [Expo](https://expo.dev/) ve [React Native](https://reactnative.dev/) kullanılarak oluşturulmuş bir mobil uygulama başlangıç şablonudur. Modern UI bileşenleri, navigasyon, harita ve Supabase entegrasyonu gibi birçok özelliği içerir.

## 🔗 Projeyi StackBlitz'te Aç

[StackBlitz ile düzenle ⚡️](https://stackblitz.com/~/github.com/ejderox112/sb1-b88th8qh)

## 📦 Kurulum

```bash
git clone https://github.com/ejderox112/sb1-b88th8qh.git
cd sb1-b88th8qh
npm install --legacy-peer-deps
```

## 🗃️ Supabase Kurulumu

Supabase projenizi kurduktan sonra, veritabanı tablolarınız için yetkileri ayarlamanız gerekebilir. Aşağıdaki SQL sorgularını Supabase projenizdeki SQL düzenleyicisinde çalıştırabilirsiniz:

```sql
-- "anon" rolü için sadece okuma yetkisi verir
grant select on table api.<your_table> to anon;

-- "authenticated" (giriş yapmış) kullanıcılar için tüm yetkileri verir
grant select, insert, update, delete on table api.<your_table> to authenticated;
```

## ⚙️ Supabase Ortam Değerleri

Uygulamanın oturum açma ve profil oluşturma akışları çalışabilmesi için hem URL hem de anon anahtarının tanımlı olması gerekir. Aşağıdaki adımları izleyin:

1. Supabase projenizde **Project Settings → API** sayfasına gidin.
2. `Project URL` ve `anon` key değerlerini kopyalayın.
3. Expo uygulamasına iki şekilde aktarabilirsiniz:

**app.json / app.config.ts**

```json
{
	"expo": {
		"extra": {
			"EXPO_PUBLIC_SUPABASE_URL": "https://<project>.supabase.co",
			"EXPO_PUBLIC_SUPABASE_ANON_KEY": "<anon-key>"
		}
	}
}
```

**.env.local** (Metro/Expo CLI’yı yeniden başlatmayı unutmayın)

```env
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

Bu değerler olmadan uygulama “Supabase yapılandırılmadı” uyarısı gösterir ve profil kaydedemez.

## 🛰️ Yakın Kullanıcı Migrasyonları

`live_locations` ve yeni medya tabloları için Supabase CLI ile migrasyonları çalıştırın:

```bash
npm run supabase:migrate
```

Komut, `supabase/migrations` klasöründeki dosyaları veritabanınıza uygular. Çakışma yaşarsanız CLI’nin yönlendirmelerini izleyin ve ardından uygulamayı yeniden başlatın.
