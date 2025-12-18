import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface BusinessAd {
  id: string;
  business_profile_id: string;
  ad_title: string;
  ad_description: string;
  video_platform: string;
  video_url: string;
  budget: number;
  radius: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  business_name?: string;
  business_category?: string;
}

export default function BusinessAdModerationScreen() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<BusinessAd[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAds();
    }
  }, [isAdmin, filter]);

  const checkAdminAccess = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.email === 'ejderha112@gmail.com') {
        setIsAdmin(true);
      } else {
        Alert.alert('Erişim Engellendi', 'Admin yetkisi gerekli');
        router.back();
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
      router.back();
    }
  };

  const fetchAds = async () => {
    try {
      let query = supabase
        .from('business_ads')
        .select(`
          *,
          business_profiles!inner(name, category)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedAds = (data || []).map((ad: any) => ({
        ...ad,
        business_name: ad.business_profiles?.name,
        business_category: ad.business_profiles?.category,
      }));

      setAds(formattedAds);
    } catch (error) {
      console.error('Reklam yükleme hatası:', error);
      Alert.alert('Hata', 'Reklamlar yüklenemedi');
    }
  };

  const handleApprove = async (adId: string) => {
    Alert.alert(
      'Reklamı Onayla',
      'Bu reklamı onaylamak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('business_ads')
                .update({ status: 'approved' })
                .eq('id', adId);

              if (error) throw error;

              Alert.alert('Başarılı', 'Reklam onaylandı');
              fetchAds();
            } catch (error) {
              Alert.alert('Hata', 'Reklam onaylanamadı');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (adId: string) => {
    Alert.alert(
      'Reklamı Reddet',
      'Bu reklamı reddetmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('business_ads')
                .update({ status: 'rejected' })
                .eq('id', adId);

              if (error) throw error;

              Alert.alert('Başarılı', 'Reklam reddedildi');
              fetchAds();
            } catch (error) {
              Alert.alert('Hata', 'Reklam reddedilemedi');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAds();
    setRefreshing(false);
  };

  if (loading || !isAdmin) {
    return (
      <View style={styles.centerContainer}>
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📢 Reklam Moderasyonu</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'pending' && styles.filterBtnActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Bekleyen ({ads.filter(a => a.status === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'approved' && styles.filterBtnActive]}
          onPress={() => setFilter('approved')}
        >
          <Text style={[styles.filterText, filter === 'approved' && styles.filterTextActive]}>
            Onaylı
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'rejected' && styles.filterBtnActive]}
          onPress={() => setFilter('rejected')}
        >
          <Text style={[styles.filterText, filter === 'rejected' && styles.filterTextActive]}>
            Reddedilen
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Tümü
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {ads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Reklam bulunamadı</Text>
          </View>
        ) : (
          ads.map((ad) => (
            <View key={ad.id} style={styles.adCard}>
              <View style={styles.adHeader}>
                <Text style={styles.adTitle}>{ad.ad_title}</Text>
                <View style={[styles.statusBadge, getStatusStyle(ad.status)]}>
                  <Text style={styles.statusText}>{getStatusLabel(ad.status)}</Text>
                </View>
              </View>

              <View style={styles.businessInfo}>
                <Text style={styles.businessName}>🏢 {ad.business_name || 'İşletme adı yok'}</Text>
                <Text style={styles.businessCategory}>📂 {ad.business_category || 'Kategori yok'}</Text>
              </View>

              <Text style={styles.adDescription}>{ad.ad_description}</Text>

              <View style={styles.adDetails}>
                <Text style={styles.detailText}>🎬 Platform: {ad.video_platform}</Text>
                <Text style={styles.detailText}>🔗 {ad.video_url}</Text>
                <Text style={styles.detailText}>💰 Bütçe: {ad.budget} TL</Text>
                <Text style={styles.detailText}>📍 Yarıçap: {ad.radius} metre</Text>
                <Text style={styles.detailText}>📅 {new Date(ad.created_at).toLocaleString('tr-TR')}</Text>
              </View>

              {ad.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleApprove(ad.id)}
                  >
                    <Text style={styles.actionBtnText}>✅ Onayla</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleReject(ad.id)}
                  >
                    <Text style={styles.actionBtnText}>❌ Reddet</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Bekliyor';
    case 'approved': return 'Onaylı';
    case 'rejected': return 'Reddedildi';
    default: return status;
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'pending': return { backgroundColor: '#FFA500' };
    case 'approved': return { backgroundColor: '#28a745' };
    case 'rejected': return { backgroundColor: '#dc3545' };
    default: return { backgroundColor: '#6c757d' };
  }
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
  header: {
    backgroundColor: '#2c3e50',
    padding: 20,
    paddingTop: 40,
  },
  backBtn: {
    marginBottom: 10,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
  },
  filterBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  adCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  adHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  adTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  businessInfo: {
    marginBottom: 12,
  },
  businessName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 4,
  },
  businessCategory: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  adDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    lineHeight: 20,
  },
  adDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
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
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
