import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { POI } from '@/types';

interface MapViewComponentProps {
  pois: POI[];
  selectedPOI?: POI;
  onPOISelect: (poi: POI) => void;
  floor: number;
}

export default function MapViewComponent({ 
  pois, 
  selectedPOI, 
  onPOISelect, 
  floor 
}: MapViewComponentProps) {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Hata', 'Konum izni gerekli');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
    } catch (error) {
      console.error('Konum alınamadı:', error);
      Alert.alert('Hata', 'Konum bilgisi alınamadı');
    }
  };

  const filteredPOIs = pois.filter(poi => poi.floor === floor && poi.isApproved);

  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.title}>Harita Görünümü</Text>
        <Text style={styles.subtitle}>
          {filteredPOIs.length} konum bulundu (Kat {floor})
        </Text>
        {selectedPOI && (
          <View style={styles.selectedPOI}>
            <Text style={styles.selectedTitle}>Seçili Konum:</Text>
            <Text style={styles.selectedName}>{selectedPOI.name}</Text>
            <Text style={styles.selectedType}>{selectedPOI.type}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  selectedPOI: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  selectedName: {
    fontSize: 18,
    color: '#007AFF',
    marginBottom: 4,
  },
  selectedType: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
});