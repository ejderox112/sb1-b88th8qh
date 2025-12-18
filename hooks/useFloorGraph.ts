import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface FloorGraph {
  floor?: {
    id: string;
    name: string;
    level_index?: number | null;
    origin_heading?: number | null;
    scale?: number | null;
  };
  nodes: Array<{ id: string; type: string; x: number; y: number; z?: number | null; metadata?: any }>;
  edges: Array<{ id: string; from_node: string; to_node: string; bidirectional: boolean; weight?: number | null; width?: number | null; is_accessible?: boolean | null }>;
  pois: Array<{ id: string; node_id: string | null; label: string; category?: string | null; metadata?: any }>;
}

interface UseFloorGraphResult {
  graph: FloorGraph | null;
  loading: boolean;
  error: string;
  refresh: (floorId?: string) => Promise<void>;
}

export function useFloorGraph(initialFloorId?: string): UseFloorGraphResult {
  const [graph, setGraph] = useState<FloorGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [floorId, setFloorId] = useState<string | undefined>(initialFloorId);

  const fetchGraph = useCallback(async (overrideFloorId?: string) => {
    if (!isSupabaseConfigured) {
      setError('Supabase yapılandırılmadı');
      return;
    }
    const targetFloorId = overrideFloorId || floorId;
    if (!targetFloorId) {
      setError('Kat seçilmedi');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data: floor } = await supabase
        .from('floors')
        .select('id, name, level_index, origin_heading, scale')
        .eq('id', targetFloorId)
        .maybeSingle();

      const { data: nodes, error: nodeErr } = await supabase
        .from('nav_nodes')
        .select('id, type, x, y, z, metadata')
        .eq('floor_id', targetFloorId);
      if (nodeErr) throw nodeErr;

      const { data: edges, error: edgeErr } = await supabase
        .from('nav_edges')
        .select('id, from_node, to_node, bidirectional, weight, width, is_accessible')
        .eq('floor_id', targetFloorId);
      if (edgeErr) throw edgeErr;

      const { data: pois, error: poiErr } = await supabase
        .from('pois')
        .select('id, node_id, label, category, metadata')
        .eq('floor_id', targetFloorId);
      if (poiErr) throw poiErr;

      setGraph({
        floor: floor || undefined,
        nodes: nodes || [],
        edges: edges || [],
        pois: pois || [],
      });
      setFloorId(targetFloorId);
    } catch (err: any) {
      setError(err?.message || 'Graf alınamadı');
    } finally {
      setLoading(false);
    }
  }, [floorId]);

  useEffect(() => {
    if (initialFloorId) {
      fetchGraph(initialFloorId);
    }
  }, [initialFloorId, fetchGraph]);

  return {
    graph,
    loading,
    error,
    refresh: fetchGraph,
  };
}
