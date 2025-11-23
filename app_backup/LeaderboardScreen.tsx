import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function LeaderboardScreen() {
  const [leaders, setLeaders] = useState([]);
  const [badgesMap, setBadgesMap] = useState({});

  useEffect(() => {
    fetchLeaderboard();
    fetchBadges();
  }, []);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .rpc('weekly_leaderboard')
      .select('*');
    setLeaders(data);
  };

  const fetchBadges = async () => {
    const { getSupporterBadges } = await import('@/lib/supporterBadgeLogic');
    // Tüm liderlerin rozetlerini çek
    const badgeResults = {};
    for (const leader of leaders) {
      const { data } = await getSupporterBadges(leader.user_id);
      badgeResults[leader.user_id] = data || [];
    }
    setBadgesMap(badgeResults);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏆 Haftalık Liderlik Tablosu</Text>
      <FlatList
        data={leaders}
        keyExtractor={item => item.user_id}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <Text>{index + 1}. {item.nickname} — {item.weekly_points} puan</Text>
            {/* Destekçi Rozetleri */}
            {badgesMap[item.user_id] && badgesMap[item.user_id].length > 0 && (
              <View style={styles.badgeRow}>
                {badgesMap[item.user_id].map((badge, idx) => (
                  <Text key={idx} style={styles.badgeItem}>{badge.badge}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  card: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  badgeItem: {
    backgroundColor: '#ffd700',
    color: '#333',
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 4,
    fontSize: 13,
  },
});