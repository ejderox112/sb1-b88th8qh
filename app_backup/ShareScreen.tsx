import { useEffect, useState } from 'react';
import { View, Text, Button, Share, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function ShareScreen() {
  const [nickname, setNickname] = useState('');
  const [level, setLevel] = useState(0);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from('profiles')
      .select('nickname, level')
      .eq('id', user.data.user.id)
      .single();

    setNickname(data.nickname);
    setLevel(data.level);
  };

  const handleShare = async () => {
    const message = `🔥 ${nickname} şu anda seviye ${level}! Sen de katıl: https://myapp.com/invite`;
    await Share.share({ message });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Başarını Paylaş</Text>
      <Text>{nickname} - Seviye {level}</Text>
      <Button title="Paylaş" onPress={handleShare} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, marginBottom: 10 },
});