import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { supabase } from '@/lib/supabase';

interface UserSearchResult {
  id: string;
  display_name: string;
  nickname: string;
}

export default function AddFriendScreen() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [info, setInfo] = useState('');

  const searchUsers = async () => {
    if (!search.trim()) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, nickname')
      .ilike('display_name', `%${search}%`);
    if (data) setResults(data);
    else setInfo('Kullanıcı bulunamadı');
  };

  const sendRequest = async (userId: string) => {
    const { data: me } = await supabase.auth.getUser();
    if (!me?.user?.id) return setInfo('Oturum yok');
    await supabase.from('friend_requests').insert({
      requester_id: me.user.id,
      receiver_id: userId,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
    setInfo('Arkadaşlık isteği gönderildi');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Arkadaş Ekle</Text>
      <TextInput
        style={styles.input}
        value={search}
        onChangeText={setSearch}
        placeholder="Kullanıcı adı veya isim"
      />
      <TouchableOpacity style={styles.searchBtn} onPress={searchUsers}>
        <Text style={styles.searchText}>Ara</Text>
      </TouchableOpacity>
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <Text style={styles.userName}>{item.display_name} ({item.nickname})</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => sendRequest(item.id)}>
              <Text style={styles.addText}>Arkadaş Ekle</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      {info ? <Text style={styles.info}>{info}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8 },
  searchBtn: { backgroundColor: '#007AFF', padding: 10, borderRadius: 8, marginBottom: 8 },
  searchText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  userCard: { padding: 8, borderRadius: 8, backgroundColor: '#f8f8f8', marginBottom: 8 },
  userName: { fontSize: 16, fontWeight: '600' },
  addBtn: { backgroundColor: '#28a745', padding: 8, borderRadius: 8, marginTop: 6 },
  addText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  info: { marginTop: 10, color: '#007AFF', fontWeight: '600' },
});
