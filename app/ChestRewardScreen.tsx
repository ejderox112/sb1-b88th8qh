import { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { openChest } from '../lib/chestUtils';
import { supabase } from '../lib/supabase';

export default function ChestRewardScreen() {
  const [result, setResult] = useState(null);

  const handleOpen = async () => {
    const chest = openChest();
    setResult(chest);

    const user = await supabase.auth.getUser();
    const userId = user.data.user.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('total_xp')
      .eq('id', userId)
      .single();

    const newXp = profile.total_xp + chest.xp;

    await supabase.from('profiles').update({ total_xp: newXp }).eq('id', userId);

    await supabase.from('chest_logs').insert({
      user_id: userId,
      chest_type: chest.type,
      xp_earned: chest.xp,
      opened_at: new Date().toISOString(),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎁 Sandık Aç</Text>
      <Button title="Sandığı Aç" onPress={handleOpen} />
      {result && (
        <View style={styles.card}>
          <Text style={styles.emoji}>{result.emoji}</Text>
          <Text>{result.type.toUpperCase()} sandık çıktı!</Text>
          <Text>+{result.xp} XP kazandın</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  card: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#eee',
    borderRadius: 10,
    alignItems: 'center',
  },
  emoji: { fontSize: 48 },
});