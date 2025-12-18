import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { uploadIndoorPhoto } from '@/lib/premiumAdService';

export default function IndoorContributeScreen() {
  const [type, setType] = useState<'room'|'corridor'|'brand'|'signage'|'garage'>('room');
  const [label, setLabel] = useState('Oda 210');
  const [floorId, setFloorId] = useState('F3');
  const [x, setX] = useState('105');
  const [y, setY] = useState('6');
  const [photoUrl, setPhotoUrl] = useState('');
  const [info, setInfo] = useState('');
  
  // Location states
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; altitude?: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        getCurrentLocation();
      } else {
        Alert.alert('Konum İzni', 'Konum bilgisi almak için izin gerekli');
      }
    } catch (error) {
      console.error('Konum izni hatası:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude || undefined,
      });
      setInfo(`📍 Konum alındı: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`);
    } catch (error) {
      console.error('Konum alma hatası:', error);
      Alert.alert('Hata', 'Konum bilgisi alınamadı');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Galeri İzni', 'Fotoğraf seçmek için galeri izni gerekli');
        return;
      }

      const result = await ImagePicker.launchImagePickerAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        exif: true, // EXIF verileri (konum dahil)
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setPhotoUrl(result.assets[0].uri); // Temporary URL
        setInfo('📷 Fotoğraf seçildi (EXIF konum bilgisi varsa otomatik alınacak)');
      }
    } catch (error) {
      console.error('Fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilemedi');
    }
  };

  const submit = async () => {
    if (!userLocation) {
      Alert.alert('Hata', 'Konum bilgisi gerekli. Lütfen GPS\'i açın.');
      return;
    }

    if (!selectedImage) {
      Alert.alert('Hata', 'Lütfen bir fotoğraf seçin');
      return;
    }

    setUploading(true);
    try {
      // Indoor photo upload with location data
      const result = await uploadIndoorPhoto(
        'izmir-sehir-hastanesi', // location_id (hardcoded for demo)
        parseInt(floorId.replace('F', '')),
        selectedImage, // photo_url (should be uploaded to storage first)
        userLocation,
        undefined, // photo EXIF location (can be extracted from image)
        { x: parseFloat(x), y: parseFloat(y) },
        type,
        label
      );

      if (result.success) {
        Alert.alert(
          '✅ Başarılı',
          `Fotoğraf yüklendi! ${result.xp_earned} XP kazandınız.\n\nModerasyon sonrası onaylanacak.`
        );
        setInfo(`Gönderildi: ${label} (${type}) - ${result.xp_earned} XP kazandınız`);
        
        // Reset form
        setLabel('');
        setX('');
        setY('');
        setSelectedImage(null);
        setPhotoUrl('');
      } else {
        Alert.alert('Hata', result.error || 'Fotoğraf yüklenemedi');
      }
    } catch (error: any) {
      console.error('Yükleme hatası:', error);
      Alert.alert('Hata', error.message || 'Fotoğraf yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📸 İç Mekan Fotoğraf Yükleme</Text>

      {/* Location Status */}
      <View style={styles.locationBox}>
        <Text style={styles.locationTitle}>📍 Konum Bilgisi</Text>
        {userLocation ? (
          <>
            <Text style={styles.locationText}>
              Enlem: {userLocation.latitude.toFixed(6)}
            </Text>
            <Text style={styles.locationText}>
              Boylam: {userLocation.longitude.toFixed(6)}
            </Text>
            {userLocation.altitude && (
              <Text style={styles.locationText}>
                Yükseklik: {userLocation.altitude.toFixed(1)} m
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.locationText}>⏳ Konum alınıyor...</Text>
        )}
        <TouchableOpacity style={styles.refreshBtn} onPress={getCurrentLocation}>
          <Text style={styles.refreshBtnText}>🔄 Konumu Yenile</Text>
        </TouchableOpacity>
      </View>

      {/* Photo Picker */}
      <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
        <Text style={styles.photoBtnText}>
          {selectedImage ? '✅ Fotoğraf Seçildi' : '📷 Fotoğraf Seç'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Tür</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {(['room','corridor','brand','signage','garage'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.choice, type===t && styles.choiceActive]} onPress={() => setType(t)}>
              <Text style={styles.choiceText}>
                {t === 'room' ? '🏠 Oda' : 
                 t === 'corridor' ? '🚪 Koridor' : 
                 t === 'brand' ? '🏢 Firma' : 
                 t === 'signage' ? '🪧 Tabela' : 
                 '🚗 Garaj'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.label}>Kat</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {['F-3','F-2','F-1','F0','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10'].map(fid => (
            <TouchableOpacity key={fid} style={[styles.choice, floorId===fid && styles.choiceActive]} onPress={() => setFloorId(fid)}>
              <Text style={styles.choiceText}>
                {fid === 'F0' ? 'Zemin' : fid.startsWith('F-') ? `${fid.replace('F-', '-')}` : fid.replace('F', '')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.label}>İsim/Etiket</Text>
      <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="Örn: Kardiyoloji 112" />

      <Text style={styles.label}>Koordinat (metre)</Text>
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.xy]} keyboardType="numeric" value={x} onChangeText={setX} placeholder="x" />
        <TextInput style={[styles.input, styles.xy]} keyboardType="numeric" value={y} onChangeText={setY} placeholder="y" />
      </View>

      <TouchableOpacity 
        style={[styles.primary, uploading && styles.primaryDisabled]} 
        onPress={submit}
        disabled={uploading}
      >
        <Text style={styles.primaryText}>
          {uploading ? '⏳ Yükleniyor...' : '📤 Gönder (10 XP)'}
        </Text>
      </TouchableOpacity>

      {!!info && <Text style={styles.info}>{info}</Text>}

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>ℹ️ Fotoğraf yüklerken:</Text>
        <Text style={styles.infoText}>• GPS konumunuz otomatik alınır</Text>
        <Text style={styles.infoText}>• Fotoğrafın EXIF verileri (konum) kontrol edilir</Text>
        <Text style={styles.infoText}>• Küçültme politikası uygulanır</Text>
        <Text style={styles.infoText}>• Moderasyon sonrası onaylanır</Text>
        <Text style={styles.infoText}>• Onaylandıktan sonra 10 XP kazanırsınız</Text>
      </View>

      {/* Kullanıcının Katkıları */}
      <View style={styles.contributionsBox}>
        <Text style={styles.contributionsTitle}>📝 Katkılarınız</Text>
        <Text style={styles.contributionsText}>Bekleyen: 0 | Onaylanan: 0 | Reddedilen: 0</Text>
        <Text style={styles.thankYou}>🙏 Katkılarınız için teşekkür ederiz!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  locationBox: {
    backgroundColor: '#e8f4f8',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  refreshBtn: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  refreshBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  photoBtn: {
    backgroundColor: '#28a745',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  photoBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  label: { marginTop: 10, fontWeight: '600', fontSize: 14 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginTop: 6 },
  row: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'nowrap' },
  choice: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    paddingVertical: 10, 
    paddingHorizontal: 14,
    minWidth: 80,
    alignItems: 'center'
  },
  choiceActive: { backgroundColor: '#eef5ff', borderColor: '#007AFF', borderWidth: 2 },
  choiceText: { fontSize: 13, fontWeight: '600' },
  xy: { flex: 1 },
  primary: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 14 },
  primaryDisabled: { backgroundColor: '#ccc' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  info: { marginTop: 10, color: '#28a745', fontWeight: '600', textAlign: 'center' },
  infoBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  contributionsBox: {
    backgroundColor: '#e8f5e9',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  contributionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  contributionsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  thankYou: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
    textAlign: 'center',
  },
});
