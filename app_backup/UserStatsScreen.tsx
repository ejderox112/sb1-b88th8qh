import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function UserStatsScreen() {
  const [completedTasks, setCompletedTasks] = useState([]);

  useEffect(() => {
    fetchCompletedTasks();
  }, []);

  const fetchCompletedTasks = async () => {
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from('user_tasks')
      .select('*, tasks(title, description)')
      .eq('user_id', user.data.user.id)
      .eq('completed', true);
    setCompletedTasks(data);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>İstatistikler</Text>
      <FlatList
        data={completedTasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.taskItem}>
            <Text style={styles.taskTitle}>{item.tasks.title}</Text>
            <Text style={styles.taskDescription}>{item.tasks.description}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  taskItem: { marginBottom: 10, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5 },
  taskTitle: { fontSize: 16, fontWeight: 'bold' },
  taskDescription: { fontSize: 14, color: '#666' },
});
