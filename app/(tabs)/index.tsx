
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, Switch } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { getActiveVenue, getDoorSigns } from '@/lib/indoor/store';
import type { Node as IndoorNode } from '@/lib/indoor/types';
import Corridor3DWrapper from '@/components/Corridor3DWrapper';
import { useNearbyUsers } from '@/hooks/useNearbyUsers';
import type { NearbyUserSnapshot } from '@/hooks/useNearbyUsers';
import type { User } from '@supabase/supabase-js';

// Mock GPS coordinates for demo (İzmir Şehir Hastanesi)
const DEMO_VENUE_LAT = 38.4613;
const DEMO_VENUE_LON = 27.2069;

export default function MapTabScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [heading, setHeading] = useState(0);
  const [currentNode, setCurrentNode] = useState<IndoorNode | null>(null);
  const [isIndoor, setIsIndoor] = useState(false);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [settings, setSettings] = useState({ locationSharing: true, nearbyVisibility: true });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const venue = getActiveVenue();
  const lastPublishRef = useRef(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!active) return;
        const user = data?.user ?? null;
        setSessionUser(user);
        if (!user) {
          setSettingsLoading(false);
          return;
        }
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('location_sharing, nearby_visibility_enabled')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        setSettings({
          locationSharing: profile?.location_sharing ?? true,
          nearbyVisibility: profile?.nearby_visibility_enabled ?? true,
        });
      } catch (err: any) {
        if (!active) return;
        setSettingsError(err?.message ?? 'Profil ayarları yüklenemedi.');
      } finally {
        if (active) setSettingsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // GPS Tracking
    useEffect(() => {
      if (Platform.OS === 'web') return;
      let locationSub: Location.LocationSubscription | null = null;
      let headingSub: Location.LocationSubscription | null = null;

      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Konum İzni', 'Navigasyon için konum iznine ihtiyacımız var.');
          return;
        }

        // Location updates
        locationSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (loc) => {
            setLocation(loc);
            checkIndoorPosition(loc);
          }
        );

        // Heading updates
        headingSub = await Location.watchHeadingAsync((h) => {
          setHeading(h.trueHeading ?? h.magHeading);
        });
      })();

      return () => {
        locationSub?.remove();
        headingSub?.remove();
      };
    }, []);

  // Check if user is inside venue and map to nearest node
  const checkIndoorPosition = (loc: Location.LocationObject) => {
    if (!loc?.coords) return;
    
    const { latitude, longitude } = loc.coords;
    // Simple proximity check (within ~100m)
    const dist = getDistance(latitude, longitude, DEMO_VENUE_LAT, DEMO_VENUE_LON);
    
    if (dist < 0.1) {
      setIsIndoor(true);
      // Map to nearest indoor node (simplified - in production use floor detection)
      const entrance = venue?.nodes?.find(n => n.id === 'entrance');
      if (entrance) setCurrentNode(entrance);
    } else {
      setIsIndoor(false);
      setCurrentNode(null);
    }
  };

  // Haversine distance in km
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const nearbyHook = useNearbyUsers({
    enabled: settings.locationSharing && settings.nearbyVisibility && !!location,
    origin: location?.coords ? { lat: location.coords.latitude, lng: location.coords.longitude } : null,
    radiusMeters: 500,
    venueId: venue?.id ?? null,
  });
  const nearbyUsers = nearbyHook.users;

  useEffect(() => {
    if (!sessionUser || !location || !settings.locationSharing) return;
    const now = Date.now();
    if (now - lastPublishRef.current < 5000) return;
    lastPublishRef.current = now;
    const payload = {
      user_id: sessionUser.id,
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      accuracy: location.coords.accuracy ?? null,
      is_sharing: settings.nearbyVisibility,
      metadata: { venue_id: venue?.id ?? null },
      updated_at: new Date().toISOString(),
    } as const;
    (async () => {
      try {
        await supabase
          .from('live_locations')
          .upsert(payload, { onConflict: 'user_id' });
      } catch (err) {
        console.warn('Live location publish failed', err?.message || err);
      }
    })();
  }, [sessionUser?.id, location?.coords?.latitude, location?.coords?.longitude, settings.locationSharing, settings.nearbyVisibility, venue?.id]);

  const toggleNearbyVisibility = async () => {
    if (!sessionUser) {
      Alert.alert('Giriş Gerekli', 'Yakındaki kullanıcı ayarını değiştirmek için giriş yapmalısınız.');
      return;
    }
    const next = !settings.nearbyVisibility;
    setSettings(prev => ({ ...prev, nearbyVisibility: next }));
    try {
      await supabase
        .from('user_profiles')
        .update({ nearby_visibility_enabled: next })
        .eq('id', sessionUser.id);
    } catch (err: any) {
      setSettings(prev => ({ ...prev, nearbyVisibility: !next }));
      Alert.alert('Hata', err?.message ?? 'Ayar güncellenemedi.');
    }
  };

  const handleMessageUser = (user: NearbyUserSnapshot) => {
    if (!user.messagesOptIn) {
      Alert.alert('Yasak', 'Bu kullanıcı mesaj isteklerini kapatmış.');
      return;
    }
    Alert.alert('Mesaj Gönder', `${user.nickname} kullanıcısına mesaj göndermek için mesaj ekranına yönlendiriliyorsunuz.`);
    // TODO: Navigate to ChatScreen with userId
  };

  // Live Map with corridor visualization
  const LiveMapView = () => {
    if (!isIndoor || !currentNode || !venue?.nodes) {
      // Outdoor Google Maps style view
      return (
        <View style={styles.outdoorMap}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>🌍 Canlı Harita</Text>
            <Text style={styles.mapSubtitle}>
              {location ? 
                `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` :
                'Konum alınıyor...'}
            </Text>
          </View>
          
          <View style={styles.compassContainer}>
            <Text style={styles.compassLabel}>Pusula</Text>
            <View style={[styles.compass, { transform: [{ rotate: `${heading}deg` }] }]}>
              <Text style={styles.compassNeedle}>⬆️</Text>
            </View>
            <Text style={styles.headingText}>{Math.round(heading)}°</Text>
          </View>

          <View style={styles.venueIndicator}>
            <Text style={styles.venueDistance}>
              📍 {venue?.name || 'İzmir Şehir Hastanesi'}
            </Text>
            <Text style={styles.venueHint}>
              Yaklaşın → İç mekan navigasyonu aktifleşecek
            </Text>
          </View>
        </View>
      );
    }

    // Indoor corridor view
    const nodesOnFloor = venue.nodes.filter(n => n.floorId === currentNode.floorId);
    const edges = venue.edges || [];
    
    // Calculate bounds for mapping
    const xs = nodesOnFloor.map(n => n.pos.x);
    const ys = nodesOnFloor.map(n => n.pos.y);
    const minX = Math.min(...xs) - 5;
    const maxX = Math.max(...xs) + 5;
    const minY = Math.min(...ys) - 5;
    const maxY = Math.max(...ys) + 5;
    const rangeX = (maxX - minX) || 1;
    const rangeY = (maxY - minY) || 1;
    const mapW = 280;
    const mapH = 200;

    const toScreen = (x: number, y: number) => ({
      left: ((x - minX) / rangeX) * mapW,
      top: ((y - minY) / rangeY) * mapH,
    });

    const screenNodes = nodesOnFloor.map(n => {
      const sc = toScreen(n.pos.x, n.pos.y);
      return { ...sc, node: n, active: n.id === currentNode.id };
    });

    // Draw corridors (edges)
    const corridorPaths = edges.filter(e => {
      const fromNode = venue.nodes.find(n => n.id === e.from);
      const toNode = venue.nodes.find(n => n.id === e.to);
      return fromNode?.floorId === currentNode.floorId && toNode?.floorId === currentNode.floorId;
    }).map(e => {
      const fromNode = venue.nodes.find(n => n.id === e.from)!;
      const toNode = venue.nodes.find(n => n.id === e.to)!;
      const from = toScreen(fromNode.pos.x, fromNode.pos.y);
      const to = toScreen(toNode.pos.x, toNode.pos.y);
      const dx = to.left - from.left;
      const dy = to.top - from.top;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      return {
        x: (from.left + to.left) / 2,
        y: (from.top + to.top) / 2,
        length,
        angle,
        kind: e.kind,
      };
    });

    const colorByKind: Record<string, string> = {
      walk: '#457b9d',
      elevator: '#9b5de5', 
      stairs: '#8d99ae',
      escalator: '#2a9d8f',
    };

    return (
      <View style={styles.indoorMap}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>🏢 İç Mekan Kroki</Text>
          <Text style={styles.mapSubtitle}>Kat: {currentNode.floorId} | {currentNode.label}</Text>
        </View>

        <View style={[styles.corridorCanvas, { width: mapW, height: mapH }]}>
          {/* Draw corridor paths */}
          {corridorPaths.map((path, i) => (
            <View
              key={`path-${i}`}
              style={{
                position: 'absolute',
                left: path.x - path.length / 2,
                top: path.y - 3,
                width: path.length,
                height: path.kind === 'elevator' ? 8 : 6,
                backgroundColor: colorByKind[path.kind] || '#457b9d',
                transform: [{ rotate: `${path.angle}deg` }],
                borderRadius: 3,
                opacity: 0.7,
              }}
            />
          ))}

          {/* Draw rooms and nodes */}
          {screenNodes.map((sn, i) => {
            const icon = sn.node.type === 'room' ? '🚪' : 
                        sn.node.type === 'brand' ? '🏢' : 
                        sn.node.type === 'elevator' ? '⬆️' : '📍';
            
            return (
              <View key={i} style={{ position: 'absolute', left: sn.left - 12, top: sn.top - 12 }}>
                {/* Node background */}
                <View style={[
                  styles.nodeCircle,
                  sn.active && styles.activeNode,
                  { backgroundColor: sn.active ? '#e74c3c' : '#34495e' }
                ]} />
                
                {/* Icon */}
                <Text style={[
                  styles.nodeIcon,
                  { left: sn.active ? -8 : -6, top: sn.active ? -20 : -18 }
                ]}>
                  {icon}
                </Text>
                
                {/* User position indicator */}
                {sn.active && (
                  <View style={[
                    styles.userIndicator,
                    { transform: [{ rotate: `${heading}deg` }] }
                  ]}>
                    <Text style={styles.userArrow}>👤</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.mapLegend}>
          <Text style={styles.legendTitle}>Açıklama</Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendLine, { backgroundColor: colorByKind.walk }]} />
            <Text style={styles.legendText}>Yürüme</Text>
            <View style={[styles.legendLine, { backgroundColor: colorByKind.elevator, height: 6 }]} />
            <Text style={styles.legendText}>Asansör</Text>
          </View>
          <Text style={styles.legendIcons}>🚪 Oda  🏢 Marka  ⬆️ Asansör  👤 Siz</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top status bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {isIndoor ? `📍 ${venue?.name || 'İç Mekan'} - ${currentNode?.label || '...'}` : '🌍 Dış Mekan'}
        </Text>
        {Platform.OS !== 'web' && <Text style={styles.heading}>🧭 {Math.round(heading)}°</Text>}
      </View>

      {/* Main content */}
      <ScrollView style={styles.content}>
        {/* Live Map - 3D Corridor View when indoor */}
        <View style={[styles.section, styles.mapSection]}>
          {isIndoor && currentNode && Platform.OS === 'web' ? (
            <View style={styles.corridor3DContainer}>
              <Text style={styles.sectionTitle}>🎮 3D İç Mekan Görünümü</Text>
              <Corridor3DWrapper
                currentNodeId={currentNode.id}
                heading={heading}
                venue={venue}
              />
              <Text style={styles.corridor3DHint}>
                🧭 Cihazınızı çevirin - 3D koridor gerçek zamanlı güncellenir
              </Text>
            </View>
          ) : (
            <LiveMapView />
          )}
        </View>

        {/* Current position info */}
        {isIndoor && currentNode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mevcut Konum</Text>
            <Text style={styles.infoText}>🏢 {currentNode.label}</Text>
            <Text style={styles.infoText}>🔢 Kat: {currentNode.floorId}</Text>
            {getDoorSigns(venue?.id || '', currentNode.floorId, currentNode.pos, 20).slice(0, 3).map((sign, i) => (
              <Text key={i} style={styles.signText}>
                {sign.isSponsor ? '⭐' : '🚪'} {sign.label} ({sign.distance.toFixed(0)}m)
              </Text>
            ))}
          </View>
        )}

        {/* Nearby users */}
        <View style={styles.section}>
          <View style={styles.toggleHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Yakındaki Kullanıcılar</Text>
              <Text style={styles.infoText}>
                500 m çemberi · {nearbyUsers.length} kişi bulundu
              </Text>
            </View>
            <Switch value={settings.nearbyVisibility} onValueChange={toggleNearbyVisibility} />
          </View>
          {settingsError && <Text style={styles.warningText}>{settingsError}</Text>}
          {settingsLoading && <Text style={styles.infoText}>Ayarlar yükleniyor...</Text>}
          {nearbyHook.error && <Text style={styles.warningText}>{nearbyHook.error}</Text>}
          {!settings.locationSharing && !settingsLoading && (
            <Text style={styles.warningText}>
              Konum paylaşımı profil ekranından kapalı olduğu için yakındaki kullanıcılar gizlendi.
            </Text>
          )}
          {settings.locationSharing && settings.nearbyVisibility && (
            <>
              {nearbyHook.isLoading ? (
                <Text style={styles.infoText}>Yakındaki kullanıcılar yükleniyor...</Text>
              ) : nearbyUsers.length === 0 ? (
                <Text style={styles.infoText}>Şu anda 500 m içinde başka kullanıcı yok.</Text>
              ) : (
                nearbyUsers.map(user => (
                  <View key={user.userId} style={styles.userCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.username}>{user.nickname}</Text>
                      <Text style={styles.userDist}>{Math.round(user.distanceMeters)} m uzakta</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.msgBtn, !user.messagesOptIn && styles.msgBtnDisabled]}
                      disabled={!user.messagesOptIn}
                      onPress={() => handleMessageUser(user)}
                    >
                      <Text style={styles.msgBtnText}>
                        {user.messagesOptIn ? '💬 Mesaj' : '🔒 Kapalı'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}
        </View>

        {/* 3D corridor view (live when indoor, preview otherwise) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚶‍♂️ İç Mekan Navigasyon</Text>
          <Corridor3DWrapper heading={heading} currentNodeLabel={currentNode?.label ?? 'Önizleme'} />
          {!isIndoor && (
            <Text style={styles.infoText}>
              Bu bir önizlemedir — iç mekana yaklaştığınızda gerçek rota ve kapı bilgileri aktifleşecektir.
            </Text>
          )}
        </View>

        {!isIndoor && (
          <View style={styles.section}>
            <Text style={styles.infoText}>
              📍 İç mekan navigasyonu için {venue?.name || 'hedefe'} yakınına gidin.
            </Text>
            {location && (
              <Text style={styles.coordText}>
                Koordinat: {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  statusBar: {
    backgroundColor: '#1d3557',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  heading: { fontSize: 14, color: '#a8dadc' },
  content: { flex: 1 },
  section: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  infoText: { fontSize: 15, color: '#555', marginBottom: 6 },
  signText: { fontSize: 14, color: '#666', marginLeft: 8, marginTop: 4 },
  coordText: { fontSize: 13, color: '#888', marginTop: 8 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  username: { fontSize: 16, fontWeight: '600', color: '#333' },
  userDist: { fontSize: 13, color: '#999', marginTop: 2 },
  msgBtn: {
    backgroundColor: '#457b9d',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  msgBtnDisabled: {
    backgroundColor: '#b0bec5',
  },
  msgBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  warningText: { fontSize: 13, color: '#c0392b', marginBottom: 6 },
  toggleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mapSection: { paddingHorizontal: 8, paddingVertical: 12 },
  outdoorMap: { 
    minHeight: 220, 
    backgroundColor: '#1a365d', 
    borderRadius: 12, 
    padding: 16,
    alignItems: 'center' 
  },
  indoorMap: { 
    minHeight: 280, 
    backgroundColor: '#f8f9fa', 
    borderRadius: 12, 
    padding: 12 
  },
  mapHeader: { alignItems: 'center', marginBottom: 12 },
  mapTitle: { fontSize: 18, fontWeight: '700', color: '#2c3e50', textAlign: 'center' },
  mapSubtitle: { fontSize: 13, color: '#6c757d', marginTop: 4, textAlign: 'center' },
  compassContainer: { alignItems: 'center', marginVertical: 16 },
  compassLabel: { fontSize: 14, color: '#e9c46a', fontWeight: '600', marginBottom: 8 },
  compass: { 
    width: 60, 
    height: 60, 
    backgroundColor: '#264653', 
    borderRadius: 30, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 3, 
    borderColor: '#e9c46a' 
  },
  compassNeedle: { fontSize: 24, color: '#e76f51' },
  headingText: { fontSize: 16, color: '#f4a261', fontWeight: '600', marginTop: 8 },
  venueIndicator: { alignItems: 'center', marginTop: 12 },
  venueDistance: { fontSize: 16, color: '#f1faee', fontWeight: '600' },
  venueHint: { fontSize: 12, color: '#a8dadc', marginTop: 4, textAlign: 'center' },
  corridorCanvas: { 
    backgroundColor: '#e9ecef', 
    borderRadius: 8, 
    margin: 8,
    alignSelf: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#dee2e6'
  },
  nodeCircle: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: '#fff' 
  },
  activeNode: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    borderWidth: 3, 
    borderColor: '#fff',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5
  },
  nodeIcon: { position: 'absolute', fontSize: 12, left: -6, top: -18 },
  userIndicator: { 
    position: 'absolute', 
    left: 6, 
    top: -32, 
    alignItems: 'center' 
  },
  userArrow: { fontSize: 16 },
  mapLegend: { 
    backgroundColor: '#fff', 
    padding: 10, 
    borderRadius: 8, 
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  legendTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6, color: '#495057' },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  legendLine: { width: 20, height: 4, borderRadius: 2, marginRight: 8 },
  legendText: { fontSize: 11, color: '#6c757d', marginRight: 12 },
  legendIcons: { fontSize: 11, color: '#6c757d', textAlign: 'center' },
  corridor3DContainer: {
    minHeight: 400,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 12,
  },
  corridor3DHint: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
