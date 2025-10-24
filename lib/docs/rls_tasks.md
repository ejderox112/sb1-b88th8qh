# RLS Politikaları — `tasks` Tablosu

Bu doküman, Supabase üzerinde tanımlanan `tasks` tablosu için Row Level Security (RLS) politikalarını açıklar. Amaç, kullanıcıların sadece kendi görevlerine erişmesini sağlamak ve admin rolüne tam yetki vermektir.

---

## 🧱 Tablo Yapısı

| Sütun Adı        | Tipi     | Açıklama |
|------------------|----------|----------|
| `id`             | `uuid`   | Görev kimliği |
| `title`          | `text`   | Görev başlığı |
| `owner_user_id`  | `uuid`   | Görevi oluşturan kullanıcı |
| `tenant_id`      | `uuid`   | Görevin ait olduğu tenant |

---

## 🔐 JWT Claim Yapısı

RLS politikaları aşağıdaki JWT claim’lerini kullanır:

- `auth.uid()` → oturum açmış kullanıcının UUID’si  
- `auth.jwt() ->> 'user_role'` → kullanıcının rolü (`admin`, `user`, vb.)  
- `auth.jwt() ->> 'tenant_id'` → kullanıcının ait olduğu tenant UUID’si

---

## 📜 Tanımlanan Politikalar

### 1. `tasks_select_owner_or_tenant_admin`

```sql
FOR SELECT
USING (
  (auth.jwt() ->> 'user_role') = 'admin'
  OR (
    tenant_id IS NOT NULL
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND owner_user_id = auth.uid()
  )
)
