import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { submitRoomSuggestion } from '@/lib/locationAdmin';
import type { Location, LocationFloor, FloorNode, RoomSuggestionType } from '@/types';

interface ProfileSnapshot {
  level: number;
  trust_score: number;
}

const suggestionTypes: { id: RoomSuggestionType; label: string; desc: string; emoji: string }[] = [
  { id: 'exists', label: 'Var', desc: 'Bu oda burada faaliyet gösteriyor', emoji: '✅' },
  { id: 'new_tenant', label: 'Yeni Kiracı', desc: 'Yeni firma/klinik taşındı', emoji: '🆕' },
  { id: 'closed', label: 'Kapandı', desc: 'Oda/işletme kapandı', emoji: '🚫' },
  { id: 'moved', label: 'Taşındı', desc: 'Başka kata/koridora taşındı', emoji: '📦' },
  { id: 'rename', label: 'İsim Güncelle', desc: 'Adı değişti / yazımı farklı', emoji: '✏️' },
];

export default function RoomSuggestionScreen() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [floors, setFloors] = useState<LocationFloor[]>([]);
  const [nodes, setNodes] = useState<FloorNode[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<LocationFloor | null>(null);
  const [selectedNode, setSelectedNode] = useState<FloorNode | null>(null);

  const [profileSnapshot, setProfileSnapshot] = useState<ProfileSnapshot | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('user');
  const [isLoadingMap, setIsLoadingMap] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [suggestionType, setSuggestionType] = useState<RoomSuggestionType>('exists');
  const [proposedTenant, setProposedTenant] = useState('');
  const [note, setNote] = useState('');

  const getExtraValue = (key: string) => {
    const extras = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
    if (extras && typeof extras[key] !== 'undefined') {
      return extras[key] ?? '';
    }
    return (process.env as Record<string, string | undefined>)[key] ?? '';
  };

  const getAdminOverrides = () => {
    const overrideEmails = getExtraValue('EXPO_PUBLIC_ADMIN_OVERRIDE_EMAILS')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean);
    const forceAdmin = getExtraValue('EXPO_PUBLIC_FORCE_ADMIN').toLowerCase() === 'true';
    return { overrideEmails, forceAdmin };
  };

  const attemptDemoLogin = async () => {
    const demoEmail = String(getExtraValue('EXPO_PUBLIC_DEMO_EMAIL') || '').trim();
    const demoPassword = String(getExtraValue('EXPO_PUBLIC_DEMO_PASSWORD') || '').trim();
    if (!demoEmail || !demoPassword) {
      return null;
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPassword });
      if (error) {
        console.warn('Demo giriş hatası:', error.message);
        return null;
      }
      return data?.user ?? null;
    } catch (err) {
      console.warn('Demo giriş denemesi başarısız:', err);
      return null;
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        let currentUser = !error ? data?.user : null;
        const { overrideEmails, forceAdmin } = getAdminOverrides();

        if (!currentUser) {
          currentUser = await attemptDemoLogin();
        }

        if (currentUser) {
          setUserId(currentUser.id);
          const { data: profile } = await supabase
            .from('profiles')
            .select('level, trust_score, role')
            .eq('id', currentUser.id)
            .maybeSingle();

          let resolvedRole = 'user';
          if (profile) {
            setProfileSnapshot({ level: profile.level ?? 1, trust_score: profile.trust_score ?? 0 });
            if (profile.role) {
              resolvedRole = profile.role;
            }
          } else {
            setProfileSnapshot({ level: 10, trust_score: 45 });
          }

          if (currentUser.user_metadata?.role) {
            resolvedRole = currentUser.user_metadata.role;
          }

          if (currentUser.email && overrideEmails.includes(currentUser.email.toLowerCase())) {
            resolvedRole = 'admin';
          } else if (forceAdmin) {
            resolvedRole = 'admin';
          }

          setUserRole(resolvedRole);
        } else {
          setProfileSnapshot({ level: 8, trust_score: 20 });
          if (forceAdmin) {
            setUserRole('admin');
          }
        }
      } catch (err) {
        console.warn('Profil bilgisi alınamadı:', err);
        setProfileSnapshot({ level: 15, trust_score: 60 });
      }

      try {
        const { data: locationData } = await supabase
          .from('locations')
          .select('id, name, city, district')
          .order('created_at', { ascending: false });
        setLocations(locationData ?? []);
      } catch (err) {
        console.warn('Konum listesi alınamadı:', err);
        setLocations([]);
      } finally {
        setIsLoadingMap(false);
      }
    };

    bootstrap();
  }, []);

  const selectLocation = async (location: Location) => {
    setSelectedLocation(location);
    setSelectedFloor(null);
    setSelectedNode(null);
    setFloors([]);
    setNodes([]);

    try {
      const { data } = await supabase
        .from('location_floors')
        .select('id, label, floor_index, entry_type')
        .eq('location_id', location.id)
        .order('floor_index', { ascending: true });
      setFloors(data ?? []);
    } catch (err) {
      console.warn('Kat listesi alınamadı:', err);
    }
  };

  const selectFloor = async (floor: LocationFloor) => {
    setSelectedFloor(floor);
    setSelectedNode(null);
    setNodes([]);

    try {
      const { data } = await supabase
        .from('floor_nodes')
        .select('id, name, code, type')
        .eq('location_floor_id', floor.id)
        .order('name', { ascending: true });
      setNodes(data ?? []);
    } catch (err) {
      console.warn('Node listesi alınamadı:', err);
    }
  };

  const selectNode = (node: FloorNode) => {
    setSelectedNode(node);
  };

  const levelRequirement = 5;
  const trustRequirement = 30;
  const meetsLevel = (profileSnapshot?.level ?? 0) >= levelRequirement;
  const meetsTrust = (profileSnapshot?.trust_score ?? 0) >= trustRequirement;
  const hasValidUser = Boolean(userId);
  const isAdmin = userRole === 'admin';
  const canSubmit = hasValidUser && (isAdmin || (meetsLevel && meetsTrust));

  const handleSubmitSuggestion = async () => {
    if (!selectedNode) {
      Alert.alert('Eksik bilgi', 'Lütfen önce kapı/oda seçin.');
      return;
    }
    if (!canSubmit) {
      Alert.alert('Yetki gerekli', `Öneri göndermek için en az seviye ${levelRequirement} ve güven ${trustRequirement}+ gerekiyor.`);
      return;
    }

    if (!hasValidUser) {
      Alert.alert('Oturum gerekli', 'Öneri göndermek için demo hesabı ile otomatik giriş yapılamadı. Lütfen ayarlarınızdaki demo e-posta/parola bilgilerini doldurun.');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitRoomSuggestion({
        floor_node_id: selectedNode.id,
        user_id: userId,
        type: suggestionType,
        proposed_tenant_name: proposedTenant || null,
        note: note || null,
      });
      Alert.alert('Teşekkürler', 'Öneriniz moderatör sırasına alındı.');
      setSuggestionType('exists');
      setProposedTenant('');
      setNote('');
    } catch (err: any) {
      Alert.alert('Hata', err.message ?? 'Öneri gönderilirken sorun oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>💬 Oda / Kapı Önerisi</Text>
      <Text style={styles.subtitle}>Bu koridorda hangi firma var, kapandı mı, isim mi değiştirdi? Hemen bildir.</Text>

      <View style={styles.profileCard}>
        <Text style={styles.profileLine}>Seviye: <Text style={styles.profileValue}>{profileSnapshot?.level ?? '—'}</Text></Text>
        <Text style={styles.profileLine}>Güven: <Text style={styles.profileValue}>{profileSnapshot?.trust_score ?? '—'}</Text></Text>
        <Text style={styles.profileHint}>Min. seviye {levelRequirement} · Güven {trustRequirement}+ öneri için şart.</Text>
      </View>

      {isLoadingMap ? (
        <ActivityIndicator color="#00d4ff" style={{ marginTop: 24 }} />
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Bina seç</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {locations.map(loc => (
                <TouchableOpacity
                  key={loc.id}
                  style={[styles.pill, selectedLocation?.id === loc.id && styles.pillActive]}
                  onPress={() => selectLocation(loc)}
                >
                  <Text style={styles.pillText}>{loc.name}</Text>
                  <Text style={styles.pillHint}>{loc.city} · {loc.district}</Text>
                </TouchableOpacity>
              ))}
              {locations.length === 0 && <Text style={styles.emptyHint}>Henüz bina kaydı yok.</Text>}
            </ScrollView>
          </View>

          {selectedLocation && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Kat seç</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {floors.map(floor => (
                  <TouchableOpacity
                    key={floor.id}
                    style={[styles.pill, selectedFloor?.id === floor.id && styles.pillActive]}
                    onPress={() => selectFloor(floor)}
                  >
                    <Text style={styles.pillText}>{floor.label}</Text>
                    <Text style={styles.pillHint}>Kat {floor.floor_index}</Text>
                  </TouchableOpacity>
                ))}
                {floors.length === 0 && <Text style={styles.emptyHint}>Bu bina için kat girilmedi.</Text>}
              </ScrollView>
            </View>
          )}

          {selectedFloor && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Kapı / Node seç</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {nodes.map(node => (
                  <TouchableOpacity
                    key={node.id}
                    style={[styles.nodeChip, selectedNode?.id === node.id && styles.nodeChipActive]}
                    onPress={() => selectNode(node)}
                  >
                    <Text style={styles.nodeType}>{node.type.toUpperCase()}</Text>
                    <Text style={styles.nodeLabel}>{node.name || node.code || 'İsimsiz'}</Text>
                  </TouchableOpacity>
                ))}
                {nodes.length === 0 && <Text style={styles.emptyHint}>Bu katta henüz node yok.</Text>}
              </ScrollView>
            </View>
          )}
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Önerini yaz</Text>
        <View style={styles.typeRow}>
          {suggestionTypes.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[styles.typeChip, suggestionType === type.id && styles.typeChipActive]}
              onPress={() => setSuggestionType(type.id)}
            >
              <Text style={styles.typeChipEmoji}>{type.emoji}</Text>
              <Text style={styles.typeChipText}>{type.label}</Text>
              <Text style={styles.typeChipDesc}>{type.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Firma / klinik adı (opsiyonel)"
          value={proposedTenant}
          onChangeText={setProposedTenant}
        />
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Kısa açıklama (ör: 3. katta Acil Servis kapandı, yerine laboratuvar açıldı)"
          value={note}
          onChangeText={setNote}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedNode || isSubmitting || !canSubmit) && styles.submitButtonDisabled,
          ]}
          disabled={!selectedNode || isSubmitting || !canSubmit}
          onPress={handleSubmitSuggestion}
        >
          <Text style={styles.submitText}>{isSubmitting ? 'Gönderiliyor...' : 'Öneriyi Gönder'}</Text>
        </TouchableOpacity>
        {!canSubmit && hasValidUser && !isAdmin && (
          <Text style={styles.limitHint}>
            Öneri göndermek için seviye {levelRequirement} ve güven {trustRequirement}+ gerekiyor.
          </Text>
        )}
        {!hasValidUser && (
          <Text style={styles.limitHint}>Demo giriş bilgileri `app.json` içindeki `EXPO_PUBLIC_DEMO_EMAIL` ve `EXPO_PUBLIC_DEMO_PASSWORD` alanlarından okunur.</Text>
        )}
        {isAdmin && !hasValidUser && (
          <Text style={styles.limitHint}>Admin override aktif olsa bile, Supabase oturumu oluşmadıkça gönderim yapılamaz.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1d22',
    padding: 16,
  },
  title: {
    color: '#00d4ff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: '#b0b3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: '#2a2d32',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileLine: {
    color: '#d8d8d8',
    fontWeight: '600',
  },
  profileValue: {
    color: '#00ff88',
  },
  profileHint: {
    color: '#b0b3b8',
    fontSize: 11,
    marginTop: 8,
  },
  section: {
    backgroundColor: '#2a2d32',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  sectionTitle: {
    color: '#ffddaa',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#3a3d42',
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#4a4d52',
  },
  pillActive: {
    borderColor: '#00d4ff',
    backgroundColor: '#004659',
  },
  pillText: {
    color: '#fff',
    fontWeight: '700',
  },
  pillHint: {
    color: '#b0b3b8',
    fontSize: 11,
  },
  emptyHint: {
    color: '#b0b3b8',
    fontSize: 12,
    paddingVertical: 4,
  },
  nodeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#3a3d42',
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#4a4d52',
  },
  nodeChipActive: {
    borderColor: '#00ff88',
    backgroundColor: '#0b3a1f',
  },
  nodeType: {
    color: '#ffddaa',
    fontSize: 10,
    fontWeight: '700',
  },
  nodeLabel: {
    color: '#fff',
    fontSize: 13,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  typeChip: {
    width: '48%',
    backgroundColor: '#3a3d42',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#4a4d52',
    marginBottom: 10,
    marginRight: '4%',
  },
  typeChipActive: {
    borderColor: '#00d4ff',
    backgroundColor: '#003546',
  },
  typeChipEmoji: {
    fontSize: 16,
  },
  typeChipText: {
    color: '#fff',
    fontWeight: '700',
    marginTop: 4,
  },
  typeChipDesc: {
    color: '#b0b3b8',
    fontSize: 11,
  },
  input: {
    backgroundColor: '#3a3d42',
    color: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4a4d52',
    marginBottom: 12,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#00d4ff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#1a1d22',
    fontSize: 15,
    fontWeight: '700',
  },
  limitHint: {
    color: '#ff8888',
    fontSize: 12,
    marginTop: 8,
  },
});
