import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

interface Profile {
  id: string;
  nickname: string;
  level: number;
  xp: number;
  avatar_url: string;
  user_code: string;
  location_sharing: boolean;
  profile_visible: boolean;
  indoor_nav_enabled: boolean;
}

interface Badge {
  id: string;
  icon_url: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationSharing, setLocationSharing] = useState(true);
  const [profileVisible, setProfileVisible] = useState(true);
  const [indoorNavEnabled, setIndoorNavEnabled] = useState(false);

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
      location_sharing: true,
      profile_visible: true,
      indoor_nav_enabled: false,
    });
    setLocationSharing(true);
    setProfileVisible(true);
    setIndoorNavEnabled(false);
    setLoading(false);
  };

  const loadMockBadges = () => {
    console.log('Mock rozetler yükleniyor...');
    setBadges([
      { id: 'badge-1', icon_url: 'https://img.icons8.com/emoji/96/trophy-emoji.png' },
      { id: 'badge-2', icon_url: 'https://img.icons8.com/emoji/96/star-emoji.png' },
      { id: 'badge-3', icon_url: 'https://img.icons8.com/emoji/96/fire.png' },
      { id: 'badge-4', icon_url: 'https://img.icons8.com/emoji/96/crown-emoji.png' },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
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
          <Text style={styles.info}>Kod: {profile.user_code}</Text>
        </>
      )}
      
      {!loading && !error && !profile && (
        <Text style={styles.info}>Profil verisi bulunamadı.</Text>
      )}
      
      <Text style={styles.badgeTitle}>🏆 Rozetler</Text>
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

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>⚙️ Gizlilik & Ayarlar</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>📍 Konum Paylaşımı</Text>
            <Text style={styles.settingDesc}>Diğer kullanıcılar konumumu görebilir</Text>
          </View>
          <Switch
            value={locationSharing}
            onValueChange={(value) => {
              setLocationSharing(value);
              console.log('Konum paylaşımı:', value);
            }}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>👁️ Profil Görünürlüğü</Text>
            <Text style={styles.settingDesc}>Profilim herkese açık</Text>
          </View>
          <Switch
            value={profileVisible}
            onValueChange={(value) => {
              setProfileVisible(value);
              console.log('Profil görünürlüğü:', value);
            }}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>🧭 İç Mekan Navigasyon</Text>
            <Text style={styles.settingDesc}>Bina içi konum takibi</Text>
          </View>
          <Switch
            value={indoorNavEnabled}
            onValueChange={(value) => {
              setIndoorNavEnabled(value);
              console.log('İç mekan navigasyon:', value);
            }}
          />
        </View>
      </View>

      <View style={styles.navigationSection}>
        <Text style={styles.sectionTitle}>🗺️ Navigasyon Özellikleri</Text>
        
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navButtonText}>📍 Harita Görünümü</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navButton} onPress={() => router.push('/IndoorNavScreen' as any)}>
          <Text style={styles.navButtonText}>🏢 İç Mekan Haritası</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navButton} onPress={() => router.push('/IndoorContributeScreen' as any)}>
          <Text style={styles.navButtonText}>➕ İç Mekan Öner</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={() => router.push('/IndoorModerationScreen' as any)}>
          <Text style={styles.navButtonText}>🛠️ İç Mekan Onay (Admin)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navButtonText}>👥 Yakındaki Kullanıcılar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navButtonText}>🎯 Görev Konumları</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold' as const, marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginVertical: 10 },
  name: { fontSize: 20, fontWeight: 'bold' as const, textAlign: 'center', marginVertical: 10 },
  info: { fontSize: 14, color: '#666', textAlign: 'center', marginVertical: 5 },
  badgeTitle: { marginTop: 20, fontSize: 16, fontWeight: 'bold' as const, marginBottom: 10 },
  badge: { width: 50, height: 50, marginRight: 10 },
  emptyText: { fontSize: 14, color: '#999', fontStyle: 'italic' as const },
  errorBox: { backgroundColor: '#fee', padding: 15, borderRadius: 8, marginVertical: 10 },
  errorText: { color: '#c00', fontSize: 14 },
  settingsSection: { marginTop: 30, borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' as const, marginBottom: 15 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 16, fontWeight: '600' as const, marginBottom: 4 },
  settingDesc: { fontSize: 12, color: '#888' },
  navigationSection: { marginTop: 30, marginBottom: 30 },
  navButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, marginVertical: 8 },
  navButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' as const, textAlign: 'center' },
});
