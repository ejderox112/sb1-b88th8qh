import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import ErrorMessage from '@/components/ErrorMessage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getTopSupportersWithProfile } from '@/lib/supporterTopLogic';
// Removed inline imports for heavy lists to avoid nested VirtualizedList warnings

export default function LocationsScreen() {
  const [userRole, setUserRole] = useState<string>('user');
  const [userId, setUserId] = useState<string | null>(null);
  const [supportersByProject, setSupportersByProject] = useState<Record<string, any[]>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [supporterMsg, setSupporterMsg] = useState('');
  const [donationLoadingProject, setDonationLoadingProject] = useState<string | null>(null);

  const projects = useMemo(
    () => [
      { name: 'EgePark AVM', id: 'egepark' },
      { name: 'Forum Bornova', id: 'forum' },
      { name: 'İzmir Şehir Hastanesi', id: 'hastane' },
      { name: 'Optimum AVM', id: 'optimum' },
      { name: 'Agora AVM', id: 'agora' },
    ],
    []
  );

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    projects.forEach((proj) => fetchTopSupporters(proj.id));
  }, [projects]);

  const fetchTopSupporters = async (projectId: string) => {
    try {
      const { data, error } = await getTopSupportersWithProfile(projectId);
      if (error) throw error;
      setSupportersByProject((prev) => ({ ...prev, [projectId]: data || [] }));
    } catch (err: any) {
      console.error('Destekçi verisi alınamadı:', err);
      setErrorMsg('Destekçi listesi yüklenirken hata oluştu.');
    }
  };

  const handleMockDonate = async (projectId: string, amount: number) => {
    setErrorMsg('');
    setSupporterMsg('');
    if (!userId) {
      setErrorMsg('Bağış yapmak için önce giriş yapmalısınız.');
      return;
    }
    setDonationLoadingProject(projectId);
    try {
      const { error } = await supabase.from('supporters').insert({
        user_id: userId,
        project_id: projectId,
        amount,
        date: new Date().toISOString(),
      });
      if (error) throw error;
      setSupporterMsg(`Teşekkür ederiz! ${amount} TL destek kaydedildi.`);
      await fetchTopSupporters(projectId);
    } catch (err: any) {
      console.error('Bağış kaydedilemedi', err);
      setErrorMsg(err?.message || 'Bağış kaydedilemedi.');
    } finally {
      setDonationLoadingProject(null);
    }
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

      setUserId(user.id);

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

  const openBusinessAdPanel = () => {
    router.push('/BusinessAdPanelScreen');
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
        {projects.map((proj, idx) => {
          const supporters = supportersByProject[proj.id] || [];
          return (
            <View key={proj.id} style={styles.projectCard}>
              <Text style={styles.projectTitle}>{idx+1}. {proj.name}</Text>
              <Text style={styles.projectSupportInfo}>
                Bu projeye toplam {supporters.length} kayıtlı destek var.
              </Text>
              <Text style={styles.premiumInfo}>
                Destek olup <Text style={{fontWeight:'bold',color:'#FFD700'}}>premium</Text> rozeti ve <Text style={{fontWeight:'bold',color:'#00d4ff'}}>bağışçı</Text> rozeti kazanmak ister misiniz?
              </Text>
              <TouchableOpacity
                style={styles.donateButton}
                onPress={() => handleMockDonate(proj.id, 0)}
                disabled={donationLoadingProject === proj.id}
              >
                <Text style={styles.donateButtonText}>Destek Ol / Katkı Sağla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.voteButton} onPress={() => {/* TODO: Voting integration */}}>
                <Text style={styles.voteButtonText}>Oy Ver (Sıradaki Harita)</Text>
              </TouchableOpacity>
              {/* En Büyük Destekçilerimiz */}
              <View style={styles.supportersBox}>
                  <Text style={styles.supportersTitle}>En Büyük Destekçilerimiz (Top 3)</Text>
                  <View style={styles.supportersList}>
                    {supporters.length === 0 ? (
                      <Text style={styles.supporterItem}>Henüz destekçi yok.</Text>
                    ) : (
                      supporters.map((sup) => (
                        <View key={`${proj.id}-${sup.user_id}`} style={styles.supporterRow}>
                          {sup.avatar_url ? (
                            <Image source={{ uri: sup.avatar_url }} style={styles.supporterAvatar} />
                          ) : null}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.supporterName}>
                              {(sup.show_name || false) ? (sup.nickname ?? 'Destekçi') : 'Anonim Destekçi'}
                            </Text>
                            {/* <Text style={styles.supporterAmount}>{sup.amount} TL</Text> */}
                            {(sup.is_top3 || false) && (
                              <TouchableOpacity
                                style={styles.showNameButton}
                                onPress={async () => {
                                  try {
                                    // Kullanıcı kendi ismini paylaşmak istiyorsa
                                    if (!userId || userId !== sup.user_id) throw new Error('Sadece kendi ismini paylaşabilirsin.');
                                    await supabase.from('supporters').update({ show_name: true }).eq('user_id', userId).eq('project_id', proj.id);
                                    setSupporterMsg('İsmin başarıyla paylaşıldı.');
                                  } catch (e: any) {
                                    setErrorMsg('İsim paylaşma başarısız: ' + (e?.message || 'Bilinmeyen hata'));
                                  }
                                }}
                              >
                                <Text style={styles.showNameText}>İsmimi Paylaş</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          <TouchableOpacity
                            style={[styles.likeButton, sup.liked_by_user ? styles.likeButtonDisabled : null]}
                            disabled={sup.liked_by_user}
                            onPress={async () => {
                              try {
                                if (!userId) throw new Error('Önce giriş yapın.');
                                if (sup.liked_by_user) return;
                                const { likeSupporter } = await import('@/lib/supporterLogic');
                                await likeSupporter(sup.user_id, userId, proj.id);
                                setSupporterMsg('Destekçiye like gönderdiniz.');
                              } catch (e: any) {
                                setErrorMsg('Like işlemi başarısız: ' + (e?.message || 'Bilinmeyen hata'));
                              }
                            }}
                          >
                            <Text style={styles.likeText}>👍</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.dislikeButton, sup.disliked_by_user ? styles.dislikeButtonDisabled : null]}
                            disabled={sup.disliked_by_user}
                            onPress={async () => {
                              try {
                                if (!userId) throw new Error('Önce giriş yapın.');
                                if (sup.disliked_by_user) return;
                                const { dislikeSupporter } = await import('@/lib/supporterLogic');
                                await dislikeSupporter(sup.user_id, userId, proj.id);
                                setSupporterMsg('Geri bildirim gönderildi.');
                              } catch (e: any) {
                                setErrorMsg('Dislike işlemi başarısız: ' + (e?.message || 'Bilinmeyen hata'));
                              }
                            }}
                          >
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
          );
        })}
        {supporterMsg ? <Text style={styles.supportSuccess}>{supporterMsg}</Text> : null}
        <ErrorMessage message={errorMsg} />
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

      {/* Konumunuza Özel Reklam Verin */}
      <View style={styles.adSection}>
        <Text style={styles.adSectionTitle}>📢 Konumunuza Özel Reklam Verin</Text>
        <Text style={styles.adSectionDesc}>
          İşletme sahibiyseniz, konumunuza özel video reklam oluşturun. 
          Yakındaki kullanıcılara görüntülensin, tıklama başına ödeme yapın!
        </Text>
        
        <View style={styles.adFeatures}>
          <Text style={styles.adFeature}>✅ YouTube, Instagram, Facebook video entegrasyonu</Text>
          <Text style={styles.adFeature}>✅ İzlenme: 0.10 TL | Tıklama: 0.50 TL</Text>
          <Text style={styles.adFeature}>✅ 5 saniye sonra atlanabilir</Text>
          <Text style={styles.adFeature}>✅ Her reklam izleyene 5 XP kazandırın</Text>
          <Text style={styles.adFeature}>✅ Konum, saat, gün bazlı detaylı istatistikler</Text>
          <Text style={styles.adFeature}>✅ Admin onayı sonrası yayına girer</Text>
        </View>

        <TouchableOpacity style={styles.adButton} onPress={openBusinessAdPanel}>
          <Text style={styles.adButtonText}>🚀 Reklam Kampanyası Başlat</Text>
        </TouchableOpacity>

        <Text style={styles.adNote}>
          Premium üyeler reklam istatistiklerinde %5 bonus, Premium Plus üyeler %10 bonus kazanır.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
    premiumInfo: {
      fontSize: 14,
      color: '#FFD700',
      textAlign: 'center',
      marginVertical: 8,
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
  supportSection: {
    backgroundColor: '#23272e',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#3a3d42',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
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
  donateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  donateButton: {
    flex: 1,
    backgroundColor: '#ff784f',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  donateButtonDisabled: {
    opacity: 0.5,
  },
  donateButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
  },
  voteButton: {
    backgroundColor: '#00d4ff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  voteButtonText: {
    color: '#1a1d22',
    fontWeight: '700',
    fontSize: 14,
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
  supporterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  supporterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 4,
  },
  supporterName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  supporterAmount: {
    color: '#00d4ff',
    fontWeight: '700',
    fontSize: 13,
    marginTop: 2,
  },
  likeButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2f343d',
  },
  likeText: {
    fontSize: 18,
  },
  dislikeButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2f343d',
    marginLeft: 6,
  },
  dislikeText: {
    fontSize: 18,
  },
  supportersInfo: {
    color: '#b0b3b8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  supportSuccess: {
    color: '#3fe478',
    marginTop: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  supportNote: {
    color: '#b0b3b8',
    fontSize: 13,
    marginTop: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
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
  section: {
    marginVertical: 16,
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  inlineButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  smallButton: {
    backgroundColor: '#00d4ff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
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
  adSection: {
    backgroundColor: '#2a2d32',
    padding: 18,
    borderRadius: 12,
    marginVertical: 20,
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  adSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF9500',
    marginBottom: 10,
    textAlign: 'center',
  },
  adSectionDesc: {
    fontSize: 15,
    color: '#ffddaa',
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  adFeatures: {
    backgroundColor: '#23272e',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  adFeature: {
    fontSize: 14,
    color: '#d8d8d8',
    marginBottom: 8,
    lineHeight: 20,
  },
  adButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  adButtonText: {
    color: '#1a1d22',
    fontWeight: '800',
    fontSize: 16,
  },
  adNote: {
    fontSize: 13,
    color: '#b0b3b8',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  likeButtonDisabled: {
    opacity: 0.5,
  },
  dislikeButtonDisabled: {
    opacity: 0.5,
  },
  showNameButton: {
    backgroundColor: '#00d4ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  showNameText: {
    color: '#1a1d22',
    fontWeight: '700',
    fontSize: 12,
  },
});
