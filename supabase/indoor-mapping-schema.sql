-- İç Mekan Haritalandırma Sistemi için Supabase Tabloları
-- Admin: ejderha112@gmail.com

-- 1. İç Mekan Venue'ları (Hastane, AVM, vb.)
CREATE TABLE IF NOT EXISTS indoor_venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  floor_count INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Katlar (Her venue'nun katları)
CREATE TABLE IF NOT EXISTS indoor_floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES indoor_venues(id) ON DELETE CASCADE,
  floor_number INTEGER NOT NULL, -- 0=Zemin, 1=1.Kat, -1=Bodrum
  name TEXT NOT NULL,
  blueprint_url TEXT, -- Kroki JPG/PNG URL'i
  blueprint_width INTEGER, -- Kroki pixel genişliği
  blueprint_height INTEGER, -- Kroki pixel yüksekliği
  scale_meters_per_pixel DOUBLE PRECISION DEFAULT 0.1, -- 1 pixel = kaç metre
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(venue_id, floor_number)
);

-- 3. Noktalar (Odalar, Koridorlar, vb.)
CREATE TABLE IF NOT EXISTS indoor_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID REFERENCES indoor_floors(id) ON DELETE CASCADE,
  x DOUBLE PRECISION NOT NULL, -- Kroki üzerinde X koordinatı (pixel)
  y DOUBLE PRECISION NOT NULL, -- Kroki üzerinde Y koordinatı (pixel)
  type TEXT NOT NULL CHECK (type IN ('room', 'corridor', 'entrance', 'elevator', 'stairs', 'exit', 'poi')),
  label TEXT NOT NULL, -- Oda adı, koridor numarası, vb.
  description TEXT, -- Ek açıklama
  metadata JSONB DEFAULT '{}', -- Ek bilgiler (departman, telefon, vb.)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Bağlantılar/Kenarlar (Hangi noktalar birbirine bağlı)
CREATE TABLE IF NOT EXISTS indoor_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id UUID REFERENCES indoor_nodes(id) ON DELETE CASCADE,
  to_node_id UUID REFERENCES indoor_nodes(id) ON DELETE CASCADE,
  distance_meters DOUBLE PRECISION, -- Gerçek mesafe (metre)
  is_bidirectional BOOLEAN DEFAULT true, -- İki yönlü mü?
  traversal_type TEXT DEFAULT 'walk' CHECK (traversal_type IN ('walk', 'elevator', 'stairs', 'escalator')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_node_id, to_node_id)
);

-- 5. Kullanıcı Hareket Geçmişi (GPS Tracking - opsiyonel)
CREATE TABLE IF NOT EXISTS indoor_tracking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  venue_id UUID REFERENCES indoor_venues(id),
  floor_id UUID REFERENCES indoor_floors(id),
  x DOUBLE PRECISION,
  y DOUBLE PRECISION,
  heading DOUBLE PRECISION, -- Pusula yönü (derece)
  accuracy DOUBLE PRECISION, -- GPS doğruluğu (metre)
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- 6. Admin Yetkileri Tablosu
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'editor')),
  permissions JSONB DEFAULT '{"can_create_venues": true, "can_edit_venues": true, "can_delete_venues": true}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- İlk admin kullanıcısını ekle (ejderha112@gmail.com)
-- NOT: Bu insert gerçek user_id ile yapılmalı
-- INSERT INTO admin_users (email, role) 
-- VALUES ('ejderha112@gmail.com', 'super_admin')
-- ON CONFLICT (email) DO NOTHING;

-- Index'ler (Performans için)
CREATE INDEX IF NOT EXISTS idx_indoor_floors_venue ON indoor_floors(venue_id);
CREATE INDEX IF NOT EXISTS idx_indoor_nodes_floor ON indoor_nodes(floor_id);
CREATE INDEX IF NOT EXISTS idx_indoor_nodes_type ON indoor_nodes(type);
CREATE INDEX IF NOT EXISTS idx_indoor_edges_from ON indoor_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_indoor_edges_to ON indoor_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_tracking_logs_user ON indoor_tracking_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_logs_venue ON indoor_tracking_logs(venue_id, timestamp DESC);

-- RLS Politikaları
ALTER TABLE indoor_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE indoor_floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE indoor_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE indoor_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE indoor_tracking_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Herkes venue'ları okuyabilir (public erişim)
CREATE POLICY "Anyone can read venues" ON indoor_venues
  FOR SELECT USING (true);

-- Herkes katları okuyabilir
CREATE POLICY "Anyone can read floors" ON indoor_floors
  FOR SELECT USING (true);

-- Herkes noktaları okuyabilir
CREATE POLICY "Anyone can read nodes" ON indoor_nodes
  FOR SELECT USING (true);

-- Herkes bağlantıları okuyabilir
CREATE POLICY "Anyone can read edges" ON indoor_edges
  FOR SELECT USING (true);

-- Sadece admin'ler venue oluşturabilir
CREATE POLICY "Admins can create venues" ON indoor_venues
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() AND email = 'ejderha112@gmail.com'
    )
  );

-- Sadece admin'ler venue güncelleyebilir
CREATE POLICY "Admins can update venues" ON indoor_venues
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() AND email = 'ejderha112@gmail.com'
    )
  );

-- Sadece admin'ler venue silebilir
CREATE POLICY "Admins can delete venues" ON indoor_venues
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() AND email = 'ejderha112@gmail.com'
    )
  );

-- Kat CRUD politikaları (admin only)
CREATE POLICY "Admins can manage floors" ON indoor_floors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() AND email = 'ejderha112@gmail.com'
    )
  );

-- Nokta CRUD politikaları (admin only)
CREATE POLICY "Admins can manage nodes" ON indoor_nodes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() AND email = 'ejderha112@gmail.com'
    )
  );

-- Bağlantı CRUD politikaları (admin only)
CREATE POLICY "Admins can manage edges" ON indoor_edges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() AND email = 'ejderha112@gmail.com'
    )
  );

-- Tracking logs - kullanıcılar sadece kendi loglarını görebilir
CREATE POLICY "Users can read own tracking logs" ON indoor_tracking_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracking logs" ON indoor_tracking_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin kullanıcıları sadece kendileri okuyabilir
CREATE POLICY "Admins can read own admin data" ON admin_users
  FOR SELECT USING (auth.uid() = user_id);

-- Grants
GRANT SELECT ON indoor_venues TO anon, authenticated;
GRANT SELECT ON indoor_floors TO anon, authenticated;
GRANT SELECT ON indoor_nodes TO anon, authenticated;
GRANT SELECT ON indoor_edges TO anon, authenticated;

GRANT ALL ON indoor_venues TO authenticated;
GRANT ALL ON indoor_floors TO authenticated;
GRANT ALL ON indoor_nodes TO authenticated;
GRANT ALL ON indoor_edges TO authenticated;
GRANT ALL ON indoor_tracking_logs TO authenticated;
GRANT SELECT ON admin_users TO authenticated;

-- Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_indoor_venues_updated_at BEFORE UPDATE ON indoor_venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_indoor_floors_updated_at BEFORE UPDATE ON indoor_floors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_indoor_nodes_updated_at BEFORE UPDATE ON indoor_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Örnek Veri: İzmir Şehir Hastanesi (demo için)
-- INSERT INTO indoor_venues (name, address, latitude, longitude, floor_count)
-- VALUES ('İzmir Şehir Hastanesi', 'Başak Mah. 1756/1 Sok. No:1 Bayraklı/İzmir', 38.4613, 27.2069, 3);
