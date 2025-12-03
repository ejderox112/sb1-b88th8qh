import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Origin = { lat: number; lng: number } | null;

export interface NearbyUserSnapshot {
  userId: string;
  nickname: string;
  avatarUrl?: string | null;
  level?: number | null;
  trustScore?: number | null;
  lat: number;
  lng: number;
  distanceMeters: number;
  updatedAt: string;
  messagesOptIn: boolean;
}

interface Options {
  enabled: boolean;
  origin: Origin;
  radiusMeters?: number;
  freshnessMs?: number;
  pollMs?: number;
  venueId?: string | null;
}

interface NearbyState {
  users: NearbyUserSnapshot[];
  isLoading: boolean;
  error: string | null;
  lastUpdated?: string;
}

const DEFAULT_STATE: NearbyState = {
  users: [],
  isLoading: false,
  error: null,
};

const toRadians = (value: number) => (value * Math.PI) / 180;
const haversineMeters = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const R = 6371000; // metres
  const dLat = toRadians(bLat - aLat);
  const dLon = toRadians(bLng - aLng);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const ch = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(ch), Math.sqrt(1 - ch));
  return R * c;
};

export function useNearbyUsers(options: Options) {
  const { enabled, origin, radiusMeters = 500, freshnessMs = 120000, pollMs = 10000, venueId } = options;
  const [state, setState] = useState<NearbyState>(DEFAULT_STATE);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const fetchPromiseRef = useRef<Promise<void> | null>(null);
  const supabaseUnavailable = typeof (supabase as any)?.from !== 'function';

  useEffect(() => {
    if (supabaseUnavailable) return;
    let isMounted = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (isMounted) {
          setCurrentUserId(data?.user?.id ?? null);
        }
      })
      .catch(() => {
        if (isMounted) setCurrentUserId(null);
      });
    return () => {
      isMounted = false;
    };
  }, [supabaseUnavailable]);

  const fetchNearby = useCallback(async () => {
    if (!enabled || !origin) {
      setState({ ...DEFAULT_STATE });
      return;
    }

    if (supabaseUnavailable) {
      setState({ users: [], isLoading: false, error: 'Supabase yapılandırılmadı.' });
      return;
    }

    // prevent overlapping fetches
    if (fetchPromiseRef.current) {
      await fetchPromiseRef.current;
      return;
    }

    const promise = (async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        const freshnessIso = new Date(Date.now() - freshnessMs).toISOString();
        let liveQuery = supabase
          .from('live_locations')
          .select('id,user_id,lat,lng,accuracy,is_sharing,metadata,updated_at')
          .eq('is_sharing', true)
          .gt('updated_at', freshnessIso);

        const { data: liveData, error: liveError } = await liveQuery;
        if (liveError) throw liveError;

        if (!liveData || liveData.length === 0) {
          setState({ users: [], isLoading: false, error: null, lastUpdated: new Date().toISOString() });
          return;
        }

        const filtered = liveData.filter(row => {
          if (!row.user_id) return false;
          if (currentUserId && row.user_id === currentUserId) return false;
          if (!row.lat || !row.lng) return false;
          return true;
        });

        if (filtered.length === 0) {
          setState({ users: [], isLoading: false, error: null, lastUpdated: new Date().toISOString() });
          return;
        }

        const userIds = Array.from(new Set(filtered.map(row => row.user_id)));
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('id,nickname,avatar_url,level,trust_score,nearby_visibility_enabled,location_sharing,messages_opt_in')
          .in('id', userIds);
        if (profileError) throw profileError;

        const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]));
        const now = new Date().toISOString();
        const combined = filtered
          .map(row => {
            const profile = profileMap.get(row.user_id);
            if (!profile) return null;
            if (profile.nearby_visibility_enabled === false) return null;
            if (profile.location_sharing === false) return null;
            if (venueId && row.metadata?.venue_id && row.metadata.venue_id !== venueId) return null;
            const distanceMeters = haversineMeters(origin.lat, origin.lng, row.lat, row.lng);
            if (!Number.isFinite(distanceMeters) || distanceMeters > radiusMeters) return null;
            return {
              userId: row.user_id,
              nickname: profile.nickname || 'Bilinmeyen Kullanıcı',
              avatarUrl: profile.avatar_url,
              level: profile.level,
              trustScore: profile.trust_score,
              lat: row.lat,
              lng: row.lng,
              distanceMeters,
              updatedAt: row.updated_at ?? now,
              messagesOptIn: profile.messages_opt_in !== false,
            } as NearbyUserSnapshot;
          })
          .filter(Boolean) as NearbyUserSnapshot[];

        combined.sort((a, b) => a.distanceMeters - b.distanceMeters);
        setState({ users: combined, isLoading: false, error: null, lastUpdated: now });
      } catch (err: any) {
        setState(prev => ({ ...prev, isLoading: false, error: err?.message ?? 'Yakındaki kullanıcılar alınamadı.' }));
      } finally {
        fetchPromiseRef.current = null;
      }
    })();

    fetchPromiseRef.current = promise;
    await promise;
  }, [enabled, origin?.lat, origin?.lng, freshnessMs, radiusMeters, venueId, currentUserId, supabaseUnavailable]);

  useEffect(() => {
    if (!enabled || !origin) {
      setState({ ...DEFAULT_STATE });
      return;
    }

    if (supabaseUnavailable) {
      setState({ users: [], isLoading: false, error: 'Supabase yapılandırılmadı.' });
      return;
    }

    fetchNearby();
    if (!pollMs) return;

    const interval = setInterval(() => {
      fetchNearby();
    }, pollMs);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, origin?.lat, origin?.lng, pollMs, fetchNearby]);

  return useMemo(
    () => ({
      users: state.users,
      isLoading: state.isLoading,
      error: state.error,
      lastUpdated: state.lastUpdated,
      refresh: fetchNearby,
    }),
    [state.users, state.isLoading, state.error, state.lastUpdated, fetchNearby]
  );
}
