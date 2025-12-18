import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface Notification {
  id: string;
  type: 'user_report' | 'venue_suggestion' | 'indoor_suggestion' | 'general_feedback' | 'system_alert';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'unread' | 'read' | 'resolved' | 'archived';
  related_user_id?: string;
  related_item_id?: string;
  created_at: string;
  metadata?: any;
}

interface Statistics {
  total_reports: number;
  pending_reports: number;
  total_venue_suggestions: number;
  pending_venue_suggestions: number;
  total_indoor_suggestions: number;
  pending_indoor_suggestions: number;
  active_users_today: number;
  new_users_this_week: number;
}

const TYPE_ICONS: Record<string, string> = {
  user_report: '🚨',
  venue_suggestion: '🏥',
  indoor_suggestion: '🏢',
  general_feedback: '💬',
  system_alert: '⚠️',
};

const TYPE_LABELS: Record<string, string> = {
  user_report: 'Kullanıcı Şikayeti',
  venue_suggestion: 'Mekan Önerisi',
  indoor_suggestion: 'İç Mekan Önerisi',
  general_feedback: 'Genel Geri Bildirim',
  system_alert: 'Sistem Uyarısı',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: '#28a745',
  medium: '#ffc107',
  high: '#fd7e14',
  critical: '#dc3545',
};

export default function AdminNotificationPanel() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('unread');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, filterType, filterStatus]);

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

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchNotifications(),
        fetchStatistics(),
      ]);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      let query = supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Bildirimler yüklenemedi:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      // User reports
      const { count: totalReports } = await supabase
        .from('user_reports')
        .select('*', { count: 'exact', head: true });

      const { count: pendingReports } = await supabase
        .from('user_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Venue suggestions
      const { count: totalVenues } = await supabase
        .from('venue_suggestions')
        .select('*', { count: 'exact', head: true });

      const { count: pendingVenues } = await supabase
        .from('venue_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Indoor suggestions
      const { count: totalIndoor } = await supabase
        .from('indoor_map_suggestions')
        .select('*', { count: 'exact', head: true });

      const { count: pendingIndoor } = await supabase
        .from('indoor_map_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Active users today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: activeToday } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', today.toISOString());

      // New users this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count: newUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      setStatistics({
        total_reports: totalReports || 0,
        pending_reports: pendingReports || 0,
        total_venue_suggestions: totalVenues || 0,
        pending_venue_suggestions: pendingVenues || 0,
        total_indoor_suggestions: totalIndoor || 0,
        pending_indoor_suggestions: pendingIndoor || 0,
        active_users_today: activeToday || 0,
        new_users_this_week: newUsers || 0,
      });
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, status: 'read' as const } : n)
      );
    } catch (error) {
      console.error('İşaretleme hatası:', error);
    }
  };

  const markAsResolved = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      Alert.alert('✅ Başarılı', 'Bildirim çözüldü olarak işaretlendi');
      await fetchNotifications();
    } catch (error) {
      Alert.alert('Hata', 'İşlem başarısız');
    }
  };

  const archiveNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ status: 'archived' })
        .eq('id', notificationId);

      if (error) throw error;

      await fetchNotifications();
    } catch (error) {
      Alert.alert('Hata', 'Arşivleme başarısız');
    }
  };

  const navigateToDetail = (notification: Notification) => {
    markAsRead(notification.id);

    if (notification.type === 'user_report' && notification.related_item_id) {
      router.push('/AdminReportModerationScreen' as any);
    } else if (notification.type === 'venue_suggestion' && notification.related_item_id) {
      router.push('/AdminVenueModerationScreen' as any);
    } else if (notification.type === 'indoor_suggestion' && notification.related_item_id) {
      router.push('/IndoorModerationScreen' as any);
    }
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

  const filteredNotifications = notifications.filter(n => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(query) ||
        n.description.toLowerCase().includes(query)
      );
    }
    return true;
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
        <Text style={styles.title}>🔔 Admin Bildirim Paneli</Text>
        <Text style={styles.subtitle}>Şikayetler, Öneriler ve Uyarılar</Text>
      </View>

      {/* İstatistikler */}
      {statistics && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: '#dc3545' }]}>
              <Text style={styles.statNumber}>{statistics.pending_reports}</Text>
              <Text style={styles.statLabel}>Bekleyen Şikayet</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#ffc107' }]}>
              <Text style={styles.statNumber}>{statistics.pending_venue_suggestions}</Text>
              <Text style={styles.statLabel}>Bekleyen Mekan</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#fd7e14' }]}>
              <Text style={styles.statNumber}>{statistics.pending_indoor_suggestions}</Text>
              <Text style={styles.statLabel}>Bekleyen İç Mekan</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#28a745' }]}>
              <Text style={styles.statNumber}>{statistics.active_users_today}</Text>
              <Text style={styles.statLabel}>Bugün Aktif</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#007AFF' }]}>
              <Text style={styles.statNumber}>{statistics.new_users_this_week}</Text>
              <Text style={styles.statLabel}>Bu Hafta Yeni</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Hızlı Erişim Butonları */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: '#dc3545' }]}
          onPress={() => router.push('/AdminReportModerationScreen' as any)}
        >
          <Text style={styles.quickBtnText}>🚨 Şikayetler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: '#28a745' }]}
          onPress={() => router.push('/AdminVenueModerationScreen' as any)}
        >
          <Text style={styles.quickBtnText}>🏥 Mekanlar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: '#fd7e14' }]}
          onPress={() => router.push('/IndoorModerationScreen' as any)}
        >
          <Text style={styles.quickBtnText}>🏢 İç Mekan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: '#007AFF' }]}
          onPress={() => router.push('/AdminMapEditorScreen' as any)}
        >
          <Text style={styles.quickBtnText}>🗺️ Kroki Editör</Text>
        </TouchableOpacity>
      </View>

      {/* Arama */}
      <TextInput
        style={styles.searchInput}
        placeholder="Bildirim ara..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Filtreler */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'unread' && styles.filterChipActive]}
          onPress={() => setFilterStatus('unread')}
        >
          <Text style={[styles.filterText, filterStatus === 'unread' && styles.filterTextActive]}>
            ⏳ Okunmamış
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'read' && styles.filterChipActive]}
          onPress={() => setFilterStatus('read')}
        >
          <Text style={[styles.filterText, filterStatus === 'read' && styles.filterTextActive]}>
            👁️ Okundu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'resolved' && styles.filterChipActive]}
          onPress={() => setFilterStatus('resolved')}
        >
          <Text style={[styles.filterText, filterStatus === 'resolved' && styles.filterTextActive]}>
            ✅ Çözüldü
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
          onPress={() => setFilterStatus('all')}
        >
          <Text style={[styles.filterText, filterStatus === 'all' && styles.filterTextActive]}>
            📋 Tümü
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bildirim Listesi */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>📭 Bildirim bulunamadı</Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                notification.status === 'unread' && styles.notificationUnread,
              ]}
              onPress={() => navigateToDetail(notification)}
            >
              <View style={styles.notificationHeader}>
                <View style={styles.notificationHeaderLeft}>
                  <Text style={styles.notificationIcon}>
                    {TYPE_ICONS[notification.type] || '📢'}
                  </Text>
                  <View style={styles.notificationHeaderText}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMeta}>
                      {TYPE_LABELS[notification.type]} • {formatDate(notification.created_at)}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: SEVERITY_COLORS[notification.severity] },
                  ]}
                >
                  <Text style={styles.severityText}>
                    {notification.severity.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.notificationDescription} numberOfLines={2}>
                {notification.description}
              </Text>

              <View style={styles.notificationActions}>
                {notification.status === 'unread' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#007AFF' }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                  >
                    <Text style={styles.actionBtnText}>👁️ Okundu</Text>
                  </TouchableOpacity>
                )}

                {notification.status !== 'resolved' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#28a745' }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      markAsResolved(notification.id);
                    }}
                  >
                    <Text style={styles.actionBtnText}>✅ Çöz</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#6c757d' }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    archiveNotification(notification.id);
                  }}
                >
                  <Text style={styles.actionBtnText}>📦 Arşivle</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
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
  statsScroll: {
    flexGrow: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  statCard: {
    width: 120,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  quickBtn: {
    flex: 1,
    minWidth: 100,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  searchInput: {
    margin: 12,
    marginBottom: 0,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
  },
  filterScroll: {
    flexGrow: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginLeft: 12,
    marginVertical: 12,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
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
  notificationCard: {
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
  notificationUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    backgroundColor: '#f8f9fa',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  notificationHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  notificationHeaderText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  notificationMeta: {
    fontSize: 12,
    color: '#999',
  },
  severityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    height: 24,
  },
  severityText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  notificationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
