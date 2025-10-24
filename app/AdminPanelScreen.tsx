import { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function AdminPanelScreen() {
  const [pendingPlaces, setPendingPlaces] = useState([]);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    const { data } = await supabase
      .from('places')
      .select('*')
      .eq('approved', false);
    setPendingPlaces(data);
  };

  const approvePlace = async (id) => {
    await supabase.from('places').update({ approved: true }).eq('id', id);
    fetchPending();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Onay Bekleyen İşletmeler</Text>
      <FlatList
        data={pendingPlaces}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.name}</Text>
            <Button title="Onayla" onPress={() => approvePlace(item.id)} />
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