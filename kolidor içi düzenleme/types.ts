
export interface Door {
  id: string;
  position: number; // which segment it's on
  side: 'left' | 'right';
  isPath?: boolean;
  description?: string;
}

export interface CorridorSettings {
  id: string;
  vanishingPointX: number;
  vanishingPointY: number;
  corridorWidth: number;
  corridorHeight: number;
  numSegments: number;
  perspectiveStrength: number;
  lineColor: string;
  doors: Door[];
}

export interface Destination {
  name: string;
  address: string;
}

export interface Journey {
  destination: Destination;
  path: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// The google.maps global types have been removed as they are browser-specific
// and not compatible with React Native. Native map implementations will have
// their own type definitions.
