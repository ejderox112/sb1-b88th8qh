import { supabase } from '@/lib/supabase';
import type {
  Location,
  LocationFloor,
  FloorNode,
  FloorEdge,
  RoomDetail,
  RoomSuggestion,
  RoomSuggestionType,
  RoomSuggestionStatus,
} from '@/types/locationModels';

// ADMIN: yeni bina oluştur
export async function createLocation(payload: Pick<Location, 'name' | 'city' | 'district' | 'polygon'>) {
  const { data, error } = await supabase
    .from('locations')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as Location;
}

// ADMIN: kata ekle
export async function addFloor(payload: Pick<LocationFloor, 'location_id' | 'floor_index' | 'label' | 'entry_type' | 'plan_image_url' | 'calibration'>) {
  const { data, error } = await supabase
    .from('location_floors')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as LocationFloor;
}

// ADMIN: kroki üzerinde node (oda/koridor/asansör/merdiven) ekle
export async function addFloorNode(payload: Pick<FloorNode, 'location_floor_id' | 'type' | 'code' | 'name' | 'x' | 'y' | 'gps_lat' | 'gps_lng' | 'is_hidden' | 'is_featured'>) {
  const { data, error } = await supabase
    .from('floor_nodes')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as FloorNode;
}

// ADMIN: iki node arasına koridor edge'i ekle
export async function addFloorEdge(payload: Pick<FloorEdge, 'from_node_id' | 'to_node_id' | 'distance_m' | 'direction_hint' | 'is_stairs' | 'is_elevator'>) {
  const { data, error } = await supabase
    .from('floor_edges')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as FloorEdge;
}

// ADMIN: oda detaylarını ayarla (tenant, durum vs.)
export async function upsertRoomDetail(payload: Pick<RoomDetail, 'floor_node_id' | 'room_number' | 'tenant_name' | 'category' | 'status' | 'tags' | 'description'>) {
  const { data, error } = await supabase
    .from('room_details')
    .upsert(payload, { onConflict: 'floor_node_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data as RoomDetail;
}

// USER: oda için öneri bırak
export async function submitRoomSuggestion(payload: Pick<RoomSuggestion, 'floor_node_id' | 'user_id' | 'type' | 'proposed_tenant_name' | 'note'>) {
  const { data, error } = await supabase
    .from('room_suggestions')
    .insert({
      ...payload,
      status: 'pending' as RoomSuggestionStatus,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as RoomSuggestion;
}

// MOD/ADMIN: öneriyi onayla / reddet
export async function reviewRoomSuggestion(id: string, status: RoomSuggestionStatus, moderatedBy: string | null) {
  const { data, error } = await supabase
    .from('room_suggestions')
    .update({ status, moderated_by: moderatedBy, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as RoomSuggestion;
}

// CLIENT: bir katın tüm node + edge + room detail datasını çek (navigasyon için)
export async function getFloorGraph(locationFloorId: string) {
  const [{ data: nodes, error: nodesError }, { data: edges, error: edgesError }, { data: rooms, error: roomsError }] = await Promise.all([
    supabase.from('floor_nodes').select('*').eq('location_floor_id', locationFloorId),
    supabase.from('floor_edges').select('*').in('from_node_id',
      supabase.from('floor_nodes').select('id').eq('location_floor_id', locationFloorId) as any
    ),
    supabase.from('room_details').select('*').in('floor_node_id',
      supabase.from('floor_nodes').select('id').eq('location_floor_id', locationFloorId) as any
    ),
  ]);

  if (nodesError) throw nodesError;
  if (edgesError) throw edgesError;
  if (roomsError) throw roomsError;

  return {
    nodes: (nodes ?? []) as FloorNode[],
    edges: (edges ?? []) as FloorEdge[],
    rooms: (rooms ?? []) as RoomDetail[],
  };
}
