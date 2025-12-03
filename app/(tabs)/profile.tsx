import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity, Switch, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { validateNickname } from '@/lib/nicknameValidation';

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
  nearby_visibility_enabled?: boolean;
  messages_opt_in?: boolean;
  photo_capture_opt_in?: boolean;
  nickname_locked?: boolean;
  can_bypass_photo_limit?: boolean;
  email?: string;
  gender?: string;
  age?: number;
  show_gender?: boolean;
  show_age?: boolean;
  full_name?: string;
  dominant_city?: string;
  dominant_city_hours?: number;
  city_visible?: boolean;
}

interface Badge {
  id: string;
  icon_url: string;
}

const DEFAULT_AVATARS = {
  male: 'https://ui-avatars.com/api/?name=E&background=0D8ABC&color=fff&bold=true',
  female: 'https://ui-avatars.com/api/?name=K&background=E91E63&color=fff&bold=true',
  neutral: 'https://ui-avatars.com/api/?name=%3F&background=6B7280&color=fff&bold=true',
};

const pickFallbackAvatar = (gender?: string) => {
  const normalized = gender?.toLowerCase();
  if (normalized === 'erkek' || normalized === 'male') return DEFAULT_AVATARS.male;
  if (normalized === 'kadın' || normalized === 'kadin' || normalized === 'female') return DEFAULT_AVATARS.female;
  return DEFAULT_AVATARS.neutral;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationSharing, setLocationSharing] = useState(true);
  const [profileVisible, setProfileVisible] = useState(true);
  const [indoorNavEnabled, setIndoorNavEnabled] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [cityVisible, setCityVisible] = useState(true);
  const [dominantCity, setDominantCity] = useState('');
  const [dominantCityHours, setDominantCityHours] = useState(0);
  const [nearbyVisibility, setNearbyVisibility] = useState(true);
  const [messagesOptIn, setMessagesOptIn] = useState(true);
  const [photoCaptureOptIn, setPhotoCaptureOptIn] = useState(true);
  const [nicknameLocked, setNicknameLocked] = useState(false);
  const [photoCountToday, setPhotoCountToday] = useState<number | null>(null);
  const [photoCountLoading, setPhotoCountLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile?.id && photoCaptureOptIn) {
      fetchDailyPhotoCount(profile.id);
    }
  }, [profile?.id, photoCaptureOptIn]);

  const fetchProfile = async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase yapılandırılmadı. EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY değerlerini ekleyin.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Kullanıcı giriş yapmamışsa mock veriyi veya boş ekranı göster
        // loadMockProfile(); // İsterseniz mock'a dönebilirsiniz ama gerçek veri istendiği için boş bırakıyoruz
        setError('Kullanıcı oturumu bulunamadı. Lütfen giriş yapın.');
        setLoading(false);
        return;
      }

      // Profil verisini çek
      let { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profil yoksa oluştur
        console.log('Profil bulunamadı, yeni oluşturuluyor...');
        const newProfile = {
          id: user.id,
          email: user.email,
          nickname: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Yeni Kullanıcı',
          avatar_url: user.user_metadata?.avatar_url || 'https://i.pravatar.cc/150?img=12',
          level: 1,
          xp: 0,
          user_code: 'USER' + Math.floor(Math.random() * 10000),
          location_sharing: true,
          profile_visible: true,
          indoor_nav_enabled: false
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert(newProfile)
          .select()
          .single();
        
        if (createError) {
          console.error('Profil oluşturma hatası:', createError);
          setError('Profil oluşturulamadı.');
        } else {
          data = createdProfile;
        }
      } else if (error) {
        console.error('Profil çekme hatası:', error);
        setError('Profil yüklenirken hata oluştu.');
      }

      if (data) {
        setProfile(data);
        setLocationSharing(data.location_sharing ?? true);
        setProfileVisible(data.profile_visible ?? true);
        setIndoorNavEnabled(data.indoor_nav_enabled ?? false);
        setNicknameInput(data.nickname || '');
        setCodeInput(data.user_code || '');
        setCityVisible(data.city_visible ?? true);
        setDominantCity(data.dominant_city || '');
        setDominantCityHours(Number(data.dominant_city_hours) || 0);
        setNearbyVisibility(data.nearby_visibility_enabled ?? true);
        setMessagesOptIn(data.messages_opt_in ?? true);
        setPhotoCaptureOptIn(data.photo_capture_opt_in ?? true);
        setNicknameLocked(data.nickname_locked ?? false);
        if (data.id) fetchDailyPhotoCount(data.id);
      }

      // Rozetleri çek (Eğer tablosu varsa)
      // const { data: badgesData } = await supabase.from('badges').select('*').eq('user_id', user.id);
      // if (badgesData) setBadges(badgesData);
      loadMockBadges(); // Şimdilik rozetler mock kalsın

    } catch (e: any) {
      console.error('Beklenmeyen hata:', e);
      setError('Bir hata oluştu: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      if (!isSupabaseConfigured) {
        setError('Supabase yapılandırılmadan çıkış yapılamaz.');
        return;
      }
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError('Çıkış yapılamadı: ' + signOutError.message);
        return;
      }
      router.replace('/indoor');
    } catch (err: any) {
      setError('Çıkış hatası: ' + (err?.message || 'Bilinmeyen hata'));
    }
  };

  const normalizeCode = (code: string) => code.trim().replace(/\s+/g, '').toUpperCase();

  const handleSave = async () => {
    if (!profile) return;
    setError('');
    setSuccessMsg('');

    const nickname = nicknameInput.trim();
    const userCode = normalizeCode(codeInput);

    if (!nickname.trim()) {
      setError('Kullanıcı adı boş olamaz.');
      return;
    }
    
    // Nickname lock kontrolü
    if (profile.nickname_locked) {
      setError('Kullanıcı adınız değiştirilemez (admin tarafından kilitlenmiş).');
      return;
    }
    
    // Nickname validation
    const isAdmin = profile.level >= 99; // Admin seviyesi kontrolü
    const nicknameValidation = validateNickname(nickname, isAdmin);
    if (!nicknameValidation.valid) {
      setError(nicknameValidation.error || 'Geçersiz kullanıcı adı');
      return;
    }
    if (!/^[A-Za-z0-9_.-]{3,20}$/.test(userCode)) {
      setError('Kod 3-20 karakter olmalı ve sadece harf, rakam, . _ - içerebilir.');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase yapılandırılmadan profil kaydedilemez.');
      return;
    }

    setSaving(true);
    try {
      const { data: nicknameConflict } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('nickname', nickname)
        .neq('id', profile.id)
        .maybeSingle();
      if (nicknameConflict) {
        setError('Bu kullanıcı adı zaten kullanılıyor.');
        return;
      }

      const { data: codeConflict } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_code', userCode)
        .neq('id', profile.id)
        .maybeSingle();
      if (codeConflict) {
        setError('Bu kullanıcı kodu zaten alınmış.');
        return;
      }

      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          nickname,
          user_code: userCode,
          location_sharing: locationSharing,
          profile_visible: profileVisible,
          indoor_nav_enabled: indoorNavEnabled,
          city_visible: cityVisible,
          nearby_visibility_enabled: nearbyVisibility,
          messages_opt_in: messagesOptIn,
          photo_capture_opt_in: photoCaptureOptIn,
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (updateError) {
        setError('Profil güncellenemedi: ' + updateError.message);
      } else if (data) {
        setProfile(data as Profile);
        setCityVisible(data.city_visible ?? true);
        setDominantCity(data.dominant_city || '');
        setDominantCityHours(Number(data.dominant_city_hours) || 0);
        setNearbyVisibility(data.nearby_visibility_enabled ?? true);
        setMessagesOptIn(data.messages_opt_in ?? true);
        setPhotoCaptureOptIn(data.photo_capture_opt_in ?? true);
        setSuccessMsg('Profil başarıyla güncellendi.');
      }
    } catch (e: any) {
      console.error('Profil güncelleme hatası:', e);
      setError('Profil güncelleme hatası: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const loadMockBadges = () => {
    setBadges([
      { id: 'badge-1', icon_url: 'https://img.icons8.com/emoji/96/trophy-emoji.png' },
      { id: 'badge-2', icon_url: 'https://img.icons8.com/emoji/96/star-emoji.png' },
      { id: 'badge-3', icon_url: 'https://img.icons8.com/emoji/96/fire.png' },
      { id: 'badge-4', icon_url: 'https://img.icons8.com/emoji/96/crown-emoji.png' },
    ]);
  };

  const fetchDailyPhotoCount = async (userId: string) => {
    try {
      if (!isSupabaseConfigured) {
        setPhotoCountToday(null);
        return;
      }
      setPhotoCountLoading(true);
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from('room_photos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', start.toISOString());
      if (error) throw error;
      setPhotoCountToday(count ?? 0);
    } catch (err) {
      console.warn('room photo count lookup failed', err);
      setPhotoCountToday(null);
    } finally {
      setPhotoCountLoading(false);
    }
  };

  const avatarLocked = (profile?.level ?? 0) < 5;
  const avatarUri = avatarLocked
    ? pickFallbackAvatar(profile?.gender)
    : (profile?.avatar_url || pickFallbackAvatar(profile?.gender));

  const cityBadgeUnlocked = dominantCity && dominantCityHours >= 15;
  const dailyLimit = profile?.can_bypass_photo_limit ? Infinity : 5;
  const photoUsageText = photoCountToday == null
    ? 'Kota bilgisi alınamadı'
    : `${photoCountToday} / ${dailyLimit === Infinity ? 'sınırsız' : dailyLimit}`;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>👤 Profil</Text>
      
      {loading && <Text style={styles.info}>Yükleniyor...</Text>}
      
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          {!profile && (
            <TouchableOpacity style={styles.button} onPress={() => router.push('/indoor')}>
              <Text style={styles.buttonText}>Giriş Yap</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {successMsg ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{successMsg}</Text>
        </View>
      ) : null}
      
      {!loading && !error && profile && (
        <>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          {avatarLocked ? (
            <Text style={styles.avatarHint}>Profil fotoğrafı seviyen 5 olduğunda Gmail hesabından otomatik olarak alınacak.</Text>
          ) : (
            <Text style={styles.avatarHint}>Gmail profil fotoğrafın senkron durumda.</Text>
          )}
          <Text style={styles.name}>{profile.nickname || 'İsimsiz Kullanıcı'}</Text>
          <Text style={styles.info}>Email: {profile.email}</Text>
          <Text style={styles.info}>Seviye: {profile.level || 0}</Text>
          <Text style={styles.info}>XP: {profile.xp || 0}</Text>
          <Text style={styles.info}>Kod: {profile.user_code}</Text>

          <View style={styles.googleCard}>
            <Text style={styles.sectionTitle}>🔐 Google Profili</Text>
            <Text style={styles.googleText}>Ad Soyad: {profile.full_name || 'Google hesabı eşleniyor'}</Text>
            <Text style={styles.googleText}>Yaş: {profile.show_age === false ? 'Gizli' : (profile.age ? `${profile.age}` : 'Belirtilmemiş')}</Text>
            <Text style={styles.googleText}>Cinsiyet: {profile.show_gender === false ? 'Gizli' : (profile.gender || 'Belirtilmemiş')}</Text>
          </View>

          <View style={styles.cityCard}>
            <Text style={styles.sectionTitle}>🌆 En Aktif Şehir</Text>
            {cityBadgeUnlocked ? (
              <>
                <Text style={styles.cityHighlight}>{dominantCity}</Text>
                <Text style={styles.cityInfo}>Toplam {dominantCityHours.toFixed(1)} saat iç mekân açtın. Bu veri kilitlendi ve değiştirilemez.</Text>
              </>
            ) : (
              <Text style={styles.cityInfo}>Herhangi bir şehirde en az 15 saat iç mekân açarak ev şehir rozetini kazan.</Text>
            )}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Arkadaşlar şehir etiketimi görebilsin</Text>
                <Text style={styles.settingDesc}>Profilime giren arkadaşlarım bu alanı görüntüleyebilir.</Text>
              </View>
              <Switch value={cityVisible} onValueChange={setCityVisible} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>📝 Profil Bilgileri</Text>
          <Text style={styles.label}>Görünen İsim</Text>
          <TextInput
            style={styles.input}
            value={nicknameInput}
            onChangeText={setNicknameInput}
            placeholder="Kullanıcı adı"
            editable={!nicknameLocked}
            selectTextOnFocus={!nicknameLocked}
          />
          {nicknameLocked && (
            <Text style={styles.helperText}>Bu kullanıcı adı moderasyon tarafından kilitlendi.</Text>
          )}
          <Text style={styles.label}>Kullanıcı Kodu</Text>
          <TextInput
            style={styles.input}
            value={codeInput}
            onChangeText={setCodeInput}
            placeholder="Örn: EJDER112"
            autoCapitalize="characters"
          />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>📍 Konum Paylaşımı</Text>
              <Text style={styles.settingDesc}>Diğer kullanıcılar konumumu görebilir</Text>
            </View>
            <Switch value={locationSharing} onValueChange={setLocationSharing} />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>🛰️ Yakındaki Kullanıcılar</Text>
              <Text style={styles.settingDesc}>500 m içindeki kişiler beni görebilsin</Text>
            </View>
            <Switch
              value={nearbyVisibility}
              onValueChange={setNearbyVisibility}
              disabled={!locationSharing}
            />
          </View>
          {!locationSharing && (
            <Text style={styles.helperText}>Konum paylaşımını açmadan bu ayar kullanılamaz.</Text>
          )}

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>💬 Mesaj İstekleri</Text>
              <Text style={styles.settingDesc}>Yakındaki kişiler sohbet isteği gönderebilsin</Text>
            </View>
            <Switch value={messagesOptIn} onValueChange={setMessagesOptIn} />
          </View>

          <View style={styles.photoCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>📷 İç Mekan Fotoğrafları</Text>
                <Text style={styles.settingDesc}>Sadece JPG yükleyebilir, günde 5 foto atarsın</Text>
              </View>
              <Switch value={photoCaptureOptIn} onValueChange={setPhotoCaptureOptIn} />
            </View>
            {photoCaptureOptIn ? (
              <Text style={styles.helperText}>
                Bugünkü kullanım: {photoCountLoading ? 'yükleniyor...' : photoUsageText}
              </Text>
            ) : (
              <Text style={styles.helperText}>Fotoğraf yüklemeyi devre dışı bıraktın.</Text>
            )}
            {profile?.can_bypass_photo_limit && (
              <Text style={styles.helperText}>Admin yetkisi sayesinde limit uygulanmaz.</Text>
            )}
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>👁️ Profil Görünürlüğü</Text>
              <Text style={styles.settingDesc}>Arkadaş aramalarında profilimi göster</Text>
            </View>
            <Switch value={profileVisible} onValueChange={setProfileVisible} />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>🧭 İç Mekan Navigasyon</Text>
              <Text style={styles.settingDesc}>Bina içi konum takibi</Text>
            </View>
            <Switch value={indoorNavEnabled} onValueChange={setIndoorNavEnabled} />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
            <Text style={styles.buttonText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, { backgroundColor: '#dc3545', marginTop: 20 }]} onPress={handleSignOut}>
            <Text style={styles.buttonText}>Çıkış Yap</Text>
          </TouchableOpacity>
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

        <TouchableOpacity style={styles.navButton} onPress={() => router.push('/AddFriendScreen' as any)}>
          <Text style={styles.navButtonText}>🔎 Arkadaş Bul</Text>
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
  avatarHint: { fontSize: 12, color: '#777', textAlign: 'center', marginBottom: 6 },
  info: { fontSize: 14, color: '#666', textAlign: 'center', marginVertical: 5 },
  badgeTitle: { marginTop: 20, fontSize: 16, fontWeight: 'bold' as const, marginBottom: 10 },
  badge: { width: 50, height: 50, marginRight: 10 },
  emptyText: { fontSize: 14, color: '#999', fontStyle: 'italic' as const },
  errorBox: { backgroundColor: '#fee', padding: 15, borderRadius: 8, marginVertical: 10 },
  errorText: { color: '#c00', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' as const, marginBottom: 15, marginTop: 20 },
  label: { fontSize: 14, fontWeight: '600' as const, marginBottom: 4 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 16, fontWeight: '600' as const, marginBottom: 4 },
  settingDesc: { fontSize: 12, color: '#888' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12 },
  successBox: { backgroundColor: '#e9f9ee', padding: 12, borderRadius: 8, marginBottom: 12 },
  successText: { color: '#0a7a2e', textAlign: 'center' },
  googleCard: { padding: 16, borderWidth: 1, borderColor: '#eee', borderRadius: 12, marginTop: 10 },
  googleText: { fontSize: 14, marginBottom: 6, color: '#333' },
  cityCard: { padding: 16, borderWidth: 1, borderColor: '#eee', borderRadius: 12, marginTop: 18 },
  cityHighlight: { fontSize: 20, fontWeight: '700' as const, textAlign: 'center', marginBottom: 6 },
  cityInfo: { fontSize: 13, color: '#555', textAlign: 'center', marginBottom: 10 },
  navigationSection: { marginTop: 30, marginBottom: 30 },
  navButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, marginVertical: 8 },
  navButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' as const, textAlign: 'center' },
  helperText: { fontSize: 12, color: '#777', marginBottom: 8, marginTop: -4 },
  photoCard: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, paddingHorizontal: 12, marginTop: 12, backgroundColor: '#fafafa' },
});
