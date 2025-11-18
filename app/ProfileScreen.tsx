import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList } from 'react-native';

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Basit mock profil yükle (Supabase'siz çalışmak için)
    loadMockProfile();
    loadMockBadges();
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
    <View style={styles.container}>
      <Text style={styles.title}>👤 Profil</Text>
      
      {loading && <Text style={styles.info}>Yükleniyor...</Text>}
      
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}
      
      {!loading && !error && profile && (
        <>
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          <Text style={styles.name}>{profile.nickname || 'İsimsiz Kullanıcı'}</Text>
          <Text style={styles.info}>Seviye: {profile.level || 0}</Text>
          <Text style={styles.info}>XP: {profile.xp || 0}</Text>
        </>
      )}
      
      {!loading && !error && !profile && (
        <Text style={styles.info}>Profil verisi bulunamadı.</Text>
      )}
      
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
});