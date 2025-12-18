// 3D Haritada Arkadaşları Gösterme Bileşeni
// Avatar + Profil Fotoğrafı + "Git" Butonu

import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { getNearbyFriendsFor3D, subscribeToFriendLocations, navigateToFriend } from '@/lib/chatLocationService';
import type { NearbyFriend } from '@/lib/chatLocationService';

interface Map3DFriendsLayerProps {
  currentUserLat: number;
  currentUserLng: number;
  onNavigateToFriend?: (friend: NearbyFriend) => void;
}

export default function Map3DFriendsLayer({
  currentUserLat,
  currentUserLng,
  onNavigateToFriend,
}: Map3DFriendsLayerProps) {
  const [nearbyFriends, setNearbyFriends] = useState<NearbyFriend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<NearbyFriend | null>(null);

  useEffect(() => {
    // İlk yükleme
    fetchNearbyFriends();

    // Realtime güncellemeler
    const unsubscribe = subscribeToFriendLocations((friend) => {
      setNearbyFriends((prev) => {
        const index = prev.findIndex((f) => f.user_id === friend.user_id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = friend;
          return updated;
        }
        return [...prev, friend];
      });
    });

    // Her 30 saniyede bir yenile
    const interval = setInterval(fetchNearbyFriends, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const fetchNearbyFriends = async () => {
    try {
      const friends = await getNearbyFriendsFor3D();
      setNearbyFriends(friends);
    } catch (error) {
      console.error('Arkadaş konumları alınamadı:', error);
    }
  };

  const handleNavigate = async (friend: NearbyFriend) => {
    try {
      await navigateToFriend(friend.user_id);
      onNavigateToFriend?.(friend);
    } catch (error) {
      alert('Navigasyon başlatılamadı');
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <View style={styles.container}>
      {/* Arkadaş Konumları (3D Harita Overlay) */}
      {nearbyFriends.map((friend) => (
        <TouchableOpacity
          key={friend.user_id}
          style={[
            styles.friendMarker,
            {
              // 3D haritada gerçek koordinatlara göre pozisyon hesapla
              // Bu örnek - gerçekte Three.js koordinat sistemine dönüştürülecek
              left: calculateScreenX(friend.lng, currentUserLng),
              top: calculateScreenY(friend.lat, currentUserLat),
            },
          ]}
          onPress={() => setSelectedFriend(friend)}
        >
          {/* Avatar Çemberi */}
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: friend.avatar_url || 'https://via.placeholder.com/50' }}
              style={styles.avatar}
            />
            {/* Level Badge */}
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{friend.level}</Text>
            </View>
          </View>

          {/* İsim ve Mesafe */}
          <View style={styles.infoBox}>
            <Text style={styles.nickname}>{friend.nickname}</Text>
            <Text style={styles.distance}>{formatDistance(friend.distance_meters)}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Seçili Arkadaş Detay Paneli */}
      {selectedFriend && (
        <View style={styles.detailPanel}>
          <View style={styles.detailHeader}>
            <Image
              source={{ uri: selectedFriend.avatar_url || 'https://via.placeholder.com/80' }}
              style={styles.detailAvatar}
            />
            <View style={styles.detailInfo}>
              <Text style={styles.detailName}>{selectedFriend.nickname}</Text>
              <Text style={styles.detailLevel}>Level {selectedFriend.level}</Text>
              <Text style={styles.detailDistance}>
                {formatDistance(selectedFriend.distance_meters)} uzaklıkta
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedFriend(null)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Git Butonu */}
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() => handleNavigate(selectedFriend)}
          >
            <Text style={styles.navigateButtonText}>🧭 Git</Text>
          </TouchableOpacity>

          {/* Konum Süresi */}
          <Text style={styles.expiryText}>
            Paylaşım bitiş: {new Date(selectedFriend.expires_at).toLocaleTimeString('tr-TR')}
          </Text>
        </View>
      )}

      {/* Arkadaş Sayısı */}
      <View style={styles.counterBadge}>
        <Text style={styles.counterText}>👥 {nearbyFriends.length}</Text>
      </View>
    </View>
  );
}

// Koordinat → Ekran pozisyonu dönüşümü (basitleştirilmiş)
function calculateScreenX(lng: number, userLng: number): number {
  // Gerçekte Three.js kamera ve world koordinatlarına göre hesaplanacak
  const deltaLng = lng - userLng;
  return 200 + deltaLng * 10000; // Örnek
}

function calculateScreenY(lat: number, userLat: number): number {
  const deltaLat = lat - userLat;
  return 200 - deltaLat * 10000; // Örnek
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  friendMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#FF9800',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoBox: {
    marginTop: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  nickname: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  distance: {
    color: '#aaa',
    fontSize: 10,
  },
  detailPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#4CAF50',
  },
  detailInfo: {
    flex: 1,
    marginLeft: 12,
  },
  detailName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  detailLevel: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  detailDistance: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#999',
  },
  navigateButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  expiryText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  counterBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
