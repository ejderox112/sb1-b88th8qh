// İŞLETME VİDEO REKLAM OYNATICI - React Native Component
// YouTube, Instagram, Facebook Desteği

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  getNearbyBusinessAds,
  recordAdImpression,
  recordAdClick,
  getEmbedUrl,
  type BusinessAd,
} from '@/lib/businessAdService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BusinessAdPlayerProps {
  userLatitude: number;
  userLongitude: number;
  maxDistance?: number;
  onAdComplete?: () => void;
}

export default function BusinessAdPlayer({
  userLatitude,
  userLongitude,
  maxDistance = 5000,
  onAdComplete,
}: BusinessAdPlayerProps) {
  const [ads, setAds] = useState<BusinessAd[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [watchTime, setWatchTime] = useState(0);
  const [adViewed, setAdViewed] = useState(false);

  const watchTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadNearbyAds();
  }, [userLatitude, userLongitude]);

  useEffect(() => {
    // İlk reklam yüklendiğinde görüntülenme kaydı yap
    if (ads.length > 0 && !adViewed) {
      const currentAd = ads[currentAdIndex];
      recordAdImpression(currentAd.ad_id, userLatitude, userLongitude);
      setAdViewed(true);
      startWatchTimer();
    }

    return () => {
      if (watchTimer.current) {
        clearInterval(watchTimer.current);
      }
    };
  }, [ads, currentAdIndex]);

  const loadNearbyAds = async () => {
    try {
      setLoading(true);
      const nearbyAds = await getNearbyBusinessAds(
        userLatitude,
        userLongitude,
        maxDistance
      );
      setAds(nearbyAds);
    } catch (error) {
      console.error('Reklamlar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const startWatchTimer = () => {
    watchTimer.current = setInterval(() => {
      setWatchTime((prev) => prev + 1);
    }, 1000);
  };

  const handleAdClick = async () => {
    const currentAd = ads[currentAdIndex];

    // Tıklamayı kaydet ve ücretlendir
    const result = await recordAdClick(
      currentAd.ad_id,
      userLatitude,
      userLongitude
    );

    if (result.success) {
      // İşletme websitesini aç
      if (result.businessUrl) {
        Linking.openURL(result.businessUrl);
      } else if (result.businessPhone) {
        Linking.openURL(`tel:${result.businessPhone}`);
      }
    }
  };

  const handleSkipAd = () => {
    if (currentAdIndex < ads.length - 1) {
      setCurrentAdIndex(currentAdIndex + 1);
      setWatchTime(0);
      setAdViewed(false);
    } else {
      onAdComplete?.();
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Yakınlardaki reklamlar yükleniyor...</Text>
      </View>
    );
  }

  if (ads.length === 0) {
    return (
      <View style={styles.noAdsContainer}>
        <Text style={styles.noAdsText}>
          Yakınınızda reklam veren işletme bulunmuyor
        </Text>
      </View>
    );
  }

  const currentAd = ads[currentAdIndex];
  const embedUrl = getEmbedUrl(currentAd.video_url, currentAd.video_platform);
  const canSkip = watchTime >= 5; // 5 saniye sonra geçilebilir

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <View style={styles.videoContainer}>
        <WebView
          source={{ uri: embedUrl }}
          style={styles.video}
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
        />

        {/* Skip Button */}
        {canSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkipAd}>
            <Text style={styles.skipButtonText}>
              ⏭️ Geç ({ads.length - currentAdIndex} kaldı)
            </Text>
          </TouchableOpacity>
        )}

        {/* Watch Timer */}
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>
            {canSkip ? '✅' : `${watchTime}s`}
          </Text>
        </View>
      </View>

      {/* Ad Info */}
      <View style={styles.infoContainer}>
        <View style={styles.infoHeader}>
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{currentAd.business_name}</Text>
            <Text style={styles.adTitle}>{currentAd.title}</Text>
          </View>
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>
              📍 {formatDistance(currentAd.distance_meters)}
            </Text>
          </View>
        </View>

        {currentAd.description && (
          <Text style={styles.description} numberOfLines={2}>
            {currentAd.description}
          </Text>
        )}

        {/* Platform Badge */}
        <View style={styles.platformBadge}>
          <Text style={styles.platformText}>
            {currentAd.video_platform === 'youtube' && '📺 YouTube'}
            {currentAd.video_platform === 'instagram' && '📸 Instagram'}
            {currentAd.video_platform === 'facebook' && '👥 Facebook'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.detailButton} onPress={handleAdClick}>
            <Text style={styles.detailButtonText}>🔍 Detaylı Bilgi</Text>
          </TouchableOpacity>

          {canSkip && (
            <TouchableOpacity style={styles.nextButton} onPress={handleSkipAd}>
              <Text style={styles.nextButtonText}>Sonraki Reklam →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Ad Counter */}
        <Text style={styles.adCounter}>
          Reklam {currentAdIndex + 1} / {ads.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 14,
  },
  noAdsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  noAdsText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.5625, // 16:9 aspect ratio
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  skipButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timerBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  adTitle: {
    color: '#aaa',
    fontSize: 14,
  },
  distanceBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  distanceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  platformBadge: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 16,
  },
  platformText: {
    color: '#fff',
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detailButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adCounter: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
});
