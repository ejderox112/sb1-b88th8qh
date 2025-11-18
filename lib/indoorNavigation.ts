// İç Mekan Navigasyon Algoritmaları ve Yardımcı Fonksiyonlar

import {
  NavigationNode,
  NavigationPath,
  NavigationRoute,
  RouteStep,
  Floor,
  PathType,
} from '../types/indoorNavigation';

// Graph yapısı için Node
interface GraphNode {
  id: string;
  node: NavigationNode;
  neighbors: { nodeId: string; path: NavigationPath }[];
}

// Dijkstra Algorithm - En kısa rota bulma
export function findShortestRoute(
  startNodeId: string,
  endNodeId: string,
  floors: Floor[]
): NavigationRoute | null {
  // Graph oluştur
  const graph = buildGraph(floors);
  
  if (!graph[startNodeId] || !graph[endNodeId]) {
    console.error('Başlangıç veya bitiş noktası bulunamadı');
    return null;
  }

  // Dijkstra ile en kısa yol
  const { distances, previous } = dijkstra(graph, startNodeId);

  if (distances[endNodeId] === Infinity) {
    console.error('Hedefe ulaşan bir yol bulunamadı');
    return null;
  }

  // Yolu oluştur
  const path = reconstructPath(previous, startNodeId, endNodeId);
  const steps = createRouteSteps(path, graph, floors);

  return {
    id: `route-${Date.now()}`,
    start_node_id: startNodeId,
    end_node_id: endNodeId,
    total_distance_meters: distances[endNodeId],
    total_duration_seconds: calculateTotalDuration(steps),
    steps,
    created_at: new Date().toISOString(),
  };
}

// Graph Builder
function buildGraph(floors: Floor[]): Record<string, GraphNode> {
  const graph: Record<string, GraphNode> = {};

  floors.forEach((floor) => {
    floor.nodes.forEach((node) => {
      graph[node.id] = {
        id: node.id,
        node,
        neighbors: [],
      };
    });

    floor.paths.forEach((path) => {
      if (graph[path.from_node_id]) {
        graph[path.from_node_id].neighbors.push({
          nodeId: path.to_node_id,
          path,
        });
      }

      if (path.is_bidirectional && graph[path.to_node_id]) {
        graph[path.to_node_id].neighbors.push({
          nodeId: path.from_node_id,
          path,
        });
      }
    });
  });

  return graph;
}

// Dijkstra Algoritması
function dijkstra(
  graph: Record<string, GraphNode>,
  startId: string
): {
  distances: Record<string, number>;
  previous: Record<string, string | null>;
} {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  // Initialize
  Object.keys(graph).forEach((nodeId) => {
    distances[nodeId] = Infinity;
    previous[nodeId] = null;
    unvisited.add(nodeId);
  });
  distances[startId] = 0;

  while (unvisited.size > 0) {
    // En küçük mesafeli node'u bul
    let currentId: string | null = null;
    let minDistance = Infinity;

    unvisited.forEach((nodeId) => {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        currentId = nodeId;
      }
    });

    if (currentId === null || minDistance === Infinity) break;

    unvisited.delete(currentId);

    // Komşuları güncelle
    graph[currentId].neighbors.forEach(({ nodeId, path }) => {
      const alt = distances[currentId!] + path.distance_meters;
      if (alt < distances[nodeId]) {
        distances[nodeId] = alt;
        previous[nodeId] = currentId;
      }
    });
  }

  return { distances, previous };
}

// Yolu yeniden oluştur
function reconstructPath(
  previous: Record<string, string | null>,
  startId: string,
  endId: string
): string[] {
  const path: string[] = [];
  let current: string | null = endId;

  while (current !== null) {
    path.unshift(current);
    if (current === startId) break;
    current = previous[current];
  }

  return path;
}

// Rota adımlarını oluştur
function createRouteSteps(
  path: string[],
  graph: Record<string, GraphNode>,
  floors: Floor[]
): RouteStep[] {
  const steps: RouteStep[] = [];

  for (let i = 0; i < path.length; i++) {
    const nodeId = path[i];
    const node = graph[nodeId].node;
    const nextNodeId = path[i + 1];

    let pathInfo: NavigationPath | undefined;
    let distance = 0;
    let duration = 0;
    let pathType: PathType = 'corridor';

    if (nextNodeId) {
      const neighbor = graph[nodeId].neighbors.find(
        (n) => n.nodeId === nextNodeId
      );
      if (neighbor) {
        pathInfo = neighbor.path;
        distance = pathInfo.distance_meters;
        duration = pathInfo.duration_seconds;
        pathType = pathInfo.path_type;
      }
    }

    const instruction = generateInstruction(node, nextNodeId ? graph[nextNodeId].node : null, i === 0, i === path.length - 1);

    steps.push({
      step_number: i + 1,
      node,
      instruction,
      distance_meters: distance,
      duration_seconds: duration,
      path_type: pathType,
    });
  }

  return steps;
}

// Talimat oluştur
function generateInstruction(
  currentNode: NavigationNode,
  nextNode: NavigationNode | null,
  isFirst: boolean,
  isLast: boolean
): string {
  if (isFirst) {
    if (currentNode.type === 'entrance') {
      return `${currentNode.name} girişinden başlayın`;
    }
    return `${currentNode.name} noktasından başlayın`;
  }

  if (isLast) {
    if (currentNode.type === 'room' && currentNode.metadata?.room_number) {
      return `${currentNode.metadata.room_number} numaralı ${currentNode.name} odaya ulaştınız`;
    }
    return `${currentNode.name} noktasına ulaştınız`;
  }

  switch (currentNode.type) {
    case 'elevator':
      if (nextNode) {
        return `Asansöre binin ve ${getFloorName(nextNode)} gidin`;
      }
      return `Asansöre binin`;
    
    case 'escalator':
      return `Yürüyen merdiveni kullanın`;
    
    case 'stairs':
      if (nextNode) {
        return `Merdivenleri kullanarak ${getFloorName(nextNode)} çıkın`;
      }
      return `Merdivenleri kullanın`;
    
    case 'junction':
      return `${currentNode.name} kavşağından devam edin`;
    
    case 'corridor':
      return `Koridoru takip edin`;
    
    default:
      return `${currentNode.name} üzerinden devam edin`;
  }
}

// Kat ismini al
function getFloorName(node: NavigationNode): string {
  // Floor bilgisi node'dan alınabilir (ek metadata gerekebilir)
  return 'hedefe';
}

// Toplam süre hesaplama
function calculateTotalDuration(steps: RouteStep[]): number {
  return steps.reduce((total, step) => total + step.duration_seconds, 0);
}

// Mesafe formatlama
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// Süre formatlama
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (minutes === 0) {
    return `${secs} saniye`;
  }
  
  if (secs === 0) {
    return `${minutes} dakika`;
  }
  
  return `${minutes} dk ${secs} sn`;
}

// İki nokta arası düz mesafe (Euclidean)
export function calculateEuclideanDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// GPS koordinatları arası mesafe (Haversine formula)
export function calculateGPSDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Dünya yarıçapı (metre)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // metre cinsinden
}

// En yakın girişi bul (kullanıcının mevcut konumuna göre)
export function findNearestEntrance(
  userLat: number,
  userLon: number,
  building: any // Building type
): any | null {
  let nearest = null;
  let minDistance = Infinity;

  building.entrances.forEach((entrance: any) => {
    const distance = calculateGPSDistance(
      userLat,
      userLon,
      entrance.latitude,
      entrance.longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = entrance;
    }
  });

  return nearest;
}
