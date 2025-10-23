import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { POI } from '../types';
import { GeminiService } from '../lib/gemini';
import { X, MapPin } from 'lucide-react-native';

interface AddPOIModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (poi: Omit<POI, 'id' | 'createdAt' | 'createdBy' | 'isApproved'>) => void;
  currentLocation?: { latitude: number; longitude: number };
  floor: number;
}

const POI_TYPES: { value: POI['type']; label: string }[] = [
  { value: 'store', label: 'Mağaza' },
  { value: 'wc', label: 'WC' },
  { value: 'elevator', label: 'Asansör' },
  { value: 'stairs', label: 'Merdiven' },
  { value: 'restaurant', label: 'Restoran' },
  { value: 'exit', label: 'Çıkış' },
  { value: 'info', label: 'Bilgi Noktası' },
];

export default function AddPOIModal({
  visible,
  onClose,
  onSubmit,
  currentLocation,
  floor,
}: AddPOIModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<POI['type']>('store');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const geminiService = new GeminiService();

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Lütfen bir isim girin');
      return;
    }

    if (!currentLocation) {
      Alert.alert('Hata', 'Konum bilgisi alınamadı');
      return;
    }

    onSubmit({
      name: name.trim(),
      type,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      floor,
      description: description.trim() || undefined,
    });

    // Reset form
    setName('');
    setType('store');
    setDescription('');
    onClose();
  };

  const generateNameWithAI = async () => {
    if (!description.trim()) {
      Alert.alert('Bilgi', 'Önce açıklama girin, sonra AI ile isim önerisi alabilirsiniz');
      return;
    }

    setIsGenerating(true);
    try {
      const suggestedName = await geminiService.suggestPOIName(
        POI_TYPES.find(t => t.value === type)?.label || type,
        description
      );
      setName(suggestedName);
    } catch {
      Alert.alert('Hata', 'AI önerisi alınamadı');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Yeni Konum Öner</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>Konum Türü</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.typeContainer}>
                {POI_TYPES.map((poiType) => (
                  <TouchableOpacity
                    key={poiType.value}
                    style={[
                      styles.typeButton,
                      type === poiType.value && styles.selectedType,
                    ]}
                    onPress={() => setType(poiType.value)}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        type === poiType.value && styles.selectedTypeText,
                      ]}
                    >
                      {poiType.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Açıklama</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Bu konum hakkında kısa açıklama..."
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.nameHeader}>
              <Text style={styles.label}>İsim</Text>
              <TouchableOpacity
                style={styles.aiButton}
                onPress={generateNameWithAI}
                disabled={isGenerating}
              >
                <Text style={styles.aiButtonText}>
                  {isGenerating ? 'Üretiliyor...' : 'AI Önerisi'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Konum ismi..."
            />
          </View>

          <View style={styles.locationInfo}>
            <MapPin size={16} color="#666" />
            <Text style={styles.locationText}>
              Konum: {currentLocation?.latitude.toFixed(6)}, {currentLocation?.longitude.toFixed(6)}
            </Text>
          </View>
          <Text style={styles.floorText}>{floor}. Kat</Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>İptal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Öner</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedType: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeText: {
    fontSize: 14,
    color: '#666',
  },
  selectedTypeText: {
    color: '#fff',
  },
  nameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  floorText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});