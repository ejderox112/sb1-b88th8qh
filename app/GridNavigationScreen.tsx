import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function GridNavigationScreen() {
  const [grid, setGrid] = useState([]);
  const [position, setPosition] = useState({ row: 0, col: 0 });
  const [target, setTarget] = useState({ row: 4, col: 4 });

  useEffect(() => {
    fetchGrid();
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

  const move = (dir) => {
    const { row, col } = position;
    const moves = {
      up: { row: row - 1, col },
      down: { row: row + 1, col },
      left: { row, col: col - 1 },
      right: { row, col: col + 1 },
    };
    const next = moves[dir];
    if (
      next.row >= 0 &&
      next.col >= 0 &&
      next.row < grid.length &&
      next.col < grid[0].length &&
      grid[next.row][next.col]
    ) {
      setPosition(next);
    }
  };

  const reachedTarget = position.row === target.row && position.col === target.col;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Navigasyon</Text>
      <Text>Konum: ({position.row}, {position.col})</Text>
      <Text>Hedef: ({target.row}, {target.col})</Text>
      {reachedTarget && <Text style={styles.success}>🎉 Hedefe Ulaştın!</Text>}
      <View style={styles.controls}>
        <TouchableOpacity onPress={() => move('up')} style={styles.button}><Text>↑</Text></TouchableOpacity>
        <View style={styles.row}>
          <TouchableOpacity onPress={() => move('left')} style={styles.button}><Text>←</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => move('right')} style={styles.button}><Text>→</Text></TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => move('down')} style={styles.button}><Text>↓</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, marginBottom: 10 },
  controls: { marginTop: 20, alignItems: 'center' },
  row: { flexDirection: 'row' },
  button: {
    backgroundColor: '#ddd',
    padding: 10,
    margin: 5,
    borderRadius: 5,
  },
  success: { marginTop: 10, fontSize: 16, color: 'green' },
});