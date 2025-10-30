import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { POI } from '../types';
import { GeminiService } from '../lib/gemini';
import { X, Navigation, MapPin } from 'lucide-react-native';

interface DirectionsModalProps {
  visible: boolean;
  onClose: () => void;
  fromPOI?: POI;
  toPOI?: POI;
  userLocation?: { latitude: number; longitude: number };
}

export default function DirectionsModal({
  visible,
  onClose,
  fromPOI,
  toPOI,
  userLocation,
}: DirectionsModalProps) {
  const [directions, setDirections] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const geminiService = GeminiService.getInstance();

  useEffect(() => {
    if (visible && toPOI) {
      generateDirections();
    }
  }, [visible, fromPOI, toPOI]);

  const generateDirections = async () => {
    if (!toPOI) return;

    setLoading(true);
    try {
      const from = fromPOI ? fromPOI.name : 'Mevcut konumunuz';
      const to = toPOI.name;
      const floor = toPOI.floor;

      const directionsText = await geminiService.getDirections(from, to, floor);
      setDirections(directionsText);
    } catch (error) {
      setDirections('Yön tarifi oluşturulamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Yön Tarifi</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.routeInfo}>
            <View style={styles.locationRow}>
              <MapPin size={20} color="#28a745" />
              <Text style={styles.locationText}>
                Başlangıç: {fromPOI ? fromPOI.name : 'Mevcut Konumunuz'}
              </Text>
            </View>
            <View style={styles.locationRow}>
              <Navigation size={20} color="#dc3545" />
              <Text style={styles.locationText}>
                Hedef: {toPOI?.name} ({toPOI?.floor}. Kat)
              </Text>
            </View>
          </View>

          <View style={styles.directionsContainer}>
            <Text style={styles.directionsTitle}>Yön Tarifi:</Text>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>AI yön tarifi oluşturuluyor...</Text>
              </View>
            ) : (
              <Text style={styles.directionsText}>{directions}</Text>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.closeFooterButton} onPress={onClose}>
            <Text style={styles.closeFooterButtonText}>Kapat</Text>
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
  routeInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  directionsContainer: {
    flex: 1,
  },
  directionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  directionsText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  closeFooterButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeFooterButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});