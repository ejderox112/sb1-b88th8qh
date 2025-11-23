import { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { getSupporterBadges, getTopSupporters, likeSupporter, dislikeSupporter } from '@/lib/supporterLogic';
import { View, Text, Image, StyleSheet, FlatList } from 'react-native';
import ErrorMessage from '@/components/ErrorMessage';

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [supporterBadges, setSupporterBadges] = useState([]);
  const [donationInfo, setDonationInfo] = useState('');
  const [likeSent, setLikeSent] = useState(false);
  const [dislikeSent, setDislikeSent] = useState(false);

  useEffect(() => {
    loadMockProfile();
    loadMockBadges();
    fetchSupporterData();
    async function fetchSupporterData() {
      const userId = profile?.id || 'demo-123';
      const { getSupporterBadges } = await import('@/lib/supporterBadgeLogic');
      const { data } = await getSupporterBadges(userId);
      setSupporterBadges(data || []);
      // Bağış bilgisi
      // ...mevcut donationInfo kodu...
    }
  }, []);

  const loadMockProfile = () => {
    console.log('Mock profil yükleniyor...');
    setProfile({
      id: 'demo-123',
      nickname: 'Demo Kullanıcı',
      level: 5,
      xp: 500,
      avatar_url: 'https://i.pravatar.cc/150?img=68',
      user_code: 'DEMO123',
    });
    setLoading(false);
  };

  const loadMockBadges = () => {
    console.log('Mock rozetler yükleniyor...');
    // Şimdilik boş, ileride mock rozetler eklenebilir
    setBadges([]);
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.title}>👤 Profil</Text>
        {loading && <Text style={styles.info}>Yükleniyor...</Text>}
        <ErrorMessage message={error} />
        {/* Destekçi Rozetleri */}
        <View style={styles.badgeBox}>
          <Text style={styles.badgeTitle}>Destekçi Rozetleri</Text>
          {supporterBadges.length === 0 ? (
            <Text style={styles.badgeEmpty}>Henüz rozet yok.</Text>
          ) : (
            supporterBadges.map((badge, idx) => (
              <Text key={idx} style={styles.badgeItem}>{badge.badge} ({badge.project_id}) - {new Date(badge.awarded_at).toLocaleDateString('tr-TR')}</Text>
            ))
          )}
        </View>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        {!loading && !error && profile && (
          <>
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            <Text style={styles.name}>{profile.nickname || 'İsimsiz Kullanıcı'}</Text>
            <Text style={styles.info}>Seviye: {profile.level || 0}</Text>
            <Text style={styles.info}>XP: {profile.xp || 0}</Text>
            <View style={styles.supporterBox}>
              <Text style={styles.supporterBadge}>{supporterBadge ? `🏅 ${supporterBadge}` : '🏅 En Büyük Proje Destekçisi'}</Text>
              <Text style={styles.supporterDonation}>{donationInfo || 'Bağış bilgisi yok.'}</Text>
              <View style={styles.likeRow}>
                <Text style={styles.likeLabel}>Bu kullanıcıya:</Text>
                <TouchableOpacity style={[styles.likeBtn, likeSent && { opacity: 0.5 }]} disabled={likeSent} onPress={async () => {
                  if (!likeSent) {
                    await likeSupporter(profile.id, 'currentUserId');
                    setLikeSent(true);
                  }
                }}>
                  <Text style={styles.likeBtnText}>👍 Like</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dislikeBtn, dislikeSent && { opacity: 0.5 }]} disabled={dislikeSent} onPress={async () => {
                  if (!dislikeSent) {
                    await dislikeSupporter(profile.id, 'currentUserId');
                    setDislikeSent(true);
                  }
                }}>
                  <Text style={styles.dislikeBtnText}>👎 Dislike</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.likeInfo}>Her kullanıcıya 1 like/dislike gönderebilirsiniz.</Text>
            </View>
          </>
        )}
        {!loading && !error && !profile && (
          <Text style={styles.info}>Profil verisi bulunamadı.</Text>
        )}
        {/* Rozetler başlığı ve listesi bitişik JSX hatası için kapsayıcıya alındı */}
        <View>
          <Text style={styles.badgeTitle}>Rozetler</Text>
          <FlatList
            data={badges}
            keyExtractor={item => item.id}
            horizontal
            renderItem={({ item }) => (
              <Image source={{ uri: item.icon_url }} style={styles.badge} />
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Henüz rozet kazanılmadı</Text>
            }
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold' as const, marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginVertical: 10 },
  name: { fontSize: 20, fontWeight: 'bold' as const, textAlign: 'center', marginVertical: 10 },
  info: { fontSize: 14, color: '#666', textAlign: 'center', marginVertical: 5 },
  badgeTitle: { marginTop: 20, fontSize: 16, fontWeight: 'bold' as const },
  badge: { width: 50, height: 50, marginRight: 10 },
  emptyText: { fontSize: 14, color: '#999', fontStyle: 'italic' as const },
  errorBox: { backgroundColor: '#fee', padding: 15, borderRadius: 8, marginVertical: 10 },
  errorText: { color: '#c00', fontSize: 14 },
  supporterBox: {
    backgroundColor: '#23272e',
    padding: 14,
    borderRadius: 10,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#3a3d42',
    alignItems: 'center',
  },
  supporterBadge: {
    color: '#00d4ff',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 6,
  },
  supporterDonation: {
    color: '#ffddaa',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  likeLabel: {
    color: '#fff',
    fontSize: 14,
    marginRight: 8,
  },
  likeBtn: {
    backgroundColor: '#00d4ff',
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  likeBtnText: {
    color: '#23272e',
    fontWeight: '700',
    fontSize: 14,
  },
  dislikeBtn: {
    backgroundColor: '#ffddaa',
    padding: 8,
    borderRadius: 8,
  },
  dislikeBtnText: {
    color: '#23272e',
    fontWeight: '700',
    fontSize: 14,
  },
  likeInfo: {
    color: '#b0b3b8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },
});