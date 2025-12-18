import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface UserInfo {
  id: string;
  email: string;
  nickname: string;
  level: number;
  xp: number;
  subscription_tier: string;
  military_rank: string;
  total_spent: number;
}

export default function AdminPremiumManagement() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [searching, setSearching] = useState(false);

  React.useEffect(() => {
    checkAdminAccess();
  }, []);

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

  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      Alert.alert('Uyarı', 'Lütfen email adresi girin');
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', searchEmail.trim().toLowerCase())
        .single();

      if (error) throw error;

      if (!data) {
        Alert.alert('Bulunamadı', 'Bu email adresine sahip kullanıcı bulunamadı');
        setUserInfo(null);
        return;
      }

      setUserInfo({
        id: data.id,
        email: data.email,
        nickname: data.nickname || 'İsimsiz',
        level: data.level || 0,
        xp: data.xp || 0,
        subscription_tier: data.subscription_tier || 'free',
        military_rank: data.military_rank || 'yok',
        total_spent: data.total_spent || 0,
      });
    } catch (error) {
      console.error('Kullanıcı arama hatası:', error);
      Alert.alert('Hata', 'Kullanıcı aranamadı');
    } finally {
      setSearching(false);
    }
  };

  const handleUpdateTier = async (newTier: string) => {
    if (!userInfo) return;

    Alert.alert(
      'Abonelik Değiştir',
      `${userInfo.nickname} kullanıcısının aboneliğini ${getTierName(newTier)} olarak değiştirmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Değiştir',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_profiles')
                .update({ subscription_tier: newTier })
                .eq('id', userInfo.id);

              if (error) throw error;

              // Log transaction
              await supabase.from('subscription_transactions').insert({
                user_id: userInfo.id,
                tier: newTier,
                amount: 0,
                status: 'completed',
                payment_method: 'admin_manual',
              });

              Alert.alert('Başarılı', 'Abonelik güncellendi');
              handleSearch(); // Refresh user info
            } catch (error) {
              console.error('Abonelik güncelleme hatası:', error);
              Alert.alert('Hata', 'Abonelik güncellenemedi');
            }
          },
        },
      ]
    );
  };

  const handleUpdateRank = async () => {
    if (!userInfo) return;

    Alert.prompt(
      'Rütbe Değiştir',
      'Yeni rütbe adını girin (örn: cavus, teğmen, albay):',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Değiştir',
          onPress: async (newRank?: string) => {
            if (!newRank) return;
            try {
              const { error } = await supabase
                .from('user_profiles')
                .update({ military_rank: newRank.toLowerCase() })
                .eq('id', userInfo.id);

              if (error) throw error;

              Alert.alert('Başarılı', 'Rütbe güncellendi');
              handleSearch();
            } catch (error) {
              Alert.alert('Hata', 'Rütbe güncellenemedi');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleAddXP = async () => {
    if (!userInfo) return;

    Alert.prompt(
      'XP Ekle',
      'Eklenecek XP miktarını girin:',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ekle',
          onPress: async (amount?: string) => {
            if (!amount) return;
            const xpAmount = parseInt(amount);
            if (isNaN(xpAmount) || xpAmount <= 0) {
              Alert.alert('Hata', 'Geçerli bir sayı girin');
              return;
            }

            try {
              const newXP = userInfo.xp + xpAmount;
              const newLevel = Math.floor(Math.sqrt(newXP / 10));

              const { error } = await supabase
                .from('user_profiles')
                .update({ xp: newXP, level: newLevel })
                .eq('id', userInfo.id);

              if (error) throw error;

              Alert.alert('Başarılı', `${xpAmount} XP eklendi. Yeni seviye: ${newLevel}`);
              handleSearch();
            } catch (error) {
              Alert.alert('Hata', 'XP eklenemedi');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleAddSpent = async () => {
    if (!userInfo) return;

    Alert.prompt(
      'Harcama Ekle',
      'Eklenecek harcama miktarını girin (TL):',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ekle',
          onPress: async (amount?: string) => {
            if (!amount) return;
            const spentAmount = parseFloat(amount);
            if (isNaN(spentAmount) || spentAmount <= 0) {
              Alert.alert('Hata', 'Geçerli bir sayı girin');
              return;
            }

            try {
              const newSpent = userInfo.total_spent + spentAmount;

              const { error } = await supabase
                .from('user_profiles')
                .update({ total_spent: newSpent })
                .eq('id', userInfo.id);

              if (error) throw error;

              Alert.alert('Başarılı', `${spentAmount} TL harcama eklendi`);
              handleSearch();
            } catch (error) {
              Alert.alert('Hata', 'Harcama eklenemedi');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  if (loading || !isAdmin) {
    return (
      <View style={styles.centerContainer}>
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🎖️ Premium & Rütbe Yönetimi</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>👤 Kullanıcı Ara</Text>
          <TextInput
            style={styles.input}
            value={searchEmail}
            onChangeText={setSearchEmail}
            placeholder="Email adresi girin"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={handleSearch}
            disabled={searching}
          >
            <Text style={styles.searchBtnText}>
              {searching ? '⏳ Aranıyor...' : '🔍 Ara'}
            </Text>
          </TouchableOpacity>
        </View>

        {userInfo && (
          <View style={styles.userSection}>
            <Text style={styles.sectionTitle}>📋 Kullanıcı Bilgileri</Text>
            
            <View style={styles.infoCard}>
              <InfoRow label="Email" value={userInfo.email} />
              <InfoRow label="Kullanıcı Adı" value={userInfo.nickname} />
              <InfoRow label="Seviye" value={userInfo.level.toString()} />
              <InfoRow label="XP" value={userInfo.xp.toString()} />
              <InfoRow label="Abonelik" value={getTierName(userInfo.subscription_tier)} />
              <InfoRow label="Rütbe" value={userInfo.military_rank} />
              <InfoRow label="Toplam Harcama" value={`${userInfo.total_spent} TL`} />
            </View>

            <View style={styles.tierSection}>
              <Text style={styles.sectionTitle}>💎 Abonelik Değiştir</Text>
              <View style={styles.tierButtons}>
                <TouchableOpacity
                  style={[styles.tierBtn, { backgroundColor: '#6c757d' }]}
                  onPress={() => handleUpdateTier('free')}
                >
                  <Text style={styles.tierBtnText}>Free</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tierBtn, { backgroundColor: '#007AFF' }]}
                  onPress={() => handleUpdateTier('premium')}
                >
                  <Text style={styles.tierBtnText}>Premium</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tierBtn, { backgroundColor: '#FFD700' }]}
                  onPress={() => handleUpdateTier('prestij')}
                >
                  <Text style={styles.tierBtnText}>Prestij</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tierBtn, { backgroundColor: '#FF6B6B' }]}
                  onPress={() => handleUpdateTier('premium_plus')}
                >
                  <Text style={styles.tierBtnText}>Premium+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>⚡ Hızlı İşlemler</Text>
              
              <TouchableOpacity style={styles.actionBtn} onPress={handleUpdateRank}>
                <Text style={styles.actionBtnText}>🎖️ Rütbe Değiştir</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={handleAddXP}>
                <Text style={styles.actionBtnText}>⭐ XP Ekle</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={handleAddSpent}>
                <Text style={styles.actionBtnText}>💰 Harcama Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>ℹ️ Bilgilendirme</Text>
          <Text style={styles.infoBoxText}>
            • Abonelik değişiklikleri anında uygulanır{'\n'}
            • Manuel işlemler subscription_transactions tablosuna "admin_manual" olarak kaydedilir{'\n'}
            • XP ekleme otomatik olarak seviye hesaplar{'\n'}
            • Rütbe güncellemesi military_ranks tablosuna göre yapılmalıdır
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function getTierName(tier: string): string {
  switch (tier) {
    case 'free': return 'Ücretsiz';
    case 'premium': return 'Premium (79 TL/ay)';
    case 'prestij': return 'Prestij (500 TL/ay)';
    case 'premium_plus': return 'Premium Plus (1000 TL/ay)';
    default: return tier;
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
  content: {
    padding: 16,
  },
  searchSection: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  searchBtn: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userSection: {
    marginBottom: 16,
  },
  infoCard: {
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '500',
  },
  tierSection: {
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
  tierButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  tierBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tierBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionsSection: {
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
  actionBtn: {
    backgroundColor: '#28a745',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#e9f5ff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
});
