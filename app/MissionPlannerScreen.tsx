import { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function MissionPlannerScreen() {
  const [availableTasks, setAvailableTasks] = useState([]);
  const [route, setRoute] = useState([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks_catalog')
      .select('id, title, location_name');
    setAvailableTasks(data);
  };

  const addToRoute = (task) => {
    if (!route.find(t => t.id === task.id)) {
      setRoute([...route, task]);
    }
  };

  const removeFromRoute = (taskId) => {
    setRoute(route.filter(t => t.id !== taskId));
  };

  const startRoute = async () => {
    const user = await supabase.auth.getUser();
    await supabase.from('task_routes').insert({
      user_id: user.data.user.id,
      task_ids: route.map(t => t.id),
      started_at: new Date().toISOString(),
    });
    setRoute([]);
    alert('Rota başlatıldı!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Görev Planlayıcı</Text>

      <Text style={styles.section}>📌 Mevcut Görevler</Text>
      <FlatList
        data={availableTasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.title} ({item.location_name})</Text>
            <Button title="Ekle" onPress={() => addToRoute(item)} />
          </View>
        )}
      />

      <Text style={styles.section}>🧭 Seçilen Rota</Text>
      <FlatList
        data={route}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.title}</Text>
            <Button title="Kaldır" onPress={() => removeFromRoute(item.id)} />
          </View>
        )}
      />

      {route.length > 0 && (
        <Button title="Rotayı Başlat" onPress={startRoute} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  section: { marginTop: 20, fontSize: 18, fontWeight: '600' },
  card: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
});