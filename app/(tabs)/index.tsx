
import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions, Alert, Platform } from 'react-native'; // Import Platform
import type { CorridorSettings, Door, Destination, Journey } from '../../corridor-editor/types';
import { stringToSeed, mulberry32 } from '../../corridor-editor/utils/random';
import ControlPanel from '../../corridor-editor/components/ControlPanel.native';
import ChatBot from '../../corridor-editor/components/ChatBot.native';
import Corridor3D from '../../corridor-editor/components/Corridor3D';

// Helper functions remain the same...
const generateThematicId = (random: () => number, part: number): string => {
    const prefixes = ['Wing', 'Block', 'Sector', 'Hall', 'Section', 'Area'];
    const letters = 'ABCDEFG';
    if (part === 0) return `Main Lobby`;
    if (part < 4) return `${prefixes[Math.floor(random() * prefixes.length)]} ${letters.charAt(Math.floor(random() * letters.length))}`;
    return `Room ${Math.floor(random() * 900) + 100}`;
};

const generatePathForDestination = (destinationName: string): string[] => {
    const seed = stringToSeed(destinationName);
    const random = mulberry32(seed);
    const pathLength = Math.floor(random() * 3) + 3;
    const path = ['START-0'];
    for (let i = 0; i < pathLength; i++) {
        path.push(generateThematicId(random, i + 1));
    }
    path.push(destinationName);
    return path;
};

const generateCorridorSettings = (id: string, destination: Destination | null, path: string[]): CorridorSettings => {
  const seed = stringToSeed(id + (destination?.name || ''));
  const random = mulberry32(seed);
  const lineColor = `hsl(${Math.floor(random() * 360)}, 90%, 70%)`;
  const numDoors = Math.floor(random() * 4) + 2;
  const doors: Door[] = [];
  const currentPathIndex = path.indexOf(id);
  const nextPathId = (currentPathIndex !== -1 && currentPathIndex < path.length - 1) ? path[currentPathIndex + 1] : null;

  if (nextPathId) {
    doors.push({ id: nextPathId, position: Math.floor(random() * 30) + 5, side: random() > 0.5 ? 'left' : 'right', isPath: true });
  }
  const remainingDoors = numDoors - doors.length;
  for (let i = 0; i < remainingDoors; i++) {
    const doorId = generateThematicId(random, Math.floor(random() * 5));
    doors.push({ id: doorId, position: Math.floor(random() * 30) + 5, side: random() > 0.5 ? 'left' : 'right', isPath: false });
  }
  
  return { id, doors, lineColor, numSegments: 40, vanishingPointX: 0.5, vanishingPointY: 0.5, corridorWidth: 0.8, corridorHeight: 0.9, perspectiveStrength: 1.5 };
};

export default function MapTabScreen() {
  const [corridorId, setCorridorId] = useState<string>('START-0');
  const [destination, setDestination] = useState<Destination | null>(null);
  const [path, setPath] = useState<string[]>(['START-0']);
  const [history, setHistory] = useState<Journey[]>([]);
  
  const { width } = useWindowDimensions();
  const isMobileLayout = width < 768;

  const corridorSettings = useMemo(() => generateCorridorSettings(corridorId, destination, path), [corridorId, destination, path]);

  const handleNavigate = useCallback((newId: string) => {
    setCorridorId(newId);
  }, []);

  const handlePlaceSelected = useCallback((newDestination: Destination | null) => {
      if (!newDestination) return;
      const newPath = generatePathForDestination(newDestination.name);
      setDestination(newDestination);
      setPath(newPath);
      setCorridorId('START-0');
  }, []);
  
  const handleNewDestination = useCallback(() => {
    if (destination && path.length > 1) {
      const completedJourney: Journey = { destination, path };
      setHistory(prev => [completedJourney, ...prev.slice(0, 4)]);
    }

    // NOTE: Alert.prompt is iOS-only. 
    // For Android, a custom modal or a third-party library would be needed.
    // As a temporary fix, we'll use a simple alert.
    if (Platform.OS === 'web') {
        const text = window.prompt('Enter the name of the place you want to go:');
        if (text) {
            handlePlaceSelected({ name: text, address: '' });
        }
    } else {
        Alert.alert(
            'Feature Not Available on Android',
            'Entering a destination via a prompt is not supported on Android in this version.',
            [{ text: 'OK' }]
        );
    }
  }, [destination, path, handlePlaceSelected]);

  return (
    <View style={styles.container}>
      <View style={[styles.mainContent, { flexDirection: isMobileLayout ? 'column-reverse' : 'row' }]}>
        <View style={isMobileLayout ? styles.panelContainerMobile : styles.panelContainerDesktop}>
            <ControlPanel 
               settings={corridorSettings}
               cameraZ={0}
               setCameraZ={() => {}} 
               destination={destination}
               path={path}
               history={history}
               onNewDestination={handleNewDestination}
               onPlaceSelected={handlePlaceSelected}
               mapApiLoaded={false}
               userLocation={null}
            />
        </View>
        <View style={styles.canvasContainer}>
          <Corridor3D 
            settings={corridorSettings} 
            onNavigate={handleNavigate} 
          />
        </View>
      </View>
      <ChatBot lineColor={corridorSettings.lineColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  mainContent: { flex: 1 },
  canvasContainer: { flex: 3 },
  panelContainerDesktop: { flex: 1, maxWidth: 350 },
  panelContainerMobile: { height: '40%', width: '100%' }
});
