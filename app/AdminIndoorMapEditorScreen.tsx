import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

interface Venue {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  floor_count: number;
  created_by: string;
}

interface Floor {
  id: string;
  venue_id: string;
  floor_number: number;
  name: string;
  blueprint_url?: string;
  blueprint_width?: number;
  blueprint_height?: number;
  scale_meters_per_pixel?: number;
}

interface Node {
  id: string;
  floor_id: string;
  x: number;
  y: number;
  type: 'room' | 'corridor' | 'entrance' | 'elevator' | 'stairs';
  label: string;
}

export default function AdminIndoorMapEditorScreen() {
  const [userEmail, setUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);

  // Yeni venue formu
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');
  const [newVenueLat, setNewVenueLat] = useState('');
  const [newVenueLng, setNewVenueLng] = useState('');
  const [newVenueFloors, setNewVenueFloors] = useState('3');
  const [newVenueType, setNewVenueType] = useState('hospital');
  const [newVenueActive, setNewVenueActive] = useState(true);

  // Yeni floor formu
  const [newFloorNumber, setNewFloorNumber] = useState('0');
  const [newFloorName, setNewFloorName] = useState('Zemin Kat');

  // Yeni node formu
  const [newNodeX, setNewNodeX] = useState('');
  const [newNodeY, setNewNodeY] = useState('');
  const [newNodeType, setNewNodeType] = useState<Node['type']>('corridor');
  const [newNodeLabel, setNewNodeLabel] = useState('');

  const [message, setMessage] = useState('');

  // Kroki görüntüleme için
  const [blueprintUri, setBlueprintUri] = useState<string | null>(null);
  const [blueprintDimensions, setBlueprintDimensions] = useState({ width: 0, height: 0 });
  const [showBlueprintEditor, setShowBlueprintEditor] = useState(false);
  const [clickMode, setClickMode] = useState<'view' | 'add'>('view');
  const screenWidth = Dimensions.get('window').width;
  const maxBlueprintWidth = screenWidth - 32; // padding

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setMessage('❌ Giriş yapmalısınız');
      setLoading(false);
      return;
    }

    const email = userData.user.email;
    setUserEmail(email || '');

    // Admin kontrolü - sadece ejderha112@gmail.com
    if (email === 'ejderha112@gmail.com') {
      setIsAdmin(true);
      fetchVenues();
    } else {
      setMessage('❌ Bu sayfaya erişim yetkiniz yok. Sadece admin erişebilir.');
    }
    setLoading(false);
  };

  const fetchVenues = async () => {
    const { data, error } = await supabase
      .from('indoor_venues')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Venue yükleme hatası:', error);
      return;
    }

    setVenues(data || []);
  };

  const createVenue = async () => {
    if (!newVenueName.trim() || !newVenueAddress.trim()) {
      setMessage('❌ Venue adı ve adres zorunlu');
      return;
    }

    const lat = parseFloat(newVenueLat);
    const lng = parseFloat(newVenueLng);
    const floorCount = parseInt(newVenueFloors);

    if (isNaN(lat) || isNaN(lng)) {
      setMessage('❌ Geçerli GPS koordinatları girin');
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('indoor_venues')
      .insert({
        name: newVenueName.trim(),
        address: newVenueAddress.trim(),
        latitude: lat,
        longitude: lng,
        floor_count: floorCount,
        created_by: userData?.user?.id,
        type: newVenueType,
        active: newVenueActive,
      })
      .select()
      .single();

    if (error) {
      setMessage('❌ Venue oluşturulamadı: ' + error.message);
      return;
    }

    setMessage('✅ Venue oluşturuldu!');
    setNewVenueName('');
    setNewVenueAddress('');
    setNewVenueLat('');
    setNewVenueLng('');
    fetchVenues();
  };

  const selectVenue = async (venue: Venue) => {
    setSelectedVenue(venue);
    setSelectedFloor(null);
    setNodes([]);

    const { data, error } = await supabase
      .from('indoor_floors')
      .select('*')
      .eq('venue_id', venue.id)
      .order('floor_number', { ascending: true });

    if (error) {
      console.error('Kat yükleme hatası:', error);
      return;
    }

    setFloors(data || []);
  };

  const createFloor = async () => {
    if (!selectedVenue) {
      setMessage('❌ Önce bir venue seçin');
      return;
    }

    const floorNum = parseInt(newFloorNumber);
    if (isNaN(floorNum)) {
      setMessage('❌ Geçerli kat numarası girin');
      return;
    }

    const { data, error } = await supabase
      .from('indoor_floors')
      .insert({
        venue_id: selectedVenue.id,
        floor_number: floorNum,
        name: newFloorName.trim() || `Kat ${floorNum}`,
      })
      .select()
      .single();

    if (error) {
      setMessage('❌ Kat oluşturulamadı: ' + error.message);
      return;
    }

    setMessage('✅ Kat oluşturuldu!');
    setNewFloorNumber('');
    setNewFloorName('');
    selectVenue(selectedVenue);
  };

  const uploadBlueprint = async (floor: Floor) => {
    try {
      // Galeri izni iste
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setMessage('❌ Galeri izni gerekli');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;
      const { width, height } = result.assets[0];

      // Kroki URL'ini floor'a kaydet
      const { error } = await supabase
        .from('indoor_floors')
        .update({
          blueprint_url: uri, // Demo için local URI
          blueprint_width: width,
          blueprint_height: height,
          scale_meters_per_pixel: 0.1, // Varsayılan: 1 pixel = 10cm
        })
        .eq('id', floor.id);

      if (error) {
        setMessage('❌ Kroki kaydedilemedi: ' + error.message);
        return;
      }

      setMessage('✅ Kroki yüklendi! Artık üzerine tıklayarak nokta ekleyebilirsiniz.');
      
      // Kroki editörünü aç
      setBlueprintUri(uri);
      setBlueprintDimensions({ width: width || 800, height: height || 600 });
      setShowBlueprintEditor(true);
      setClickMode('view');
      
      // Floor'u yeniden yükle
      if (selectedVenue) selectVenue(selectedVenue);
    } catch (error) {
      setMessage('❌ Kroki yüklenemedi: ' + (error as Error).message);
    }
  };

  const handleBlueprintPress = (event: any) => {
    if (clickMode !== 'add') return;
    if (!selectedFloor) return;

    const { locationX, locationY } = event.nativeEvent;
    
    // Tıklanan koordinatları kaydet
    setNewNodeX(locationX.toFixed(1));
    setNewNodeY(locationY.toFixed(1));
    setMessage(`📍 Koordinat seçildi: (${locationX.toFixed(1)}, ${locationY.toFixed(1)})`);
    setClickMode('view');
  };

  const openBlueprintEditor = () => {
    if (!selectedFloor?.blueprint_url) {
      setMessage('❌ Önce kroki yükleyin');
      return;
    }
    
    setBlueprintUri(selectedFloor.blueprint_url);
    setBlueprintDimensions({
      width: selectedFloor.blueprint_width || 800,
      height: selectedFloor.blueprint_height || 600,
    });
    setShowBlueprintEditor(true);
    setClickMode('view');
  };

  const selectFloor = async (floor: Floor) => {
    setSelectedFloor(floor);

    const { data, error } = await supabase
      .from('indoor_nodes')
      .select('*')
      .eq('floor_id', floor.id);

    if (error) {
      console.error('Node yükleme hatası:', error);
      return;
    }

    setNodes(data || []);
  };

  const createNode = async () => {
    if (!selectedFloor) {
      setMessage('❌ Önce bir kat seçin');
      return;
    }

    const x = parseFloat(newNodeX);
    const y = parseFloat(newNodeY);

    if (isNaN(x) || isNaN(y)) {
      setMessage('❌ Geçerli X,Y koordinatları girin');
      return;
    }

    if (!newNodeLabel.trim()) {
      setMessage('❌ Oda/Koridor adı girin');
      return;
    }

    const { data, error } = await supabase
      .from('indoor_nodes')
      .insert({
        floor_id: selectedFloor.id,
        x,
        y,
        type: newNodeType,
        label: newNodeLabel.trim(),
      })
      .select()
      .single();

    if (error) {
      setMessage('❌ Nokta oluşturulamadı: ' + error.message);
      return;
    }

    setMessage('✅ Nokta oluşturuldu!');
    setNewNodeX('');
    setNewNodeY('');
    setNewNodeLabel('');
    selectFloor(selectedFloor);
  };

  const deleteNode = async (nodeId: string) => {
    if (Platform.OS === 'web') {
      if (!confirm('Bu noktayı silmek istediğinizden emin misiniz?')) return;
    } else {
      Alert.alert(
        'Nokta Sil',
        'Bu noktayı silmek istediğinizden emin misiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: async () => {
              await performDelete(nodeId);
            },
          },
        ]
      );
      return;
    }

    await performDelete(nodeId);
  };

  const performDelete = async (nodeId: string) => {
    const { error } = await supabase
      .from('indoor_nodes')
      .delete()
      .eq('id', nodeId);

    if (error) {
      setMessage('❌ Silme başarısız: ' + error.message);
      return;
    }

    setMessage('✅ Nokta silindi');
    if (selectedFloor) selectFloor(selectedFloor);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.errorBox}>
          <Text style={styles.errorIcon}>🚫</Text>
          <Text style={styles.errorTitle}>Erişim Engellendi</Text>
          <Text style={styles.errorText}>{message}</Text>
          <Text style={styles.errorSubtext}>
            Giriş yapan kullanıcı: {userEmail || 'Bilinmiyor'}
          </Text>
          <Text style={styles.errorSubtext}>
            Yetkili kullanıcı: ejderha112@gmail.com
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Kroki Editörü Modal */}
      {showBlueprintEditor && blueprintUri && (
        <View style={styles.blueprintEditorOverlay}>
          <View style={styles.blueprintEditorContainer}>
            <View style={styles.blueprintEditorHeader}>
              <Text style={styles.blueprintEditorTitle}>
                🗺️ Kroki Editörü - {selectedFloor?.name}
              </Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  setShowBlueprintEditor(false);
                  setClickMode('view');
                }}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.blueprintModeBar}>
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  clickMode === 'view' && styles.modeBtnActive,
                ]}
                onPress={() => setClickMode('view')}
              >
                <Text style={styles.modeBtnText}>
                  👁️ Görüntüle
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  clickMode === 'add' && styles.modeBtnActive,
                ]}
                onPress={() => setClickMode('add')}
              >
                <Text style={styles.modeBtnText}>
                  ➕ Nokta Ekle
                </Text>
              </TouchableOpacity>
            </View>

            {clickMode === 'add' && (
              <View style={styles.blueprintHintBox}>
                <Text style={styles.blueprintHintText}>
                  📍 Kroki üzerinde istediğiniz yere dokunun
                </Text>
              </View>
            )}

            <ScrollView style={styles.blueprintScrollContainer}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={handleBlueprintPress}
                style={styles.blueprintTouchable}
              >
                <Image
                  source={{ uri: blueprintUri }}
                  style={{
                    width: maxBlueprintWidth,
                    height:
                      (blueprintDimensions.height / blueprintDimensions.width) *
                      maxBlueprintWidth,
                  }}
                  resizeMode="contain"
                />
                
                {/* Mevcut noktaları göster */}
                {nodes.map((node) => {
                  const scale = maxBlueprintWidth / blueprintDimensions.width;
                  const displayX = node.x * scale;
                  const displayY = node.y * scale;
                  
                  return (
                    <View
                      key={node.id}
                      style={[
                        styles.blueprintMarker,
                        {
                          left: displayX - 12,
                          top: displayY - 12,
                          backgroundColor:
                            node.type === 'entrance'
                              ? '#28a745'
                              : node.type === 'room'
                              ? '#007AFF'
                              : node.type === 'elevator'
                              ? '#9b5de5'
                              : node.type === 'stairs'
                              ? '#f77f00'
                              : '#6c757d',
                        },
                      ]}
                    >
                      <Text style={styles.blueprintMarkerText}>
                        {node.type === 'entrance' && '🚪'}
                        {node.type === 'room' && '🚪'}
                        {node.type === 'corridor' && '🚶'}
                        {node.type === 'elevator' && '🛗'}
                        {node.type === 'stairs' && '🪜'}
                      </Text>
                      <View style={styles.blueprintMarkerLabel}>
                        <Text style={styles.blueprintMarkerLabelText}>
                          {node.label}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.blueprintEditorFooter}>
              <Text style={styles.blueprintEditorFooterText}>
                💡 {nodes.length} nokta işaretlendi
              </Text>
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setShowBlueprintEditor(false)}
              >
                <Text style={styles.doneBtnText}>✓ Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>🗺️ İç Mekan Harita Editörü</Text>
        <Text style={styles.subtitle}>Admin: {userEmail}</Text>
      </View>

      {message ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      {/* Venue Oluşturma */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Yeni Mekan Ekle</Text>
        <Text style={styles.helpText}>
          Hastane, AVM, vb. için temel bilgileri girin
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="Mekan Adı (ör: İzmir Şehir Hastanesi)"
          value={newVenueName}
          onChangeText={setNewVenueName}
        />
        <TextInput
          style={styles.input}
          placeholder="Adres"
          value={newVenueAddress}
          onChangeText={setNewVenueAddress}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Enlem (38.4613)"
            value={newVenueLat}
            onChangeText={setNewVenueLat}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Boylam (27.2069)"
            value={newVenueLng}
            onChangeText={setNewVenueLng}
            keyboardType="decimal-pad"
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Kat Sayısı (varsayılan: 3)"
          value={newVenueFloors}
          onChangeText={setNewVenueFloors}
          keyboardType="number-pad"
        />
        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              newVenueType === 'hospital' && styles.typeBtnActive,
            ]}
            onPress={() => setNewVenueType('hospital')}
          >
            <Text style={styles.typeBtnText}>🏥 Hastane</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              newVenueType === 'shopping_mall' && styles.typeBtnActive,
            ]}
            onPress={() => setNewVenueType('shopping_mall')}
          >
            <Text style={styles.typeBtnText}>🛍️ AVM</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <Text style={styles.activeLabel}>Aktif:</Text>
          <TouchableOpacity
            style={[
              styles.activeBtn,
              newVenueActive && styles.activeBtnActive,
            ]}
            onPress={() => setNewVenueActive(true)}
          >
            <Text style={styles.activeBtnText}>✅ Evet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.activeBtn,
              !newVenueActive && styles.activeBtnActive,
            ]}
            onPress={() => setNewVenueActive(false)}
          >
            <Text style={styles.activeBtnText}>❌ Hayır</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={createVenue}>
          <Text style={styles.primaryBtnText}>+ Mekan Oluştur</Text>
        </TouchableOpacity>
      </View>

      {/* Venue Listesi */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏢 Mekanlar ({venues.length})</Text>
        {venues.map((venue) => (
          <TouchableOpacity
            key={venue.id}
            style={[
              styles.venueCard,
              selectedVenue?.id === venue.id && styles.selectedCard,
            ]}
            onPress={() => selectVenue(venue)}
          >
            <Text style={styles.venueCardTitle}>{venue.name}</Text>
            <Text style={styles.venueCardText}>{venue.address}</Text>
            <Text style={styles.venueCardText}>
              📍 {venue.latitude}, {venue.longitude}
            </Text>
            <Text style={styles.venueCardText}>
              🏢 {venue.floor_count} kat
            </Text>
          </TouchableOpacity>
        ))}
        {venues.length === 0 && (
          <Text style={styles.emptyText}>Henüz mekan eklenmemiş</Text>
        )}
      </View>

      {/* Kat Ekleme */}
      {selectedVenue && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🏢 Katlar - {selectedVenue.name}
          </Text>
          
          <View style={styles.formRow}>
            <TextInput
              style={[styles.input, styles.smallInput]}
              placeholder="Kat No (0)"
              value={newFloorNumber}
              onChangeText={setNewFloorNumber}
              keyboardType="number-pad"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Kat Adı (Zemin Kat)"
              value={newFloorName}
              onChangeText={setNewFloorName}
            />
            <TouchableOpacity style={styles.addBtn} onPress={createFloor}>
              <Text style={styles.addBtnText}>+ Ekle</Text>
            </TouchableOpacity>
          </View>

          {floors.map((floor) => (
            <View key={floor.id} style={styles.floorCard}>
              <TouchableOpacity
                style={[
                  styles.floorContent,
                  selectedFloor?.id === floor.id && styles.selectedFloor,
                ]}
                onPress={() => selectFloor(floor)}
              >
                <Text style={styles.floorTitle}>
                  Kat {floor.floor_number}: {floor.name}
                </Text>
                {floor.blueprint_url && (
                  <Text style={styles.floorSubtext}>✓ Kroki yüklü</Text>
                )}
              </TouchableOpacity>
              <View style={styles.floorActions}>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={() => uploadBlueprint(floor)}
                >
                  <Text style={styles.uploadBtnText}>
                    {floor.blueprint_url ? '🔄' : '📷'} Kroki
                  </Text>
                </TouchableOpacity>
                {floor.blueprint_url && (
                  <TouchableOpacity
                    style={styles.viewBlueprintBtn}
                    onPress={() => {
                      selectFloor(floor);
                      openBlueprintEditor();
                    }}
                  >
                    <Text style={styles.viewBlueprintBtnText}>👁️ Görüntüle</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          {floors.length === 0 && (
            <Text style={styles.emptyText}>Henüz kat eklenmemiş</Text>
          )}
        </View>
      )}

      {/* Node Ekleme */}
      {selectedFloor && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🎯 Noktalar - {selectedFloor.name}
          </Text>
          <Text style={styles.helpText}>
            Odalar, koridorlar ve önemli noktaları ekleyin
          </Text>

          {selectedFloor?.blueprint_url && (
            <TouchableOpacity
              style={styles.blueprintSelectBtn}
              onPress={() => {
                openBlueprintEditor();
                setTimeout(() => setClickMode('add'), 100);
              }}
            >
              <Text style={styles.blueprintSelectBtnText}>
                🗺️ Krokiden Koordinat Seç
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="X koordinat"
              value={newNodeX}
              onChangeText={setNewNodeX}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Y koordinat"
              value={newNodeY}
              onChangeText={setNewNodeY}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.typeRow}>
            {(['corridor', 'room', 'entrance', 'elevator', 'stairs'] as const).map(
              (type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeBtn,
                    newNodeType === type && styles.typeBtnActive,
                  ]}
                  onPress={() => setNewNodeType(type)}
                >
                  <Text style={styles.typeBtnText}>
                    {type === 'corridor' && '🚶 Koridor'}
                    {type === 'room' && '🚪 Oda'}
                    {type === 'entrance' && '🚪 Giriş'}
                    {type === 'elevator' && '🛗 Asansör'}
                    {type === 'stairs' && '🪜 Merdiven'}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Oda/Koridor Adı (ör: Acil Servis)"
            value={newNodeLabel}
            onChangeText={setNewNodeLabel}
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={createNode}>
            <Text style={styles.primaryBtnText}>+ Nokta Ekle</Text>
          </TouchableOpacity>

          {/* Node Listesi */}
          <View style={styles.nodeList}>
            <Text style={styles.nodeListTitle}>
              Eklenen Noktalar ({nodes.length})
            </Text>
            {nodes.map((node) => (
              <View key={node.id} style={styles.nodeCard}>
                <View style={styles.nodeInfo}>
                  <Text style={styles.nodeLabel}>{node.label}</Text>
                  <Text style={styles.nodeDetails}>
                    {node.type} • ({node.x.toFixed(1)}, {node.y.toFixed(1)})
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteNode(node.id)}
                >
                  <Text style={styles.deleteBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
            {nodes.length === 0 && (
              <Text style={styles.emptyText}>Henüz nokta eklenmemiş</Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 İpucu: Önce mekan oluşturun, sonra katları ekleyin, son olarak
          her kata ait odaları ve koridorları işaretleyin.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#007AFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
  errorBox: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dc3545',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: '#721c24',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  messageBox: {
    margin: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  messageText: {
    fontSize: 14,
    color: '#0d47a1',
    textAlign: 'center',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  smallInput: {
    width: 80,
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  addBtn: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  venueCard: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  selectedCard: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  venueCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  venueCardText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  floorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  floorContent: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  selectedFloor: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  floorTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  floorSubtext: {
    fontSize: 12,
    color: '#28a745',
    marginTop: 4,
  },
  floorActions: {
    flexDirection: 'row',
    gap: 6,
  },
  uploadBtn: {
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  viewBlueprintBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  viewBlueprintBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  blueprintSelectBtn: {
    backgroundColor: '#17a2b8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  blueprintSelectBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  blueprintEditorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 1000,
  },
  blueprintEditorContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  blueprintEditorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  blueprintEditorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    color: '#333',
    fontWeight: '700',
  },
  blueprintModeBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#f8f9fa',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  blueprintHintBox: {
    padding: 12,
    backgroundColor: '#fff3cd',
    borderBottomWidth: 1,
    borderBottomColor: '#ffc107',
  },
  blueprintHintText: {
    fontSize: 13,
    color: '#856404',
    textAlign: 'center',
  },
  blueprintScrollContainer: {
    flex: 1,
  },
  blueprintTouchable: {
    padding: 16,
  },
  blueprintMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  blueprintMarkerText: {
    fontSize: 12,
  },
  blueprintMarkerLabel: {
    position: 'absolute',
    top: 26,
    left: -20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 60,
  },
  blueprintMarkerLabelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  blueprintEditorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  blueprintEditorFooterText: {
    fontSize: 13,
    color: '#6c757d',
  },
  doneBtn: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  typeBtnActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeBtnText: {
    fontSize: 13,
    color: '#333',
  },
  nodeList: {
    marginTop: 16,
  },
  nodeListTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  nodeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 6,
  },
  nodeInfo: {
    flex: 1,
  },
  nodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  nodeDetails: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },
  deleteBtnText: {
    fontSize: 18,
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  footer: {
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  footerText: {
    fontSize: 13,
    color: '#6c757d',
    lineHeight: 20,
  },
  activeLabel: {
    fontSize: 14,
    color: '#333',
    marginRight: 8,
    alignSelf: 'center',
  },
  activeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#f8f9fa',
    marginRight: 8,
  },
  activeBtnActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  activeBtnText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
});
