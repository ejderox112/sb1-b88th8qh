import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { POI } from '../types';
import { MapPin, Building, Navigation } from 'lucide-react-native';

interface POIListProps {
  pois: POI[];
  onPOISelect: (poi: POI) => void;
  selectedPOI?: POI;
  floor: number;
}

export default function POIList({ pois, onPOISelect, selectedPOI, floor }: POIListProps) {
  const filteredPOIs = pois.filter(poi => poi.floor === floor && poi.isApproved);

  const getTypeIcon = (type: POI['type']) => {
    switch (type) {
      case 'store': return <Building size={20} color="#FF6B6B" />;
      case 'wc': return <MapPin size={20} color="#4ECDC4" />;
      case 'elevator': return <Navigation size={20} color="#45B7D1" />;
      case 'stairs': return <Navigation size={20} color="#96CEB4" />;
      case 'restaurant': return <Building size={20} color="#FFEAA7" />;
      case 'exit': return <Navigation size={20} color="#DDA0DD" />;
      case 'info': return <MapPin size={20} color="#74B9FF" />;
      default: return <MapPin size={20} color="#666" />;
    }
  };

  const getTypeText = (type: POI['type']) => {
    switch (type) {
      case 'store': return 'Mağaza';
      case 'wc': return 'WC';
      case 'elevator': return 'Asansör';
      case 'stairs': return 'Merdiven';
      case 'restaurant': return 'Restoran';
      case 'exit': return 'Çıkış';
      case 'info': return 'Bilgi';
      default: return type;
    }
  };

  const renderPOI = ({ item }: { item: POI }) => (
    <TouchableOpacity
      style={[
        styles.poiItem,
        selectedPOI?.id === item.id && styles.selectedPOI
      ]}
      onPress={() => onPOISelect(item)}
    >
      <View style={styles.poiHeader}>
        {getTypeIcon(item.type)}
        <View style={styles.poiInfo}>
          <Text style={styles.poiName}>{item.name}</Text>
          <Text style={styles.poiType}>{getTypeText(item.type)} - {item.floor}. Kat</Text>
        </View>
      </View>
      {item.description && (
        <Text style={styles.poiDescription}>{item.description}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{floor}. Kat Konumları</Text>
      <FlatList
        data={filteredPOIs}
        renderItem={renderPOI}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  poiItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedPOI: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  poiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poiInfo: {
    marginLeft: 12,
    flex: 1,
  },
  poiName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  poiType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  poiDescription: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    fontStyle: 'italic',
  },
});