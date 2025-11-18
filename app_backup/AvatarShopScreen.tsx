import { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, Image, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function AvatarShopScreen() {
  const [items, setItems] = useState([]);
  const [userLevel, setUserLevel] = useState(1);
  const [ownedItems, setOwnedItems] = useState([]);

  useEffect(() => {
    fetchUserLevel();
    fetchShopItems();
    fetchOwnedItems();
  }, []);

  const fetchUserLevel = async () => {
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from('profiles')
      .select('level')
      .eq('id', user.data.user.id)
      .single();
    setUserLevel(data.level);
  };

  const fetchShopItems = async () => {
    const { data } = await supabase
      .from('avatar_items')
      .select('*')
      .lte('required_level', userLevel);
    setItems(data);
  };

  const fetchOwnedItems = async () => {
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from('user_avatar_items')
      .select('item_id')
      .eq('user_id', user.data.user.id);
    setOwnedItems(data.map(d => d.item_id));
  };

  const unlockItem = async (itemId) => {
    const user = await supabase.auth.getUser();
    await supabase.from('user_avatar_items').insert({
      user_id: user.data.user.id,
      item_id: itemId,
      unlocked_at: new Date().toISOString(),
    });
    fetchOwnedItems();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧍 Avatar Mağazası</Text>
      <Text>Seviyen: {userLevel}</Text>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.image_url }} style={styles.image} />
            <Text>{item.name}</Text>
            {ownedItems.includes(item.id) ? (
              <Text>✅ Sahip</Text>
            ) : (
              <Button title="Aç" onPress={() => unlockItem(item.id)} />
            )}
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
    alignItems: 'center',
  },
  image: { width: 80, height: 80, marginBottom: 5 },
});