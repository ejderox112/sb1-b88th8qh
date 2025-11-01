
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// This is a temporary, simple component for debugging the connection issue.
export default function DebugScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Bağlantı Testi</Text>
      <Text style={styles.subtext}>Eğer bu ekranı telefonunuzda görüyorsanız, bağlantı başarılıdır.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  text: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00ff7f', // Spring Green
  },
  subtext: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 10,
  }
});
