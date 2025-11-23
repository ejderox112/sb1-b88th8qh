export type LocationEntryType = 'parking' | 'main' | 'side';

export interface Location {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  polygon: unknown | null; // GeoJSON veya [ [lat,lng], ... ]
  default_floor_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LocationFloor {
  id: string;
  location_id: string;
  floor_index: number;
  label: string;
  entry_type: LocationEntryType | null;
  plan_image_url: string | null;
  calibration: unknown | null;
  created_at: string;
}

export type FloorNodeType = 'room' | 'corridor' | 'stairs' | 'elevator' | 'lobby';

export interface FloorNode {
  id: string;
  location_floor_id: string;
  type: FloorNodeType;
  code: string | null;
  name: string | null;
  x: number;
  y: number;
  gps_lat: number | null;
  gps_lng: number | null;
  is_hidden: boolean;
  is_featured: boolean;
  created_at: string;
}

export type DirectionHint = 'straight' | 'left' | 'right';

export interface FloorEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  distance_m: number;
  direction_hint: DirectionHint | null;
  is_stairs: boolean;
  is_elevator: boolean;
  created_at: string;
}

export type RoomStatus = 'active' | 'empty' | 'closed' | 'hidden';

export interface RoomDetail {
  id: string;
  floor_node_id: string;
  room_number: string | null;
  tenant_name: string | null;
  category: string | null;
  status: RoomStatus;
  tags: unknown | null;
  description: string | null;
  created_at: string;
}

export type RoomSuggestionType = 'exists' | 'closed' | 'moved' | 'rename' | 'new_tenant';
export type RoomSuggestionStatus = 'pending' | 'approved' | 'rejected';

export interface RoomSuggestion {
  id: string;
  floor_node_id: string;
  user_id: string;
  type: RoomSuggestionType;
  proposed_tenant_name: string | null;
  note: string | null;
  status: RoomSuggestionStatus;
  moderated_by: string | null;
  created_at: string;
  resolved_at: string | null;
}
