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
  about_me?: string;
  is_online?: boolean;
  birth_date?: string;
  hide_email?: boolean;
  admin_username?: string;
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

const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// DD.MM.YYYY formatını YYYY-MM-DD'ye çevir
const convertToISODate = (ddmmyyyy: string): string => {
  if (!ddmmyyyy || ddmmyyyy.length !== 10) return '';
  const parts = ddmmyyyy.split('.');
  if (parts.length !== 3) return '';
  const [day, month, year] = parts;
  return `${year}-${month}-${day}`;
};

// YYYY-MM-DD formatını DD.MM.YYYY'ye çevir
const convertToDisplayDate = (isoDate: string): string => {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts;
  return `${day}.${month}.${year}`;
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
  const [aboutMe, setAboutMe] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [birthDate, setBirthDate] = useState('');
  const [genderInput, setGenderInput] = useState<'erkek' | 'kadın' | 'belirtmek istemiyorum' | ''>('');
  const [nicknameError, setNicknameError] = useState('');
  const [birthDateError, setBirthDateError] = useState('');
  const [aboutMeError, setAboutMeError] = useState('');
  const [hideEmail, setHideEmail] = useState(false);
  const [availableFields, setAvailableFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile && photoCaptureOptIn) {
      if (profile.id) fetchDailyPhotoCount(profile.id);
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

      // Profil verisini çek (id, yoksa user_id ile dene)
      let profileData: any = null;
      const tryFetch = async (column: 'id' | 'user_id') => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq(column, user.id)
          .maybeSingle();
        if (error) return { data: null, error };
        return { data: data ?? null, error: null };
      };

      let first = await tryFetch('id');
      if (first.data) profileData = first.data;
      else {
        let second = await tryFetch('user_id');
        if (second.data) profileData = second.data;
        else if (first.error && first.error.code !== 'PGRST116') {
          console.error('Profil çekme hatası:', first.error);
          setError('Profil yüklenirken hata oluştu.');
        }
      }

      if (!profileData) {
        console.log('Profil bulunamadı, yeni oluşturuluyor...');
        const baseProfile = {
          id: user.id,
          email: user.email,
          nickname: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Yeni Kullanıcı',
          avatar_url: user.user_metadata?.avatar_url || 'https://i.pravatar.cc/150?img=12',
          level: 1,
          xp: 0,
        } as any;

        // Önce user_id ile dene, şema desteklemiyorsa bir kez daha dene
        let created: any = null;
        let createErr: any = null;
        const payloadWithUserId = { ...baseProfile, user_id: user.id };
        const { data: createdWithUid, error: createError1 } = await supabase
          .from('user_profiles')
          .insert(payloadWithUserId)
          .select()
          .maybeSingle();
        if (!createError1 && createdWithUid) {
          created = createdWithUid;
        } else {
          createErr = createError1;
          const { data: createdNoUid, error: createError2 } = await supabase
            .from('user_profiles')
            .insert(baseProfile)
            .select()
            .maybeSingle();
          if (!createError2 && createdNoUid) {
            created = createdNoUid;
            createErr = null;
          } else if (createError2) {
            createErr = createError2;
          }
        }

        if (!created && createErr?.code === '23505') {
          const retry = await tryFetch('id');
          if (retry.data) {
            profileData = retry.data;
            createErr = null;
          }
        }

        if (created) {
          profileData = created;
        } else {
          console.error('Profil oluşturma hatası:', createErr);
          setError('Profil oluşturulamadı.');
        }
      }

      if (profileData) {
        const meta = user.user_metadata || {};
        const metaName = (meta.full_name || meta.name || [meta.given_name, meta.family_name].filter(Boolean).join(' ')).trim();
        const metaAvatar = meta.picture || meta.avatar_url;
        const metaGender = meta.gender || meta.sex;
        if (!profileData.full_name && metaName) profileData.full_name = metaName;
        if (!profileData.nickname && metaName) profileData.nickname = metaName;
        if (!profileData.email && user.email) profileData.email = user.email;
        if (!profileData.avatar_url && metaAvatar) profileData.avatar_url = metaAvatar;
        if (!profileData.gender && metaGender) profileData.gender = metaGender;

        const presence = {
          location_sharing: Object.prototype.hasOwnProperty.call(profileData, 'location_sharing'),
          profile_visible: Object.prototype.hasOwnProperty.call(profileData, 'profile_visible'),
          indoor_nav_enabled: Object.prototype.hasOwnProperty.call(profileData, 'indoor_nav_enabled'),
          nearby_visibility_enabled: Object.prototype.hasOwnProperty.call(profileData, 'nearby_visibility_enabled'),
          messages_opt_in: Object.prototype.hasOwnProperty.call(profileData, 'messages_opt_in'),
          photo_capture_opt_in: Object.prototype.hasOwnProperty.call(profileData, 'photo_capture_opt_in'),
          nickname_locked: Object.prototype.hasOwnProperty.call(profileData, 'nickname_locked'),
          can_bypass_photo_limit: Object.prototype.hasOwnProperty.call(profileData, 'can_bypass_photo_limit'),
          city_visible: Object.prototype.hasOwnProperty.call(profileData, 'city_visible'),
          dominant_city: Object.prototype.hasOwnProperty.call(profileData, 'dominant_city'),
          dominant_city_hours: Object.prototype.hasOwnProperty.call(profileData, 'dominant_city_hours'),
          about_me: Object.prototype.hasOwnProperty.call(profileData, 'about_me'),
          is_online: Object.prototype.hasOwnProperty.call(profileData, 'is_online'),
          birth_date: Object.prototype.hasOwnProperty.call(profileData, 'birth_date'),
          gender: Object.prototype.hasOwnProperty.call(profileData, 'gender'),
          age: Object.prototype.hasOwnProperty.call(profileData, 'age'),
          hide_email: Object.prototype.hasOwnProperty.call(profileData, 'hide_email'),
          admin_username: Object.prototype.hasOwnProperty.call(profileData, 'admin_username'),
        } as Record<string, boolean>;
        setAvailableFields(presence);

        setProfile(profileData);
        if (presence.location_sharing) setLocationSharing(profileData.location_sharing ?? true);
        if (presence.profile_visible) setProfileVisible(profileData.profile_visible ?? true);
        if (presence.indoor_nav_enabled) setIndoorNavEnabled(profileData.indoor_nav_enabled ?? false);
        setNicknameInput(profileData.nickname || '');
        setCodeInput(profileData.user_code || '');
        if (presence.city_visible) setCityVisible(profileData.city_visible ?? true);
        if (presence.dominant_city) setDominantCity(profileData.dominant_city || '');
        if (presence.dominant_city_hours) setDominantCityHours(Number(profileData.dominant_city_hours) || 0);
        if (presence.nearby_visibility_enabled) setNearbyVisibility(profileData.nearby_visibility_enabled ?? true);
        if (presence.messages_opt_in) setMessagesOptIn(profileData.messages_opt_in ?? true);
        if (presence.photo_capture_opt_in) setPhotoCaptureOptIn(profileData.photo_capture_opt_in ?? true);
        if (presence.nickname_locked) setNicknameLocked(profileData.nickname_locked ?? false);
        if (presence.about_me) setAboutMe(profileData.about_me || '');
        if (presence.is_online) setIsOnline(profileData.location_sharing ?? true);
        if (presence.birth_date) setBirthDate(profileData.birth_date ? convertToDisplayDate(profileData.birth_date) : '');
        if (presence.gender) setGenderInput((profileData.gender as any) || '');
        if (presence.hide_email) setHideEmail(profileData.hide_email ?? false);
        const targetUserId = (profileData as any).user_id || profileData.id;
        if (targetUserId) fetchDailyPhotoCount(targetUserId);
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

  const handleBirthDateChange = (text: string) => {
    // Sadece rakam ve nokta kabul et
    let cleaned = text.replace(/[^\d.]/g, '');
    
    // Otomatik nokta ekleme: 08.09.1999 formatı için
    if (cleaned.length === 2 && !cleaned.includes('.')) {
      cleaned = cleaned + '.';
    } else if (cleaned.length === 5 && cleaned.split('.').length === 2) {
      cleaned = cleaned + '.';
    }
    
    // Maksimum 10 karakter (DD.MM.YYYY)
    if (cleaned.length > 10) {
      cleaned = cleaned.substring(0, 10);
    }
    
    setBirthDate(cleaned);
  };

  const handleSave = async () => {
    if (!profile) return;
    setError('');
    setSuccessMsg('');
    setNicknameError('');
    setBirthDateError('');
    setAboutMeError('');

    const nickname = nicknameInput.trim();
    const userCode = normalizeCode(codeInput);

    // Nickname kontrolü
    if (!nickname.trim()) {
      setNicknameError('Kullanıcı adı boş olamaz.');
      setSaving(false);
      return;
    }
    
    // Hakkımda alanı kontrolü
    if (aboutMe.length > 200) {
      setAboutMeError('En fazla 200 karakter olabilir.');
      setSaving(false);
      return;
    }
    
    // Kod ve numara yasağı kontrolü
    const codePattern = /\b[A-Z]{2,}\d{2,}|\d{3,}/i;
    if (codePattern.test(aboutMe)) {
      setAboutMeError('Kod veya numara yazamazsınız.');
      setSaving(false);
      return;
    }
    
    // Nickname lock kontrolü
    if (profile.nickname_locked) {
      setNicknameError('Kullanıcı adınız admin tarafından kilitlenmiş, değiştirilemez.');
      return;
    }
    
    // Nickname validation
    const isAdmin = profile.level >= 99; // Admin seviyesi kontrolü
    const nicknameValidation = validateNickname(nickname, isAdmin);
    if (!nicknameValidation.valid) {
      setNicknameError(nicknameValidation.error || 'Geçersiz kullanıcı adı');
      return;
    }
    
    // Doğum tarihi format kontrolü
    if (birthDate && birthDate.length === 10) {
      const parts = birthDate.split('.');
      if (parts.length !== 3) {
        setBirthDateError('Geçersiz format. Örnek: 08.09.1999');
        return;
      }
      const [day, month, year] = parts.map(p => parseInt(p, 10));
      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
        setBirthDateError('Geçersiz tarih. Kontrol edin.');
        return;
      }
    } else if (birthDate && birthDate.length > 0 && birthDate.length !== 10) {
      setBirthDateError('10 karakter olmalı. Örnek: 08.09.1999');
      return;
    }
    // Kullanıcı kodu sistem tarafından otomatik atanır, validasyon yok

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
        setNicknameError('Bu kullanıcı adı zaten kullanılıyor.');
        setSaving(false);
        return;
      }
      
      // Kullanıcı kodu otomatik atanır, conflict kontrolü yok

      const updatePayload: Record<string, any> = {
        nickname,
      };
      // `user_code` kolonu veritabanında yoksa gönderme (schema mismatch nedeniyle 400/406 hatası)
      if (availableFields.user_code || Object.prototype.hasOwnProperty.call(profile, 'user_code')) {
        updatePayload.user_code = userCode;
      }
      if ('location_sharing' in profile) updatePayload.location_sharing = locationSharing;
      if ('profile_visible' in profile) updatePayload.profile_visible = profileVisible;
      if ('indoor_nav_enabled' in profile) updatePayload.indoor_nav_enabled = indoorNavEnabled;
      if ('city_visible' in profile) updatePayload.city_visible = cityVisible;
      if ('nearby_visibility_enabled' in profile) updatePayload.nearby_visibility_enabled = nearbyVisibility;
      if ('messages_opt_in' in profile) updatePayload.messages_opt_in = messagesOptIn;
      if ('photo_capture_opt_in' in profile) updatePayload.photo_capture_opt_in = photoCaptureOptIn;
      if ('about_me' in profile) updatePayload.about_me = aboutMe;
      if ('is_online' in profile) updatePayload.is_online = isOnline;
      if ('birth_date' in profile) updatePayload.birth_date = birthDate ? convertToISODate(birthDate) : null;
      if ('gender' in profile) updatePayload.gender = genderInput || null;
      if ('age' in profile) updatePayload.age = birthDate ? calculateAge(convertToISODate(birthDate)) : null;
      if ('hide_email' in profile) updatePayload.hide_email = hideEmail;

      const primaryFilter = profile.id;
      const secondaryFilter = (profile as any).user_id;

      let updateRes = await supabase
        .from('user_profiles')
        .update(updatePayload)
        .eq('id', primaryFilter)
        .select()
        .maybeSingle();

      if ((updateRes.error || !updateRes.data) && secondaryFilter) {
        updateRes = await supabase
          .from('user_profiles')
          .update(updatePayload)
          .eq('user_id', secondaryFilter)
          .select()
          .maybeSingle();
      }

      // Eğer güncelleme hata verip hatada eksik kolon (ör. user_code) adı geçiyorsa,
      // user_code'u payload'dan çıkarıp tekrar dene.
      let { data, error: updateError } = updateRes;
      if (updateError && /user_code/i.test(updateError.message)) {
        // user_code kolonunu kaldır ve yeniden dene
        if (updatePayload.user_code !== undefined) delete updatePayload.user_code;

        let retryRes = await supabase
          .from('user_profiles')
          .update(updatePayload)
          .eq('id', primaryFilter)
          .select()
          .maybeSingle();

        if ((retryRes.error || !retryRes.data) && secondaryFilter) {
          retryRes = await supabase
            .from('user_profiles')
            .update(updatePayload)
            .eq('user_id', secondaryFilter)
            .select()
            .maybeSingle();
        }

        data = retryRes.data;
        updateError = retryRes.error;
      }

      if (updateError) {
        setError('Profil güncellenemedi: ' + updateError.message);
      } else if (data) {
        const presence = {
          location_sharing: Object.prototype.hasOwnProperty.call(data, 'location_sharing'),
          profile_visible: Object.prototype.hasOwnProperty.call(data, 'profile_visible'),
          indoor_nav_enabled: Object.prototype.hasOwnProperty.call(data, 'indoor_nav_enabled'),
          nearby_visibility_enabled: Object.prototype.hasOwnProperty.call(data, 'nearby_visibility_enabled'),
          messages_opt_in: Object.prototype.hasOwnProperty.call(data, 'messages_opt_in'),
          photo_capture_opt_in: Object.prototype.hasOwnProperty.call(data, 'photo_capture_opt_in'),
          nickname_locked: Object.prototype.hasOwnProperty.call(data, 'nickname_locked'),
          can_bypass_photo_limit: Object.prototype.hasOwnProperty.call(data, 'can_bypass_photo_limit'),
          city_visible: Object.prototype.hasOwnProperty.call(data, 'city_visible'),
          dominant_city: Object.prototype.hasOwnProperty.call(data, 'dominant_city'),
          dominant_city_hours: Object.prototype.hasOwnProperty.call(data, 'dominant_city_hours'),
          about_me: Object.prototype.hasOwnProperty.call(data, 'about_me'),
          is_online: Object.prototype.hasOwnProperty.call(data, 'is_online'),
          birth_date: Object.prototype.hasOwnProperty.call(data, 'birth_date'),
          gender: Object.prototype.hasOwnProperty.call(data, 'gender'),
          age: Object.prototype.hasOwnProperty.call(data, 'age'),
          hide_email: Object.prototype.hasOwnProperty.call(data, 'hide_email'),
          admin_username: Object.prototype.hasOwnProperty.call(data, 'admin_username'),
        } as Record<string, boolean>;
        setAvailableFields(presence);
        setProfile(data as Profile);
        if (presence.city_visible) setCityVisible(data.city_visible ?? true);
        if (presence.dominant_city) setDominantCity(data.dominant_city || '');
        if (presence.dominant_city_hours) setDominantCityHours(Number(data.dominant_city_hours) || 0);
        if (presence.nearby_visibility_enabled) setNearbyVisibility(data.nearby_visibility_enabled ?? true);
        if (presence.messages_opt_in) setMessagesOptIn(data.messages_opt_in ?? true);
        if (presence.photo_capture_opt_in) setPhotoCaptureOptIn(data.photo_capture_opt_in ?? true);
        if (presence.hide_email) setHideEmail(data.hide_email ?? false);
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

  // Yaş gösteriminde DB'den gelen değer yoksa, formdaki doğum tarihinden hesapla
  const displayedAge = profile?.age ?? (birthDate ? calculateAge(convertToISODate(birthDate)) : null);

  const cityBadgeUnlocked = dominantCity && dominantCityHours >= 15;
  const dailyLimit = profile?.can_bypass_photo_limit ? Infinity : 5;
  const photoUsageText = photoCountToday == null
    ? 'Kota bilgisi alınamadı'
    : `${photoCountToday} / ${dailyLimit === Infinity ? 'sınırsız' : dailyLimit}`;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>👤 Profil</Text>
      
      {/* Admin Panel Button */}
      {!loading && !error && profile?.email === 'ejderha112@gmail.com' && (
        <TouchableOpacity
          style={styles.adminPanelButton}
          onPress={() => router.push('/AdminCentralPanel' as any)}
        >
          <Text style={styles.adminPanelText}>👑 Admin Kontrol Paneli</Text>
        </TouchableOpacity>
      )}
      
      {loading && <Text style={styles.info}>Yükleniyor...</Text>}
      
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          {!profile && (
            <TouchableOpacity style={styles.button} onPress={fetchProfile}>
              <Text style={styles.buttonText}>Tekrar Dene</Text>
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
          <View style={styles.avatarContainer}>
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
            <View style={[styles.onlineIndicator, { backgroundColor: isOnline ? '#28a745' : '#6c757d' }]} />
          </View>
          {avatarLocked ? (
            <Text style={styles.avatarHint}>Profil fotoğrafı seviyen 5 olduğunda Gmail hesabından otomatik olarak alınacak.</Text>
          ) : (
            <Text style={styles.avatarHint}>Gmail profil fotoğrafın senkron durumda.</Text>
          )}
          <Text style={styles.name}>{profile.nickname || 'İsimsiz Kullanıcı'}</Text>
          <Text style={styles.onlineStatus}>{isOnline ? '🟢 Online' : '⚫ Offline'}</Text>
          <Text style={styles.info}>Email: {profile.email}</Text>
          <Text style={styles.info}>Seviye: {profile.level || 0}</Text>
          <Text style={styles.info}>XP: {profile.xp || 0}</Text>
          <Text style={styles.info}>Kod: {profile.user_code}</Text>

          <View style={styles.googleCard}>
            <Text style={styles.sectionTitle}>🔐 Google Profili</Text>
            <Text style={styles.googleText}>Ad Soyad: {profile.full_name || 'Google hesabı eşleniyor'}</Text>
            <Text style={styles.googleText}>Yaş: {profile.show_age === false ? 'Gizli' : (displayedAge != null ? `${displayedAge}` : 'Belirtilmemiş')}</Text>
            <Text style={styles.googleText}>Cinsiyet: {profile.show_gender === false ? 'Gizli' : (profile.gender || 'Belirtilmemiş')}</Text>
          </View>

          {availableFields.city_visible && (
            <View style={styles.cityCard}>
              <Text style={styles.sectionTitle}>🌆 En Aktif Şehir</Text>
              {cityBadgeUnlocked ? (
                <>
                  {cityVisible ? (
                    <>
                      <Text style={styles.cityHighlight}>{dominantCity}</Text>
                      <Text style={styles.cityInfo}>Toplam {dominantCityHours.toFixed(1)} saat iç mekân açtın. Bu veri kilitlendi ve değiştirilemez.</Text>
                    </>
                  ) : (
                    <Text style={styles.cityInfo}>Şehir etiketi gizli (sadece sen görebilirsin: {dominantCity})</Text>
                  )}
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
          )}

          <Text style={styles.sectionTitle}>📝 Profil Bilgileri</Text>
          <Text style={styles.label}>Görünen İsim</Text>
          <TextInput
            style={[styles.input, nicknameError ? styles.inputError : null]}
            value={nicknameInput}
            onChangeText={(text) => { setNicknameInput(text); setNicknameError(''); }}
            placeholder="Kullanıcı adı"
            editable={!nicknameLocked}
            selectTextOnFocus={!nicknameLocked}
          />
          {nicknameError ? (
            <Text style={styles.errorText}>⚠️ {nicknameError}</Text>
          ) : nicknameLocked ? (
            <Text style={styles.helperText}>Bu kullanıcı adı moderasyon tarafından kilitlendi.</Text>
          ) : null}

          <Text style={styles.label}>Doğum Tarihi (Yaş otomatik hesaplanır)</Text>
          <TextInput
            style={[styles.input, birthDateError ? styles.inputError : null]}
            value={birthDate}
            onChangeText={(text) => { handleBirthDateChange(text); setBirthDateError(''); }}
            placeholder="DD.MM.YYYY (örn: 08.09.1999)"
            maxLength={10}
          />
          {birthDateError ? (
            <Text style={styles.errorText}>⚠️ {birthDateError}</Text>
          ) : (
            <Text style={styles.helperText}>Yaş: {birthDate ? calculateAge(convertToISODate(birthDate)) : 'Belirtilmemiş'}</Text>
          )}

          <Text style={styles.label}>Cinsiyet</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[styles.genderButton, genderInput === 'erkek' && styles.genderButtonActive]}
              onPress={() => setGenderInput('erkek')}
            >
              <Text style={[styles.genderButtonText, genderInput === 'erkek' && styles.genderButtonTextActive]}>Erkek</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderButton, genderInput === 'kadın' && styles.genderButtonActive]}
              onPress={() => setGenderInput('kadın')}
            >
              <Text style={[styles.genderButtonText, genderInput === 'kadın' && styles.genderButtonTextActive]}>Kadın</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderButton, genderInput === 'belirtmek istemiyorum' && styles.genderButtonActive]}
              onPress={() => setGenderInput('belirtmek istemiyorum')}
            >
              <Text style={[styles.genderButtonText, genderInput === 'belirtmek istemiyorum' && styles.genderButtonTextActive]}>Belirtmek İstemiyorum</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Hakkımda (200 karakter)</Text>
          <TextInput
            style={[styles.input, styles.multiline, aboutMeError ? styles.inputError : null]}
            value={aboutMe}
            onChangeText={(text) => { setAboutMe(text); setAboutMeError(''); }}
            placeholder="Kendini tanıt... (Kod/numara yasak)"
            multiline
            maxLength={200}
            numberOfLines={4}
          />
          {aboutMeError ? (
            <Text style={styles.errorText}>⚠️ {aboutMeError}</Text>
          ) : (
            <Text style={styles.helperText}>{aboutMe.length}/200 karakter</Text>
          )}

          {availableFields.location_sharing && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>📍 Konum Paylaşımı (Online/Offline)</Text>
                <Text style={styles.settingDesc}>Açık: Online görünürsün. Kapalı: Offline görünürsün.</Text>
              </View>
              <Switch value={locationSharing} onValueChange={(val) => { setLocationSharing(val); setIsOnline(val); }} />
            </View>
          )}

          {availableFields.nearby_visibility_enabled && (
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
          )}
          {availableFields.nearby_visibility_enabled && !locationSharing && (
            <Text style={styles.helperText}>Konum paylaşımını açmadan bu ayar kullanılamaz.</Text>
          )}

          {availableFields.messages_opt_in && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>💬 Mesaj İstekleri</Text>
                <Text style={styles.settingDesc}>Yakındaki kişiler sohbet isteği gönderebilsin</Text>
              </View>
              <Switch value={messagesOptIn} onValueChange={setMessagesOptIn} />
            </View>
          )}

          {availableFields.photo_capture_opt_in && (
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
          )}

          {availableFields.profile_visible && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>👁️ Profil Görünürlüğü</Text>
                <Text style={styles.settingDesc}>Arkadaş aramalarında profilimi göster</Text>
              </View>
              <Switch value={profileVisible} onValueChange={setProfileVisible} />
            </View>
          )}

          {availableFields.hide_email && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>📧 Mail Adresi Gizleme</Text>
                <Text style={styles.settingDesc}>E-posta adresimi diğer kullanıcılardan gizle</Text>
              </View>
              <Switch value={hideEmail} onValueChange={setHideEmail} />
            </View>
          )}
          {availableFields.hide_email && hideEmail && (
            <Text style={styles.helperText}>Mail adresin gizli. Kullanıcılar sadece nickname ve user_code ile bulabilir.</Text>
          )}

          {availableFields.admin_username && profile?.admin_username && (
            <View style={styles.adminCard}>
              <Text style={styles.sectionTitle}>👑 Admin Bilgileri</Text>
              <Text style={styles.adminText}>Kullanıcı Adı: {profile.admin_username}</Text>
              <Text style={styles.helperText}>Kullanıcılar seni "{profile.admin_username}" ile arayabilir. Mail adresin kimseye görünmez.</Text>
            </View>
          )}

          {availableFields.indoor_nav_enabled && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>🧭 İç Mekan Navigasyon</Text>
                <Text style={styles.settingDesc}>Bina içi konum takibi</Text>
              </View>
              <Switch value={indoorNavEnabled} onValueChange={setIndoorNavEnabled} />
            </View>
          )}

          {badges.length > 0 && (
            <>
              <Text style={styles.badgeTitle}>🏆 Rozetler</Text>
              <FlatList
                data={badges}
                keyExtractor={item => item.id}
                horizontal
                renderItem={({ item }) => (
                  <Image source={{ uri: item.icon_url }} style={styles.badge} />
                )}
              />
            </>
          )}

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
            <Text style={styles.buttonText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </TouchableOpacity>
        </>
      )}
      
      {!loading && !error && !profile && (
        <Text style={styles.info}>Profil verisi bulunamadı.</Text>
      )}

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

        <TouchableOpacity style={styles.navButton} onPress={() => router.push('/NotificationsScreen' as any)}>
          <Text style={styles.navButtonText}>🔔 Bildirimler</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={() => router.push('/NotificationSettingsScreen' as any)}>
          <Text style={styles.navButtonText}>⚙️ Bildirim Ayarları</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={() => router.push('/SuggestVenueScreen' as any)}>
          <Text style={styles.navButtonText}>🏥 Mekan Öner (Hastane/AVM)</Text>
        </TouchableOpacity>

        {/* Admin Panel - Sadece ejderha112@gmail.com için */}
        {profile?.email === 'ejderha112@gmail.com' && (
          <>
            <TouchableOpacity 
              style={[styles.navButton, { backgroundColor: '#28a745', borderColor: '#28a745' }]}
              onPress={() => router.push('/AdminVenueModerationScreen' as any)}
            >
              <Text style={styles.navButtonText}>🗺️ Mekan Önerileri Moderasyonu</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navButton, { backgroundColor: '#dc3545', borderColor: '#dc3545' }]} 
              onPress={() => router.push('/AdminIndoorMapEditorScreen' as any)}
            >
              <Text style={[styles.navButtonText, { color: '#fff' }]}>🗺️ Admin: Harita Editörü</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navButton, { backgroundColor: '#dc3545', borderColor: '#dc3545' }]} 
              onPress={() => router.push('/AdminReportModerationScreen' as any)}
            >
              <Text style={[styles.navButtonText, { color: '#fff' }]}>🚨 Kullanıcı Şikayetleri</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navButton, { backgroundColor: '#007AFF', borderColor: '#007AFF' }]} 
              onPress={() => router.push('/AdminNotificationPanel' as any)}
            >
              <Text style={[styles.navButtonText, { color: '#fff' }]}>🔔 Bildirim Paneli</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navButton, { backgroundColor: '#28a745', borderColor: '#28a745' }]} 
              onPress={() => router.push('/AdminMapEditorScreen' as any)}
            >
              <Text style={[styles.navButtonText, { color: '#fff' }]}>🗺️ Kroki & Adres Editör</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navButton, { backgroundColor: '#6f42c1', borderColor: '#6f42c1' }]} 
              onPress={() => router.push('/AdminDataManagementPanel' as any)}
            >
              <Text style={[styles.navButtonText, { color: '#fff' }]}>📊 Data Yönetim Paneli</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Çıkış Yap butonu en altta */}
      {!loading && !error && profile && (
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#dc3545', marginTop: 20, marginBottom: 30 }]} 
          onPress={handleSignOut}
        >
          <Text style={styles.buttonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold' as const, marginBottom: 15 },
  adminPanelButton: {
    backgroundColor: '#2c3e50',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  adminPanelText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  avatarContainer: { alignSelf: 'center', position: 'relative', marginVertical: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  onlineIndicator: { position: 'absolute', bottom: 5, right: 5, width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: '#fff' },
  name: { fontSize: 20, fontWeight: 'bold' as const, textAlign: 'center', marginTop: 10 },
  onlineStatus: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 10 },
  avatarHint: { fontSize: 12, color: '#777', textAlign: 'center', marginBottom: 6 },
  info: { fontSize: 14, color: '#666', textAlign: 'center', marginVertical: 5 },
  badgeTitle: { marginTop: 20, fontSize: 16, fontWeight: 'bold' as const, marginBottom: 10 },
  badge: { width: 50, height: 50, marginRight: 10 },
  emptyText: { fontSize: 14, color: '#999', fontStyle: 'italic' as const },
  errorBox: { backgroundColor: '#fee', padding: 15, borderRadius: 8, marginVertical: 10 },
  errorText: { color: '#dc3545', fontSize: 13, fontWeight: '600' as const, marginTop: -8, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' as const, marginBottom: 15, marginTop: 20 },
  label: { fontSize: 14, fontWeight: '600' as const, marginBottom: 4 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 16, fontWeight: '600' as const, marginBottom: 4 },
  settingDesc: { fontSize: 12, color: '#888' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12 },
  inputError: { borderColor: '#dc3545', borderWidth: 2, backgroundColor: '#fff5f5' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  successBox: { backgroundColor: '#e9f9ee', padding: 12, borderRadius: 8, marginBottom: 12 },
  successText: { color: '#0a7a2e', textAlign: 'center' },
  googleCard: { padding: 16, borderWidth: 1, borderColor: '#eee', borderRadius: 12, marginTop: 10 },
  googleText: { fontSize: 14, marginBottom: 6, color: '#333' },
  adminCard: { padding: 16, borderWidth: 2, borderColor: '#007AFF', borderRadius: 12, marginTop: 18, backgroundColor: '#e9f5ff' },
  adminText: { fontSize: 15, marginBottom: 6, color: '#333', fontWeight: '600' as const },
  cityCard: { padding: 16, borderWidth: 1, borderColor: '#eee', borderRadius: 12, marginTop: 18 },
  cityHighlight: { fontSize: 20, fontWeight: '700' as const, textAlign: 'center', marginBottom: 6 },
  cityInfo: { fontSize: 13, color: '#555', textAlign: 'center', marginBottom: 10 },
  navigationSection: { marginTop: 30, marginBottom: 30 },
  navButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, marginVertical: 8 },
  navButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' as const, textAlign: 'center' },
  helperText: { fontSize: 12, color: '#777', marginBottom: 8, marginTop: -4 },
  photoCard: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, paddingHorizontal: 12, marginTop: 12, backgroundColor: '#fafafa' },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' as const, textAlign: 'center' },
  genderContainer: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  genderButton: { flex: 1, minWidth: 100, padding: 12, borderRadius: 8, borderWidth: 2, borderColor: '#ccc', backgroundColor: '#fff' },
  genderButtonActive: { borderColor: '#007AFF', backgroundColor: '#e9f5ff' },
  genderButtonText: { fontSize: 14, fontWeight: '600' as const, textAlign: 'center', color: '#666' },
  genderButtonTextActive: { color: '#007AFF' },
});
