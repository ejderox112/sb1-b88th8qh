import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function LeaderboardScreen() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .rpc('weekly_leaderboard')
      .select('*');
    setLeaders(data);
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
});