import { View, Text, StyleSheet } from 'react-native';

export default function ErrorMessage({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    backgroundColor: '#ffe6e6',
    borderRadius: 8,
    padding: 8,
    marginVertical: 6,
  },
  errorText: {
    color: '#d32f2f',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
