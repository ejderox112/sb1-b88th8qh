import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function BusinessAnalyticsScreen() {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from('business_task_stats')
      .select('*')
      .eq('owner_id', user.data.user.id);
    setStats(data);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Görev Performans Raporu</Text>
      <FlatList
        data={stats}
        keyExtractor={item => item.task_id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>Görev: {item.task_title}</Text>
            <Text>Gösterim: {item.views}</Text>
            <Text>Tıklama: {item.clicks}</Text>
            <Text>Tamamlama: {item.completions}</Text>
            <Text>Bütçe Harcaması: ₺{item.spent}</Text>
            <Text>ROI: %{item.roi}</Text>
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