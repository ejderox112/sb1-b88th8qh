import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { submitSuggestion } from '@/lib/indoor/store';

export default function IndoorContributeScreen() {
  const [type, setType] = useState<'room'|'corridor'|'brand'|'signage'>('room');
  const [label, setLabel] = useState('Oda 210');
  const [floorId, setFloorId] = useState('F3');
  const [x, setX] = useState('105');
  const [y, setY] = useState('6');
  const [photoUrl, setPhotoUrl] = useState('');
  const [info, setInfo] = useState('');

  const submit = () => {
    const pos = { x: Number(x) || 0, y: Number(y) || 0 };
    const s = submitSuggestion({
      venueId: 'izmir-sehir-hastanesi',
      floorId,
      type,
      label,
      pos,
      photoUrl: photoUrl || undefined,
      submittedBy: 'demo-123',
    });
    setInfo(`Gönderildi: ${s.label} (${s.type})`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>İç Mekan Öneri</Text>

      <Text style={styles.label}>Tür</Text>
      <View style={styles.row}>
        {(['room','corridor','brand','signage'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.choice, type===t && styles.choiceActive]} onPress={() => setType(t)}>
            <Text>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Kat</Text>
      <View style={styles.row}>
        {['F0','F3'].map(fid => (
          <TouchableOpacity key={fid} style={[styles.choice, floorId===fid && styles.choiceActive]} onPress={() => setFloorId(fid)}>
            <Text>{fid}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>İsim/Etiket</Text>
      <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="Örn: Kardiyoloji 112" />

      <Text style={styles.label}>Koordinat (metre)</Text>
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.xy]} keyboardType="numeric" value={x} onChangeText={setX} placeholder="x" />
        <TextInput style={[styles.input, styles.xy]} keyboardType="numeric" value={y} onChangeText={setY} placeholder="y" />
      </View>

      <Text style={styles.label}>Fotoğraf URL (opsiyonel)</Text>
      <TextInput style={styles.input} value={photoUrl} onChangeText={setPhotoUrl} placeholder="https://..." />

      <TouchableOpacity style={styles.primary} onPress={submit}>
        <Text style={styles.primaryText}>Gönder</Text>
      </TouchableOpacity>

      {!!info && <Text style={styles.info}>{info}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  label: { marginTop: 10, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginTop: 6 },
  row: { flexDirection: 'row', gap: 8, marginTop: 6 },
  choice: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
  choiceActive: { backgroundColor: '#eef5ff', borderColor: '#007AFF' },
  xy: { flex: 1 },
  primary: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 14 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  info: { marginTop: 10, color: '#333' },
});
