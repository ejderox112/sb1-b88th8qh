import { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function PremiumPanelScreen() {
  const [myPlaces, setMyPlaces] = useState([]);

  useEffect(() => {
    fetchMyPlaces();
  }, []);

  const fetchMyPlaces = async () => {
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from('places')
      .select('*')
      .eq('owner_id', user.data.user.id);
    setMyPlaces(data);
  };

  const upgradeToPremium = async (id) => {
    await supabase.from('places').update({ premium: true }).eq('id', id);
    fetchMyPlaces();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>İşletme Paneli</Text>
      <FlatList
        data={myPlaces}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.name}</Text>
            {item.premium ? (
              <Text style={styles.premium}>⭐ Premium</Text>
            ) : (
              <Button title="Premium'a Geç" onPress={() => upgradeToPremium(item.id)} />
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
  card: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  premium: { color: 'gold', fontWeight: 'bold' },
});