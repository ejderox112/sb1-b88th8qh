
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions, Alert, Platform, Text } from 'react-native';
import * as Location from 'expo-location';
import type { CorridorSettings, Door, Destination, Journey } from '../../corridor-editor/types';
import { stringToSeed, mulberry32 } from '../../corridor-editor/utils/random';
import ControlPanel from '../../corridor-editor/components/ControlPanel.native';
import ChatBot from '../../corridor-editor/components/ChatBot.native';
import Corridor3D from '../../corridor-editor/components/Corridor3D';
import MiniMap from '../../corridor-editor/components/MiniMap'; // Import the new MiniMap

// --- Start of Navigation Logic ---
const TARGET_LOCATION = { name: "Izmir Şehir Hastanesi Girişi", latitude: 38.4613, longitude: 27.2069 };
const ARRIVAL_THRESHOLD_METERS = 20;

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; const φ1 = lat1 * Math.PI/180; const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180; const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateBearing(startLat: number, startLng: number, destLat: number, destLng: number) {
  const startLatRad = startLat * Math.PI/180; const destLatRad = destLat * Math.PI/180;
  const dLng = (destLng - startLng) * Math.PI/180;
  const y = Math.sin(dLng) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) - Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(dLng);
  let brng = Math.atan2(y, x);
  brng = brng * 180/Math.PI;
  return (brng + 360) % 360;
}

function getNavigationInstruction(heading: number, bearing: number): string {
    const diff = bearing - heading;
    const angle = (diff + 180) % 360 - 180;
    if (angle > -22.5 && angle <= 22.5) return "Düz Git";
    if (angle > 22.5 && angle <= 157.5) return "Sağa Dön";
    if (angle < -22.5 && angle >= -157.5) return "Sola Dön";
    return "Arkana Dön";
}
// --- End of Navigation Logic ---


const generateThematicId = (random: () => number, part: number): string => { /* ... */ return ''; };
const generatePathForDestination = (destinationName: string): string[] => { /* ... */ return []; };
const generateCorridorSettings = (id: string, destination: Destination | null, path: string[]): CorridorSettings => { /* ... */ return {} as any; };


export default function MapTabScreen() {
  const [corridorId, setCorridorId] = useState<string>('START-0');
  const [destination, setDestination] = useState<Destination | null>(null);
  const [path, setPath] = useState<string[]>(['START-0']);
  const [history, setHistory] = useState<Journey[]>([]);

  // States for real-world navigation
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [instruction, setInstruction] = useState<string>("Konum bilgisi bekleniyor...");
  const [bearing, setBearing] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { width } = useWindowDimensions();
  const isMobileLayout = width < 768;
  const corridorSettings = useMemo(() => generateCorridorSettings(corridorId, destination, path), [corridorId, destination, path]);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | undefined;
    let headingSubscription: Location.LocationSubscription | undefined;
    const startWatching = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      locationSubscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 }, (newLocation) => { setLocation(newLocation); });
      headingSubscription = await Location.watchHeadingAsync((newHeading) => { setHeading(newHeading.trueHeading); });
    };
    startWatching();
    return () => { locationSubscription?.remove(); headingSubscription?.remove(); };
  }, []);

  useEffect(() => {
    if (location && heading !== null) {
      const dist = getDistanceInMeters(location.coords.latitude, location.coords.longitude, TARGET_LOCATION.latitude, TARGET_LOCATION.longitude);
      setDistance(dist);
      const calculatedBearing = calculateBearing(location.coords.latitude, location.coords.longitude, TARGET_LOCATION.latitude, TARGET_LOCATION.longitude);
      setBearing(calculatedBearing);

      if (dist < ARRIVAL_THRESHOLD_METERS) {
        setInstruction(`Hedefe Ulaştınız: ${TARGET_LOCATION.name}`);
      } else {
        setInstruction(getNavigationInstruction(heading, calculatedBearing));
      }
    }
  }, [location, heading]);

  const handleNavigate = useCallback((newId: string) => { setCorridorId(newId); }, []);
  const handlePlaceSelected = useCallback((newDestination: Destination | null) => { /* ... */ }, []);
  const handleNewDestination = useCallback(() => { /* ... */ }, [destination, path, handlePlaceSelected]);

  return (
    <View style={styles.container}>
      <View style={[styles.mainContent, { flexDirection: isMobileLayout ? 'column-reverse' : 'row' }]}>
        <View style={isMobileLayout ? styles.panelContainerMobile : styles.panelContainerDesktop}>
            <ControlPanel 
               settings={corridorSettings} cameraZ={0} setCameraZ={() => {}} destination={destination} path={path}
               history={history} onNewDestination={handleNewDestination} onPlaceSelected={handlePlaceSelected}
               mapApiLoaded={false} userLocation={{ lat: location?.coords.latitude || 0, lng: location?.coords.longitude || 0 }}
            />
            <View style={styles.locationContainer}>
              <Text style={styles.navigationHeader}>Navigasyon</Text>
              {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
              <Text style={styles.instructionText}>{instruction}</Text>
              {distance !== null && (
                 <Text style={styles.locationText}>
                   Hedefe olan mesafe: {distance.toFixed(0)} metre
                 </Text>
              )}
            </View>
        </View>
        <View style={styles.canvasContainer}>
          <Corridor3D 
            key={heading} // Force re-render on heading change to update camera
            cameraRotationY={heading ? (-heading * Math.PI / 180) : 0} // Pass heading as rotation
            settings={corridorSettings} 
            onNavigate={handleNavigate} 
          />
        </View>
      </View>
      <View style={styles.miniMapOverlay}>
        <MiniMap heading={heading} bearing={bearing} />
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
  panelContainerMobile: { height: '40%', width: '100%' },
  locationContainer: { padding: 10, backgroundColor: '#1c1c1c', margin: 10, borderRadius: 8 },
  locationText: { color: '#aaa', fontSize: 14, textAlign: 'center' },
  errorText: { color: 'red', fontSize: 16, textAlign: 'center' },
  navigationHeader: { fontSize: 18, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  instructionText: { color: '#33FF99', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  miniMapOverlay: { position: 'absolute', top: 50, left: 10, zIndex: 10 },
});
