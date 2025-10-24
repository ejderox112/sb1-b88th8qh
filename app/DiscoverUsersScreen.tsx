import { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';

export default function DiscoverUsersScreen() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers('');
  }, []);

  const fetchUsers = async (query) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url, level')
      .ilike('nickname', `%${query}%`)
      .limit(20);

    setUsers(data);
  };

  const handleSearch = (text) => {
    setSearch(text);
    fetchUsers(text);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kullanıcıları Keşfet</Text>
      <TextInput
        style={styles.input}
        placeholder="Kullanıcı ara..."
        value={search}
        onChangeText={handleSearch}
      />
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <Text style={styles.name}>{item.nickname}</Text>
            <Text>Seviye: {item.level}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 10,
    borderRadius: 5,
  },
  card: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  name: { fontWeight: 'bold' },
});