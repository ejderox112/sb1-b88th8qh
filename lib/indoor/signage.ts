import type { Venue, DoorSign } from './types';

export function getNearbyDoorSigns(
  venue: Venue,
  doorSigns: DoorSign[],
  currentNodeId: string,
  radiusMeters = 12
) {
  const current = venue.nodes.find(n => n.id === currentNodeId);
  if (!current) return [] as Array<DoorSign & { distance: number }>;

  const result: Array<DoorSign & { distance: number }> = [];
  for (const ds of doorSigns) {
    const node = venue.nodes.find(n => n.id === ds.nodeId);
    if (!node) continue;
    if (node.floorId !== current.floorId) continue;
    const dx = node.pos.x - current.pos.x;
    const dy = node.pos.y - current.pos.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= radiusMeters) {
      result.push({ ...ds, distance: Math.round(d) });
    }
  }
  // sort sponsored first, then by distance
  result.sort((a, b) => Number(Boolean(b.isSponsored)) - Number(Boolean(a.isSponsored)) || a.distance - b.distance);
  return result;
}
