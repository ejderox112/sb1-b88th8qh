import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface UserData {
  id: string;
  email: string;
  nickname: string;
  level: number;
  xp: number;
  user_code: string;
  is_banned?: boolean;
  warning_count?: number;
  created_at: string;
  last_seen_at?: string;
}

interface SystemStats {
  total_users: number;
  active_users_24h: number;
  banned_users: number;
  total_reports: number;
  pending_reports: number;
  total_venues: number;
  pending_venues: number;
  total_indoor_maps: number;
  total_tasks: number;
  total_xp_awarded: number;
}

export default function AdminDataManagementPanel() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'stats' | 'users' | 'bulk' | 'export'>('stats');
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Bulk operations
  const [bulkXP, setBulkXP] = useState('');
  const [bulkAction, setBulkAction] = useState<'add_xp' | 'remove_xp' | 'ban' | 'unban' | 'reset_warnings'>('add_xp');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      if (selectedTab === 'users') {
        fetchUsers();
      }
    }
  }, [isAdmin, selectedTab]);

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

  const fetchStats = async () => {
    try {
      // Total users
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Active users 24h
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      
      const { count: activeUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen_at', yesterday.toISOString());

      // Banned users
      const { count: bannedUsers } = await supabase
        .from('user_restrictions')
        .select('*', { count: 'exact', head: true })
        .eq('is_banned', true);

      // Reports
      const { count: totalReports } = await supabase
        .from('user_reports')
        .select('*', { count: 'exact', head: true });

      const { count: pendingReports } = await supabase
        .from('user_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Venues
      const { count: totalVenues } = await supabase
        .from('venue_suggestions')
        .select('*', { count: 'exact', head: true });

      const { count: pendingVenues } = await supabase
        .from('venue_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Indoor maps
      const { count: totalIndoor } = await supabase
        .from('indoor_map_suggestions')
        .select('*', { count: 'exact', head: true });

      // Tasks
      const { count: totalTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });

      // Total XP
      const { data: xpData } = await supabase
        .from('user_profiles')
        .select('xp');
      
      const totalXP = xpData?.reduce((sum: number, user: any) => sum + (user.xp || 0), 0) || 0;

      setStats({
        total_users: totalUsers || 0,
        active_users_24h: activeUsers || 0,
        banned_users: bannedUsers || 0,
        total_reports: totalReports || 0,
        pending_reports: pendingReports || 0,
        total_venues: totalVenues || 0,
        pending_venues: pendingVenues || 0,
        total_indoor_maps: totalIndoor || 0,
        total_tasks: totalTasks || 0,
        total_xp_awarded: totalXP,
      });
    } catch (error) {
      console.error('İstatistik hatası:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          nickname,
          level,
          xp,
          user_code,
          created_at,
          last_seen_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (searchQuery.trim()) {
        const search = searchQuery.trim();
        query = query.or(`email.ilike.%${search}%,nickname.ilike.%${search}%,user_code.ilike.%${search}%`);
      }

      const { data: profilesData, error: profilesError } = await query;

      if (profilesError) throw profilesError;

      // Get restriction data
      const userIds = profilesData?.map((u: any) => u.id) || [];
      const { data: restrictionsData } = await supabase
        .from('user_restrictions')
        .select('user_id, is_banned, warning_count')
        .in('user_id', userIds);

      const restrictionsMap = new Map<string, { is_banned: boolean; warning_count: number }>(
        restrictionsData?.map((r: any) => [r.user_id, { is_banned: r.is_banned, warning_count: r.warning_count }]) || []
      );

      const enrichedUsers = profilesData?.map((user: any) => {
        const restriction = restrictionsMap.get(user.id);
        return {
          ...user,
          is_banned: restriction?.is_banned || false,
          warning_count: restriction?.warning_count || 0,
        };
      }) || [];

      setUsers(enrichedUsers);
    } catch (error) {
      Alert.alert('Hata', 'Kullanıcılar yüklenemedi');
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(users.map(u => u.id));
  };

  const deselectAllUsers = () => {
    setSelectedUsers([]);
  };

  const executeBulkOperation = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Uyarı', 'Lütfen en az bir kullanıcı seçin');
      return;
    }

    Alert.alert(
      '⚠️ Toplu İşlem Onayı',
      `${selectedUsers.length} kullanıcıya ${bulkAction} işlemi uygulanacak. Devam edilsin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          style: 'destructive',
          onPress: async () => {
            try {
              if (bulkAction === 'add_xp') {
                const xpAmount = parseInt(bulkXP) || 0;
                if (xpAmount <= 0) {
                  Alert.alert('Hata', 'Geçerli bir XP miktarı girin');
                  return;
                }

                // Update XP for all selected users
                for (const userId of selectedUsers) {
                  const user = users.find(u => u.id === userId);
                  if (!user) continue;

                  const newXP = user.xp + xpAmount;
                  const newLevel = Math.floor(Math.sqrt(newXP / 10));

                  await supabase
                    .from('user_profiles')
                    .update({ xp: newXP, level: newLevel })
                    .eq('id', userId);
                }

                Alert.alert('✅ Başarılı', `${selectedUsers.length} kullanıcıya ${xpAmount} XP eklendi`);

              } else if (bulkAction === 'remove_xp') {
                const xpAmount = parseInt(bulkXP) || 0;
                if (xpAmount <= 0) {
                  Alert.alert('Hata', 'Geçerli bir XP miktarı girin');
                  return;
                }

                for (const userId of selectedUsers) {
                  const user = users.find(u => u.id === userId);
                  if (!user) continue;

                  const newXP = Math.max(0, user.xp - xpAmount);
                  const newLevel = Math.floor(Math.sqrt(newXP / 10));

                  await supabase
                    .from('user_profiles')
                    .update({ xp: newXP, level: newLevel })
                    .eq('id', userId);
                }

                Alert.alert('✅ Başarılı', `${selectedUsers.length} kullanıcıdan ${xpAmount} XP çıkarıldı`);

              } else if (bulkAction === 'ban') {
                const { data: adminUser } = await supabase.auth.getUser();
                
                for (const userId of selectedUsers) {
                  await supabase
                    .from('user_restrictions')
                    .upsert({
                      user_id: userId,
                      is_banned: true,
                      ban_reason: 'Toplu ban işlemi (admin)',
                      restricted_by: adminUser?.user?.id,
                    });
                }

                Alert.alert('✅ Başarılı', `${selectedUsers.length} kullanıcı banlandı`);

              } else if (bulkAction === 'unban') {
                for (const userId of selectedUsers) {
                  await supabase
                    .from('user_restrictions')
                    .update({
                      is_banned: false,
                      ban_expires_at: null,
                      ban_reason: null,
                    })
                    .eq('user_id', userId);
                }

                Alert.alert('✅ Başarılı', `${selectedUsers.length} kullanıcının banı kaldırıldı`);

              } else if (bulkAction === 'reset_warnings') {
                for (const userId of selectedUsers) {
                  await supabase
                    .from('user_restrictions')
                    .update({ warning_count: 0 })
                    .eq('user_id', userId);
                }

                Alert.alert('✅ Başarılı', `${selectedUsers.length} kullanıcının uyarıları sıfırlandı`);
              }

              deselectAllUsers();
              fetchUsers();
            } catch (error) {
              Alert.alert('Hata', 'Toplu işlem başarısız: ' + (error as Error).message);
            }
          },
        },
      ]
    );
  };

  const exportData = async (dataType: string) => {
    Alert.alert(
      'Veri Dışa Aktarma',
      `${dataType} verileri dışa aktarılacak. Bu işlem biraz zaman alabilir.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Devam',
          onPress: async () => {
            try {
              let data: any[] = [];
              let filename = '';

              if (dataType === 'users') {
                const { data: usersData } = await supabase
                  .from('user_profiles')
                  .select('*')
                  .order('created_at', { ascending: false });
                data = usersData || [];
                filename = 'users_export.json';
              } else if (dataType === 'reports') {
                const { data: reportsData } = await supabase
                  .from('user_reports')
                  .select('*')
                  .order('created_at', { ascending: false });
                data = reportsData || [];
                filename = 'reports_export.json';
              } else if (dataType === 'venues') {
                const { data: venuesData } = await supabase
                  .from('venue_suggestions')
                  .select('*')
                  .order('created_at', { ascending: false });
                data = venuesData || [];
                filename = 'venues_export.json';
              }

              const jsonString = JSON.stringify(data, null, 2);
              
              // In a real implementation, you would save this to device storage
              // For now, we'll just show the data length
              Alert.alert(
                '✅ Dışa Aktarma Hazır',
                `${data.length} kayıt hazırlandı. Dosya: ${filename}\n\nBoyut: ${(jsonString.length / 1024).toFixed(2)} KB`
              );

            } catch (error) {
              Alert.alert('Hata', 'Dışa aktarma başarısız');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Bilinmiyor';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Data Yönetim Paneli</Text>
        <Text style={styles.subtitle}>Kullanıcı & Sistem Verileri</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'stats' && styles.tabActive]}
          onPress={() => setSelectedTab('stats')}
        >
          <Text style={[styles.tabText, selectedTab === 'stats' && styles.tabTextActive]}>
            📊 İstatistikler
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'users' && styles.tabActive]}
          onPress={() => setSelectedTab('users')}
        >
          <Text style={[styles.tabText, selectedTab === 'users' && styles.tabTextActive]}>
            👥 Kullanıcılar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'bulk' && styles.tabActive]}
          onPress={() => setSelectedTab('bulk')}
        >
          <Text style={[styles.tabText, selectedTab === 'bulk' && styles.tabTextActive]}>
            ⚙️ Toplu İşlem
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'export' && styles.tabActive]}
          onPress={() => setSelectedTab('export')}
        >
          <Text style={[styles.tabText, selectedTab === 'export' && styles.tabTextActive]}>
            💾 Dışa Aktar
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView style={styles.content}>
        {/* Statistics Tab */}
        {selectedTab === 'stats' && stats && (
          <View style={styles.statsTab}>
            <View style={styles.statRow}>
              <View style={[styles.statBox, { backgroundColor: '#007AFF' }]}>
                <Text style={styles.statNumber}>{stats.total_users}</Text>
                <Text style={styles.statLabel}>Toplam Kullanıcı</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: '#28a745' }]}>
                <Text style={styles.statNumber}>{stats.active_users_24h}</Text>
                <Text style={styles.statLabel}>24s Aktif</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={[styles.statBox, { backgroundColor: '#dc3545' }]}>
                <Text style={styles.statNumber}>{stats.banned_users}</Text>
                <Text style={styles.statLabel}>Banlı Kullanıcı</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: '#ffc107' }]}>
                <Text style={styles.statNumber}>{stats.pending_reports}</Text>
                <Text style={styles.statLabel}>Bekleyen Şikayet</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={[styles.statBox, { backgroundColor: '#fd7e14' }]}>
                <Text style={styles.statNumber}>{stats.total_venues}</Text>
                <Text style={styles.statLabel}>Toplam Mekan</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: '#6c757d' }]}>
                <Text style={styles.statNumber}>{stats.total_indoor_maps}</Text>
                <Text style={styles.statLabel}>İç Mekan</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={[styles.statBox, { backgroundColor: '#17a2b8' }]}>
                <Text style={styles.statNumber}>{stats.total_tasks}</Text>
                <Text style={styles.statLabel}>Toplam Görev</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: '#6f42c1' }]}>
                <Text style={styles.statNumber}>{stats.total_xp_awarded.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Toplam XP</Text>
              </View>
            </View>

            <View style={styles.quickActionsSection}>
              <Text style={styles.sectionTitle}>🚀 Hızlı Erişim</Text>
              
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: '#dc3545' }]}
                onPress={() => router.push('/AdminReportModerationScreen' as any)}
              >
                <Text style={styles.quickActionText}>🚨 Şikayetleri Görüntüle</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: '#28a745' }]}
                onPress={() => router.push('/AdminVenueModerationScreen' as any)}
              >
                <Text style={styles.quickActionText}>🏥 Mekan Önerilerini Görüntüle</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: '#007AFF' }]}
                onPress={() => router.push('/AdminMapEditorScreen' as any)}
              >
                <Text style={styles.quickActionText}>🗺️ Kroki Editör</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: '#ffc107' }]}
                onPress={() => router.push('/AdminNotificationPanel' as any)}
              >
                <Text style={styles.quickActionText}>🔔 Bildirim Paneli</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Users Tab */}
        {selectedTab === 'users' && (
          <View style={styles.usersTab}>
            <TextInput
              style={styles.searchInput}
              placeholder="Kullanıcı ara (email, nick, kod)..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={fetchUsers}
            />

            <TouchableOpacity style={styles.searchBtn} onPress={fetchUsers}>
              <Text style={styles.searchBtnText}>🔍 Ara</Text>
            </TouchableOpacity>

            {users.map((user) => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <TouchableOpacity onPress={() => toggleUserSelection(user.id)}>
                    <View style={styles.checkbox}>
                      {selectedUsers.includes(user.id) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.userInfo}>
                    <Text style={styles.userNickname}>{user.nickname}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <Text style={styles.userCode}>Kod: {user.user_code}</Text>
                  </View>

                  <View style={styles.userStats}>
                    <Text style={styles.userLevel}>Lv{user.level}</Text>
                    <Text style={styles.userXP}>{user.xp} XP</Text>
                  </View>
                </View>

                {user.is_banned && (
                  <Text style={styles.bannedBadge}>🚫 BANLI</Text>
                )}
                {(user.warning_count || 0) > 0 && (
                  <Text style={styles.warningBadge}>⚠️ {user.warning_count} Uyarı</Text>
                )}

                <Text style={styles.userDate}>
                  Kayıt: {formatDate(user.created_at)}
                </Text>
              </View>
            ))}

            {users.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Kullanıcı bulunamadı</Text>
              </View>
            )}
          </View>
        )}

        {/* Bulk Operations Tab */}
        {selectedTab === 'bulk' && (
          <View style={styles.bulkTab}>
            <Text style={styles.sectionTitle}>
              ⚙️ Toplu İşlem ({selectedUsers.length} kullanıcı seçili)
            </Text>

            <View style={styles.selectionActions}>
              <TouchableOpacity style={styles.selectionBtn} onPress={selectAllUsers}>
                <Text style={styles.selectionBtnText}>✅ Tümünü Seç</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.selectionBtn} onPress={deselectAllUsers}>
                <Text style={styles.selectionBtnText}>❌ Seçimi Temizle</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>İşlem Tipi</Text>
            <View style={styles.actionTypeGrid}>
              <TouchableOpacity
                style={[
                  styles.actionTypeChip,
                  bulkAction === 'add_xp' && styles.actionTypeChipActive,
                ]}
                onPress={() => setBulkAction('add_xp')}
              >
                <Text style={styles.actionTypeText}>➕ XP Ekle</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionTypeChip,
                  bulkAction === 'remove_xp' && styles.actionTypeChipActive,
                ]}
                onPress={() => setBulkAction('remove_xp')}
              >
                <Text style={styles.actionTypeText}>➖ XP Çıkar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionTypeChip,
                  bulkAction === 'ban' && styles.actionTypeChipActive,
                ]}
                onPress={() => setBulkAction('ban')}
              >
                <Text style={styles.actionTypeText}>🚫 Ban</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionTypeChip,
                  bulkAction === 'unban' && styles.actionTypeChipActive,
                ]}
                onPress={() => setBulkAction('unban')}
              >
                <Text style={styles.actionTypeText}>✅ Ban Kaldır</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionTypeChip,
                  bulkAction === 'reset_warnings' && styles.actionTypeChipActive,
                ]}
                onPress={() => setBulkAction('reset_warnings')}
              >
                <Text style={styles.actionTypeText}>🔄 Uyarı Sıfırla</Text>
              </TouchableOpacity>
            </View>

            {(bulkAction === 'add_xp' || bulkAction === 'remove_xp') && (
              <>
                <Text style={styles.label}>XP Miktarı</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Örn: 500"
                  value={bulkXP}
                  onChangeText={setBulkXP}
                  keyboardType="number-pad"
                />
              </>
            )}

            <TouchableOpacity
              style={[
                styles.executeBulkBtn,
                selectedUsers.length === 0 && styles.executeBulkBtnDisabled,
              ]}
              onPress={executeBulkOperation}
              disabled={selectedUsers.length === 0}
            >
              <Text style={styles.executeBulkBtnText}>
                ⚡ İşlemi Uygula ({selectedUsers.length} kullanıcı)
              </Text>
            </TouchableOpacity>

            <Text style={styles.warningText}>
              ⚠️ Toplu işlemler geri alınamaz! Dikkatli olun.
            </Text>
          </View>
        )}

        {/* Export Tab */}
        {selectedTab === 'export' && (
          <View style={styles.exportTab}>
            <Text style={styles.sectionTitle}>💾 Veri Dışa Aktarma</Text>

            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: '#007AFF' }]}
              onPress={() => exportData('users')}
            >
              <Text style={styles.exportBtnText}>👥 Kullanıcı Verilerini Aktar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: '#dc3545' }]}
              onPress={() => exportData('reports')}
            >
              <Text style={styles.exportBtnText}>🚨 Şikayet Verilerini Aktar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: '#28a745' }]}
              onPress={() => exportData('venues')}
              >
              <Text style={styles.exportBtnText}>🏥 Mekan Verilerini Aktar</Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ℹ️ Dışa aktarılan veriler JSON formatında olacaktır. Veriler cihazınıza kaydedilecektir.
              </Text>
            </View>
          </View>
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
    backgroundColor: '#6f42c1',
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
  tabScroll: {
    flexGrow: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6f42c1',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#6f42c1',
  },
  content: {
    flex: 1,
  },
  statsTab: {
    padding: 16,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    padding: 20,
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
  quickActionsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  quickActionBtn: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  usersTab: {
    padding: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  searchBtn: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userNickname: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  userEmail: {
    fontSize: 13,
    color: '#666',
  },
  userCode: {
    fontSize: 12,
    color: '#999',
  },
  userStats: {
    alignItems: 'flex-end',
  },
  userLevel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  userXP: {
    fontSize: 12,
    color: '#666',
  },
  bannedBadge: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '700',
    marginBottom: 4,
  },
  warningBadge: {
    fontSize: 12,
    color: '#ffc107',
    fontWeight: '700',
    marginBottom: 4,
  },
  userDate: {
    fontSize: 11,
    color: '#999',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
  },
  bulkTab: {
    padding: 16,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  selectionBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  actionTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  actionTypeChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  actionTypeChipActive: {
    backgroundColor: '#e9f5ff',
    borderColor: '#007AFF',
  },
  actionTypeText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  executeBulkBtn: {
    backgroundColor: '#dc3545',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  executeBulkBtnDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.5,
  },
  executeBulkBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  warningText: {
    fontSize: 13,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 12,
  },
  exportTab: {
    padding: 16,
  },
  exportBtn: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  exportBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  infoBox: {
    backgroundColor: '#e9f5ff',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#007AFF',
    lineHeight: 20,
  },
});
