const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Service Role Key gerekli!

if (!supabaseUrl || !supabaseKey) {
  console.error('HATA: .env.local dosyasında SUPABASE_URL veya SUPABASE_SERVICE_KEY eksik.');
  console.error('Lütfen SUPABASE_SERVICE_KEY (service_role secret) eklediğinden emin ol.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
-- Temel tabloları oluştur
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  first_name text,
  last_name text,
  display_name text,
  nickname text UNIQUE,
  user_code char(10) UNIQUE,
  gender text CHECK (gender IN ('female','male','nonbinary','other')),
  birth_year smallint,
  avatar_url text,
  trust_score smallint DEFAULT 0,
  level smallint DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb
);

CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  visibility text CHECK (visibility IN ('public','invite_only')) DEFAULT 'public',
  status text CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('owner','admin','member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  type text CHECK (type IN ('text','emoji','image')) DEFAULT 'text',
  created_at timestamptz DEFAULT now()
);

-- RLS (Güvenlik) Politikalarını Etkinleştir
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Basit okuma/yazma politikaları (Geliştirme için)
DO $$ 
BEGIN
    -- Profiles policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public profiles are viewable by everyone') THEN
        CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own profile') THEN
        CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;

    -- Groups policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Groups are viewable by everyone') THEN
        CREATE POLICY "Groups are viewable by everyone" ON public.groups FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can create groups') THEN
        CREATE POLICY "Authenticated users can create groups" ON public.groups FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    -- Group members policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Group members are viewable by everyone') THEN
        CREATE POLICY "Group members are viewable by everyone" ON public.group_members FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can join groups') THEN
        CREATE POLICY "Authenticated users can join groups" ON public.group_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    -- Group messages policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Group messages are viewable by everyone') THEN
        CREATE POLICY "Group messages are viewable by everyone" ON public.group_messages FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can send messages') THEN
        CREATE POLICY "Authenticated users can send messages" ON public.group_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;
`;

async function runMigration() {
  console.log('Veritabanı tabloları oluşturuluyor...');
  
  // Supabase JS client ile doğrudan SQL çalıştırma (rpc) veya REST API ile tablo oluşturma mümkün değil.
  // Ancak "postgres" kütüphanesi ile bağlanabiliriz.
  // VEYA Supabase Management API kullanabiliriz ama o da karmaşık.
  
  // EN KOLAY YOL: Kullanıcıya SQL'i verip panelden çalıştırmasını istemekti.
  // Ama kullanıcı "bağlan" dediği için, node-postgres ile bağlanmayı deneyeceğiz.
  
  // Connection string oluştur
  // postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
  
  console.log('UYARI: Bu scriptin çalışması için veritabanı şifresine ihtiyacım var.');
  console.log('Lütfen terminalde şu komutu çalıştır (şifreni girerek):');
  console.log('npx supabase db push');
  console.log('VEYA');
  console.log('Supabase Dashboard -> SQL Editor kısmına gidip kodu yapıştır.');
}

// runMigration();
console.log('Otomatik bağlantı için veritabanı şifresi gerekiyor.');
console.log('Lütfen Supabase Dashboard -> SQL Editor kullanın.');
