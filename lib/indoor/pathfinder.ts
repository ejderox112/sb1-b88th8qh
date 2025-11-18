import type { Venue, RouteResult } from './types';

function euclidean(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x + 0 - b.x;
  const dy = a.y + 0 - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function findRoute(venue: Venue, startNodeId: string, endNodeId: string): RouteResult | null {
  if (startNodeId === endNodeId) {
    return { path: [startNodeId], steps: [{ nodeId: startNodeId, instruction: 'Başlangıç noktasındasınız' }], distanceMeters: 0 };
  }

  const nodes = new Map(venue.nodes.map(n => [n.id, n]));
  const neighbors = new Map<string, Array<{ to: string; cost: number; kind: string }>>();
  for (const e of venue.edges) {
    if (!neighbors.has(e.from)) neighbors.set(e.from, []);
    if (!neighbors.has(e.to)) neighbors.set(e.to, []);
    neighbors.get(e.from)!.push({ to: e.to, cost: e.cost, kind: e.kind });
    neighbors.get(e.to)!.push({ to: e.from, cost: e.cost, kind: e.kind });
  }

  const open = new Set<string>([startNodeId]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  for (const n of nodes.keys()) {
    gScore.set(n, Infinity);
    fScore.set(n, Infinity);
  }
  gScore.set(startNodeId, 0);
  const start = nodes.get(startNodeId)!;
  const end = nodes.get(endNodeId)!;
  fScore.set(startNodeId, euclidean(start.pos, end.pos));

  function getLowestF(): string | null {
    let best: string | null = null;
    let bestVal = Infinity;
    for (const n of open) {
      const v = fScore.get(n)!;
      if (v < bestVal) { bestVal = v; best = n; }
    }
    return best;
  }

  while (open.size) {
    const current = getLowestF();
    if (!current) break;
    if (current === endNodeId) {
      // Reconstruct path
      const path: string[] = [current];
      let cur = current;
      while (cameFrom.has(cur)) {
        cur = cameFrom.get(cur)!;
        path.push(cur);
      }
      path.reverse();

      // Build steps and distance
      let distance = 0;
      const steps = path.map((nid, idx) => {
        const node = nodes.get(nid)!;
        if (idx === 0) return { nodeId: nid, instruction: 'Giriş: ' + (node.label ?? node.type) };
        const prev = nodes.get(path[idx - 1])!;
        const edge = venue.edges.find(e => (e.from === prev.id && e.to === node.id) || (e.to === prev.id && e.from === node.id));
        const kind = edge?.kind ?? 'walk';
        const delta = euclidean(prev.pos, node.pos);
        distance += edge?.cost ?? delta;
        if (kind === 'elevator') return { nodeId: nid, instruction: `Asansöre bin ve ${node.label ?? 'hedef kata'} çık` };
        if (node.type === 'room') return { nodeId: nid, instruction: `${node.label ?? 'Oda'} önündesin` };
        if (node.type === 'brand') return { nodeId: nid, instruction: `${node.label ?? 'Firma'} yanından geç` };
        return { nodeId: nid, instruction: `${Math.round(delta)} m ilerle` };
      });
      return { path, steps, distanceMeters: Math.round(distance) };
    }

    open.delete(current);
    const curG = gScore.get(current)!;

    for (const nb of neighbors.get(current) ?? []) {
      const tentative = curG + nb.cost;
      if (tentative < gScore.get(nb.to)!) {
        cameFrom.set(nb.to, current);
        gScore.set(nb.to, tentative);
        const h = euclidean(nodes.get(nb.to)!.pos, end.pos);
        fScore.set(nb.to, tentative + h);
        if (!open.has(nb.to)) open.add(nb.to);
      }
    }
  }

  return null;
}
