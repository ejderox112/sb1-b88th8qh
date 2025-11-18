import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export default function OfflineTasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    loadTasks();

    return () => unsubscribe();
  }, [isConnected]);

  const loadTasks = async () => {
    if (isConnected) {
      const user = await supabase.auth.getUser();
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.data.user.id);

      setTasks(data);
      await AsyncStorage.setItem('cached_tasks', JSON.stringify(data));
    } else {
      const cached = await AsyncStorage.getItem('cached_tasks');
      if (cached) setTasks(JSON.parse(cached));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isConnected ? 'Çevrimiçi Görevler' : 'Çevrimdışı Görevler'}
      </Text>
      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.title}</Text>
            <Text>{item.completed ? 'Tamamlandı' : 'Bekliyor'}</Text>
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