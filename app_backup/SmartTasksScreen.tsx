import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function SmartTasksScreen() {
  const [suggestedTasks, setSuggestedTasks] = useState([]);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    const user = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from('profiles')
      .select('level')
      .eq('id', user.data.user.id)
      .single();

    const { data: completed } = await supabase
      .from('tasks')
      .select('title')
      .eq('user_id', user.data.user.id)
      .eq('completed', true);

    const completedTitles = completed.map(t => t.title);

    const { data: allTasks } = await supabase
      .from('tasks_catalog')
      .select('*');

    const filtered = allTasks.filter(task =>
      task.level_required <= profile.level &&
      !completedTitles.includes(task.title)
    );

    setSuggestedTasks(filtered);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Senin İçin Görevler</Text>
      <FlatList
        data={suggestedTasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.title}</Text>
            <Text>Seviye Gereksinimi: {item.level_required}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, marginBottom: 10 },
  card: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
});