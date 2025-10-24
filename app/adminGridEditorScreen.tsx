import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { supabase } from '../lib/supabase';

const GRID_SIZE = 10;

export default function AdminGridEditorScreen() {
  const [grid, setGrid] = useState(
    Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false))
  );

  const toggleCell = (row, col) => {
    const newGrid = [...grid];
    newGrid[row][col] = !newGrid[row][col];
    setGrid(newGrid);
  };

  const saveGrid = async () => {
    const user = await supabase.auth.getUser();
    await supabase.from('grid_maps').insert({
      admin_id: user.data.user.id,
      grid_data: grid,
    });
  };

  return (
    <View style={styles.container}>
      {grid.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((cell, colIndex) => (
            <TouchableOpacity
              key={colIndex}
              style={[styles.cell, cell && styles.active]}
              onPress={() => toggleCell(rowIndex, colIndex)}
            />
          ))}
        </View>
      ))}
      <TouchableOpacity style={styles.saveButton} onPress={saveGrid}>
        <Text style={styles.saveText}>Kaydet</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  row: { flexDirection: 'row' },
  cell: {
    width: 30,
    height: 30,
    margin: 2,
    backgroundColor: '#ccc',
  },
  active: { backgroundColor: '#4caf50' },
  saveButton: {
    marginTop: 20,
    backgroundColor: '#2196f3',
    padding: 10,
    borderRadius: 5,
  },
  saveText: { color: '#fff', textAlign: 'center' },
});