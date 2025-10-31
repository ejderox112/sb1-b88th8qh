import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function UserStatsScreen() {
  const [completedTasks, setCompletedTasks] = useState([]);
  const [badges, setBadges] = useState([]);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const user = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from('profiles')
      .select('level')
      .eq('id', user.data.user.id)
      .single();
    setLevel(profile.level);

    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, completed_at')
      .eq('user_id', user.data.user.id)
      .eq('completed', true)
      .order('completed_at', { ascending: false });
    setCompletedTasks(tasks);

    const { data: badgeList } = await supabase
      .from('badges')
      .select('name, earned_at')
      .eq('user_id', user.data.user.id)
      .order('earned_at', { ascending: false });
    setBadges(badgeList);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>İstatistikler</Text>
      <Text>Seviye: {level}</Text>

      <Text style={styles.section}>✅ Tamamlanan Görevler</Text>
      <FlatList
        data={completedTasks}
        keyExtractor={item => item.title + item.completed_at}
        renderItem={({ item }) => (
          <Text>• {item.title} ({new Date(item.completed_at).toLocaleDateString()})</Text>
        )}
      />

      <Text style={styles.section}>🏅 Rozetler</Text>
      <FlatList
        data={badges}
        keyExtractor={item => item.name + item.earned_at}
        renderItem={({ item }) => (
          <Text>• {item.name} ({new Date(item.earned_at).toLocaleDateString()})</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  section: { marginTop: 20, fontSize: 18, fontWeight: '600' },
});