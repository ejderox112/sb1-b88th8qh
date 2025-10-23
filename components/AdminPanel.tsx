import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { Suggestion, POI } from '../types';
import { supabase } from '../lib/supabase';
import { Check, X, Clock } from 'lucide-react-native';

interface AdminPanelProps {
  visible: boolean;
  onClose: () => void;
  onPOIApproved: () => void;
}

export default function AdminPanel({ visible, onClose, onPOIApproved }: AdminPanelProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSuggestions();
    }
  }, [visible]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      setSuggestions(data || []);
    } catch {
      Alert.alert('Hata', 'Öneriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = async (suggestionId: string, action: 'approve' | 'reject') => {
    try {
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (!suggestion) return;

      if (action === 'approve') {
        // POI tablosuna ekle
        const { error: poiError } = await supabase
          .from('pois')
          .insert({
            name: suggestion.poiName,
            type: suggestion.type,
            latitude: suggestion.latitude,
            longitude: suggestion.longitude,
            floor: suggestion.floor,
            description: suggestion.description,
            isApproved: true,
            createdBy: suggestion.createdBy,
          });

        if (poiError) throw poiError;
        onPOIApproved();
      }

      // Öneri durumunu güncelle
      const { error } = await supabase
        .from('suggestions')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', suggestionId);

      if (error) throw error;

      Alert.alert(
        'Başarılı',
        action === 'approve' ? 'Öneri onaylandı' : 'Öneri reddedildi'
      );
      
      loadSuggestions();
    } catch {
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi');
    }
  };

  const getStatusColor = (status: Suggestion['status']) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545';
      default: return '#666';
    }
  };

  const getStatusText = (status: Suggestion['status']) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      default: return status;
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

  const renderSuggestion = ({ item }: { item: Suggestion }) => (
    <View style={styles.suggestionItem}>
      <View style={styles.suggestionHeader}>
        <Text style={styles.suggestionName}>{item.poiName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.suggestionType}>
        {getTypeText(item.type)} - {item.floor}. Kat
      </Text>
      
      {item.description && (
        <Text style={styles.suggestionDescription}>{item.description}</Text>
      )}
      
      <Text style={styles.suggestionDate}>
        {new Date(item.createdAt).toLocaleDateString('tr-TR')}
      </Text>

      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleSuggestion(item.id, 'approve')}
          >
            <Check size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Onayla</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleSuggestion(item.id, 'reject')}
          >
            <X size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Reddet</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Paneli</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Clock size={20} color="#FFA500" />
              <Text style={styles.statNumber}>
                {suggestions.filter(s => s.status === 'pending').length}
              </Text>
              <Text style={styles.statLabel}>Bekleyen</Text>
            </View>
            <View style={styles.statItem}>
              <Check size={20} color="#28a745" />
              <Text style={styles.statNumber}>
                {suggestions.filter(s => s.status === 'approved').length}
              </Text>
              <Text style={styles.statLabel}>Onaylanan</Text>
            </View>
            <View style={styles.statItem}>
              <X size={20} color="#dc3545" />
              <Text style={styles.statNumber}>
                {suggestions.filter(s => s.status === 'rejected').length}
              </Text>
              <Text style={styles.statLabel}>Reddedilen</Text>
            </View>
          </View>

          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.id}
            refreshing={loading}
            onRefresh={loadSuggestions}
            showsVerticalScrollIndicator={false}
          />
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
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  suggestionItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  suggestionType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  suggestionDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  approveButton: {
    backgroundColor: '#28a745',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});