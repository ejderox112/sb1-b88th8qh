import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { supabase } from '@/lib/supabase';

interface VenueSuggestion {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  venue_type: string;
  description: string | null;
  floor_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  created_at: string;
  user_id: string;
  moderation_notes: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  user_profiles?: {
    nickname: string;
    email: string;
    user_code: string;
  };
}

const STATUS_FILTERS = [
  { value: 'pending', label: '⏳ Bekleyen', color: '#ffc107' },
  { value: 'approved', label: '✅ Onaylı', color: '#28a745' },
  { value: 'rejected', label: '❌ Reddedilen', color: '#dc3545' },
  { value: 'spam', label: '🚫 Spam', color: '#6c757d' },
];

const VENUE_TYPE_LABELS: Record<string, string> = {
  hospital: '🏥 Hastane',
  mall: '🛍️ AVM',
  airport: '✈️ Havalimanı',
  university: '🎓 Üniversite',
  office: '🏢 Ofis',
  hotel: '🏨 Otel',
  other: '📍 Diğer',
};

export default function AdminVenueModerationScreen() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<VenueSuggestion[]>([]);
  const [filter, setFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [moderationNote, setModerationNote] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchSuggestions();
    }
  }, [isAdmin, filter]);

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

  const fetchSuggestions = async () => {
    try {
      let query = supabase
        .from('venue_suggestions')
        .select(`
          *,
          user_profiles!venue_suggestions_user_id_fkey (
            nickname,
            email,
            user_code
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setSuggestions(data || []);
    } catch (error) {
      Alert.alert('Hata', 'Öneriler yüklenemedi: ' + (error as Error).message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSuggestions();
    setRefreshing(false);
  };

  const handleModeration = async (
    suggestionId: string,
    newStatus: 'approved' | 'rejected' | 'spam',
    createVenue: boolean = false
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // Update suggestion status
      const { error: updateError } = await supabase
        .from('venue_suggestions')
        .update({
          status: newStatus,
          moderation_notes: moderationNote || null,
          moderated_by: userData.user.id,
          moderated_at: new Date().toISOString(),
        })
        .eq('id', suggestionId);

      if (updateError) throw updateError;

      // If approved and should create venue
      if (newStatus === 'approved' && createVenue) {
        const suggestion = suggestions.find((s) => s.id === suggestionId);
        if (suggestion) {
          const { error: venueError } = await supabase
            .from('indoor_venues')
            .insert({
              name: suggestion.name,
              address: suggestion.address,
              latitude: suggestion.latitude,
              longitude: suggestion.longitude,
              venue_type: suggestion.venue_type,
              description: suggestion.description,
              floor_count: suggestion.floor_count,
              created_by: userData.user.id,
            });

          if (venueError) {
            Alert.alert('Uyarı', 'Öneri onaylandı ancak mekan oluşturulamadı: ' + venueError.message);
          } else {
            Alert.alert('✅ Başarılı', 'Öneri onaylandı ve mekan sisteme eklendi!');
          }
        }
      } else {
        const statusText = newStatus === 'rejected' ? 'reddedildi' : 'spam olarak işaretlendi';
        Alert.alert('✅ Başarılı', `Öneri ${statusText}`);
      }

      setExpandedId(null);
      setModerationNote('');
      fetchSuggestions();
    } catch (error) {
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi: ' + (error as Error).message);
    }
  };

  const confirmAction = (
    suggestionId: string,
    action: 'approved' | 'rejected' | 'spam',
    suggestion: VenueSuggestion
  ) => {
    const actions = {
      approved: {
        title: '✅ Onayla',
        message: `"${suggestion.name}" mekanını onaylayıp sisteme eklemek istiyor musunuz?`,
        confirmText: 'Onayla ve Ekle',
        createVenue: true,
      },
      rejected: {
        title: '❌ Reddet',
        message: `"${suggestion.name}" önerisini reddetmek istediğinizden emin misiniz?`,
        confirmText: 'Reddet',
        createVenue: false,
      },
      spam: {
        title: '🚫 Spam',
        message: `"${suggestion.name}" önerisini spam olarak işaretlemek istediğinizden emin misiniz? Bu kullanıcı kısıtlanabilir.`,
        confirmText: 'Spam Olarak İşaretle',
        createVenue: false,
      },
    };

    const actionConfig = actions[action];

    Alert.alert(
      actionConfig.title,
      actionConfig.message,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: actionConfig.confirmText,
          style: action === 'spam' ? 'destructive' : 'default',
          onPress: () => handleModeration(suggestionId, action, actionConfig.createVenue),
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const openInMaps = (lat: number, lng: number, name: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Alert.alert('Haritada Aç', `${name} konumunu Google Maps'te açmak ister misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Aç', onPress: () => {
        // In real app: Linking.openURL(url);
        Alert.alert('Demo', 'Gerçek uygulamada Google Maps açılır');
      }},
    ]);
  };

  const filteredSuggestions = suggestions.filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(query) ||
      s.address.toLowerCase().includes(query) ||
      s.user_profiles?.nickname?.toLowerCase().includes(query)
    );
  });

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Mekan Önerileri Moderasyonu</Text>
        <Text style={styles.subtitle}>
          {filteredSuggestions.length} öneri
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {STATUS_FILTERS.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[
              styles.filterChip,
              filter === item.value && { backgroundColor: item.color },
            ]}
            onPress={() => setFilter(item.value)}
          >
            <Text
              style={[
                styles.filterText,
                filter === item.value && styles.filterTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Mekan veya kullanıcı ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredSuggestions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchQuery ? '🔍 Arama sonucu bulunamadı' : '📭 Öneri bulunamadı'}
            </Text>
          </View>
        ) : (
          filteredSuggestions.map((suggestion) => (
            <View key={suggestion.id} style={styles.card}>
              <TouchableOpacity
                onPress={() =>
                  setExpandedId(expandedId === suggestion.id ? null : suggestion.id)
                }
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.venueType}>
                      {VENUE_TYPE_LABELS[suggestion.venue_type] || suggestion.venue_type}
                    </Text>
                    <Text style={styles.venueName}>{suggestion.name}</Text>
                    <Text style={styles.venueAddress} numberOfLines={1}>
                      📍 {suggestion.address}
                    </Text>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: STATUS_FILTERS.find((f) => f.value === suggestion.status)?.color || '#ccc' },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {STATUS_FILTERS.find((f) => f.value === suggestion.status)?.label.split(' ')[1] || suggestion.status}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    👤 {suggestion.user_profiles?.nickname || 'Bilinmeyen'}
                  </Text>
                  <Text style={styles.metaText}>
                    🕐 {formatDate(suggestion.created_at)}
                  </Text>
                  <Text style={styles.metaText}>
                    🏢 {suggestion.floor_count} kat
                  </Text>
                </View>
              </TouchableOpacity>

              {expandedId === suggestion.id && (
                <View style={styles.expandedContent}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>📧 Kullanıcı E-posta:</Text>
                    <Text style={styles.detailValue}>{suggestion.user_profiles?.email || 'N/A'}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>🆔 Kullanıcı Kodu:</Text>
                    <Text style={styles.detailValue}>{suggestion.user_profiles?.user_code || 'N/A'}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>🌍 GPS Koordinatları:</Text>
                    <TouchableOpacity
                      onPress={() => openInMaps(suggestion.latitude, suggestion.longitude, suggestion.name)}
                    >
                      <Text style={[styles.detailValue, styles.linkText]}>
                        {suggestion.latitude.toFixed(6)}, {suggestion.longitude.toFixed(6)} 🗺️
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {suggestion.description && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>📝 Açıklama:</Text>
                      <Text style={styles.detailValue}>{suggestion.description}</Text>
                    </View>
                  )}

                  {suggestion.moderation_notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>📋 Moderasyon Notu:</Text>
                      <Text style={styles.detailValue}>{suggestion.moderation_notes}</Text>
                    </View>
                  )}

                  {suggestion.status === 'pending' && (
                    <>
                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>📝 Moderasyon Notu (Opsiyonel):</Text>
                        <TextInput
                          style={styles.noteInput}
                          placeholder="Karar nedeni veya ek bilgi..."
                          value={moderationNote}
                          onChangeText={setModerationNote}
                          multiline
                          numberOfLines={3}
                        />
                      </View>

                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.approveBtn]}
                          onPress={() => confirmAction(suggestion.id, 'approved', suggestion)}
                        >
                          <Text style={styles.actionBtnText}>✅ Onayla</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.rejectBtn]}
                          onPress={() => confirmAction(suggestion.id, 'rejected', suggestion)}
                        >
                          <Text style={styles.actionBtnText}>❌ Reddet</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.spamBtn]}
                          onPress={() => confirmAction(suggestion.id, 'spam', suggestion)}
                        >
                          <Text style={styles.actionBtnText}>🚫 Spam</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
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
    backgroundColor: '#007AFF',
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
  filterScroll: {
    flexGrow: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterContainer: {
    padding: 12,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#f9f9f9',
  },
  listContainer: {
    flex: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
  },
  card: {
    backgroundColor: '#fff',
    margin: 12,
    marginBottom: 0,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardHeaderRight: {
    marginLeft: 10,
  },
  venueType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  venueName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  venueAddress: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailSection: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  linkText: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: '#28a745',
  },
  rejectBtn: {
    backgroundColor: '#dc3545',
  },
  spamBtn: {
    backgroundColor: '#6c757d',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
