import type { Venue, DoorSign } from './types';

// Minimal mock graph for Izmir Sehir Hastanesi: Entrance -> Elevator -> Floor3 -> Room112
export const izmirHospital: Venue = {
  id: 'izmir-sehir-hastanesi',
  name: 'İzmir Şehir Hastanesi',
  floors: [
    { id: 'F0', name: 'Zemin Kat', level: 0 },
    { id: 'F3', name: '3. Kat', level: 3 },
  ],
  nodes: [
    { id: 'entrance', label: 'Ana Giriş', type: 'entrance', floorId: 'F0', pos: { x: 0, y: 0 } },
    { id: 'lobby', label: 'Lobi', type: 'corridor', floorId: 'F0', pos: { x: 20, y: 0 } },
    { id: 'elevF0', label: 'Asansör (Zemin)', type: 'elevator', floorId: 'F0', pos: { x: 40, y: 0 } },

    { id: 'elevF3', label: 'Asansör (3.Kat)', type: 'elevator', floorId: 'F3', pos: { x: 40, y: 0 } },
    { id: 'corrF3A', label: 'Koridor A', type: 'corridor', floorId: 'F3', pos: { x: 60, y: 0 } },
    { id: 'corrF3B', label: 'Koridor B', type: 'corridor', floorId: 'F3', pos: { x: 80, y: 0 } },
    { id: 'room112', label: 'Oda 112', type: 'room', floorId: 'F3', pos: { x: 100, y: 0 } },
    { id: 'brandXXX', label: 'XXX Firması', type: 'brand', floorId: 'F3', pos: { x: 85, y: 5 } },
  ],
  edges: [
    { id: 'e1', from: 'entrance', to: 'lobby', kind: 'walk', cost: 20 },
    { id: 'e2', from: 'lobby', to: 'elevF0', kind: 'walk', cost: 20 },
    { id: 'e3', from: 'elevF0', to: 'elevF3', kind: 'elevator', cost: 30 }, // vertical transfer
    { id: 'e4', from: 'elevF3', to: 'corrF3A', kind: 'walk', cost: 20 },
    { id: 'e5', from: 'corrF3A', to: 'corrF3B', kind: 'walk', cost: 20 },
    { id: 'e6', from: 'corrF3B', to: 'room112', kind: 'walk', cost: 20 },
    { id: 'e7', from: 'corrF3B', to: 'brandXXX', kind: 'walk', cost: 8 },
  ],
};

export const izmirDoorSigns: DoorSign[] = [
  { nodeId: 'room112', label: 'Oda 112' },
  { nodeId: 'brandXXX', label: 'XXX Firması', isSponsored: true, sponsor: { name: 'XXX', logoUrl: 'https://img.icons8.com/color/96/briefcase.png' } },
];
