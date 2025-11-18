
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SocialConnectScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Social Connect feature is temporarily disabled.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
    padding: 20,
  },
});
