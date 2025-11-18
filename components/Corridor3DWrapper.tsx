import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Corridor3DWrapperProps {
  heading: number;
  currentNodeLabel: string;
}

// Web fallback - Three.js requires WebGL setup
export default function Corridor3DWrapper({ heading, currentNodeLabel }: Corridor3DWrapperProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🚶‍♂️ {currentNodeLabel}</Text>
      <Text style={styles.heading}>Yön: {Math.round(heading)}°</Text>
      <Text style={styles.note}>Web 3D render yakında...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    color: '#ecf0f1',
    fontWeight: '600',
  },
  heading: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 8,
  },
  note: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 12,
  },
});
