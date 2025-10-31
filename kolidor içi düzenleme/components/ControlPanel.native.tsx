
import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import type { CorridorSettings, Destination, Journey } from '../types';

// NOTE: This is a re-creation for React Native based on the props from App.tsx
// as the original ControlPanel.tsx was missing.

interface ControlPanelProps {
  settings: CorridorSettings;
  cameraZ: number;
  setCameraZ: (value: number) => void;
  destination: Destination | null;
  path: string[];
  history: Journey[];
  onNewDestination: () => void;
  mapApiLoaded: boolean; // Will be used for native maps
  userLocation: { lat: number; lng: number } | null; // Will be used for native maps
  onPlaceSelected: (destination: Destination) => void; // Will be used for native maps
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
      
      {/* Journey Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Journey</Text>
        <Text style={styles.text}>Current Location: <Text style={{color: settings.lineColor}}>{settings.id}</Text></Text>
        {destination ? (
            <>
                <Text style={styles.text}>Destination: {destination.name}</Text>
                <Text style={styles.text}>Path: {path.join(' -> ')}</Text>
            </>
        ) : (
            <Text style={styles.text}>No destination set.</Text>
        )}
        <Button title="Find New Destination" onPress={onNewDestination} color={settings.lineColor} />
      </View>

      {/* Camera Controls */}
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
      
       {/* Journey History */}
      {history.length > 0 && <View style={styles.section}>
        <Text style={styles.sectionTitle}>Journey History</Text>
        {history.map((journey, index) => (
            <Text key={index} style={styles.historyItem}>
                {index + 1}. {journey.destination.name}
            </Text>
        ))}
      </View>}

      {/* Placeholder for Map/Image Editor functionality */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More Tools</Text>
        <Text style={styles.placeholderText}>Map and Image Editor will be here.</Text>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderLeftWidth: 1,
    borderColor: '#444',
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
  placeholderText: {
      color: '#888',
      textAlign: 'center',
      fontStyle: 'italic',
  }
});

export default ControlPanel;
