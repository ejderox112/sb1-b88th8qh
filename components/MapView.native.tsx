import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { POI } from '../types';

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
  const mounted = useRef(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mapRef, setMapRef] = useState<MapView | null>(null);

  useEffect(() => {
    mounted.current = true;
    getCurrentLocation();
    
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (selectedPOI && mapRef) {
      mapRef.animateToRegion({
        latitude: selectedPOI.latitude,
        longitude: selectedPOI.longitude,
        latitudeDelta: 0.001,
        longitudeDelta: 0.001,
      });
    }
  }, [selectedPOI, mapRef]);

  const getCurrentLocation = async () => {
    try {
      if (!mounted.current) return;
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Hata', 'Konum izni gerekli');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      if (!mounted.current) return;
      setLocation(currentLocation);
    } catch (error) {
      console.error('Konum alınamadı:', error);
      Alert.alert('Hata', 'Konum bilgisi alınamadı');
    }
  };

  const getMarkerColor = (type: POI['type']) => {
    switch (type) {
      case 'store': return '#FF6B6B';
      case 'wc': return '#4ECDC4';
      case 'elevator': return '#45B7D1';
      case 'stairs': return '#96CEB4';
      case 'restaurant': return '#FFEAA7';
      case 'exit': return '#DDA0DD';
      case 'info': return '#74B9FF';
      default: return '#FF6B6B';
    }
  };

  const filteredPOIs = pois.filter(poi => poi.floor === floor && poi.isApproved);

  return (
    <View style={styles.container}>
      <MapView
        ref={setMapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: location?.coords.latitude || 41.0082,
          longitude: location?.coords.longitude || 28.9784,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="Konumunuz"
            pinColor="blue"
          />
        )}
        
        {filteredPOIs.map((poi) => (
          <Marker
            key={poi.id}
            coordinate={{
              latitude: poi.latitude,
              longitude: poi.longitude,
            }}
            title={poi.name}
            description={`${poi.type} - ${poi.floor}. kat`}
            pinColor={getMarkerColor(poi.type)}
            onPress={() => onPOISelect(poi)}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});