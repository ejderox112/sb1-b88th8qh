import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { findRoute } from '@/lib/indoor/pathfinder';
import { getNearbyDoorSigns } from '@/lib/indoor/signage';
import { getActiveVenue, getDoorSigns } from '@/lib/indoor/store';

export default function IndoorNavScreen() {
  const venue = getActiveVenue('izmir-sehir-hastanesi');
  if (!venue) return <View style={styles.container}><Text>Venue bulunamadı</Text></View>;
  const startId = 'entrance';
  const [targetId, setTargetId] = useState<string>('room112');
  const [routeNodeIds, setRouteNodeIds] = useState<string[]>([]);
  const [steps, setSteps] = useState<{ nodeId: string; instruction: string }[]>([]);
  const [distance, setDistance] = useState<number>(0);
  const [idx, setIdx] = useState(0);

  const currentNodeId = routeNodeIds[idx];
  const currentSigns = useMemo(() => {
    if (!currentNodeId) return [] as Array<any>;
    return getNearbyDoorSigns(venue, getDoorSigns(venue.id), currentNodeId, 15);
  }, [currentNodeId]);

  const buildRoute = () => {
    const res = findRoute(venue, startId, targetId);
    if (res) {
      setRouteNodeIds(res.path);
      setSteps(res.steps);
      setDistance(res.distanceMeters);
      setIdx(0);
    }
  };

  const stepForward = () => {
    setIdx(i => Math.min(i + 1, Math.max(0, routeNodeIds.length - 1)));
  };
  const stepBack = () => {
    setIdx(i => Math.max(i - 1, 0));
  };

  const MiniMap = () => {
    if (!routeNodeIds.length) return null;
    const nodesMap = new Map(venue.nodes.map(n => [n.id, n]));
    const pts = routeNodeIds.map(id => nodesMap.get(id)!).map(n => ({ x: n.pos.x, y: n.pos.y, floorId: n.floorId }));
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = 10;
    const W = 260, H = 140;
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const sx = (W - pad * 2) / spanX;
    const sy = (H - pad * 2) / spanY;
    const s = Math.min(sx, sy);

    const themeByFloor: Record<string, string> = {
      F0: '#8ecae6',
      F3: '#ffb703',
    };
    const curNodeId = routeNodeIds[idx];
    const curNode = nodesMap.get(curNodeId!);
    const themeColor = curNode ? (themeByFloor[curNode.floorId] || '#007AFF') : '#007AFF';

    const items = pts.map((p, i) => ({
      left: pad + (p.x - minX) * s,
      top: pad + (p.y - minY) * s,
      active: i === idx,
      floorId: p.floorId,
    }));

    const colorByKind: Record<string, string> = {
      walk: themeColor,
      elevator: '#9b5de5',
      stairs: '#8d99ae',
      escalator: '#2a9d8f',
    };
    const segments = items.slice(1).map((pt, i) => {
      const a = items[i];
      const b = pt;
      const dx = b.left - a.left;
      const dy = b.top - a.top;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const ux = dx / len;
      const uy = dy / len;
      const fromId = routeNodeIds[i];
      const toId = routeNodeIds[i + 1];
      const edge = venue.edges.find(e => (e.from === fromId && e.to === toId) || (e.to === fromId && e.from === toId));
      const segKind = edge?.kind ?? 'walk';
      const segColor = colorByKind[segKind] ?? themeColor;
      return { x: (a.left + b.left) / 2, y: (a.top + b.top) / 2, len, angle, segColor, segKind, ax: a.left, ay: a.top, bx: b.left, by: b.top, ux, uy };
    });

    return (
      <View style={styles.mapBox}>
        {/* lines */}
        {segments.map((sg, i) => {
          if (sg.segKind === 'stairs') {
            const dash = 8;
            const gap = 6;
            const total = sg.len;
            const count = Math.max(1, Math.floor((total + gap) / (dash + gap)));
            const elems = [] as JSX.Element[];
            for (let k = 0; k < count; k++) {
              const offset = k * (dash + gap);
              if (offset > total) break;
              const midOffset = Math.min(offset + dash / 2, total);
              const cx = sg.ax + sg.ux * midOffset;
              const cy = sg.ay + sg.uy * midOffset;
              elems.push(
                <View
                  key={`seg-${i}-dash-${k}`}
                  style={{
                    position: 'absolute',
                    left: cx - dash / 2,
                    top: cy - 2,
                    width: dash,
                    height: 4,
                    backgroundColor: sg.segColor,
                    opacity: 0.7,
                    transform: [{ rotate: `${sg.angle}deg` }],
                    borderRadius: 2,
                  }}
                />
              );
            }
            return elems;
          }
          const height = sg.segKind === 'elevator' ? 6 : 4;
          return (
            <View
              key={'seg-' + i}
              style={{
                position: 'absolute',
                left: sg.x - sg.len / 2,
                top: sg.y - height / 2,
                width: sg.len,
                height,
                backgroundColor: sg.segColor,
                opacity: 0.6,
                transform: [{ rotate: `${sg.angle}deg` }],
                borderRadius: 3,
              }}
            />
          );
        })}
        {/* nodes */}
        {items.map((it, i) => (
          <View
            key={'pt-' + i}
            style={{
              position: 'absolute',
              left: it.left - (it.active ? 6 : 4),
              top: it.top - (it.active ? 6 : 4),
              width: it.active ? 12 : 8,
              height: it.active ? 12 : 8,
              borderRadius: 8,
              backgroundColor: it.active ? '#d00000' : '#1d3557',
              borderWidth: it.active ? 2 : 1,
              borderColor: it.active ? '#fff' : '#fff',
            }}
          />
        ))}
        {/* node icons/labels for interest points */}
        {routeNodeIds.map((nid, i) => {
          const n = nodesMap.get(nid)!;
          const it = items[i];
          if (!n || !it) return null;
          const icon = n.type === 'brand' ? '🏢' : n.type === 'room' ? '🚪' : n.type === 'elevator' ? '⬆️' : '';
          if (!icon) return null;
          return (
            <Text key={'icon-' + i} style={{ position: 'absolute', left: it.left + 6, top: it.top - 16, fontSize: 12 }}>
              {icon}
            </Text>
          );
        })}
        {/* legend */}
        <View style={{ position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', marginBottom: 4 }}>Açıklama</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <View style={{ width: 14, height: 4, backgroundColor: colorByKind.walk, borderRadius: 2, marginRight: 6 }} />
            <Text style={{ fontSize: 11 }}>Yürüme</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <View style={{ width: 14, height: 6, backgroundColor: colorByKind.elevator, borderRadius: 3, marginRight: 6 }} />
            <Text style={{ fontSize: 11 }}>Asansör</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <View style={{ width: 14, height: 0, borderTopWidth: 2, borderColor: colorByKind.stairs, borderStyle: 'dashed', marginRight: 6 }} />
            <Text style={{ fontSize: 11 }}>Merdiven</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <View style={{ width: 14, height: 4, backgroundColor: colorByKind.escalator, borderRadius: 2, marginRight: 6 }} />
            <Text style={{ fontSize: 11 }}>Yürüyen Merdiven</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Text style={{ fontSize: 12, marginRight: 8 }}>🚪 Oda</Text>
            <Text style={{ fontSize: 12, marginRight: 8 }}>🏢 Marka</Text>
            <Text style={{ fontSize: 12 }}>⬆️ Asansör</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>İç Mekan Navigasyon</Text>

      <View style={styles.destRow}>
        <TouchableOpacity
          style={[styles.destButton, targetId === 'room112' && styles.destButtonActive]}
          onPress={() => setTargetId('room112')}
        >
          <Text style={styles.destText}>🎯 Oda 112</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.destButton, targetId === 'brandXXX' && styles.destButtonActive]}
          onPress={() => setTargetId('brandXXX')}
        >
          <Text style={styles.destText}>🏢 XXX Firması</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.primary} onPress={buildRoute}>
        <Text style={styles.primaryText}>Rota Oluştur</Text>
      </TouchableOpacity>

      {!!routeNodeIds.length && (
        <View style={styles.panel}>
          <Text style={styles.subTitle}>Toplam Mesafe: {distance} m</Text>
          <View style={styles.controls}>
            <TouchableOpacity style={styles.ctrlBtn} onPress={stepBack}><Text>◀︎</Text></TouchableOpacity>
            <Text style={styles.stepInfo}>Adım {idx + 1}/{routeNodeIds.length}</Text>
            <TouchableOpacity style={styles.ctrlBtn} onPress={stepForward}><Text>▶︎</Text></TouchableOpacity>
          </View>

          <MiniMap />

          <Text style={styles.sectionHeader}>Yönlendirmeler</Text>
          <FlatList
            data={steps}
            keyExtractor={(s, i) => s.nodeId + ':' + i}
            renderItem={({ item, index }) => (
              <View style={[styles.stepRow, index === idx && styles.stepActive]}> 
                <Text style={styles.stepText}>{index + 1}. {item.instruction}</Text>
              </View>
            )}
          />

          <Text style={styles.sectionHeader}>Kapı Üstü İsimlikler</Text>
          <FlatList
            data={currentSigns}
            keyExtractor={(s, i) => s.nodeId + ':' + i}
            renderItem={({ item }) => (
              <View style={[styles.signRow, item.isSponsored && styles.signSponsored]}>
                <Text style={styles.signText}>{item.label} {item.isSponsored ? '• Sponsorlu' : ''} • {item.distance} m</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>Yakında isimlik yok</Text>}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  destRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  destButton: { paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
  destButtonActive: { backgroundColor: '#eef5ff', borderColor: '#007AFF' },
  destText: { fontSize: 14 },
  primary: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  panel: { flex: 1, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  subTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  ctrlBtn: { padding: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 6 },
  stepInfo: { fontSize: 13, color: '#333' },
  mapBox: { alignSelf: 'center', width: 260, height: 140, backgroundColor: '#f8f9fa', borderRadius: 10, marginVertical: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  sectionHeader: { fontSize: 16, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  stepRow: { paddingVertical: 6 },
  stepActive: { backgroundColor: '#f6fbff' },
  stepText: { fontSize: 14, color: '#333' },
  signRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  signSponsored: { backgroundColor: '#fff9e6' },
  signText: { fontSize: 14 },
  empty: { fontSize: 12, color: '#999', fontStyle: 'italic' },
});
