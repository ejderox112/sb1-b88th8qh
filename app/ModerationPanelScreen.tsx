import { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function ModerationPanelScreen() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const { data } = await supabase
      .from('content_reports')
      .select('id, content_id, reason, created_at');
    setReports(data);
  };

  const deleteContent = async (contentId) => {
    await supabase.from('user_content').delete().eq('id', contentId);
    await supabase.from('content_reports').delete().eq('content_id', contentId);
    fetchReports();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>İçerik Moderasyonu</Text>
      <FlatList
        data={reports}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>📸 İçerik ID: {item.content_id}</Text>
            <Text>🚨 Sebep: {item.reason}</Text>
            <Text>🕒 Tarih: {new Date(item.created_at).toLocaleString()}</Text>
            <Button title="İçeriği Sil" onPress={() => deleteContent(item.content_id)} />
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