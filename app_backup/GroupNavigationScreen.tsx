import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

const GRID_SIZE = 10;

export default function GroupNavigationScreen() {
  const [grid, setGrid] = useState([]);
  const [myPos, setMyPos] = useState({ row: 0, col: 0 });
  const [others, setOthers] = useState([]);

  useEffect(() => {
    fetchGrid();
    updateMyPosition();
    subscribeOthers();
  }, []);

  const fetchGrid = async () => {
    const { data } = await supabase
      .from('grid_maps')
      .select('grid_data')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    setGrid(data.grid_data);
  };

  const updateMyPosition = async () => {
    const user = await supabase.auth.getUser();
    await supabase.from('grid_positions').upsert({
      user_id: user.data.user.id,
      row: myPos.row,
      col: myPos.col,
      updated_at: new Date().toISOString(),
    });
  };

  const subscribeOthers = () => {
    const channel = supabase
      .channel('grid_positions')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'grid_positions' }, payload => {
        fetchOthers();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const fetchOthers = async () => {
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from('grid_positions')
      .select('*')
      .neq('user_id', user.data.user.id);
    setOthers(data);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grup Navigasyonu</Text>
      <Text>Sen: ({myPos.row}, {myPos.col})</Text>
      {others.map(user => (
        <Text key={user.id}>🧍 {user.nickname || 'Kullanıcı'}: ({user.row}, {user.col})</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, marginBottom: 10 },
});