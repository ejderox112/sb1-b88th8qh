import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LocationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Konumlar Sayfası</Text>
      <Text style={styles.subtitle}>Bu basitleştirilmiş bir test versiyonudur</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});