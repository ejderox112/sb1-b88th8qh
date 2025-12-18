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

interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  report_category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  admin_notes: string | null;
  action_taken: string | null;
  created_at: string;
  reporter_profile?: {
    nickname: string;
    email: string;
  };
  reported_profile?: {
    nickname: string;
    email: string;
    user_code: string;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  harassment: '😡 Taciz',
  offensive_language: '🤬 Küfür/Hakaret',
  spam: '📧 Spam',
  threat: '⚠️ Tehdit',
  inappropriate_content: '🔞 Uygunsuz İçerik',
  fake_profile: '👤 Sahte Profil',
  impersonation: '🎭 Kimliğe Bürünme',
  other: '📝 Diğer',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: '#28a745',
  medium: '#ffc107',
  high: '#fd7e14',
  critical: '#dc3545',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ Bekliyor',
  investigating: '🔍 İnceleniyor',
  resolved: '✅ Çözüldü',
  dismissed: '❌ Reddedildi',
  escalated: '🚨 Yükseltildi',
};

export default function AdminReportModerationScreen() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [filter, setFilter] = useState<string>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionType, setActionType] = useState<string>('');
  const [restrictionDuration, setRestrictionDuration] = useState('168'); // 7 gün default
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchReports();
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

  const fetchReports = async () => {
    try {
      let query = supabase
        .from('user_reports')
        .select(`
          *,
          reporter_profile:user_profiles!user_reports_reporter_id_fkey (
            nickname,
            email
          ),
          reported_profile:user_profiles!user_reports_reported_user_id_fkey (
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

      setReports(data || []);
    } catch (error) {
      Alert.alert('Hata', 'Şikayetler yüklenemedi: ' + (error as Error).message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const takeAction = async (reportId: string, reportedUserId: string, actionTypeParam: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      let actionResult = '';

      // 1. Moderasyon aksiyonu kaydet
      if (actionTypeParam === 'warning') {
        actionResult = 'Kullanıcıya uyarı verildi';
        
        await supabase
          .from('moderation_actions')
          .insert({
            moderator_id: userData.user.id,
            target_user_id: reportedUserId,
            action_type: 'warning',
            reason: adminNotes || 'Şikayet sonucu uyarı',
            report_id: reportId,
          });

      } else if (actionTypeParam === 'temp_ban') {
        const hours = parseInt(restrictionDuration) || 168;
        actionResult = `Kullanıcıya ${hours} saat (${Math.floor(hours / 24)} gün) geçici ban verildi`;
        
        await supabase
          .from('user_restrictions')
          .upsert({
            user_id: reportedUserId,
            is_banned: true,
            ban_reason: adminNotes || 'Şikayet sonucu geçici ban',
            ban_expires_at: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
            restricted_by: userData.user.id,
          });

        await supabase
          .from('moderation_actions')
          .insert({
            moderator_id: userData.user.id,
            target_user_id: reportedUserId,
            action_type: 'temp_ban',
            reason: adminNotes || 'Şikayet sonucu geçici ban',
            duration_hours: hours,
            report_id: reportId,
          });

      } else if (actionTypeParam === 'permanent_ban') {
        actionResult = 'Kullanıcıya kalıcı ban verildi';
        
        await supabase
          .from('user_restrictions')
          .upsert({
            user_id: reportedUserId,
            is_banned: true,
            ban_reason: adminNotes || 'Şikayet sonucu kalıcı ban',
            ban_expires_at: null, // Kalıcı
            restricted_by: userData.user.id,
          });

        await supabase
          .from('moderation_actions')
          .insert({
            moderator_id: userData.user.id,
            target_user_id: reportedUserId,
            action_type: 'permanent_ban',
            reason: adminNotes || 'Şikayet sonucu kalıcı ban',
            report_id: reportId,
          });

      } else if (actionTypeParam === 'restrict_messages') {
        actionResult = 'Kullanıcının mesaj gönderme yetkisi kaldırıldı';
        
        await supabase
          .from('user_restrictions')
          .upsert({
            user_id: reportedUserId,
            can_send_messages: false,
            restriction_reason: adminNotes || 'Şikayet sonucu mesaj kısıtlaması',
            restricted_by: userData.user.id,
          });

        await supabase
          .from('moderation_actions')
          .insert({
            moderator_id: userData.user.id,
            target_user_id: reportedUserId,
            action_type: 'restriction',
            reason: 'Mesaj gönderme kısıtlaması: ' + (adminNotes || 'Şikayet sonucu'),
            report_id: reportId,
          });

      } else if (actionTypeParam === 'dismiss') {
        actionResult = 'Şikayet geçersiz sayıldı';
      }

      // 2. Şikayet durumunu güncelle
      const { error: updateError } = await supabase
        .from('user_reports')
        .update({
          status: actionTypeParam === 'dismiss' ? 'dismissed' : 'resolved',
          admin_notes: adminNotes,
          action_taken: actionResult,
          reviewed_by: userData.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      Alert.alert('✅ Başarılı', actionResult);
      
      setExpandedId(null);
      setAdminNotes('');
      setActionType('');
      fetchReports();
    } catch (error) {
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi: ' + (error as Error).message);
    }
  };

  const confirmAction = (reportId: string, reportedUserId: string, action: string, reportData: UserReport) => {
    const actionMessages: Record<string, { title: string; message: string }> = {
      warning: {
        title: '⚠️ Uyarı Ver',
        message: `${reportData.reported_profile?.nickname} kullanıcısına uyarı vermek istediğinizden emin misiniz?`,
      },
      temp_ban: {
        title: '⏰ Geçici Ban',
        message: `${reportData.reported_profile?.nickname} kullanıcısını ${Math.floor(parseInt(restrictionDuration) / 24)} gün banlamak istediğinizden emin misiniz?`,
      },
      permanent_ban: {
        title: '🚫 Kalıcı Ban',
        message: `${reportData.reported_profile?.nickname} kullanıcısını KALICI olarak banlamak istediğinizden emin misiniz? Bu işlem geri alınamaz!`,
      },
      restrict_messages: {
        title: '💬 Mesaj Kısıtlama',
        message: `${reportData.reported_profile?.nickname} kullanıcısının mesaj gönderme yetkisini kaldırmak istediğinizden emin misiniz?`,
      },
      dismiss: {
        title: '❌ Şikayeti Reddet',
        message: 'Bu şikayeti geçersiz saymak istediğinizden emin misiniz?',
      },
    };

    const config = actionMessages[action];

    Alert.alert(
      config.title,
      config.message,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          style: action === 'permanent_ban' ? 'destructive' : 'default',
          onPress: () => takeAction(reportId, reportedUserId, action),
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

  const filterOptions = [
    { value: 'pending', label: '⏳ Bekleyen' },
    { value: 'investigating', label: '🔍 İnceleniyor' },
    { value: 'resolved', label: '✅ Çözüldü' },
    { value: 'dismissed', label: '❌ Reddedildi' },
    { value: 'escalated', label: '🚨 Yükseltildi' },
    { value: 'all', label: '📋 Tümü' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚨 Kullanıcı Şikayetleri</Text>
        <Text style={styles.subtitle}>{reports.length} şikayet</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {filterOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterChip,
              filter === option.value && { backgroundColor: '#dc3545' },
            ]}
            onPress={() => setFilter(option.value)}
          >
            <Text
              style={[
                styles.filterText,
                filter === option.value && styles.filterTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>📭 Şikayet bulunamadı</Text>
          </View>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={styles.card}>
              <TouchableOpacity
                onPress={() =>
                  setExpandedId(expandedId === report.id ? null : report.id)
                }
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.categoryLabel}>
                      {CATEGORY_LABELS[report.report_category] || report.report_category}
                    </Text>
                    <Text style={styles.reportedUser}>
                      👤 Şikayetli: {report.reported_profile?.nickname || 'Bilinmeyen'}
                    </Text>
                    <Text style={styles.reporterUser}>
                      🚨 Şikayet Eden: {report.reporter_profile?.nickname || 'Bilinmeyen'}
                    </Text>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    <View
                      style={[
                        styles.severityBadge,
                        { backgroundColor: SEVERITY_COLORS[report.severity] },
                      ]}
                    >
                      <Text style={styles.severityText}>
                        {report.severity.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>
                        {STATUS_LABELS[report.status] || report.status}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    🕐 {formatDate(report.created_at)}
                  </Text>
                </View>

                <Text style={styles.descriptionPreview} numberOfLines={2}>
                  {report.description}
                </Text>
              </TouchableOpacity>

              {expandedId === report.id && (
                <View style={styles.expandedContent}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>📝 Şikayet Detayı:</Text>
                    <Text style={styles.detailValue}>{report.description}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>👤 Şikayetli Kullanıcı:</Text>
                    <Text style={styles.detailValue}>
                      Email: {report.reported_profile?.email || 'N/A'}{'\n'}
                      Kod: {report.reported_profile?.user_code || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>🚨 Şikayet Eden:</Text>
                    <Text style={styles.detailValue}>
                      Email: {report.reporter_profile?.email || 'N/A'}
                    </Text>
                  </View>

                  {report.admin_notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>📋 Admin Notları:</Text>
                      <Text style={styles.detailValue}>{report.admin_notes}</Text>
                    </View>
                  )}

                  {report.action_taken && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>✅ Alınan Aksiyon:</Text>
                      <Text style={styles.detailValue}>{report.action_taken}</Text>
                    </View>
                  )}

                  {report.status === 'pending' && (
                    <>
                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>📝 Admin Notu:</Text>
                        <TextInput
                          style={styles.noteInput}
                          placeholder="İşlem notları..."
                          value={adminNotes}
                          onChangeText={setAdminNotes}
                          multiline
                          numberOfLines={3}
                        />
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>⏰ Ban Süresi (Saat):</Text>
                        <TextInput
                          style={styles.durationInput}
                          placeholder="168"
                          value={restrictionDuration}
                          onChangeText={setRestrictionDuration}
                          keyboardType="number-pad"
                        />
                        <Text style={styles.helperText}>
                          {Math.floor(parseInt(restrictionDuration) / 24)} gün
                        </Text>
                      </View>

                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#ffc107' }]}
                          onPress={() => confirmAction(report.id, report.reported_user_id, 'warning', report)}
                        >
                          <Text style={styles.actionBtnText}>⚠️ Uyarı</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#fd7e14' }]}
                          onPress={() => confirmAction(report.id, report.reported_user_id, 'temp_ban', report)}
                        >
                          <Text style={styles.actionBtnText}>⏰ Geçici Ban</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#dc3545' }]}
                          onPress={() => confirmAction(report.id, report.reported_user_id, 'permanent_ban', report)}
                        >
                          <Text style={styles.actionBtnText}>🚫 Kalıcı Ban</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#6c757d' }]}
                          onPress={() => confirmAction(report.id, report.reported_user_id, 'restrict_messages', report)}
                        >
                          <Text style={styles.actionBtnText}>💬 Mesaj Kısıtla</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#28a745', marginTop: 8 }]}
                        onPress={() => confirmAction(report.id, report.reported_user_id, 'dismiss', report)}
                      >
                        <Text style={styles.actionBtnText}>❌ Şikayeti Reddet</Text>
                      </TouchableOpacity>
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
    backgroundColor: '#dc3545',
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
    alignItems: 'flex-end',
    gap: 6,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc3545',
    marginBottom: 6,
  },
  reportedUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  reporterUser: {
    fontSize: 13,
    color: '#666',
  },
  severityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
  },
  statusText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  descriptionPreview: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
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
    lineHeight: 20,
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
  durationInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    width: 100,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
