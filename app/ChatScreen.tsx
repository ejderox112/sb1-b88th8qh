import { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase'; // Supabase client dosyan burada olmalı

export default function SocialConnectScreen() {
  const [searchNick, setSearchNick] = useState('');
  const [result, setResult] = useState(null);

  const searchUser = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('nickname', searchNick);

    if (error) console.log(error);
    setResult(data?.[0]);
  };

  const sendFriendRequest = async () => {
    const user = await supabase.auth.getUser();
    await supabase.from('friends').insert({
      from: user.data.user.id,
      to: result.id,
      status: 'pending',
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kullanıcı Ara</Text>
      <TextInput
        style={styles.input}
        placeholder="Nickname gir"
        onChangeText={setSearchNick}
        value={searchNick}
      />
      <Button title="Ara" onPress={searchUser} />
      {result && (
        <View style={styles.result}>
          <Text>{result.nickname} bulundu!</Text>
          <Button title="Ekle" onPress={sendFriendRequest} />
        </View>
      )}
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
  result: { marginTop: 20 },
});