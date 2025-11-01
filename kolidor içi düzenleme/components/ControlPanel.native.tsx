
import React from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import type { CorridorSettings, Destination, Journey } from '../types';
import MiniMap from './MiniMap.native';
import ImageEditor from './ImageEditor.native'; // Import the new ImageEditor

interface ControlPanelProps {
  settings: CorridorSettings;
  cameraZ: number;
  setCameraZ: (value: number) => void;
  destination: Destination | null;
  path: string[];
  history: Journey[];
  onNewDestination: () => void;
  mapApiLoaded: boolean;
  userLocation: { lat: number; lng: number } | null;
  onPlaceSelected: (destination: Destination) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  settings,
  cameraZ,
  setCameraZ,
  destination,
  path,
  history,
  onNewDestination,
}) => {

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Control Panel</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Journey</Text>
        {destination && (
            <View style={styles.miniMapContainer}>
                <MiniMap path={path} currentId={settings.id} lineColor={settings.lineColor} />
            </View>
        )}
        <Text style={styles.text}>Location: <Text style={{color: settings.lineColor}}>{settings.id}</Text></Text>
        <Button title={destination ? "Complete & Find New" : "Find New Destination"} onPress={onNewDestination} color={settings.lineColor} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Camera Controls</Text>
        <Text style={styles.text}>Depth: {Math.round(cameraZ)} / {settings.numSegments}</Text>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={0}
          maximumValue={settings.numSegments - 2}
          value={cameraZ}
          onValueChange={setCameraZ}
          minimumTrackTintColor={settings.lineColor}
          maximumTrackTintColor="#555"
          thumbTintColor={settings.lineColor}
        />
      </View>

      <View style={styles.section}>
        <ImageEditor lineColor={settings.lineColor} />
      </View>
      
       {history.length > 0 && <View style={styles.section}>
        <Text style={styles.sectionTitle}>Journey History</Text>
        {history.map((journey, index) => (
            <Text key={index} style={styles.historyItem}>
                {index + 1}. {journey.destination.name}
            </Text>
        ))}
      </View>}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: '#1a1a1a',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#282828',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ddd',
    marginBottom: 12,
  },
  text: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  historyItem: {
      color: '#aaa',
      fontSize: 14,
  },
  miniMapContainer: {
      marginBottom: 15,
      alignItems: 'center',
  }
});

export default ControlPanel;
