// İzmir Şehir Hastanesi - Mock Veri Örneği

import {
  Building,
  Floor,
  NavigationNode,
  NavigationPath,
  BuildingEntrance,
} from '../types/indoorNavigation';

// İzmir Şehir Hastanesi Ana Verisi
export const izmirSehirHastanesi: Building = {
  id: 'building-izmir-sehir-hastanesi',
  name: 'İzmir Şehir Hastanesi',
  type: 'hospital',
  address: 'Başak Mahallesi, 1140/1. Sokak, Bayraklı, İzmir',
  latitude: 38.4613,
  longitude: 27.2069,
  floors: [],
  entrances: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Ana Giriş
const mainEntrance: BuildingEntrance = {
  id: 'entrance-main',
  building_id: izmirSehirHastanesi.id,
  name: 'Ana Giriş',
  latitude: 38.4613,
  longitude: 27.2069,
  floor_id: 'floor-ground',
  node_id: 'node-entrance-main',
  is_main: true,
  accessibility: true,
};

const emergencyEntrance: BuildingEntrance = {
  id: 'entrance-emergency',
  building_id: izmirSehirHastanesi.id,
  name: 'Acil Giriş',
  latitude: 38.4615,
  longitude: 27.2071,
  floor_id: 'floor-ground',
  node_id: 'node-entrance-emergency',
  is_main: false,
  accessibility: true,
};

izmirSehirHastanesi.entrances = [mainEntrance, emergencyEntrance];

// ===== ZEMİN KAT =====
const groundFloorNodes: NavigationNode[] = [
  {
    id: 'node-entrance-main',
    floor_id: 'floor-ground',
    type: 'entrance',
    name: 'Ana Giriş',
    x: 10,
    y: 10,
    latitude: 38.4613,
    longitude: 27.2069,
    metadata: { description: 'Hastane ana giriş kapısı', is_accessible: true },
  },
  {
    id: 'node-ground-junction1',
    floor_id: 'floor-ground',
    type: 'junction',
    name: 'Ana Koridor Kavşağı',
    x: 30,
    y: 10,
  },
  {
    id: 'node-ground-elevator1',
    floor_id: 'floor-ground',
    type: 'elevator',
    name: 'Asansör 1',
    x: 50,
    y: 10,
    metadata: { capacity: 8, wait_time_seconds: 30 },
  },
  {
    id: 'node-ground-info',
    floor_id: 'floor-ground',
    type: 'room',
    name: 'Bilgi Danışma',
    x: 30,
    y: 20,
    metadata: { department: 'Bilgi Danışma' },
  },
];

const groundFloorPaths: NavigationPath[] = [
  {
    id: 'path-1',
    from_node_id: 'node-entrance-main',
    to_node_id: 'node-ground-junction1',
    distance_meters: 20,
    path_type: 'corridor',
    duration_seconds: 24, // ~5 km/h yürüyüş hızı
    is_bidirectional: true,
    accessibility: true,
  },
  {
    id: 'path-2',
    from_node_id: 'node-ground-junction1',
    to_node_id: 'node-ground-elevator1',
    distance_meters: 20,
    path_type: 'corridor',
    duration_seconds: 24,
    is_bidirectional: true,
    accessibility: true,
  },
  {
    id: 'path-3',
    from_node_id: 'node-ground-junction1',
    to_node_id: 'node-ground-info',
    distance_meters: 10,
    path_type: 'corridor',
    duration_seconds: 12,
    is_bidirectional: true,
    accessibility: true,
  },
];

const groundFloor: Floor = {
  id: 'floor-ground',
  building_id: izmirSehirHastanesi.id,
  floor_number: 0,
  floor_name: 'Zemin Kat',
  nodes: groundFloorNodes,
  paths: groundFloorPaths,
};

// ===== 3. KAT =====
const floor3Nodes: NavigationNode[] = [
  {
    id: 'node-floor3-elevator1',
    floor_id: 'floor-3',
    type: 'elevator',
    name: 'Asansör 1 (3. Kat)',
    x: 50,
    y: 10,
  },
  {
    id: 'node-floor3-junction1',
    floor_id: 'floor-3',
    type: 'junction',
    name: '3. Kat Ana Koridor',
    x: 70,
    y: 10,
  },
  {
    id: 'node-floor3-corridor1',
    floor_id: 'floor-3',
    type: 'corridor',
    name: 'A Koridoru',
    x: 90,
    y: 10,
  },
  {
    id: 'node-floor3-room112',
    floor_id: 'floor-3',
    type: 'room',
    name: 'Dahiliye Polikliniği',
    x: 110,
    y: 10,
    metadata: {
      room_number: '112',
      department: 'Dahiliye',
      description: '112 numaralı muayene odası',
    },
  },
  {
    id: 'node-floor3-room115',
    floor_id: 'floor-3',
    type: 'room',
    name: 'Kardiyoloji Polikliniği',
    x: 110,
    y: 30,
    metadata: {
      room_number: '115',
      department: 'Kardiyoloji',
    },
  },
];

const floor3Paths: NavigationPath[] = [
  {
    id: 'path-floor3-1',
    from_node_id: 'node-floor3-elevator1',
    to_node_id: 'node-floor3-junction1',
    distance_meters: 15,
    path_type: 'corridor',
    duration_seconds: 18,
    is_bidirectional: true,
    accessibility: true,
  },
  {
    id: 'path-floor3-2',
    from_node_id: 'node-floor3-junction1',
    to_node_id: 'node-floor3-corridor1',
    distance_meters: 20,
    path_type: 'corridor',
    duration_seconds: 24,
    is_bidirectional: true,
    accessibility: true,
  },
  {
    id: 'path-floor3-3',
    from_node_id: 'node-floor3-corridor1',
    to_node_id: 'node-floor3-room112',
    distance_meters: 10,
    path_type: 'corridor',
    duration_seconds: 12,
    is_bidirectional: true,
    accessibility: true,
  },
  {
    id: 'path-floor3-4',
    from_node_id: 'node-floor3-junction1',
    to_node_id: 'node-floor3-room115',
    distance_meters: 25,
    path_type: 'corridor',
    duration_seconds: 30,
    is_bidirectional: true,
    accessibility: true,
  },
];

// Asansör bağlantısı (Zemin Kat -> 3. Kat)
const elevatorConnection: NavigationPath = {
  id: 'path-elevator-ground-to-3',
  from_node_id: 'node-ground-elevator1',
  to_node_id: 'node-floor3-elevator1',
  distance_meters: 0, // Dikey hareket
  path_type: 'elevator',
  duration_seconds: 45, // Asansör bekleme + seyahat süresi
  is_bidirectional: true,
  accessibility: true,
};

// Asansör bağlantısını ground floor paths'e ekle
groundFloorPaths.push(elevatorConnection);

const floor3: Floor = {
  id: 'floor-3',
  building_id: izmirSehirHastanesi.id,
  floor_number: 3,
  floor_name: '3. Kat',
  nodes: floor3Nodes,
  paths: floor3Paths,
};

// Katları binaya ekle
izmirSehirHastanesi.floors = [groundFloor, floor3];

// Hızlı arama fonksiyonları
export function findRoomByNumber(roomNumber: string): NavigationNode | null {
  for (const floor of izmirSehirHastanesi.floors) {
    const room = floor.nodes.find(
      (node) => node.metadata?.room_number === roomNumber
    );
    if (room) return room;
  }
  return null;
}

export function findNodeById(nodeId: string): NavigationNode | null {
  for (const floor of izmirSehirHastanesi.floors) {
    const node = floor.nodes.find((n) => n.id === nodeId);
    if (node) return node;
  }
  return null;
}

// Örnek kullanım: Ana girişten 112 numaralı odaya rota
export function getRouteToRoom112() {
  const startNode = 'node-entrance-main';
  const room112 = findRoomByNumber('112');
  
  if (!room112) {
    console.error('112 numaralı oda bulunamadı');
    return null;
  }

  return {
    startNodeId: startNode,
    endNodeId: room112.id,
    destination: room112,
  };
}
