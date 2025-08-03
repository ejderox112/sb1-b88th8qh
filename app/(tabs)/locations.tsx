import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { POI } from '@/types';
import { supabase } from '@/lib/supabase';
import { Search, MapPin, Building, Navigation } from 'lucide-react-native';

export default function LocationsScreen() {
  const [pois, setPois] = useState<POI[]>([]);
  const [filteredPois, setFilteredPois] = useState<POI[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<POI['type'] | null>(null);

  useEffect(() => {
    loadPOIs();
  }, []);

  useEffect(() => {
    filterPOIs();
  }, [pois, searchQuery, selectedFloor, selectedType]);

  const loadPOIs = async () => {
    try {
      const { data, error } = await supabase
        .from('pois')
        .select('*')
        .eq('isApproved', true)
        .order('name');

      if (error) throw error;
      setPois(data || []);
    } catch (error) {
      console.error('POI yükleme hatası:', error);
    }
  };

  const filterPOIs = () => {
    let filtered = pois;

    if (searchQuery) {
      filtered = filtered.filter(poi =>
        poi.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedFloor !== null) {
      filtered = filtered.filter(poi => poi.floor === selectedFloor);
    }

    if (selectedType) {
      filtered = filtered.filter(poi => poi.type === selectedType);
    }

    setFilteredPois(filtered);
  };

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

  const floors = [...new Set(pois.map(poi => poi.floor))].sort((a, b) => a - b);
  const types: POI['type'][] = ['store', 'wc', 'elevator', 'stairs', 'restaurant', 'exit', 'info'];

  const renderPOI = ({ item }: { item: POI }) => (
    <View style={styles.poiItem}>
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
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tüm Konumlar</Text>
        <Text style={styles.subtitle}>{filteredPois.length} konum bulundu</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Konum ara..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <Text style={styles.filterTitle}>Kat:</Text>
        <FlatList
          horizontal
          data={[null, ...floors]}
          keyExtractor={(item) => item?.toString() || 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFloor === item && styles.selectedFilter,
              ]}
              onPress={() => setSelectedFloor(item)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFloor === item && styles.selectedFilterText,
                ]}
              >
                {item ? `${item}. Kat` : 'Tümü'}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <View style={styles.filtersContainer}>
        <Text style={styles.filterTitle}>Tür:</Text>
        <FlatList
          horizontal
          data={[null, ...types]}
          keyExtractor={(item) => item || 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedType === item && styles.selectedFilter,
              ]}
              onPress={() => setSelectedType(item)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedType === item && styles.selectedFilterText,
                ]}
              >
                {item ? getTypeText(item) : 'Tümü'}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <FlatList
        data={filteredPois}
        renderItem={renderPOI}
        keyExtractor={(item) => item.id}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginRight: 8,
  },
  selectedFilter: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  selectedFilterText: {
    color: '#fff',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  poiItem: {
    backgroundColor: '#fff',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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