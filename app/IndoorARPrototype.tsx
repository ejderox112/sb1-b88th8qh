import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { useFloorGraph } from '@/hooks/useFloorGraph';
import FloorMiniMap from '@/components/FloorMiniMap';
import { findPathBfs } from '@/utils/graphRoute';

export default function IndoorARPrototype() {
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [barcodeAligned, setBarcodeAligned] = useState<string | null>(null);
  const [floorId, setFloorId] = useState('');
  const [startId, setStartId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [pathIds, setPathIds] = useState<string[]>([]);
  const { graph, loading, error, refresh } = useFloorGraph();

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission, requestPermission]);

  const handleScan = ({ data }: { data?: string }) => {
    if (!data) return;
    setBarcodeAligned(data);
  };

  const handleLoadGraph = async () => {
    if (!floorId.trim()) {
      Alert.alert('Kat ID girin');
      return;
    }
    await refresh(floorId.trim());
  };

  const handleRoute = () => {
    if (!graph) {
      Alert.alert('Önce graf yükle');
      return;
    }
    if (!startId.trim() || !targetId.trim()) {
      Alert.alert('Başlangıç ve hedef node id girin');
      return;
    }
    const path = findPathBfs(graph.nodes, graph.edges, startId.trim(), targetId.trim());
    setPathIds(path);
    if (!path.length) Alert.alert('Rota bulunamadı');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AR Prototype (Managed)</Text>
      <Text style={styles.info}>QR/AprilTag yerine basit barkod/QR tarama ile hizalama.</Text>

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="floor_id"
          placeholderTextColor="#94a3b8"
          value={floorId}
          onChangeText={setFloorId}
        />
        <TouchableOpacity style={styles.button} onPress={handleLoadGraph}>
          <Text style={styles.buttonText}>Graf Yükle</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="start node id"
          placeholderTextColor="#94a3b8"
          value={startId}
          onChangeText={setStartId}
        />
        <TextInput
          style={styles.input}
          placeholder="target node id"
          placeholderTextColor="#94a3b8"
          value={targetId}
          onChangeText={setTargetId}
        />
        <TouchableOpacity style={styles.button} onPress={handleRoute}>
          <Text style={styles.buttonText}>Rota</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      {loading ? <Text style={styles.status}>Graf yükleniyor...</Text> : null}
      {barcodeAligned ? <Text style={styles.status}>Hizalama: {barcodeAligned}</Text> : <Text style={styles.status}>Marker bekleniyor...</Text>}

      <View style={styles.cameraBox}>
        {permission?.granted ? (
          <Camera
            style={StyleSheet.absoluteFill}
            type={CameraType.back}
            onBarCodeScanned={handleScan}
            ratio="16:9"
          />
        ) : (
          <Text style={styles.error}>Kamera izni yok</Text>
        )}
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>AR ok/etiket için placeholder overlay</Text>
        </View>
      </View>

      {graph ? (
        <View style={styles.mapCard}>
          <Text style={styles.subtitle}>Mini Harita (nav_nodes/nav_edges)</Text>
          <FloorMiniMap graph={graph} pathIds={pathIds} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#0b1021' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  info: { color: '#cbd5e1', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, backgroundColor: '#1f2937', color: '#fff', padding: 10, borderRadius: 8 },
  button: { backgroundColor: '#3b82f6', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#fca5a5', marginVertical: 6 },
  status: { color: '#cbd5e1', marginVertical: 6 },
  cameraBox: { height: 280, borderRadius: 12, overflow: 'hidden', marginTop: 8, backgroundColor: '#111827' },
  overlay: { position: 'absolute', bottom: 8, left: 8, right: 8, padding: 10, backgroundColor: '#00000088', borderRadius: 8 },
  overlayText: { color: '#e5e7eb', textAlign: 'center' },
  mapCard: { marginTop: 12, padding: 10, backgroundColor: '#111827', borderRadius: 12 },
  subtitle: { color: '#e5e7eb', marginBottom: 6, fontWeight: '600' },
});
