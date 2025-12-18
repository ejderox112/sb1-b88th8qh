export function findPathBfs(
  nodes: Array<{ id: string }>,
  edges: Array<{ from_node: string; to_node: string; bidirectional?: boolean }>,
  startId: string,
  targetId: string
): string[] {
  if (startId === targetId) return [startId];
  const adj = new Map<string, Set<string>>();
  edges.forEach((e) => {
    if (!adj.has(e.from_node)) adj.set(e.from_node, new Set());
    adj.get(e.from_node)!.add(e.to_node);
    if (e.bidirectional !== false) {
      if (!adj.has(e.to_node)) adj.set(e.to_node, new Set());
      adj.get(e.to_node)!.add(e.from_node);
    }
  });
  const visited = new Set<string>();
  const queue: Array<string> = [];
  const parent = new Map<string, string | null>();
  queue.push(startId);
  visited.add(startId);
  parent.set(startId, null);
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === targetId) break;
    const neighbors = adj.get(cur);
    if (!neighbors) continue;
    neighbors.forEach((n) => {
      if (!visited.has(n)) {
        visited.add(n);
        parent.set(n, cur);
        queue.push(n);
      }
    });
  }
  if (!visited.has(targetId)) return [];
  const path: string[] = [];
  let cur: string | null = targetId;
  while (cur) {
    path.unshift(cur);
    cur = parent.get(cur) ?? null;
  }
  return path;
}
