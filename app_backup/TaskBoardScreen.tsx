import { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function TaskBoardScreen() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.data.user.id);
    setTasks(data);
  };

  const completeTask = async (taskId, points) => {
    const user = await supabase.auth.getUser();

    await supabase.from('tasks').update({ completed: true }).eq('id', taskId);

    await supabase.rpc('increment_user_level', {
      user_id_input: user.data.user.id,
      points_input: points,
    });

    fetchTasks();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Görevler</Text>
      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.task}>
            <Text>{item.title}</Text>
            {!item.completed && (
              <Button
                title="Tamamla"
                onPress={() => completeTask(item.id, item.points)}
              />
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, marginBottom: 10 },
  task: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
});