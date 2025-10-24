import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { recommendTasks } from '../lib/taskRecommender';

export default function RecommendedTasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [recommended, setRecommended] = useState([]);

  useEffect(() => {
    fetchTasksAndUser();
  }, []);

  const fetchTasksAndUser = async () => {
    const user = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('level, lat, lng, interest_tags')
      .eq('id', user.data.user.id)
      .single();

    const { data: allTasks } = await supabase
      .from('tasks')
      .select('*');

    const filtered = recommendTasks(profile, allTasks);
    setRecommended(filtered);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎯 Sana Özel Görevler</Text>
      <FlatList
        data={recommended}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.title}</Text>
            <Text>{item.description}</Text>
            <Text>Min Seviye: {item.min_level}</Text>
            <Text>Etiketler: {item.tags.join(', ')}</Text>
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