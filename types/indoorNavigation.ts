// İç Mekan Navigasyon Veri Modelleri

export type LocationType = 'hospital' | 'mall' | 'office' | 'university' | 'airport' | 'other';
export type NodeType = 'entrance' | 'elevator' | 'escalator' | 'stairs' | 'room' | 'corridor' | 'junction' | 'exit' | 'parking';
export type PathType = 'corridor' | 'stairs' | 'elevator' | 'escalator' | 'outdoor';

// Bina/Kompleks Tanımı
export interface Building {
  id: string;
  name: string;
  type: LocationType;
  address: string;
  latitude: number;
  longitude: number;
  floors: Floor[];
  entrances: BuildingEntrance[];
  created_at: string;
  updated_at: string;
}

// Kat Tanımı
export interface Floor {
  id: string;
  building_id: string;
  floor_number: number; // -2, -1, 0, 1, 2, 3... (zemin kat = 0)
  floor_name: string; // "Zemin Kat", "1. Kat", "Bodrum -1"
  map_image_url?: string; // Kat planı görseli
  nodes: NavigationNode[];
  paths: NavigationPath[];
}

// Giriş Kapısı
export interface BuildingEntrance {
  id: string;
  building_id: string;
  name: string; // "Ana Giriş", "Acil Giriş", "Otopark Girişi"
  latitude: number;
  longitude: number;
  floor_id: string;
  node_id: string; // İlk navigasyon noktası
  is_main: boolean;
  accessibility: boolean; // Engelli erişimi
}

// Navigasyon Noktası (Node)
export interface NavigationNode {
  id: string;
  floor_id: string;
  type: NodeType;
  name: string;
  x: number; // Kat planındaki X koordinatı (metre veya piksel)
  y: number; // Kat planındaki Y koordinatı
  latitude?: number; // GPS koordinatı (varsa)
  longitude?: number;
  metadata?: NodeMetadata;
}

// Node Metadata
export interface NodeMetadata {
  room_number?: string; // "112", "A-205"
  department?: string; // "Radyoloji", "Elektronik Mağazaları"
  company_name?: string; // "ABC Firması", "XYZ Mağazası"
  description?: string;
  image_url?: string;
  is_accessible?: boolean; // Engelli erişimi
  capacity?: number; // Asansör kapasitesi vb.
  wait_time_seconds?: number; // Ortalama bekleme süresi (asansör için)
}

// Navigasyon Yolu (Path/Edge)
export interface NavigationPath {
  id: string;
  from_node_id: string;
  to_node_id: string;
  distance_meters: number; // Metre cinsinden mesafe
  path_type: PathType;
  duration_seconds: number; // Tahmini geçiş süresi
  is_bidirectional: boolean; // İki yönlü mü?
  accessibility: boolean; // Engelli erişimi var mı?
  coordinates?: PathCoordinate[]; // Detaylı yol koordinatları
}

// Yol Koordinatları (curved path için)
export interface PathCoordinate {
  x: number;
  y: number;
  floor_id?: string; // Kat değişimi varsa
}

// Hesaplanmış Rota
export interface NavigationRoute {
  id: string;
  start_node_id: string;
  end_node_id: string;
  total_distance_meters: number;
  total_duration_seconds: number;
  steps: RouteStep[];
  created_at: string;
}

// Rota Adımı
export interface RouteStep {
  step_number: number;
  node: NavigationNode;
  instruction: string; // "Ana girişten girin", "Asansöre binin", "3. kata çıkın"
  distance_meters: number; // Bu adımın mesafesi
  duration_seconds: number; // Bu adımın süresi
  path_type: PathType;
  floor_change?: {
    from_floor: number;
    to_floor: number;
    method: 'elevator' | 'escalator' | 'stairs';
  };
}

// Canlı Navigasyon State
export interface LiveNavigation {
  route: NavigationRoute;
  current_step_index: number;
  current_position: {
    node_id: string;
    floor_id: string;
    latitude?: number;
    longitude?: number;
  };
  is_active: boolean;
  started_at: string;
  estimated_arrival?: string;
  distance_remaining_meters: number;
  steps_remaining: number;
}

// Kullanıcı Navigasyon Geçmişi
export interface UserNavigationHistory {
  id: string;
  user_id: string;
  route: NavigationRoute;
  started_at: string;
  completed_at?: string;
  was_successful: boolean;
  actual_duration_seconds?: number;
  rating?: number; // 1-5 yıldız
  feedback?: string;
}

// Örnek: İzmir Şehir Hastanesi - 112 Numaralı Oda
export interface HospitalRoomDestination {
  building_id: string;
  room_number: string; // "112"
  department: string; // "Dahiliye", "Kardiyoloji"
  floor_number: number;
  node_id: string;
  doctor_name?: string;
  appointment_time?: string;
}
