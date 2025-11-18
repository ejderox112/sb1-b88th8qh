export type NodeType = 'entrance' | 'elevator' | 'corridor' | 'room' | 'brand';

export interface Point2D {
  x: number;
  y: number;
}

export interface Floor {
  id: string;
  name: string;
  level: number; // 0 = ground, 1,2,3...
}

export interface Node {
  id: string;
  label?: string;
  type: NodeType;
  floorId: string;
  pos: Point2D; // meters in floor-local coords
}

export type EdgeKind = 'walk' | 'elevator' | 'stairs' | 'escalator';

export interface Edge {
  id: string;
  from: string; // nodeId
  to: string; // nodeId
  kind: EdgeKind;
  cost: number; // meters-equivalent
}

export interface Venue {
  id: string;
  name: string;
  floors: Floor[];
  nodes: Node[];
  edges: Edge[];
}

export interface DoorSign {
  nodeId: string; // room or brand node
  label: string; // e.g., Room 112 or XXX Firma
  isSponsored?: boolean;
  sponsor?: { name: string; logoUrl?: string };
}

export interface PathStep {
  nodeId: string;
  instruction: string;
}

export interface RouteResult {
  path: string[]; // nodeIds
  steps: PathStep[];
  distanceMeters: number;
}
