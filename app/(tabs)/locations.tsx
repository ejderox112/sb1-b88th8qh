import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import ErrorMessage from '@/components/ErrorMessage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
// Removed inline imports for heavy lists to avoid nested VirtualizedList warnings

export default function LocationsScreen() {
  const [userRole, setUserRole] = useState<string>('user');
    const [topSupporters, setTopSupporters] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>('default_project_id');
    const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    checkUserRole();
      fetchTopSupporters(selectedProject);
  }, []);

    const fetchTopSupporters = async (projectId: string) => {
      setSelectedProject(projectId);
      const { getTopSupportersWithProfile } = await import('@/lib/supporterTopLogic');
      const { data } = await getTopSupportersWithProfile(projectId);
      setTopSupporters(data || []);
    };
  const getAdminOverrides = () => {
    const extras = Constants.expoConfig?.extra ?? {};
    const overrideEmailsRaw = extras?.EXPO_PUBLIC_ADMIN_OVERRIDE_EMAILS ?? process.env.EXPO_PUBLIC_ADMIN_OVERRIDE_EMAILS ?? '';
    const overrideEmails = String(overrideEmailsRaw)
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean);
    const forceAdminRaw = extras?.EXPO_PUBLIC_FORCE_ADMIN ?? process.env.EXPO_PUBLIC_FORCE_ADMIN ?? 'false';
    const forceAdmin = String(forceAdminRaw).toLowerCase() === 'true';
    return { overrideEmails, forceAdmin };
  };

  const checkUserRole = async () => {
    try {
      const { overrideEmails, forceAdmin } = getAdminOverrides();
      const { data, error } = await supabase.auth.getUser();
      const user = !error ? data?.user : null;

      if (!user) {
        if (forceAdmin) {
          setUserRole('admin');
        }
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.role) {
        setUserRole(profile.role);
        return;
      }

      if (user.user_metadata?.role) {
        setUserRole(user.user_metadata.role);
        return;
      }

      if (user.email && overrideEmails.includes(user.email.toLowerCase())) {
        setUserRole('admin');
        return;
      }

      if (forceAdmin) {
        setUserRole('admin');
      }
    } catch (err) {
      console.warn('Rol kontrolü başarısız:', err);
    }
  };

  const openAdminPanel = (stage?: string) => {
    if (stage) {
      router.push(`/LocationAdminScreen?stage=${stage}`);
    } else {
      router.push('/LocationAdminScreen');
    }
  };

  const openSuggestionPanel = () => {
    router.push('/RoomSuggestionScreen');
  };

  const openIndoorNav = () => {
    router.push('/IndoorNavScreen');
  };

  const openIndoorContribute = () => {
    router.push('/IndoorContributeScreen');
  };

  const openIndoorModeration = () => {
    router.push('/IndoorModerationScreen');
  };

  const openIndoorChat = () => {
    router.push('/IndoorChatScreen');
  };

  const openAddFriend = () => {
    router.push('/AddFriendScreen');
  };

  const isAdmin = userRole === 'admin';

  const stages = useMemo(() => ([
    {
      id: 'A1',
      title: 'Plan A1 · Bina + Kat Planı',
      description: 'Her bina, tüm katlar ve giriş tipleri (ana, otopark, servis) kaydedilecek. Kat planı olmadan GPS kalibrasyonu yapılamaz.',
      badge: 'Admin',
      actionLabel: isAdmin ? 'Bina & Kat Yönet' : 'Admin erişimi gerekli',
      onPress: isAdmin ? () => openAdminPanel('A1') : undefined,
    },
    {
      id: 'B1',
      title: 'Plan B1 · Kapı / Koridor / Oda',
      description: 'Node (kapı, koridor, asansör) ve oda detayları girilecek. Her node’un X/Y ve GPS noktası tutulacak.',
      badge: 'Admin',
      actionLabel: isAdmin ? 'Node & Oda Gir' : 'Admin erişimi gerekli',
      onPress: isAdmin ? () => openAdminPanel('B1') : undefined,
    },
    {
      id: 'C',
      title: 'Plan C · Kullanıcı Önerileri',
      description: 'Standart kullanıcılar “Bu katta şu firma var / kapandı” şeklinde öneri bırakabilir. Seviye + güven skoruna göre kota artar.',
      badge: 'Tüm Üyeler',
      actionLabel: 'Oda Önerisi Gönder',
      onPress: openSuggestionPanel,
    },
  ]), [isAdmin]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Konumlar</Text>
      <Text style={styles.subtitle}>A1 / B1 / C planları ile tüm bina → kat → koridor verisini sahadan toplayın.</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>• Adminler: Her bina ve kat için GPS + node + oda detaylarını telefondan girer.</Text>
        <Text style={styles.infoText}>• Kullanıcılar: Oda isimleri / kiracı değişikliklerini öneri olarak bırakır.</Text>
        <Text style={styles.infoText}>• Seviye 10+ ve güven 60+ olanlar günde 10 öneri bırakabilir.</Text>
      </View>

      {stages.map(stage => (
        <View key={stage.id} style={styles.stageCard}>
          <View style={styles.stageHeader}>
            <Text style={styles.stageBadge}>{stage.id}</Text>
            <Text style={styles.stageBadgeMuted}>{stage.badge}</Text>
          </View>
          <Text style={styles.stageTitle}>{stage.title}</Text>
          <Text style={styles.stageDesc}>{stage.description}</Text>
          <TouchableOpacity
            style={[styles.stageButton, !stage.onPress && styles.stageButtonDisabled]}
            onPress={stage.onPress}
            disabled={!stage.onPress}
          >
            <Text style={[styles.stageButtonText, !stage.onPress && styles.stageButtonTextDisabled]}>
              {stage.actionLabel}
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Program Destekçisi Ol ve Sıradaki Haritalandırma Projeleri */}
      <View style={styles.supportSection}>
        <Text style={styles.sectionTitle}>Program Destekçisi Ol</Text>
        <Text style={styles.supportDesc}>Yeni iç mekan haritalandırma projeleri için oy ver, destek ol, bağış yap!</Text>
        {[{name:'EgePark AVM',id:'egepark'},{name:'Forum Bornova',id:'forum'},{name:'İzmir Şehir Hastanesi',id:'hastane'},{name:'Optimum AVM',id:'optimum'},{name:'Agora AVM',id:'agora'}].map((proj, idx) => (
          <View key={proj.id} style={styles.projectCard}>
            <Text style={styles.projectTitle}>{idx+1}. {proj.name}</Text>
            <Text style={styles.projectSupportInfo}>Bu projeye 1 destek, xxx adlı kullanıcıdan.</Text>
            <TouchableOpacity style={styles.donateButton} onPress={() => {/* TODO: Payment integration */}}>
              <Text style={styles.donateButtonText}>Bu Projeye Destek Ol (Bağış Yap)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.voteButton} onPress={() => {/* TODO: Voting integration */}}>
              <Text style={styles.voteButtonText}>Oy Ver (Sıradaki Harita)</Text>
            </TouchableOpacity>
            {/* En Büyük Destekçilerimiz */}
            <View style={styles.supportersBox}>
                <Text style={styles.supportersTitle}>En Büyük Destekçilerimiz (Top 3)</Text>
                <View style={styles.supportersList}>
                  {topSupporters.length === 0 ? (
                    <Text style={styles.supporterItem}>Henüz destekçi yok.</Text>
                  ) : (
                    topSupporters.map((sup, idx) => (
                      <View key={sup.user_id} style={styles.supporterRow}>
                        {sup.avatar_url ? (
                          <Image source={{ uri: sup.avatar_url }} style={styles.supporterAvatar} />
                        ) : null}
                        <Text style={styles.supporterName}>{sup.nickname}</Text>
                        <Text style={styles.supporterAmount}>{sup.amount} TL</Text>
                        <TouchableOpacity style={styles.likeButton} onPress={async () => {
                          try {
                            const { likeSupporter } = await import('@/lib/supporterLogic');
                            await likeSupporter(sup.user_id);
                          } catch (e) {
                            setErrorMsg('Like işlemi başarısız: ' + e.message);
                          }
                        }}>
                          <Text style={styles.likeText}>👍</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.dislikeButton} onPress={async () => {
                          try {
                            const { dislikeSupporter } = await import('@/lib/supporterLogic');
                            await dislikeSupporter(sup.user_id);
                          } catch (e) {
                            setErrorMsg('Dislike işlemi başarısız: ' + e.message);
                          }
                        }}>
                          <Text style={styles.dislikeText}>👎</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                      <ErrorMessage message={errorMsg} />
                </View>
                <Text style={styles.supportersInfo}>Bu projeye en çok destek veren 3 kişi özel rozet kazanır.</Text>
            </View>
          </View>
        ))}
        {/* Genel Proje Destekçileri */}
        <View style={styles.globalSupportersBox}>
          <Text style={styles.globalSupportersTitle}>Genel Proje Destekçileri</Text>
          <Text style={styles.globalSupportersDesc}>Tüm projeler baz alınarak en büyük destekçiler ve rozet sahipleri:</Text>
          <View style={styles.globalSupportersList}>
            <View style={styles.globalSupporterRow}>
              <Text style={styles.globalSupporterRank}>1.</Text>
              <Text style={styles.globalSupporterName}>Mehmet</Text>
              <Text style={styles.globalSupporterAmount}>12.000 TL</Text>
              <Text style={styles.globalSupporterBadge}>🏅 En Büyük Proje Destekçisi</Text>
            </View>
            <View style={styles.globalSupporterRow}>
              <Text style={styles.globalSupporterRank}>2.</Text>
              <Text style={styles.globalSupporterName}>Zeynep</Text>
              <Text style={styles.globalSupporterAmount}>8.500 TL</Text>
              <Text style={styles.globalSupporterBadge}>🏅</Text>
            </View>
            <View style={styles.globalSupporterRow}>
              <Text style={styles.globalSupporterRank}>3.</Text>
              <Text style={styles.globalSupporterName}>Burak</Text>
              <Text style={styles.globalSupporterAmount}>6.000 TL</Text>
              <Text style={styles.globalSupporterBadge}>🏅</Text>
            </View>
          </View>
          <Text style={styles.globalSupportersNote}>Destekçiler bağış miktarını ve tarihini profilinde gösterebilir. Örnek: "10.08.2025 yılında 10000 TL Bağış yapmıştır."</Text>
          <Text style={styles.globalSupportersLikeInfo}>Her kullanıcı listedeki destekçilere 1 adet like gönderebilir.</Text>
        </View>
        <Text style={styles.supportNote}>Destek veren kullanıcılar profillerinde özel rozet kazanır. En büyük 3 bağışçı ayrıca listelenir.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>İç Mekan (Araçlar)</Text>
        <View style={styles.inlineButtons}>
          <TouchableOpacity style={styles.smallButton} onPress={openIndoorNav}>
            <Text style={styles.smallButtonText}>İç Mekan Navigasyon (Ayrı ekran)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={openIndoorContribute}>
            <Text style={styles.smallButtonText}>Oda / Firma Önerisi (Ayrı ekran)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
        globalSupportersBox: {
          backgroundColor: '#23272e',
          padding: 16,
          borderRadius: 12,
          marginTop: 24,
          borderWidth: 1,
          borderColor: '#3a3d42',
        },
        globalSupportersTitle: {
          color: '#00d4ff',
          fontWeight: '700',
          fontSize: 17,
          marginBottom: 6,
          textAlign: 'center',
        },
        globalSupportersDesc: {
          color: '#ffddaa',
          fontSize: 15,
          marginBottom: 10,
          lineHeight: 20,
          fontWeight: '600',
          textAlign: 'center',
        },
        globalSupportersList: {
          marginBottom: 8,
        },
        globalSupporterRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 4,
          justifyContent: 'space-between',
        },
        globalSupporterRank: {
          color: '#fff',
          fontWeight: '700',
          fontSize: 15,
          width: 22,
        },
        globalSupporterName: {
          color: '#fff',
          fontSize: 15,
          flex: 1,
        },
        globalSupporterAmount: {
          color: '#00d4ff',
          fontWeight: '700',
          fontSize: 15,
          marginLeft: 8,
          width: 90,
          textAlign: 'right',
        },
        globalSupporterBadge: {
          fontSize: 18,
          marginLeft: 8,
        },
        globalSupportersNote: {
          color: '#b0b3b8',
          fontSize: 13,
          marginTop: 10,
          fontStyle: 'italic',
          textAlign: 'center',
        },
        globalSupportersLikeInfo: {
          color: '#b0b3b8',
          fontSize: 13,
          marginTop: 4,
          textAlign: 'center',
        },
      supportersBox: {
        backgroundColor: '#23272e',
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#3a3d42',
      },
      supportersTitle: {
        color: '#00d4ff',
        fontWeight: '700',
        fontSize: 15,
        marginBottom: 6,
      },
      supportersList: {
        marginBottom: 6,
      },
      supporterItem: {
        color: '#fff',
        fontSize: 14,
        marginBottom: 2,
      },
      supportersInfo: {
        color: '#b0b3b8',
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 4,
      },
    supportSection: {
      backgroundColor: '#23272e',
      padding: 16,
      borderRadius: 12,
      marginTop: 24,
      borderWidth: 1,
      borderColor: '#3a3d42',
    },
    supportDesc: {
      color: '#ffddaa',
      fontSize: 15,
      marginBottom: 12,
      lineHeight: 20,
      fontWeight: '600',
    },
    projectCard: {
      backgroundColor: '#2a2d32',
      padding: 14,
      borderRadius: 10,
      marginTop: 14,
      borderWidth: 1,
      borderColor: '#3a3d42',
    },
    projectTitle: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
    },
    projectSupportInfo: {
      color: '#b0b3b8',
      fontSize: 13,
      marginBottom: 8,
    },
    donateButton: {
      backgroundColor: '#00d4ff',
      padding: 10,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 8,
    },
    donateButtonText: {
      color: '#23272e',
      fontWeight: '700',
      fontSize: 15,
    },
    voteButton: {
      backgroundColor: '#ffddaa',
      padding: 8,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 4,
    },
    voteButtonText: {
      color: '#23272e',
      fontWeight: '700',
      fontSize: 14,
    },
    supportNote: {
      color: '#b0b3b8',
      fontSize: 13,
      marginTop: 14,
      fontStyle: 'italic',
      textAlign: 'center',
    },
  container: {
    flex: 1,
    backgroundColor: '#1a1d22',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00d4ff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#b0b3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: '#2a2d32',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00d4ff',
  },
  infoText: {
    color: '#ffddaa',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  stageCard: {
    backgroundColor: '#2a2d32',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#3a3d42',
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageBadge: {
    color: '#1a1d22',
    backgroundColor: '#00ff88',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    fontWeight: '800',
    marginRight: 8,
    fontSize: 13,
  },
  stageBadgeMuted: {
    color: '#b0b3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  stageTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  stageDesc: {
    color: '#d8d8d8',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  stageButton: {
    backgroundColor: '#00d4ff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  stageButtonDisabled: {
    backgroundColor: '#3a3d42',
    borderWidth: 1,
    borderColor: '#555',
  },
  stageButtonText: {
    color: '#1a1d22',
    fontWeight: '700',
    fontSize: 14,
  },
  stageButtonTextDisabled: {
    color: '#888',
  },
  section: {
    marginVertical: 16,
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  inlineButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallButton: {
    backgroundColor: '#00d4ff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  smallButtonText: {
    color: '#1a1d22',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  smallButtonFull: {
    backgroundColor: '#00d4ff',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
});
