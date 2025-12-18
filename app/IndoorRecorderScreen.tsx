import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Basit yerinde kayıt MVP: koridor node'ları ekle, kapı/oda ekle, Supabase'teki yeni indoor graf şemasına kaydet.
// Not: Konum/sensör entegre edilmedi; adım uzunluğu varsayılan 3 m olarak artıyor. Heading/IMU entegrasyonu bir sonraki iterasyona bırakıldı.

type LocalNodeType = 'corridor' | 'door' | 'room' | 'junction';
interface LocalNode {
  tempId: string;
  type: LocalNodeType;
  name: string;
  x: number;
  y: number;
  z: number;
  metadata?: Record<string, any>;
}

interface LocalEdge {
  fromTempId: string;
  toTempId: string;
  bidirectional?: boolean;
  width?: number;
  is_accessible?: boolean;
}

export default function IndoorRecorderScreen() {
  const [floorName, setFloorName] = useState('Varsayilan Kat');
  const [floorLevel, setFloorLevel] = useState('0');
  const [recording, setRecording] = useState(false);
  const [nodes, setNodes] = useState<LocalNode[]>([]);
  const [edges, setEdges] = useState<LocalEdge[]>([]);
  const [lastPos, setLastPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [doorName, setDoorName] = useState('');
  const [segmentLength, setSegmentLength] = useState('3'); // metre varsayılan

  useEffect(() => {
    setStatus('Kayıt için hazır. Başlat tuşuna basın.');
  }, []);

  const addNode = (type: LocalNodeType, name: string, dx = 0, dy = 0) => {
    const nextPos = { x: lastPos.x + dx, y: lastPos.y + dy };
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const node: LocalNode = {
      tempId,
      type,
      name,
      x: nextPos.x,
      y: nextPos.y,
      z: 0,
      metadata: { tempId },
    };
    setNodes((prev) => [...prev, node]);
    setLastPos(nextPos);
    return tempId;
  };

  const addCorridorStep = () => {
    const step = Number(segmentLength) || 3;
    const fromId = nodes.length > 0 ? nodes[nodes.length - 1].tempId : null;
    const tempId = addNode('corridor', `Koridor ${nodes.length + 1}`, step, 0);
    if (fromId) {
      setEdges((prev) => [...prev, { fromTempId: fromId, toTempId: tempId, bidirectional: true }]);
    }
    setStatus('Koridor segmenti eklendi.');
  };

  const addDoor = () => {
    if (!doorName.trim()) {
      Alert.alert('Kapı adı gerekli', 'Kapı için bir isim girin.');
      return;
    }
    const step = Number(segmentLength) || 3;
    const fromId = nodes.length > 0 ? nodes[nodes.length - 1].tempId : null;
    const tempId = addNode('door', doorName.trim(), step / 3, 0); // koridora yakın bir kapı pozisyonu
    if (fromId) {
      setEdges((prev) => [...prev, { fromTempId: fromId, toTempId: tempId, bidirectional: true, width: 1 }]);
    }
    setStatus('Kapı eklendi.');
    setDoorName('');
  };

  const addRoom = () => {
    if (!roomName.trim()) {
      Alert.alert('Oda adı gerekli', 'Oda için bir isim girin.');
      return;
    }
    const step = Number(segmentLength) || 3;
    const fromId = nodes.length > 0 ? nodes[nodes.length - 1].tempId : null;
    const tempId = addNode('room', roomName.trim(), 0, step / 2);
    if (fromId) {
      setEdges((prev) => [...prev, { fromTempId: fromId, toTempId: tempId, bidirectional: true, width: 1.2 }]);
    }
    setStatus('Oda eklendi.');
    setRoomName('');
  };

  const handleStart = () => {
    setNodes([]);
    setEdges([]);
    setLastPos({ x: 0, y: 0 });
    setRecording(true);
    setStatus('Kayıt başladı. Koridor ekleyin, kapı/oda ekleyin.');
  };

  const handleCancel = () => {
    setRecording(false);
    setNodes([]);
    setEdges([]);
    setLastPos({ x: 0, y: 0 });
    setStatus('İptal edildi.');
  };

  const handleSave = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert('Supabase yok', 'Önce Supabase ortam değişkenlerini ayarlayın.');
      return;
    }
    if (!nodes.length) {
      Alert.alert('Boş kayıt', 'Kaydedilecek node bulunamadı.');
      return;
    }
    setSaving(true);
    setStatus('Kaydediliyor...');
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error('Oturum bulunamadı');

      // 1) Floor hazırla (upsert by name + level)
      const { data: floorRow, error: floorError } = await supabase
        .from('floors')
        .upsert({ name: floorName || 'Varsayilan Kat', level_index: Number(floorLevel) || 0 }, { onConflict: 'name,level_index' })
        .select()
        .maybeSingle();
      if (floorError || !floorRow) throw floorError || new Error('Floor oluşturulamadı');

      // 2) Node insert (metadata.tempId ile eşle)
      const insertNodes = nodes.map((n) => ({
        floor_id: floorRow.id,
        name: n.name,
        type: n.type,
        x: n.x,
        y: n.y,
        z: n.z,
        heading_hint: null,
        metadata: { ...(n.metadata || {}), tempId: n.tempId },
        created_by: userId,
      }));
      const { data: insertedNodes, error: nodeError } = await supabase
        .from('nav_nodes')
        .insert(insertNodes)
        .select();
      if (nodeError || !insertedNodes) throw nodeError || new Error('Node eklenemedi');

      const idMap: Record<string, string> = {};
      insertedNodes.forEach((row: any) => {
        const tempId = row.metadata?.tempId;
        if (tempId) idMap[tempId] = row.id;
      });

      // 3) Edge insert
      const insertEdges = edges
        .map((e) => ({
          floor_id: floorRow.id,
          from_node: idMap[e.fromTempId],
          to_node: idMap[e.toTempId],
          bidirectional: e.bidirectional ?? true,
          width: e.width,
          is_accessible: e.is_accessible ?? false,
          metadata: {},
          created_by: userId,
        }))
        .filter((e) => e.from_node && e.to_node);
      if (insertEdges.length) {
        const { error: edgeError } = await supabase.from('nav_edges').insert(insertEdges);
        if (edgeError) throw edgeError;
      }

      // 4) POIs (room ve kapılar için)
      const poiRows = insertedNodes
        .filter((n: any) => n.type === 'room' || n.type === 'door')
        .map((n: any) => ({
          floor_id: floorRow.id,
          node_id: n.id,
          label: n.name || n.type,
          room_number: n.type === 'room' ? n.name : null,
          category: n.type,
          metadata: {},
          created_by: userId,
        }));
      if (poiRows.length) {
        const { error: poiError } = await supabase.from('pois').insert(poiRows);
        if (poiError) throw poiError;
      }

      setStatus('✅ Kaydedildi');
      setRecording(false);
    } catch (err: any) {
      console.error('Kayıt hatası', err);
      Alert.alert('Kayıt hatası', err?.message || 'Bilinmeyen hata');
      setStatus('Hata: ' + (err?.message || '')); 
    } finally {
      setSaving(false);
    }
  };

  const renderNode = ({ item }: { item: LocalNode }) => (
    <View style={styles.nodeItem}>
      <Text style={styles.nodeTitle}>{item.name} ({item.type})</Text>
      <Text style={styles.nodePos}>x:{item.x.toFixed(1)} y:{item.y.toFixed(1)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yerinde Kayıt (MVP)</Text>
      <Text style={styles.status}>{status}</Text>

      <Text style={styles.label}>Kat adı</Text>
      <TextInput style={styles.input} value={floorName} onChangeText={setFloorName} placeholder="Örn: Zemin Kat" />

      <Text style={styles.label}>Kat seviyesi (integer)</Text>
      <TextInput style={styles.input} value={floorLevel} onChangeText={setFloorLevel} keyboardType="numeric" />

      <Text style={styles.label}>Segment uzunluğu (m)</Text>
      <TextInput style={styles.input} value={segmentLength} onChangeText={setSegmentLength} keyboardType="numeric" />

      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, recording ? styles.buttonDisabled : styles.buttonPrimary]} onPress={handleStart} disabled={recording}>
          <Text style={styles.buttonText}>Başlat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, !recording ? styles.buttonDisabled : styles.buttonDanger]} onPress={handleCancel} disabled={!recording}>
          <Text style={styles.buttonText}>İptal</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, !recording ? styles.buttonDisabled : styles.buttonSecondary]} onPress={addCorridorStep} disabled={!recording}>
          <Text style={styles.buttonText}>Koridor Ekle</Text>
        </TouchableOpacity>
        <TextInput style={[styles.input, styles.inlineInput]} value={doorName} onChangeText={setDoorName} placeholder="Kapı adı" editable={recording} />
        <TouchableOpacity style={[styles.button, !recording ? styles.buttonDisabled : styles.buttonSecondary]} onPress={addDoor} disabled={!recording}>
          <Text style={styles.buttonText}>Kapı</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TextInput style={[styles.input, styles.inlineInput]} value={roomName} onChangeText={setRoomName} placeholder="Oda adı/numara" editable={recording} />
        <TouchableOpacity style={[styles.button, !recording ? styles.buttonDisabled : styles.buttonSecondary]} onPress={addRoom} disabled={!recording}>
          <Text style={styles.buttonText}>Oda</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.button, styles.buttonPrimary, (!recording && nodes.length === 0) ? styles.buttonDisabled : null]} onPress={handleSave} disabled={saving || (!recording && nodes.length === 0)}>
        <Text style={styles.buttonText}>{saving ? 'Kaydediliyor...' : 'Kaydet & Yayınla'}</Text>
      </TouchableOpacity>

      <Text style={styles.subTitle}>Geçici Node Listesi</Text>
      <FlatList
        data={nodes}
        keyExtractor={(item) => item.tempId}
        renderItem={renderNode}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0b1021' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 6 },
  subTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginTop: 12 },
  status: { color: '#cfd6ff', marginBottom: 8 },
  label: { color: '#cfd6ff', marginTop: 8 },
  input: { backgroundColor: '#1a2038', color: '#fff', padding: 10, borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: '#2e3654' },
  inlineInput: { flex: 1, marginRight: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  button: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, marginRight: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  buttonPrimary: { backgroundColor: '#3b82f6' },
  buttonSecondary: { backgroundColor: '#6b7280' },
  buttonDanger: { backgroundColor: '#ef4444' },
  buttonDisabled: { opacity: 0.5 },
  list: { marginTop: 8 },
  nodeItem: { padding: 10, backgroundColor: '#14192e', borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#1f2742' },
  nodeTitle: { color: '#fff', fontWeight: '600' },
  nodePos: { color: '#9ca3af', marginTop: 2 },
});
