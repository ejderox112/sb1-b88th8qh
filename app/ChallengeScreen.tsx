import { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function ChallengeScreen() {
  const [opponents, setOpponents] = useState([]);
  const [challengeId, setChallengeId] = useState(null);
  const [results, setResults] = useState([]);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    getUser();
  }, []);

  useEffect(() => {
    if (challengeId) subscribeResults();
  }, [challengeId]);

  const getUser = async () => {
    const user = await supabase.auth.getUser();
    setUserId(user.data.user.id);
  };

  const startChallenge = async (opponentId) => {
    const { data } = await supabase
      .from('challenges')
      .insert({
        challenger_id: userId,
        opponent_id: opponentId,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    setChallengeId(data.id);
  };

  const submitScore = async () => {
    const score = Math.floor(Math.random() * 100); // örnek skor
    await supabase.from('challenge_results').insert({
      challenge_id: challengeId,
      user_id: userId,
      score,
      submitted_at: new Date().toISOString(),
    });
  };

  const subscribeResults = () => {
    const channel = supabase
      .channel('challenge_results')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'challenge_results' }, payload => {
        fetchResults();
      })
      .subscribe();

    fetchResults();
    return () => supabase.removeChannel(channel);
  };

  const fetchResults = async () => {
    const { data } = await supabase
      .from('challenge_results')
      .select('user_id, score')
      .eq('challenge_id', challengeId);
    setResults(data);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚔️ Meydan Okuma</Text>
      <FlatList
        data={opponents}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Button title={`Meydan Oku: ${item.nickname}`} onPress={() => startChallenge(item.id)} />
        )}
      />
      {challengeId && (
        <>
          <Button title="Skor Gönder" onPress={submitScore} />
          <Text style={styles.section}>Sonuçlar</Text>
          <FlatList
            data={results}
            keyExtractor={item => item.user_id}
            renderItem={({ item }) => (
              <Text>🧍 {item.user_id === userId ? 'Ben' : 'Rakip'}: {item.score} puan</Text>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  section: { marginTop: 20, fontSize: 18, font