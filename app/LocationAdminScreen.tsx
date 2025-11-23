import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { createLocation, addFloor, addFloorNode, upsertRoomDetail } from '@/lib/locationAdmin';
import type { Location, LocationFloor, FloorNode, FloorNodeType, RoomStatus, LocationEntryType } from '@/types';

export default function LocationAdminScreen() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [floors, setFloors] = useState<LocationFloor[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<LocationFloor | null>(null);
  const [floorNodes, setFloorNodes] = useState<FloorNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<FloorNode | null>(null);
  
  // Yeni bina formu
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationCity, setNewLocationCity] = useState('');
  const [newLocationDistrict, setNewLocationDistrict] = useState('');
  
  // Yeni kat formu
  const [newFloorIndex, setNewFloorIndex] = useState('0');
  const [newFloorLabel, setNewFloorLabel] = useState('Zemin Kat');
  const [newFloorEntryType, setNewFloorEntryType] = useState<LocationEntryType>('main');

  // Yeni node formu
  const [newNodeType, setNewNodeType] = useState<FloorNodeType>('room');
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeCode, setNewNodeCode] = useState('');
  const [newNodeX, setNewNodeX] = useState('0');
  const [newNodeY, setNewNodeY] = useState('0');
  const [newNodeLat, setNewNodeLat] = useState('');
  const [newNodeLng, setNewNodeLng] = useState('');
  const [isNodeFeatured, setIsNodeFeatured] = useState(false);
  const [isNodeHidden, setIsNodeHidden] = useState(false);

  // Oda detay formu
  const [roomNumber, setRoomNumber] = useState('');
  const [roomTenant, setRoomTenant] = useState('');
  const [roomCategory, setRoomCategory] = useState('Poliklinik');
  const [roomStatus, setRoomStatus] = useState<RoomStatus>('active');
  const [roomTags, setRoomTags] = useState('');
  const [roomDescription, setRoomDescription] = useState('');

  const nodeTypeOptions: FloorNodeType[] = ['room', 'corridor', 'stairs', 'elevator', 'lobby'];
  const roomStatusOptions: RoomStatus[] = ['active', 'empty', 'closed', 'hidden'];
  const entryTypeOptions: { id: LocationEntryType; label: string; hint: string }[] = [
    { id: 'main', label: 'Ana Giriş', hint: 'Zemin veya ana lobi' },
    { id: 'parking', label: 'Otopark', hint: '-2 / -1 girişleri' },
    { id: 'side', label: 'Yan / Servis', hint: 'Acil veya servis kapısı' },
  ];

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    const { data, error } = await supabase.from('locations').select('*').order('created_at', { ascending: false });
    if (!error && data) setLocations(data);
  };

  const fetchFloorsForLocation = async (locationId: string) => {
    const { data, error } = await supabase.from('location_floors').select('*').eq('location_id', locationId).order('floor_index', { ascending: true });
    if (!error && data) setFloors(data);
  };

  const fetchNodesForFloor = async (floorId: string) => {
    const { data, error } = await supabase
      .from('floor_nodes')
      .select('*')
      .eq('location_floor_id', floorId)
      .order('created_at', { ascending: true });
    if (!error && data) setFloorNodes(data);
  };

  const handleCreateLocation = async () => {
    if (!newLocationName.trim()) {
      Alert.alert('Hata', 'Bina adı gerekli');
      return;
    }
    try {
      await createLocation({
        name: newLocationName,
        city: newLocationCity || null,
        district: newLocationDistrict || null,
        polygon: null,
      });
      Alert.alert('Başarılı', 'Bina oluşturuldu');
      setNewLocationName('');
      setNewLocationCity('');
      setNewLocationDistrict('');
      fetchLocations();
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    }
  };

  const handleAddFloor = async () => {
    if (!selectedLocation) {
      Alert.alert('Hata', 'Önce bir bina seçin');
      return;
    }
    try {
      await addFloor({
        location_id: selectedLocation.id,
        floor_index: parseInt(newFloorIndex, 10),
        label: newFloorLabel,
        entry_type: newFloorEntryType,
        plan_image_url: null,
        calibration: null,
      });
      Alert.alert('Başarılı', 'Kat eklendi');
      setNewFloorIndex('0');
      setNewFloorLabel('Zemin Kat');
      setNewFloorEntryType('main');
      fetchFloorsForLocation(selectedLocation.id);
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    }
  };

  const selectLocation = (loc: Location) => {
    setSelectedLocation(loc);
    fetchFloorsForLocation(loc.id);
    setSelectedFloor(null);
    setFloorNodes([]);
    setSelectedNode(null);
  };

  const selectFloor = (floor: LocationFloor) => {
    setSelectedFloor(floor);
    setSelectedNode(null);
    fetchNodesForFloor(floor.id);
  };

  const selectNode = (node: FloorNode) => {
    setSelectedNode(node);
    setRoomNumber(node.code || '');
    setRoomTenant(node.name || '');
  };

  const handleAddNode = async () => {
    if (!selectedFloor) {
      Alert.alert('Hata', 'Önce bir kat seçin');
      return;
    }
    try {
      await addFloorNode({
        location_floor_id: selectedFloor.id,
        type: newNodeType,
        code: newNodeCode || null,
        name: newNodeName || null,
        x: parseFloat(newNodeX) || 0,
        y: parseFloat(newNodeY) || 0,
        gps_lat: newNodeLat ? parseFloat(newNodeLat) : null,
        gps_lng: newNodeLng ? parseFloat(newNodeLng) : null,
        is_hidden: isNodeHidden,
        is_featured: isNodeFeatured,
      });
      Alert.alert('Başarılı', 'Node eklendi');
      setNewNodeName('');
      setNewNodeCode('');
      setNewNodeX('0');
      setNewNodeY('0');
      setNewNodeLat('');
      setNewNodeLng('');
      setIsNodeFeatured(false);
      setIsNodeHidden(false);
      fetchNodesForFloor(selectedFloor.id);
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    }
  };

  const handleSaveRoomDetail = async () => {
    if (!selectedNode) {
      Alert.alert('Hata', 'Önce bir oda/node seçin');
      return;
    }
    try {
      await upsertRoomDetail({
        floor_node_id: selectedNode.id,
        room_number: roomNumber || null,
        tenant_name: roomTenant || null,
        category: roomCategory || null,
        status: roomStatus,
        tags: roomTags ? roomTags.split(',').map(tag => tag.trim()) : null,
        description: roomDescription || null,
      });
      Alert.alert('Başarılı', 'Oda detayı güncellendi');
      setRoomDescription('');
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📍 Konum Yönetimi (Admin)</Text>

      {/* Bina Listesi */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Binalar</Text>
        {locations.map(loc => (
          <TouchableOpacity
            key={loc.id}
            style={[styles.locationItem, selectedLocation?.id === loc.id && styles.locationItemSelected]}
            onPress={() => selectLocation(loc)}
          >
            <Text style={styles.locationName}>{loc.name}</Text>
            <Text style={styles.locationDetail}>{loc.city} - {loc.district}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Yeni Bina Ekle */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>➕ Yeni Bina Ekle</Text>
        <TextInput
          style={styles.input}
          placeholder="Bina Adı (örn: İzmir Şehir Hastanesi)"
          value={newLocationName}
          onChangeText={setNewLocationName}
        />
        <TextInput
          style={styles.input}
          placeholder="Şehir"
          value={newLocationCity}
          onChangeText={setNewLocationCity}
        />
        <TextInput
          style={styles.input}
          placeholder="İlçe"
          value={newLocationDistrict}
          onChangeText={setNewLocationDistrict}
        />
        <TouchableOpacity style={styles.button} onPress={handleCreateLocation}>
          <Text style={styles.buttonText}>Bina Oluştur</Text>
        </TouchableOpacity>
      </View>

      {/* Seçili Binanın Katları */}
      {selectedLocation && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏢 {selectedLocation.name} - Katlar</Text>
          {floors.map(floor => (
            <TouchableOpacity
              key={floor.id}
              style={[styles.floorItem, selectedFloor?.id === floor.id && styles.floorItemSelected]}
              onPress={() => selectFloor(floor)}
            >
              <Text style={styles.floorLabel}>{floor.label}</Text>
              <Text style={styles.floorIndex}>Kat: {floor.floor_index}</Text>
            </TouchableOpacity>
          ))}

          {/* Yeni Kat Ekle */}
          <View style={styles.subSection}>
            <Text style={styles.subTitle}>➕ Yeni Kat Ekle</Text>
            <TextInput
              style={styles.input}
              placeholder="Kat No (örn: -2, 0, 1, 2)"
              value={newFloorIndex}
              onChangeText={setNewFloorIndex}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Kat Adı (örn: -2 Otopark, Zemin Kat)"
              value={newFloorLabel}
              onChangeText={setNewFloorLabel}
            />
            <View style={styles.typeRow}>
              {entryTypeOptions.map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.typeChip, newFloorEntryType === option.id && styles.typeChipActive]}
                  onPress={() => setNewFloorEntryType(option.id)}
                >
                  <Text style={styles.typeChipText}>{option.label}</Text>
                  <Text style={styles.typeChipHint}>{option.hint}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.button} onPress={handleAddFloor}>
              <Text style={styles.buttonText}>Kat Ekle</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Kat seçildiyse node yönetimi */}
      {selectedFloor && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧭 {selectedFloor.label} - Node & Oda Yönetimi</Text>

          {/* Node listesi */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.nodePillsRow}>
            {floorNodes.map(node => (
              <TouchableOpacity
                key={node.id}
                style={[styles.nodePill, selectedNode?.id === node.id && styles.nodePillSelected]}
                onPress={() => selectNode(node)}
              >
                <Text style={styles.nodePillType}>{node.type.toUpperCase()}</Text>
                <Text style={styles.nodePillLabel}>{node.name || node.code || 'İsimsiz'}</Text>
              </TouchableOpacity>
            ))}
            {floorNodes.length === 0 && (
              <Text style={styles.emptyHint}>Bu katta henüz node yok. Aşağıdan ekleyin.</Text>
            )}
          </ScrollView>

          {/* Yeni node formu */}
          <View style={styles.subSection}>
            <Text style={styles.subTitle}>🚪 Kapı / Node Oluştur</Text>
            <View style={styles.typeRow}>
              {nodeTypeOptions.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeChip, newNodeType === type && styles.typeChipActive]}
                  onPress={() => setNewNodeType(type)}
                >
                  <Text style={styles.typeChipText}>{type.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Oda Adı"
              value={newNodeName}
              onChangeText={setNewNodeName}
            />
            <TextInput
              style={styles.input}
              placeholder="Oda Kodu (örn: A1-12)"
              value={newNodeCode}
              onChangeText={setNewNodeCode}
            />
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="X"
                value={newNodeX}
                onChangeText={setNewNodeX}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.halfInput, styles.halfInputLast]}
                placeholder="Y"
                value={newNodeY}
                onChangeText={setNewNodeY}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="GPS Lat"
                value={newNodeLat}
                onChangeText={setNewNodeLat}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.input, styles.halfInput, styles.halfInputLast]}
                placeholder="GPS Lng"
                value={newNodeLng}
                onChangeText={setNewNodeLng}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleChip, isNodeFeatured && styles.toggleChipActive]}
                onPress={() => setIsNodeFeatured(!isNodeFeatured)}
              >
                <Text style={styles.toggleText}>{isNodeFeatured ? '⭐ Öne Çıkan' : 'Öne Çıkarma'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleChip, isNodeHidden && styles.toggleChipActive]}
                onPress={() => setIsNodeHidden(!isNodeHidden)}
              >
                <Text style={styles.toggleText}>{isNodeHidden ? '🙈 Gizli' : 'Gizli Yap'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleAddNode}>
              <Text style={styles.buttonText}>Node Ekle</Text>
            </TouchableOpacity>
          </View>

          {/* Oda detay formu */}
          <View style={styles.subSection}>
            <Text style={styles.subTitle}>📝 Oda Detayı</Text>
            {selectedNode ? (
              <Text style={styles.selectedNodeLabel}>Seçilen node: {selectedNode.name || selectedNode.code}</Text>
            ) : (
              <Text style={styles.emptyHint}>Oda bilgisi girmek için üstten bir node seçin.</Text>
            )}
            <TextInput
              style={styles.input}
              placeholder="Oda No"
              value={roomNumber}
              onChangeText={setRoomNumber}
            />
            <TextInput
              style={styles.input}
              placeholder="Kuruluş / Kiracı"
              value={roomTenant}
              onChangeText={setRoomTenant}
            />
            <TextInput
              style={styles.input}
              placeholder="Kategori (örn: Acil, Poliklinik)"
              value={roomCategory}
              onChangeText={setRoomCategory}
            />
            <View style={styles.typeRow}>
              {roomStatusOptions.map(status => (
                <TouchableOpacity
                  key={status}
                  style={[styles.typeChip, roomStatus === status && styles.typeChipActive]}
                  onPress={() => setRoomStatus(status)}
                >
                  <Text style={styles.typeChipText}>{status.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Etiketler (virgülle ayır)"
              value={roomTags}
              onChangeText={setRoomTags}
            />
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Açıklama"
              value={roomDescription}
              onChangeText={setRoomDescription}
              multiline
            />
            <TouchableOpacity style={styles.button} onPress={handleSaveRoomDetail}>
              <Text style={styles.buttonText}>Oda Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1d22',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00d4ff',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#2a2d32',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffddaa',
    marginBottom: 12,
  },
  locationItem: {
    backgroundColor: '#3a3d42',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00d4ff',
  },
  locationItemSelected: {
    backgroundColor: '#4a4d52',
    borderLeftColor: '#00ff88',
  },
  locationName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  locationDetail: {
    fontSize: 12,
    color: '#b0b3b8',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#3a3d42',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4a4d52',
  },
  button: {
    backgroundColor: '#00d4ff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#1a1d22',
    fontSize: 14,
    fontWeight: '700',
  },
  floorItem: {
    backgroundColor: '#3a3d42',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  floorIndex: {
    fontSize: 12,
    color: '#b0b3b8',
  },
  floorItemSelected: {
    borderLeftColor: '#00ff88',
    borderLeftWidth: 3,
    backgroundColor: '#41444a',
  },
  subSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#4a4d52',
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffddaa',
    marginBottom: 12,
  },
  nodePillsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  nodePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#3a3d42',
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#4a4d52',
  },
  nodePillSelected: {
    borderColor: '#00d4ff',
    backgroundColor: '#004659',
  },
  nodePillType: {
    color: '#ffddaa',
    fontSize: 10,
    fontWeight: '700',
  },
  nodePillLabel: {
    color: '#fff',
    fontSize: 12,
  },
  emptyHint: {
    color: '#b0b3b8',
    fontSize: 12,
    paddingVertical: 8,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4a4d52',
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  typeChipActive: {
    borderColor: '#00d4ff',
    backgroundColor: '#003546',
  },
  typeChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  typeChipHint: {
    color: '#b0b3b8',
    fontSize: 10,
  },
  rowInputs: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
    marginRight: 12,
  },
  halfInputLast: {
    marginRight: 0,
  },
  toggleRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  toggleChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4a4d52',
    alignItems: 'center',
    marginRight: 12,
  },
  toggleChipActive: {
    borderColor: '#00ff88',
    backgroundColor: '#0b3a1f',
  },
  toggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedNodeLabel: {
    color: '#00ff88',
    fontSize: 12,
    marginBottom: 8,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
