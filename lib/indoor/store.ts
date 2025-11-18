import { izmirHospital, izmirDoorSigns } from './mockVenue';
import type { Venue, Node, Edge, DoorSign } from './types';

export type SuggestionType = 'room' | 'corridor' | 'brand' | 'signage';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

export interface IndoorSuggestion {
  id: string;
  venueId: string;
  floorId: string;
  type: SuggestionType;
  label: string;
  pos: { x: number; y: number };
  photoUrl?: string;
  submittedBy: string; // user id or code
  status: SuggestionStatus;
  createdAt: number;
}

const baseVenues: Record<string, Venue> = {
  [izmirHospital.id]: izmirHospital,
};

const baseDoorSigns: Record<string, DoorSign[]> = {
  [izmirHospital.id]: izmirDoorSigns,
};

const dynamicNodes: Record<string, Node[]> = {};
const dynamicEdges: Record<string, Edge[]> = {};
const dynamicDoorSigns: Record<string, DoorSign[]> = {};
const suggestions: IndoorSuggestion[] = [];

export function getActiveVenue(venueId: string): Venue | null {
  const base = baseVenues[venueId];
  if (!base) return null;
  const extraNodes = dynamicNodes[venueId] ?? [];
  const extraEdges = dynamicEdges[venueId] ?? [];
  return {
    ...base,
    nodes: [...base.nodes, ...extraNodes],
    edges: [...base.edges, ...extraEdges],
  };
}

export function getDoorSigns(venueId: string): DoorSign[] {
  return [
    ...(baseDoorSigns[venueId] ?? []),
    ...(dynamicDoorSigns[venueId] ?? []),
  ];
}

export function submitSuggestion(s: Omit<IndoorSuggestion, 'id' | 'status' | 'createdAt'>) {
  const id = 'sugg-' + Math.random().toString(36).slice(2, 9);
  const full: IndoorSuggestion = { ...s, id, status: 'pending', createdAt: Date.now() };
  suggestions.unshift(full);
  return full;
}

export function listSuggestions(status?: SuggestionStatus) {
  return status ? suggestions.filter(s => s.status === status) : [...suggestions];
}

export function approveSuggestion(id: string) {
  const s = suggestions.find(x => x.id === id);
  if (!s) return false;
  s.status = 'approved';
  // apply to dynamic store
  if (!dynamicNodes[s.venueId]) dynamicNodes[s.venueId] = [];
  const nodeId = `${s.type}-${s.label.replace(/\s+/g, '-')}-${Date.now()}`;
  const typeMap: any = { room: 'room', corridor: 'corridor', brand: 'brand', signage: 'room' };
  const node: Node = {
    id: nodeId,
    label: s.label,
    type: typeMap[s.type] ?? 'room',
    floorId: s.floorId,
    pos: s.pos,
  };
  dynamicNodes[s.venueId].push(node);
  if (s.type === 'brand' || s.type === 'signage') {
    if (!dynamicDoorSigns[s.venueId]) dynamicDoorSigns[s.venueId] = [];
    dynamicDoorSigns[s.venueId].push({ nodeId: node.id, label: s.label, isSponsored: s.type === 'brand' });
  }
  return true;
}

export function rejectSuggestion(id: string) {
  const s = suggestions.find(x => x.id === id);
  if (!s) return false;
  s.status = 'rejected';
  return true;
}
