// REKLAM DESTEKLİ LIMIT GÖSTERGESİ - UI Component

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import {
  getMediaStats,
  getVisibilityStats,
  watchAdForPhotos,
  watchAdForVisibility,
} from '@/lib/adRewardService';

export default function AdRewardLimitIndicator() {
  const [mediaStats, setMediaStats] = useState<any>(null);
  const [visibilityStats, setVisibilityStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();

    // Her 30 saniyede bir güncelle
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const [media, visibility] = await Promise.all([
        getMediaStats(),
        getVisibilityStats(),
      ]);
      setMediaStats(media);
      setVisibilityStats(visibility);
    } catch (error) {
      console.error('Stats yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoAdClick = async () => {
    setLoading(true);
    await watchAdForPhotos();
    await loadStats();
    setLoading(false);
  };

  const handleVisibilityAdClick = async () => {
    setLoading(true);
    await watchAdForVisibility();
    await loadStats();
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#2196F3" />
      </View>
    );
  }

  if (!mediaStats || !visibilityStats) {
    return null;
  }

  // Premium kullanıcılar için basit gösterge
  if (mediaStats.is_premium) {
    return (
      <View style={styles.container}>
        <View style={styles.premiumBadge}>
          <Text style={styles.premiumText}>👑 Premium - Sınırsız</Text>
        </View>
      </View>
    );
  }

  const photoPercentage = (mediaStats.photos_remaining / (mediaStats.daily_photo_limit + mediaStats.extra_photos_from_ads)) * 100;
  const dataPercentage = (mediaStats.weekly_mb_used / mediaStats.weekly_mb_limit) * 100;

  return (
    <View style={styles.container}>
      {/* FOTO LİMİTİ */}
      <View style={styles.limitCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📸 Günlük Foto</Text>
          <Text
            style={[
              styles.remainingText,
              { color: mediaStats.photos_remaining > 0 ? '#4CAF50' : '#F44336' },
            ]}
          >
            {mediaStats.photos_remaining} / {mediaStats.daily_photo_limit + mediaStats.extra_photos_from_ads}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${photoPercentage}%`,
                backgroundColor: photoPercentage > 50 ? '#4CAF50' : photoPercentage > 25 ? '#FF9800' : '#F44336',
              },
            ]}
          />
        </View>

        {/* Reklam ile kazanılan fotolar */}
        {mediaStats.extra_photos_from_ads > 0 && (
          <Text style={styles.bonusText}>
            🎬 +{mediaStats.extra_photos_from_ads} reklam fotosu
          </Text>
        )}

        {/* Reklam Butonu */}
        {mediaStats.photos_remaining === 0 && (
          <TouchableOpacity
            style={styles.adButton}
            onPress={handlePhotoAdClick}
            disabled={loading}
          >
            <Text style={styles.adButtonText}>
              {loading ? '⏳ Yükleniyor...' : '🎬 Reklam İzle (+2 Foto)'}
            </Text>
          </TouchableOpacity>
        )}

        {/* İstatistikler */}
        <Text style={styles.statsText}>
          Toplam izlenen: {mediaStats.total_ads_watched} reklam
        </Text>
      </View>

      {/* KULLANICI GÖRÜNÜRLÜĞÜ */}
      <View style={styles.limitCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>👥 Görünür Kullanıcı</Text>
          <Text
            style={[
              styles.remainingText,
              { color: visibilityStats.boost_active ? '#4CAF50' : '#999' },
            ]}
          >
            {visibilityStats.total_visible_users} kişi
          </Text>
        </View>

        {/* Aktif Boost Göstergesi */}
        {visibilityStats.boost_active && (
          <View style={styles.boostIndicator}>
            <Text style={styles.boostText}>
              ⚡ +{visibilityStats.extra_visible_from_ads} kullanıcı
            </Text>
            <Text style={styles.boostTimeText}>
              Kalan: {Math.ceil(visibilityStats.boost_remaining_minutes)} dakika
            </Text>
          </View>
        )}

        {/* Reklam Butonu */}
        {!visibilityStats.boost_active && (
          <TouchableOpacity
            style={[styles.adButton, styles.visibilityAdButton]}
            onPress={handleVisibilityAdClick}
            disabled={loading}
          >
            <Text style={styles.adButtonText}>
              {loading ? '⏳ Yükleniyor...' : '🎬 Reklam İzle (+10 Kullanıcı)'}
            </Text>
          </TouchableOpacity>
        )}

        {/* İstatistikler */}
        <Text style={styles.statsText}>
          Yarıçap: {visibilityStats.visibility_radius}m
        </Text>
      </View>

      {/* DATA LİMİTİ (HAFTALIK) */}
      <View style={styles.limitCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>💾 Haftalık Data</Text>
          <Text style={styles.remainingText}>
            {mediaStats.mb_remaining.toFixed(1)} MB kaldı
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${dataPercentage}%`,
                backgroundColor: dataPercentage < 50 ? '#4CAF50' : dataPercentage < 80 ? '#FF9800' : '#F44336',
              },
            ]}
          />
        </View>

        <Text style={styles.statsText}>
          Kullanılan: {mediaStats.weekly_mb_used.toFixed(1)} / {mediaStats.weekly_mb_limit.toFixed(0)} MB
        </Text>
      </View>

      {/* PREMIUM UPGRADE BUTTON */}
      <TouchableOpacity style={styles.premiumUpgradeButton}>
        <Text style={styles.premiumUpgradeText}>
          ✨ Premium'a Geç - Sınırsız Kullan!
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  limitCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  remainingText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  bonusText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  adButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  visibilityAdButton: {
    backgroundColor: '#9C27B0',
  },
  adButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsText: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
  },
  boostIndicator: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  boostText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  boostTimeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  premiumText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  premiumUpgradeButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  premiumUpgradeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
