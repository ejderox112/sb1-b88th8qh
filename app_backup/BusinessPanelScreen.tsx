import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function BusinessPanelScreen() {
  const [locations, setLocations] = useState([]);
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [budget, setBudget] = useState('');

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from('business_locations')
      .select('*')
      .eq('owner_id', user.data.user.id);
    setLocations(data);
  };

  const addLocation = async () => {
    const user = await supabase.auth.getUser();
    await supabase.from('business_locations').insert({
      owner_id: user.data.user.id,
      name,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      budget: parseFloat(budget),
    });
    setName('');
    setLat('');
    setLng('');
    setBudget('');
    fetchLocations();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>İşletme Paneli</Text>

      <TextInput placeholder="Konum Adı" value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder="Enlem" value={lat} onChangeText={setLat} style={styles.input} />
      <TextInput placeholder="Boylam" value={lng} onChangeText={setLng} style={styles.input} />
      <TextInput placeholder="Reklam Bütçesi (₺)" value={budget} onChangeText={setBudget} style={styles.input} />
      <Button title="Konum Ekle" onPress={addLocation} />

      <Text style={styles.section}>📍 Mevcut Konumlar</Text>
      <FlatList
        data={locations}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.name} — ₺{item.budget}</Text>
            <Text>Konum: ({item.lat}, {item.lng})</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  section: { marginTop: 20, fontSize: 18, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginVertical: 5,
    borderRadius: 5,
  },
  card: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
});