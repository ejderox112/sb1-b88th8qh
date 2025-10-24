import { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function RouteTimerScreen() {
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [duration, setDuration] = useState(null);
  const [routeId, setRouteId] = useState(null);

  const startRoute = async () => {
    const now = new Date();
    setStartTime(now);
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from('task_routes')
      .insert({
        user_id: user.data.user.id,
        task_ids: [],
        started_at: now.toISOString(),
      })
      .select('id')
      .single();
    setRouteId(data.id);
  };

  const endRoute = async () => {
    const now = new Date();
    setEndTime(now);
    const ms = now - startTime;
    const minutes = Math.floor(ms / 60000);
    setDuration(minutes);

    await supabase.from('task_routes').update({
      completed_at: now.toISOString(),
    }).eq('id', routeId);

    const reward = Math.max(10, 100 - minutes); // hızlı tamamlayan daha çok puan alır
    await supabase.from('profiles').update({
      level: supabase.rpc('increment_level', {
        user_id_input: (await supabase.auth.getUser()).data.user.id,
        points_input: reward,
      }),
    }).eq('id', (await supabase.auth.getUser()).data.user.id);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rota Zamanlayıcı</Text>
      {!startTime && <Button title="Rotayı Başlat" onPress={startRoute} />}
      {startTime && !endTime && <Button title="Rotayı Bitir" onPress={endRoute} />}
      {duration !== null && (
        <Text style={styles.result}>⏱️ Süre: {duration} dakika — Ödül: {Math.max(10, 100 - duration)} puan</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  result: { marginTop: 20, fontSize: 18, color: 'green' },
});