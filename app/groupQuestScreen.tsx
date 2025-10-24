import { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function GroupQuestScreen() {
  const [groupMembers, setGroupMembers] = useState([]);
  const [quest, setQuest] = useState(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetchGroup();
    fetchQuest();
  }, []);

  const fetchGroup = async () => {
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from('groups')
      .select('members')
      .eq('leader_id', user.data.user.id)
      .single();
    setGroupMembers(data?.members || []);
  };

  const fetchQuest = async () => {
    const { data } = await supabase
      .from('group_quests')
      .select('*')
      .eq('active', true)
      .single();
    setQuest(data);
  };

  const completeQuest = async () => {
    const now = new Date().toISOString();
    await supabase.from('group_quests').update({ active: false, completed_at: now }).eq('id', quest.id);

    for (const member of groupMembers) {
      await supabase.from('profiles').update({
        level: supabase.rpc('increment_level', { user_id_input: member, points_input: quest.reward_points }),
      }).eq('id', member);
    }

    setCompleted(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grup Görevi</Text>
      {quest && (
        <>
          <Text>{quest.title}</Text>
          <Text>Ödül: {quest.reward_points} puan</Text>
          <FlatList
            data={groupMembers}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <Text>🧍 Üye: {item}</Text>
            )}
          />
          {!completed && (
            <Button title="Görevi Tamamla" onPress={completeQuest} />
          )}
          {completed && <Text style={styles.success}>🎉 Görev tamamlandı, ödüller dağıtıldı!</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, marginBottom: 10 },
  success: { marginTop: 10, fontSize: 16, color: 'green' },
});