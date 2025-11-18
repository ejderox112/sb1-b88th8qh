import { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { calculateGroupLevel, checkForChestUnlock } from '../lib/groupProgress';

export default function GroupTaskScreen({ groupId }) {
  const [group, setGroup] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    fetchGroupData();
  }, []);

  const fetchGroupData = async () => {
    const { data: groupData } = await supabase
      .from('user_groups')
      .select('id, name, total_xp')
      .eq('id', groupId)
      .single();

    const newLevel = calculateGroupLevel(groupData.total_xp);
    setGroup(groupData);
    setLevel(newLevel);

    const { data: groupTasks } = await supabase
      .from('group_tasks')
      .select('*')
      .eq('group_id', groupId);

    setTasks(groupTasks);
  };

  const claimChest = async () => {
    await supabase.from('group_chests').insert({
      group_id: groupId,
      unlocked_at: new Date().toISOString(),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👥 Grup Görevleri</Text>
      <Text>Grup Seviyesi: {level}</Text>
      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.title}</Text>
            <Text>{item.description}</Text>
            <Text>XP: {item.xp}</Text>
          </View>
        )}
      />
      <Button title="🎁 Sandığı Aç" onPress={claimChest} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  card: { backgroundColor: '#eee', padding: 10, marginVertical: 5, borderRadius: 8 },
});