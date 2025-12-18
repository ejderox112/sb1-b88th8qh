import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import {
  createBusinessProfile,
  createBusinessAd,
  getAdStatistics,
  purchaseSubscription,
  skipToNextRank,
} from '@/lib/premiumAdService';
import { supabase } from '@/lib/supabase';

export default function BusinessAdPanelScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [hasBusinessProfile, setHasBusinessProfile] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [userAds, setUserAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Business Profile Form
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('restaurant');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Ad Campaign Form
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [videoPlatform, setVideoPlatform] = useState<'youtube' | 'instagram' | 'facebook'>('youtube');
  const [videoUrl, setVideoUrl] = useState('');
  const [budgetTotal, setBudgetTotal] = useState('');
  const [targetRadius, setTargetRadius] = useState('5000');

  // Premium & Rank
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [militaryRank, setMilitaryRank] = useState<string | null>(null);
  const [totalSpending, setTotalSpending] = useState<number>(0);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Hata', 'Giriş yapmalısınız');
        router.back();
        return;
      }

      setUserId(user.id);

      // Check business profile
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (profile) {
        setHasBusinessProfile(true);
        setBusinessId(profile.id);
        loadUserAds(profile.id);
      }

      // Load user subscription & rank
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('subscription_tier, military_rank, total_spending')
        .eq('user_id', user.id)
        .single();

      if (userProfile) {
        setSubscriptionTier(userProfile.subscription_tier || 'free');
        setMilitaryRank(userProfile.military_rank);
        setTotalSpending(userProfile.total_spending || 0);
      }

      setLoading(false);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      setLoading(false);
    }
  };

  const loadUserAds = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('business_ads')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setUserAds(data);
      }
    } catch (error) {
      console.error('Reklamlar yüklenemedi:', error);
    }
  };

  const handleCreateBusinessProfile = async () => {
    if (!businessName || !address || !latitude || !longitude) {
      Alert.alert('Hata', 'İşletme adı, adres ve koordinatlar zorunludur');
      return;
    }

    const result = await createBusinessProfile({
      businessName,
      description,
      category,
      address,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      phone,
      email,
      website,
    });

    if (result.success) {
      Alert.alert('✅ Başarılı', 'İşletme profili oluşturuldu');
      loadUserData();
    } else {
      Alert.alert('Hata', result.error || 'İşletme profili oluşturulamadı');
    }
  };

  const handleCreateAd = async () => {
    if (!businessId) {
      Alert.alert('Hata', 'Önce işletme profili oluşturmalısınız');
      return;
    }

    if (!adTitle || !videoUrl || !budgetTotal) {
      Alert.alert('Hata', 'Reklam başlığı, video URL ve bütçe zorunludur');
      return;
    }

    const result = await createBusinessAd({
      businessId,
      title: adTitle,
      description: adDescription,
      videoPlatform,
      videoUrl,
      budgetTotal: parseFloat(budgetTotal),
      targetRadius: parseInt(targetRadius),
    });

    if (result.success) {
      Alert.alert(
        '✅ Başarılı',
        'Reklam kampanyanız oluşturuldu. Admin onayından sonra yayına girecek.',
      );
      loadUserAds(businessId);
      // Reset form
      setAdTitle('');
      setAdDescription('');
      setVideoUrl('');
      setBudgetTotal('');
    } else {
      Alert.alert('Hata', result.error || 'Reklam oluşturulamadı');
    }
  };

  const handlePurchasePremium = async (tier: 'premium' | 'prestij' | 'premium_plus') => {
    const amounts = { premium: 79, prestij: 500, premium_plus: 1000 };
    const tierNames = { premium: 'Premium', prestij: 'Prestij', premium_plus: 'Premium Plus' };

    Alert.alert(
      `${tierNames[tier]} Satın Al`,
      `${amounts[tier]} TL ödeyerek ${tierNames[tier]} üyeliğine geçmek istiyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Satın Al',
          onPress: async () => {
            const result = await purchaseSubscription(tier, 1);
            if (result.success) {
              Alert.alert('✅ Başarılı', `${tierNames[tier]} üyeliğiniz aktif edildi!`);
              loadUserData();
            } else {
              Alert.alert('Hata', result.error || 'Satın alma başarısız');
            }
          },
        },
      ],
    );
  };

  const handleRankSkip = async () => {
    Alert.alert(
      'Rütbe Atla',
      '500 TL ödeyerek bir üst rütbeye geçmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Atla',
          onPress: async () => {
            const result = await skipToNextRank();
            if (result.success) {
              Alert.alert('✅ Başarılı', `Yeni rütbeniz: ${result.new_rank}`);
              loadUserData();
            } else {
              Alert.alert('Hata', result.error || 'Rütbe atlama başarısız');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>⏳ Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📢 Reklam & Premium Panel</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Geri</Text>
        </TouchableOpacity>
      </View>

      {/* Premium & Rank Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>🎖️ Üyelik Durumu</Text>
        <Text style={styles.statusText}>Abonelik: {subscriptionTier === 'free' ? '🆓 Ücretsiz' : subscriptionTier === 'premium' ? '⭐ Premium (79 TL/ay)' : subscriptionTier === 'prestij' ? '🏅 Prestij (500 TL/ay)' : subscriptionTier === 'premium_plus' ? '💎 Premium Plus (1000 TL/ay)' : '🆓 Ücretsiz'}</Text>
        {militaryRank && (
          <Text style={styles.statusText}>Rütbe: 🎖️ {militaryRank}</Text>
        )}
        <Text style={styles.statusText}>Toplam Harcama: {totalSpending} TL</Text>

        <View style={styles.premiumButtons}>
          {subscriptionTier === 'free' && (
            <>
              <TouchableOpacity
                style={[styles.premiumBtn, { backgroundColor: '#FFD700' }]}
                onPress={() => handlePurchasePremium('premium')}
              >
                <Text style={styles.premiumBtnText}>⭐ Premium Al (79 TL/ay)</Text>
                <Text style={styles.premiumBtnSubtext}>+%5 XP Bonusu</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.premiumBtn, { backgroundColor: '#9D4EDD' }]}
                onPress={() => handlePurchasePremium('premium_plus')}
              >
                <Text style={styles.premiumBtnText}>💎 Premium Plus (1000 TL/ay)</Text>
                <Text style={styles.premiumBtnSubtext}>Extra özellik yok, prestij ve destek olmak için alabilirsiniz</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.premiumBtn, { backgroundColor: '#00D9FF' }]}
                onPress={() => handlePurchasePremium('prestij')}
              >
                <Text style={styles.premiumBtnText}>🏅 Prestij (500 TL/ay)</Text>
                <Text style={styles.premiumBtnSubtext}>Extra özellik yok, destek olmak için alabilirsiniz</Text>
              </TouchableOpacity>
            </>
          )}

          {militaryRank && militaryRank !== 'mareshal' && (
            <TouchableOpacity
              style={[styles.premiumBtn, { backgroundColor: '#FF6B6B' }]}
              onPress={handleRankSkip}
            >
              <Text style={styles.premiumBtnText}>⬆️ Rütbe Atla (500 TL)</Text>
              <Text style={styles.premiumBtnSubtext}>Bir üst rütbeye hemen geç</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Business Profile Section */}
      {!hasBusinessProfile ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏢 İşletme Profili Oluştur</Text>
          <Text style={styles.sectionDesc}>Reklam verebilmek için önce işletme profili oluşturmalısınız.</Text>

          <Text style={styles.label}>İşletme Adı *</Text>
          <TextInput
            style={styles.input}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Örn: Starbucks Bornova"
          />

          <Text style={styles.label}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="İşletmeniz hakkında kısa bilgi"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Kategori</Text>
          <View style={styles.categoryGrid}>
            {['restaurant', 'cafe', 'retail', 'health', 'education', 'entertainment', 'other'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                  {cat === 'restaurant' ? '🍽️ Restoran' : cat === 'cafe' ? '☕ Kafe' : cat === 'retail' ? '🛒 Perakende' : cat === 'health' ? '🏥 Sağlık' : cat === 'education' ? '🎓 Eğitim' : cat === 'entertainment' ? '🎬 Eğlence' : '📍 Diğer'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Adres *</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={address}
            onChangeText={setAddress}
            placeholder="Tam adres"
            multiline
            numberOfLines={2}
          />

          <View style={styles.coordRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Enlem *</Text>
              <TextInput
                style={styles.input}
                value={latitude}
                onChangeText={setLatitude}
                placeholder="38.4613"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Boylam *</Text>
              <TextInput
                style={styles.input}
                value={longitude}
                onChangeText={setLongitude}
                placeholder="27.2069"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Text style={styles.label}>Telefon</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+90 555 123 4567"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>E-posta</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="info@business.com"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Website</Text>
          <TextInput
            style={styles.input}
            value={website}
            onChangeText={setWebsite}
            placeholder="https://www.business.com"
          />

          <TouchableOpacity style={styles.createBtn} onPress={handleCreateBusinessProfile}>
            <Text style={styles.createBtnText}>✅ İşletme Profili Oluştur</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Ad Campaign Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📢 Yeni Reklam Kampanyası</Text>

            <Text style={styles.label}>Reklam Başlığı *</Text>
            <TextInput
              style={styles.input}
              value={adTitle}
              onChangeText={setAdTitle}
              placeholder="Örn: %30 İndirim!"
            />

            <Text style={styles.label}>Açıklama</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={adDescription}
              onChangeText={setAdDescription}
              placeholder="Reklam açıklaması"
              multiline
              numberOfLines={2}
            />

            <Text style={styles.label}>Video Platformu</Text>
            <View style={styles.platformRow}>
              {(['youtube', 'instagram', 'facebook'] as const).map((platform) => (
                <TouchableOpacity
                  key={platform}
                  style={[styles.platformChip, videoPlatform === platform && styles.platformChipActive]}
                  onPress={() => setVideoPlatform(platform)}
                >
                  <Text style={[styles.platformText, videoPlatform === platform && styles.platformTextActive]}>
                    {platform === 'youtube' ? '▶️ YouTube' : platform === 'instagram' ? '📷 Instagram' : '👥 Facebook'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Video URL *</Text>
            <TextInput
              style={styles.input}
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="https://www.youtube.com/watch?v=..."
            />

            <View style={styles.coordRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Bütçe (TL) *</Text>
                <TextInput
                  style={styles.input}
                  value={budgetTotal}
                  onChangeText={setBudgetTotal}
                  placeholder="1000"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Yarıçap (m)</Text>
                <TextInput
                  style={styles.input}
                  value={targetRadius}
                  onChangeText={setTargetRadius}
                  placeholder="5000"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.pricingInfo}>
              <Text style={styles.pricingText}>💰 Fiyatlandırma:</Text>
              <Text style={styles.pricingText}>• İzlenme (Impression): 0.10 TL</Text>
              <Text style={styles.pricingText}>• Tıklama (Click): 0.50 TL</Text>
              <Text style={styles.pricingText}>• 5 saniye sonra atlanabilir</Text>
              <Text style={styles.pricingText}>• Kullanıcılar her reklam için 5 XP kazanır</Text>
            </View>

            <TouchableOpacity style={styles.createAdBtn} onPress={handleCreateAd}>
              <Text style={styles.createAdBtnText}>🚀 Reklam Kampanyası Başlat</Text>
            </TouchableOpacity>
          </View>

          {/* User Ads */}
          {userAds.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Reklamlarım ({userAds.length})</Text>

              {userAds.map((ad) => (
                <View key={ad.id} style={styles.adCard}>
                  <View style={styles.adHeader}>
                    <Text style={styles.adTitle}>{ad.title}</Text>
                    <Text style={[
                      styles.adStatus,
                      ad.status === 'approved' ? styles.adStatusApproved :
                      ad.status === 'pending' ? styles.adStatusPending :
                      styles.adStatusRejected
                    ]}>
                      {ad.status === 'approved' ? '✅ Onaylı' : ad.status === 'pending' ? '⏳ Bekliyor' : '❌ Reddedildi'}
                    </Text>
                  </View>

                  <Text style={styles.adStat}>💰 Bütçe: {ad.budget_remaining} / {ad.budget_total} TL</Text>
                  <Text style={styles.adStat}>👁️ İzlenme: {ad.total_impressions}</Text>
                  <Text style={styles.adStat}>🎥 Görüntülenme: {ad.total_views}</Text>
                  <Text style={styles.adStat}>🖱️ Tıklama: {ad.total_clicks}</Text>

                  <TouchableOpacity
                    style={styles.statsBtn}
                    onPress={async () => {
                      const result = await getAdStatistics(ad.id);
                      if (result.success) {
                        Alert.alert('📊 Detaylı İstatistikler', JSON.stringify(result.data, null, 2));
                      }
                    }}
                  >
                    <Text style={styles.statsBtnText}>📊 Detaylı İstatistikler</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
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
  header: {
    padding: 20,
    backgroundColor: '#FF9500',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  backBtn: {
    padding: 8,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 6,
  },
  premiumButtons: {
    marginTop: 12,
    gap: 10,
  },
  premiumBtn: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  premiumBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  premiumBtnSubtext: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  categoryChipActive: {
    backgroundColor: '#ffe9e9',
    borderColor: '#FF9500',
  },
  categoryText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#FF9500',
  },
  coordRow: {
    flexDirection: 'row',
    gap: 12,
  },
  createBtn: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  platformRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  platformChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#f0f0f0',
    alignItems: 'center',
  },
  platformChipActive: {
    backgroundColor: '#e9f5ff',
    borderColor: '#007AFF',
  },
  platformText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  platformTextActive: {
    color: '#007AFF',
  },
  pricingInfo: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  pricingText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  createAdBtn: {
    backgroundColor: '#FF9500',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  createAdBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  adCard: {
    backgroundColor: '#f9f9f9',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  adHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  adStatus: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adStatusApproved: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  adStatusPending: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  adStatusRejected: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  adStat: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statsBtn: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  statsBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
