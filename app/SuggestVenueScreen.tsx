import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import * as Location from 'expo-location';

const VENUE_TYPES = [
  { value: 'hospital', label: '🏥 Hastane', color: '#dc3545' },
  { value: 'mall', label: '🛍️ AVM', color: '#007bff' },
  { value: 'airport', label: '✈️ Havalimanı', color: '#6f42c1' },
  { value: 'university', label: '🎓 Üniversite', color: '#28a745' },
  { value: 'office', label: '🏢 Ofis', color: '#17a2b8' },
  { value: 'hotel', label: '🏨 Otel', color: '#fd7e14' },
  { value: 'other', label: '📍 Diğer', color: '#6c757d' },
];

export default function SuggestVenueScreen() {
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [venueType, setVenueType] = useState<string>('hospital');
  const [description, setDescription] = useState('');
  const [floorCount, setFloorCount] = useState('1');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setMessage('❌ Konum izni gerekli');
        setGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(location.coords.latitude.toFixed(6));
      setLongitude(location.coords.longitude.toFixed(6));
      setMessage('✅ Konumunuz alındı!');
      setGettingLocation(false);
    } catch (error) {
      setMessage('❌ Konum alınamadı: ' + (error as Error).message);
      setGettingLocation(false);
    }
  };

  const validateForm = (): boolean => {
    if (!venueName.trim()) {
      setMessage('❌ Mekan adı gerekli');
      return false;
    }

    if (venueName.trim().length < 3) {
      setMessage('❌ Mekan adı en az 3 karakter olmalı');
      return false;
    }

    if (!address.trim()) {
      setMessage('❌ Adres gerekli');
      return false;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setMessage('❌ Geçerli GPS koordinatları girin');
      return false;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setMessage('❌ Koordinatlar geçerli aralıkta değil');
      return false;
    }

    const floors = parseInt(floorCount);
    if (isNaN(floors) || floors < 1 || floors > 50) {
      setMessage('❌ Kat sayısı 1-50 arasında olmalı');
      return false;
    }

    if (description.trim().length > 500) {
      setMessage('❌ Açıklama 500 karakterden fazla olamaz');
      return false;
    }

    return true;
  };

  const submitSuggestion = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData?.user) {
        setMessage('❌ Giriş yapmalısınız');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('venue_suggestions')
        .insert({
          user_id: userData.user.id,
          name: venueName.trim(),
          address: address.trim(),
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          venue_type: venueType,
          description: description.trim() || null,
          floor_count: parseInt(floorCount),
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes('5 mekan önerisi')) {
          setMessage('⏳ Saatte en fazla 5 mekan önerisi yapabilirsiniz. Lütfen daha sonra tekrar deneyin.');
        } else {
          setMessage('❌ Öneri gönderilemedi: ' + error.message);
        }
        setLoading(false);
        return;
      }

      setMessage('✅ Öneriniz başarıyla gönderildi! Admin onayladıktan sonra sisteme eklenecek.');
      
      // Formu temizle
      setVenueName('');
      setAddress('');
      setLatitude('');
      setLongitude('');
      setDescription('');
      setFloorCount('1');
      setVenueType('hospital');
      
      setLoading(false);
    } catch (error) {
      setMessage('❌ Beklenmeyen hata: ' + (error as Error).message);
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📍 Mekan Öner</Text>
        <Text style={styles.subtitle}>
          Bildiğiniz hastane, AVM veya büyük binaları sisteme ekleyin
        </Text>
      </View>

      {message ? (
        <View style={[
          styles.messageBox,
          message.includes('✅') ? styles.successBox : styles.errorBox
        ]}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.label}>Mekan Adı *</Text>
        <TextInput
          style={styles.input}
          placeholder="ör: İzmir Şehir Hastanesi"
          value={venueName}
          onChangeText={setVenueName}
          maxLength={100}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Mekan Tipi *</Text>
        <View style={styles.typeGrid}>
          {VENUE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeCard,
                venueType === type.value && {
                  backgroundColor: type.color,
                  borderColor: type.color,
                },
              ]}
              onPress={() => setVenueType(type.value)}
            >
              <Text
                style={[
                  styles.typeText,
                  venueType === type.value && styles.typeTextActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Adres *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tam adres (Mahalle, sokak, ilçe, şehir)"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
          maxLength={200}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>GPS Koordinatları *</Text>
          <TouchableOpacity
            style={styles.locationBtn}
            onPress={getCurrentLocation}
            disabled={gettingLocation}
          >
            <Text style={styles.locationBtnText}>
              {gettingLocation ? '⏳ Alınıyor...' : '📍 Konumumu Al'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.coordRow}>
          <View style={styles.coordInput}>
            <Text style={styles.coordLabel}>Enlem (Lat)</Text>
            <TextInput
              style={styles.input}
              placeholder="38.4613"
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.coordInput}>
            <Text style={styles.coordLabel}>Boylam (Lng)</Text>
            <TextInput
              style={styles.input}
              placeholder="27.2069"
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <Text style={styles.hint}>
          💡 Google Maps'te konuma sağ tıklayıp koordinatları kopyalayabilirsiniz
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Kat Sayısı *</Text>
        <TextInput
          style={[styles.input, styles.smallInput]}
          placeholder="1"
          value={floorCount}
          onChangeText={setFloorCount}
          keyboardType="number-pad"
          maxLength={2}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Açıklama (Opsiyonel)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Bu mekan hakkında ek bilgi (departmanlar, özellikler, vb.)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={submitSuggestion}
        disabled={loading}
      >
        <Text style={styles.submitBtnText}>
          {loading ? '⏳ Gönderiliyor...' : '✉️ Öneriyi Gönder'}
        </Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ Bilgilendirme</Text>
        <Text style={styles.infoText}>
          • Önerileriniz admin tarafından incelenir{'\n'}
          • Onaylanan mekanlar sisteme eklenir{'\n'}
          • Saatte en fazla 5 öneri gönderebilirsiniz{'\n'}
          • Spam/sahte öneriler hesabınızın kısıtlanmasına yol açar
        </Text>
      </View>

      <View style={styles.securityBox}>
        <Text style={styles.securityTitle}>🔒 Güvenlik</Text>
        <Text style={styles.securityText}>
          • Verileriniz şifrelenir{'\n'}
          • Kişisel bilgileriniz gizli kalır{'\n'}
          • Önerileriniz moderasyon sürecinden geçer
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Katkılarınız için teşekkürler! 🙏
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  messageBox: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  successBox: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  errorBox: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  smallInput: {
    width: 100,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeCard: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  typeText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#fff',
  },
  locationBtn: {
    backgroundColor: '#28a745',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  locationBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  coordRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coordInput: {
    flex: 1,
  },
  coordLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 8,
    fontStyle: 'italic',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  submitBtn: {
    margin: 16,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#ccc',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0d47a1',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1565c0',
    lineHeight: 20,
  },
  securityBox: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  securityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#155724',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 13,
    color: '#155724',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6c757d',
  },
});
