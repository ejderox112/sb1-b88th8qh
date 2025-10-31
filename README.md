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
