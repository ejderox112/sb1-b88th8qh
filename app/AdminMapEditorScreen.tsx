import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Switch,
} from 'react-native';
import { supabase } from '@/lib/supabase';

interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  floor_count?: number;
  building_type?: string;
  is_active: boolean;
  has_indoor_map: boolean;
  indoor_map_data?: any;
  created_at: string;
  updated_at: string;
}

interface Floor {
  floor_number: number;
  floor_name: string;
  svg_data?: string;
  points_of_interest: POI[];
}

interface POI {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  description?: string;
}

const BUILDING_TYPES = [
  { value: 'hospital', label: '🏥 Hastane' },
  { value: 'mall', label: '🛍️ Alışveriş Merkezi' },
  { value: 'airport', label: '✈️ Havaalanı' },
  { value: 'office', label: '🏢 Ofis Binası' },
  { value: 'university', label: '🎓 Üniversite' },
  { value: 'hotel', label: '🏨 Otel' },
  { value: 'other', label: '📍 Diğer' },
];

const POI_TYPES = [
  { value: 'entrance', label: '🚪 Giriş' },
  { value: 'exit', label: '🚪 Çıkış' },
  { value: 'elevator', label: '🛗 Asansör' },
  { value: 'stairs', label: '🪜 Merdiven' },
  { value: 'wc', label: '🚻 WC' },
  { value: 'cafe', label: '☕ Kafe' },
  { value: 'info', label: 'ℹ️ Bilgi' },
  { value: 'parking', label: '🅿️ Park' },
  { value: 'pharmacy', label: '💊 Eczane' },
  { value: 'atm', label: '💰 ATM' },
  { value: 'shop', label: '🛒 Mağaza' },
  { value: 'restaurant', label: '🍽️ Restoran' },
  { value: 'office', label: '🏢 Ofis' },
  { value: 'other', label: '📍 Diğer' },
];

export default function AdminMapEditorScreen() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [editMode, setEditMode] = useState<'list' | 'edit' | 'create' | 'indoor' | 'corners'>('list');

  // Create/Edit form states
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formLatitude, setFormLatitude] = useState('');
  const [formLongitude, setFormLongitude] = useState('');
  const [formFloorCount, setFormFloorCount] = useState('');
  const [formBuildingType, setFormBuildingType] = useState('hospital');
  const [formIsActive, setFormIsActive] = useState(true);

  // Indoor map editor states
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<number>(0);
  const [poiName, setPoiName] = useState('');
  const [poiType, setPoiType] = useState('entrance');
  const [poiX, setPoiX] = useState('');
  const [poiY, setPoiY] = useState('');
  const [poiDescription, setPoiDescription] = useState('');

  // Building corners (4 köşe pin sistemi)
  const [corners, setCorners] = useState<Array<{
    corner_number: number;
    latitude: string;
    longitude: string;
    description: string;
  }>>([
    { corner_number: 1, latitude: '', longitude: '', description: 'Kuzey-Batı Köşe' },
    { corner_number: 2, latitude: '', longitude: '', description: 'Kuzey-Doğu Köşe' },
    { corner_number: 3, latitude: '', longitude: '', description: 'Güney-Doğu Köşe' },
    { corner_number: 4, latitude: '', longitude: '', description: 'Güney-Batı Köşe' },
  ]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchLocations();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData?.user) {
        Alert.alert('Hata', 'Giriş yapmalısınız');
        setLoading(false);
        return;
      }

      // SECURITY: Only hardcoded admin email - NO database checks
      // This prevents ANY bypass attempt through database manipulation
      const userEmail = userData.user.email || '';
      
      if (userEmail !== 'ejderha112@gmail.com') {
        Alert.alert('Erişim Engellendi', 'Yetkisiz erişim tespit edildi');
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    } catch (error) {
      Alert.alert('Hata', 'Güvenlik kontrolü yapılamadı');
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLocations(data || []);
    } catch (error) {
      Alert.alert('Hata', 'Lokasyonlar yüklenemedi: ' + (error as Error).message);
    }
  };

  const createLocation = async () => {
    if (!formName || !formAddress || !formLatitude || !formLongitude) {
      Alert.alert('Hata', 'Tüm zorunlu alanları doldurun');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('locations')
        .insert({
          name: formName,
          address: formAddress,
          latitude: parseFloat(formLatitude),
          longitude: parseFloat(formLongitude),
          floor_count: formFloorCount ? parseInt(formFloorCount) : null,
          building_type: formBuildingType,
          is_active: formIsActive,
          has_indoor_map: false,
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert('✅ Başarılı', 'Lokasyon oluşturuldu');
      resetForm();
      setEditMode('list');
      fetchLocations();
    } catch (error) {
      Alert.alert('Hata', 'Lokasyon oluşturulamadı: ' + (error as Error).message);
    }
  };

  const updateLocation = async () => {
    if (!selectedLocation) return;

    if (!formName || !formAddress || !formLatitude || !formLongitude) {
      Alert.alert('Hata', 'Tüm zorunlu alanları doldurun');
      return;
    }

    try {
      const { error } = await supabase
        .from('locations')
        .update({
          name: formName,
          address: formAddress,
          latitude: parseFloat(formLatitude),
          longitude: parseFloat(formLongitude),
          floor_count: formFloorCount ? parseInt(formFloorCount) : null,
          building_type: formBuildingType,
          is_active: formIsActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedLocation.id);

      if (error) throw error;

      Alert.alert('✅ Başarılı', 'Lokasyon güncellendi');
      resetForm();
      setEditMode('list');
      fetchLocations();
    } catch (error) {
      Alert.alert('Hata', 'Güncelleme başarısız: ' + (error as Error).message);
    }
  };

  const deleteLocation = async (locationId: string) => {
    Alert.alert(
      '⚠️ Dikkat',
      'Bu lokasyonu silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('locations')
                .delete()
                .eq('id', locationId);

              if (error) throw error;

              Alert.alert('✅ Başarılı', 'Lokasyon silindi');
              fetchLocations();
            } catch (error) {
              Alert.alert('Hata', 'Silme başarısız: ' + (error as Error).message);
            }
          },
        },
      ]
    );
  };

  const loadLocationForEdit = (location: Location) => {
    setSelectedLocation(location);
    setFormName(location.name);
    setFormAddress(location.address);
    setFormLatitude(location.latitude.toString());
    setFormLongitude(location.longitude.toString());
    setFormFloorCount(location.floor_count?.toString() || '');
    setFormBuildingType(location.building_type || 'hospital');
    setFormIsActive(location.is_active);
    setEditMode('edit');
  };

  const loadIndoorMapEditor = (location: Location) => {
    setSelectedLocation(location);
    
    // Load existing indoor map data
    if (location.indoor_map_data && location.indoor_map_data.floors) {
      setFloors(location.indoor_map_data.floors);
    } else {
      // Initialize empty floors based on floor_count
      const floorCount = location.floor_count || 1;
      const initialFloors: Floor[] = [];
      for (let i = 0; i < floorCount; i++) {
        initialFloors.push({
          floor_number: i,
          floor_name: `Kat ${i}`,
          points_of_interest: [],
        });
      }
      setFloors(initialFloors);
    }
    
    setSelectedFloor(0);
    setEditMode('indoor');
  };

  const loadCornerEditor = async (location: Location) => {
    setSelectedLocation(location);
    
    // Mevcut köşeleri yükle
    try {
      const { data, error } = await supabase
        .from('building_corners')
        .select('*')
        .eq('location_id', location.id)
        .order('corner_number');
      
      if (!error && data && data.length > 0) {
        const loadedCorners = [1, 2, 3, 4].map(num => {
          const corner = data.find(c => c.corner_number === num);
          return corner ? {
            corner_number: num,
            latitude: corner.latitude.toString(),
            longitude: corner.longitude.toString(),
            description: corner.description || `Köşe ${num}`,
          } : {
            corner_number: num,
            latitude: '',
            longitude: '',
            description: `Köşe ${num}`,
          };
        });
        setCorners(loadedCorners);
      }
    } catch (error) {
      console.error('Köşe yükleme hatası:', error);
    }
    
    setEditMode('corners');
  };

  const saveCorners = async () => {
    if (!selectedLocation) return;

    // Validation - en az 3 köşe gerekli
    const filledCorners = corners.filter(c => c.latitude && c.longitude);
    if (filledCorners.length < 3) {
      Alert.alert('Hata', 'En az 3 köşe koordinatı girmelisiniz');
      return;
    }

    try {
      // Önce mevcut köşeleri sil
      await supabase
        .from('building_corners')
        .delete()
        .eq('location_id', selectedLocation.id);

      // Yeni köşeleri kaydet
      const cornersToInsert = filledCorners.map(corner => ({
        location_id: selectedLocation.id,
        corner_number: corner.corner_number,
        latitude: parseFloat(corner.latitude),
        longitude: parseFloat(corner.longitude),
        description: corner.description,
      }));

      const { error } = await supabase
        .from('building_corners')
        .insert(cornersToInsert);

      if (error) throw error;

      Alert.alert('✅ Başarılı', `${filledCorners.length} köşe koordinatı kaydedildi`);
      setEditMode('list');
      fetchLocations();
    } catch (error) {
      Alert.alert('Hata', 'Köşe kaydetme hatası: ' + (error as Error).message);
    }
  };

  const addPOI = () => {
    if (!poiName || !poiX || !poiY) {
      Alert.alert('Hata', 'POI adı, X ve Y koordinatlarını girin');
      return;
    }

    const newPOI: POI = {
      id: Date.now().toString(),
      name: poiName,
      type: poiType,
      x: parseFloat(poiX),
      y: parseFloat(poiY),
      description: poiDescription,
    };

    const updatedFloors = [...floors];
    updatedFloors[selectedFloor].points_of_interest.push(newPOI);
    setFloors(updatedFloors);

    // Reset form
    setPoiName('');
    setPoiX('');
    setPoiY('');
    setPoiDescription('');

    Alert.alert('✅ Başarılı', 'POI eklendi');
  };

  const removePOI = (poiId: string) => {
    const updatedFloors = [...floors];
    updatedFloors[selectedFloor].points_of_interest = updatedFloors[
      selectedFloor
    ].points_of_interest.filter((poi) => poi.id !== poiId);
    setFloors(updatedFloors);
  };

  const saveIndoorMap = async () => {
    if (!selectedLocation) return;

    try {
      const { error } = await supabase
        .from('locations')
        .update({
          has_indoor_map: true,
          indoor_map_data: { floors },
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedLocation.id);

      if (error) throw error;

      Alert.alert('✅ Başarılı', 'İç mekan haritası kaydedildi');
      setEditMode('list');
      fetchLocations();
    } catch (error) {
      Alert.alert('Hata', 'Kaydetme başarısız: ' + (error as Error).message);
    }
  };

  const resetForm = () => {
    setSelectedLocation(null);
    setFormName('');
    setFormAddress('');
    setFormLatitude('');
    setFormLongitude('');
    setFormFloorCount('');
    setFormBuildingType('hospital');
    setFormIsActive(true);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>⏳ Yükleniyor...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ Erişim yetkiniz yok</Text>
      </View>
    );
  }

  // List Mode
  if (editMode === 'list') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🗺️ Kroki & Adres Editör</Text>
          <Text style={styles.subtitle}>{locations.length} lokasyon</Text>
        </View>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => {
            resetForm();
            setEditMode('create');
          }}
        >
          <Text style={styles.createBtnText}>➕ Yeni Lokasyon Ekle</Text>
        </TouchableOpacity>

        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <Text style={styles.locationName}>{item.name}</Text>
                {!item.is_active && (
                  <Text style={styles.inactiveBadge}>❌ Pasif</Text>
                )}
                {item.has_indoor_map && (
                  <Text style={styles.mapBadge}>🗺️ Kroki Var</Text>
                )}
              </View>

              <Text style={styles.locationAddress}>{item.address}</Text>
              <Text style={styles.locationCoords}>
                📍 {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
              </Text>
              {item.floor_count && (
                <Text style={styles.locationFloors}>🏢 {item.floor_count} kat</Text>
              )}

              <View style={styles.locationActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#007AFF' }]}
                  onPress={() => loadLocationForEdit(item)}
                >
                  <Text style={styles.actionBtnText}>✏️ Düzenle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#FF9500' }]}
                  onPress={() => loadCornerEditor(item)}
                >
                  <Text style={styles.actionBtnText}>📍 4 Köşe</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#28a745' }]}
                  onPress={() => loadIndoorMapEditor(item)}
                >
                  <Text style={styles.actionBtnText}>🗺️ Kroki</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#dc3545' }]}
                  onPress={() => deleteLocation(item.id)}
                >
                  <Text style={styles.actionBtnText}>🗑️ Sil</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>
    );
  }

  // Create/Edit Mode
  if (editMode === 'create' || editMode === 'edit') {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {editMode === 'create' ? '➕ Yeni Lokasyon' : '✏️ Lokasyon Düzenle'}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Lokasyon Adı *</Text>
          <TextInput
            style={styles.input}
            value={formName}
            onChangeText={setFormName}
            placeholder="Örn: İzmir Şehir Hastanesi"
          />

          <Text style={styles.label}>Adres *</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={formAddress}
            onChangeText={setFormAddress}
            placeholder="Tam adres"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Enlem (Latitude) *</Text>
          <TextInput
            style={styles.input}
            value={formLatitude}
            onChangeText={setFormLatitude}
            placeholder="38.4613"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Boylam (Longitude) *</Text>
          <TextInput
            style={styles.input}
            value={formLongitude}
            onChangeText={setFormLongitude}
            placeholder="27.2069"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Kat Sayısı</Text>
          <TextInput
            style={styles.input}
            value={formFloorCount}
            onChangeText={setFormFloorCount}
            placeholder="5"
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Bina Tipi</Text>
          <View style={styles.typeGrid}>
            {BUILDING_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeChip,
                  formBuildingType === type.value && styles.typeChipActive,
                ]}
                onPress={() => setFormBuildingType(type.value)}
              >
                <Text
                  style={[
                    styles.typeText,
                    formBuildingType === type.value && styles.typeTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Aktif</Text>
            <Switch value={formIsActive} onValueChange={setFormIsActive} />
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.formBtn, { backgroundColor: '#6c757d' }]}
              onPress={() => {
                resetForm();
                setEditMode('list');
              }}
            >
              <Text style={styles.formBtnText}>İptal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.formBtn, { backgroundColor: '#28a745' }]}
              onPress={editMode === 'create' ? createLocation : updateLocation}
            >
              <Text style={styles.formBtnText}>
                {editMode === 'create' ? 'Oluştur' : 'Güncelle'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Indoor Map Editor Mode
  if (editMode === 'indoor') {
    const currentFloor = floors[selectedFloor];

    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🗺️ İç Mekan Kroki Editör</Text>
          <Text style={styles.subtitle}>{selectedLocation?.name}</Text>
        </View>

        {/* Floor Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.floorScroll}>
          {floors.map((floor, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.floorChip,
                selectedFloor === index && styles.floorChipActive,
              ]}
              onPress={() => setSelectedFloor(index)}
            >
              <Text
                style={[
                  styles.floorText,
                  selectedFloor === index && styles.floorTextActive,
                ]}
              >
                {floor.floor_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* POI List */}
        <View style={styles.poiSection}>
          <Text style={styles.sectionTitle}>
            📍 İlgi Noktaları ({currentFloor?.points_of_interest?.length || 0})
          </Text>

          {currentFloor?.points_of_interest?.map((poi) => (
            <View key={poi.id} style={styles.poiCard}>
              <View style={styles.poiHeader}>
                <Text style={styles.poiName}>
                  {POI_TYPES.find((t) => t.value === poi.type)?.label} {poi.name}
                </Text>
                <TouchableOpacity onPress={() => removePOI(poi.id)}>
                  <Text style={styles.removeBtn}>🗑️</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.poiCoords}>
                X: {poi.x}, Y: {poi.y}
              </Text>
              {poi.description && (
                <Text style={styles.poiDesc}>{poi.description}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Add POI Form */}
        <View style={styles.addPoiSection}>
          <Text style={styles.sectionTitle}>➕ Yeni İlgi Noktası Ekle</Text>

          <Text style={styles.label}>POI Adı *</Text>
          <TextInput
            style={styles.input}
            value={poiName}
            onChangeText={setPoiName}
            placeholder="Örn: Ana Giriş"
          />

          <Text style={styles.label}>POI Tipi</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.typeGrid}>
              {POI_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeChip,
                    poiType === type.value && styles.typeChipActive,
                  ]}
                  onPress={() => setPoiType(type.value)}
                >
                  <Text
                    style={[
                      styles.typeText,
                      poiType === type.value && styles.typeTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.coordRow}>
            <View style={styles.coordInput}>
              <Text style={styles.label}>X Koordinat *</Text>
              <TextInput
                style={styles.input}
                value={poiX}
                onChangeText={setPoiX}
                placeholder="100"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.coordInput}>
              <Text style={styles.label}>Y Koordinat *</Text>
              <TextInput
                style={styles.input}
                value={poiY}
                onChangeText={setPoiY}
                placeholder="200"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Text style={styles.label}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={poiDescription}
            onChangeText={setPoiDescription}
            placeholder="İsteğe bağlı açıklama"
            multiline
            numberOfLines={2}
          />

          <TouchableOpacity style={styles.addPoiBtn} onPress={addPOI}>
            <Text style={styles.addPoiBtnText}>➕ POI Ekle</Text>
          </TouchableOpacity>
        </View>

        {/* Save/Cancel Buttons */}
        <View style={styles.formActions}>
          <TouchableOpacity
            style={[styles.formBtn, { backgroundColor: '#6c757d' }]}
            onPress={() => {
              setEditMode('list');
              setFloors([]);
            }}
          >
            <Text style={styles.formBtnText}>İptal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.formBtn, { backgroundColor: '#28a745' }]}
            onPress={saveIndoorMap}
          >
            <Text style={styles.formBtnText}>💾 Haritayı Kaydet</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Corners Editor Mode (4 köşe pin sistemi)
  if (editMode === 'corners') {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📍 Bina 4 Köşe Koordinatları</Text>
          <Text style={styles.subtitle}>{selectedLocation?.name}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ℹ️ Google Maps'te binanın 4 köşesine pin koyup koordinatları girin.
              Bu sayede tam bina sınırları belirlenir ve kat planları için temel oluşturulur.
            </Text>
            <Text style={styles.infoText}>
              • Bodrum katlar için floor_count negatif olabilir (-5 = 5 bodrum kat)
            </Text>
          </View>

          {corners.map((corner) => (
            <View key={corner.corner_number} style={styles.cornerSection}>
              <Text style={styles.cornerTitle}>
                📍 Köşe {corner.corner_number}: {corner.description}
              </Text>
              
              <Text style={styles.label}>Enlem (Latitude)</Text>
              <TextInput
                style={styles.input}
                value={corner.latitude}
                onChangeText={(text) => {
                  const updated = [...corners];
                  updated[corner.corner_number - 1].latitude = text;
                  setCorners(updated);
                }}
                placeholder="38.461234"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Boylam (Longitude)</Text>
              <TextInput
                style={styles.input}
                value={corner.longitude}
                onChangeText={(text) => {
                  const updated = [...corners];
                  updated[corner.corner_number - 1].longitude = text;
                  setCorners(updated);
                }}
                placeholder="27.206789"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Açıklama</Text>
              <TextInput
                style={styles.input}
                value={corner.description}
                onChangeText={(text) => {
                  const updated = [...corners];
                  updated[corner.corner_number - 1].description = text;
                  setCorners(updated);
                }}
                placeholder="Örn: Ana Giriş Köşesi"
              />
            </View>
          ))}

          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.formBtn, { backgroundColor: '#6c757d' }]}
              onPress={() => {
                setEditMode('list');
                setCorners([
                  { corner_number: 1, latitude: '', longitude: '', description: 'Kuzey-Batı Köşe' },
                  { corner_number: 2, latitude: '', longitude: '', description: 'Kuzey-Doğu Köşe' },
                  { corner_number: 3, latitude: '', longitude: '', description: 'Güney-Doğu Köşe' },
                  { corner_number: 4, latitude: '', longitude: '', description: 'Güney-Batı Köşe' },
                ]);
              }}
            >
              <Text style={styles.formBtnText}>İptal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.formBtn, { backgroundColor: '#28a745' }]}
              onPress={saveCorners}
            >
              <Text style={styles.formBtnText}>💾 Köşeleri Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    fontWeight: '600',
  },
  header: {
    padding: 20,
    backgroundColor: '#28a745',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  createBtn: {
    margin: 12,
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  locationCard: {
    backgroundColor: '#fff',
    margin: 12,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  inactiveBadge: {
    fontSize: 10,
    color: '#dc3545',
    fontWeight: '700',
  },
  mapBadge: {
    fontSize: 10,
    color: '#28a745',
    fontWeight: '700',
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  locationFloors: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  locationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  typeChipActive: {
    backgroundColor: '#e9f5ff',
    borderColor: '#007AFF',
  },
  typeText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#007AFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
  },
  formBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  formBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  floorScroll: {
    flexGrow: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  floorChip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 0,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginHorizontal: 4,
  },
  floorChipActive: {
    backgroundColor: '#fff',
    borderBottomColor: '#007AFF',
  },
  floorText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  floorTextActive: {
    color: '#007AFF',
  },
  poiSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  poiCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  poiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  poiName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  removeBtn: {
    fontSize: 18,
  },
  poiCoords: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  poiDesc: {
    fontSize: 13,
    color: '#666',
  },
  addPoiSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  coordRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coordInput: {
    flex: 1,
  },
  addPoiBtn: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  addPoiBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cornerSection: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cornerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#e8f4f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
  },
});
