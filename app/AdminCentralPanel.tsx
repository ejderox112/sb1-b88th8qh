import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface AdminStats {
  pending_reports: number;
  pending_venues: number;
  pending_indoor: number;
  pending_ads: number;
  total_users: number;
  active_today: number;
}

export default function AdminCentralPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData?.user) {
        Alert.alert('Hata', 'Giriş yapmalısınız');
        router.back();
        return;
      }

      const userEmail = userData.user.email || '';
      
      if (userEmail !== 'ejderha112@gmail.com') {
        Alert.alert('Erişim Engellendi', 'Admin yetkisi gerekli');
        router.back();
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    } catch (error) {
      Alert.alert('Hata', 'Güvenlik kontrolü yapılamadı');
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Bekleyen şikayetler
      const { count: reportCount } = await supabase
        .from('content_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Bekleyen mekan önerileri
      const { count: venueCount } = await supabase
        .from('venue_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Bekleyen indoor fotoğraflar
      const { count: indoorCount } = await supabase
        .from('indoor_photos')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'pending');

      // Bekleyen reklamlar
      const { count: adCount } = await supabase
        .from('business_ads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Toplam kullanıcı
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Bugün aktif kullanıcılar
      const { count: activeToday } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      setStats({
        pending_reports: reportCount || 0,
        pending_venues: venueCount || 0,
        pending_indoor: indoorCount || 0,
        pending_ads: adCount || 0,
        total_users: totalUsers || 0,
        active_today: activeToday || 0,
      });
    } catch (error) {
      console.error('İstatistik yükleme hatası:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

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

  const adminSections = [
    {
      title: '📢 Moderasyon',
      color: '#FF6B6B',
      items: [
        {
          icon: '🚨',
          title: 'İçerik Raporları',
          badge: stats?.pending_reports || 0,
          route: '/AdminReportModerationScreen',
          description: 'Pornografik/Spam içerik bildirimleri'
        },
        {
          icon: '🏥',
          title: 'Mekan Önerileri',
          badge: stats?.pending_venues || 0,
          route: '/AdminVenueModerationScreen',
          description: 'Kullanıcı mekan önerileri'
        },
        {
          icon: '📸',
          title: 'Indoor Fotoğraflar',
          badge: stats?.pending_indoor || 0,
          route: '/IndoorModerationScreen',
          description: 'İç mekan fotoğraf moderasyonu'
        },
        {
          icon: '📢',
          title: 'Reklam Onayları',
          badge: stats?.pending_ads || 0,
          route: '/BusinessAdModerationScreen',
          description: 'İşletme reklamları onay/red'
        },
      ],
    },
    {
      title: '🗺️ Harita & Lokasyon',
      color: '#4ECDC4',
      items: [
        {
          icon: '📍',
          title: 'Harita Editör',
          route: '/AdminMapEditorScreen',
          description: 'Bina/Kat/4 Köşe yönetimi'
        },
        {
          icon: '🏢',
          title: 'Indoor Harita',
          route: '/AdminIndoorMapEditorScreen',
          description: 'İç mekan harita çizimi'
        },
        {
          icon: '🗂️',
          title: 'Lokasyon Admin',
          route: '/LocationAdminScreen',
          description: 'A1/B1/C plan yönetimi'
        },
      ],
    },
    {
      title: '👥 Kullanıcı Yönetimi',
      color: '#95E1D3',
      items: [
        {
          icon: '👤',
          title: 'Kullanıcılar',
          badge: stats?.total_users || 0,
          route: '/AdminUserManagement',
          description: 'Kullanıcı listesi ve düzenleme'
        },
        {
          icon: '🎖️',
          title: 'Premium & Rütbe',
          route: '/AdminPremiumManagement',
          description: 'Abonelik ve rütbe yönetimi'
        },
        {
          icon: '🚫',
          title: 'Ban Yönetimi',
          route: '/AdminBanManagement',
          description: 'Yasaklı kullanıcılar'
        },
      ],
    },
    {
      title: '💰 Finans & Reklam',
      color: '#FFD93D',
      items: [
        {
          icon: '💳',
          title: 'Abonelik İşlemleri',
          route: '/AdminSubscriptionTransactions',
          description: 'Premium/Prestij/Plus işlemleri'
        },
        {
          icon: '📊',
          title: 'Reklam İstatistikleri',
          route: '/AdminAdStatistics',
          description: 'Reklam performans raporları'
        },
        {
          icon: '💸',
          title: 'Gelir Raporları',
          route: '/AdminRevenueReports',
          description: 'Finansal raporlar'
        },
      ],
    },
    {
      title: '📊 Sistem & Veri',
      color: '#6C5CE7',
      items: [
        {
          icon: '🔔',
          title: 'Bildirim Merkezi',
          route: '/AdminNotificationPanel',
          description: 'Sistem bildirimleri'
        },
        {
          icon: '💾',
          title: 'Veri Yönetimi',
          route: '/AdminDataManagementPanel',
          description: 'Backup/Export/Import'
        },
        {
          icon: '📈',
          title: 'Analytics Dashboard',
          route: '/AdminAnalyticsDashboard',
          description: 'Detaylı istatistikler'
        },
      ],
    },
  ];

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>👑 Admin Kontrol Paneli</Text>
        <Text style={styles.subtitle}>ejderha112@gmail.com</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Geri</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.pending_reports || 0}</Text>
          <Text style={styles.statLabel}>Bekleyen Rapor</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.pending_venues || 0}</Text>
          <Text style={styles.statLabel}>Mekan Önerisi</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.pending_ads || 0}</Text>
          <Text style={styles.statLabel}>Reklam Onayı</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.active_today || 0}</Text>
          <Text style={styles.statLabel}>Aktif (Bugün)</Text>
        </View>
      </View>

      {/* Admin Sections */}
      {adminSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <View style={[styles.sectionHeader, { borderLeftColor: section.color }]}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>

          {section.items.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuDescription}>{item.description}</Text>
                </View>
              </View>

              <View style={styles.menuItemRight}>
                {item.badge !== undefined && item.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
                <Text style={styles.menuArrow}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.quickActionsTitle}>⚡ Hızlı İşlemler</Text>
        
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: '#28a745' }]}
          onPress={() => {
            Alert.alert(
              'Toplu Bildirim',
              'Tüm kullanıcılara bildirim göndermek istiyor musunuz?',
              [
                { text: 'İptal', style: 'cancel' },
                { text: 'Gönder', onPress: () => console.log('Sending...') },
              ]
            );
          }}
        >
          <Text style={styles.quickActionText}>📢 Toplu Bildirim Gönder</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: '#007AFF' }]}
          onPress={() => router.push('/AdminDatabaseBackup' as any)}
        >
          <Text style={styles.quickActionText}>💾 Veritabanı Yedekle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: '#FF9500' }]}
          onPress={() => router.push('/AdminSystemLogs' as any)}
        >
          <Text style={styles.quickActionText}>📋 Sistem Logları</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    backgroundColor: '#2c3e50',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#ecf0f1',
    opacity: 0.9,
  },
  backBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    padding: 14,
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: '#dc3545',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  menuArrow: {
    fontSize: 24,
    color: '#bdc3c7',
  },
  quickActions: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
  },
  quickActionBtn: {
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
