


import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import CorridorCanvas from '@/corridor-editor/components/CorridorCanvas.native';
import type { CorridorSettings } from '@/corridor-editor/types';

interface Corridor3DWrapperProps {
  heading: number;
  currentNodeLabel: string;
}

interface DoorInfo {
  id: string;
  position: number;
  side: 'left' | 'right';
  isPath?: boolean;
  description?: string;
  sponsor?: string;
  category?: 'emergency' | 'clinic' | 'admin' | 'service';
}

// Wrapper that renders the SVG-based 3D corridor with realistic perspective
export default function Corridor3DWrapper({ heading, currentNodeLabel }: Corridor3DWrapperProps) {
  const [cameraZ, setCameraZ] = useState(0);

  // Gentle auto-forward motion to add depth feeling (disabled for performance)
  // useEffect(() => {
  //   const id = setInterval(() => {
  //     setCameraZ((z) => (z + 0.08) % 4);
  //   }, 50);
  //   return () => clearInterval(id);
  // }, []);

  const allDoors: DoorInfo[] = useMemo(() => [
    { id: '099', position: 2, side: 'left', description: 'Kardiyoloji', category: 'clinic' },
    { id: '100', position: 4, side: 'right', description: 'Ortopedi', sponsor: '⭐ Sponsor: Özel Klinik', category: 'clinic' },
    { id: '101', position: 6, side: 'left', description: 'Radyoloji', category: 'service' },
    { id: '102', position: 9, side: 'right', description: 'Genel Cerrahi', category: 'clinic' },
    { id: '103', position: 13, side: 'left', isPath: true, description: '→ Acil Servis (Hedef)', category: 'emergency' },
    { id: '104', position: 17, side: 'right', description: 'Laboratuvar', category: 'service' },
    { id: '105', position: 20, side: 'left', description: 'Eczane', category: 'admin' },
  ], []);

  // Calculate current position first
  const currentPos = cameraZ + 5; // User is roughly at cameraZ + 5

  // Walking speed and arrival time
  const walkingSpeed = 1.2; // m/s (average human walking speed)
  const targetDoor = allDoors.find(d => d.isPath);
  const distanceToTarget = targetDoor ? Math.round((targetDoor.position - currentPos) * 2) : 0;
  const arrivalTime = distanceToTarget > 0 ? Math.ceil(distanceToTarget / walkingSpeed) : 0;

  const settings: CorridorSettings = useMemo(() => ({
    id: 'hospital-corridor',
    vanishingPointX: 0.5,
    vanishingPointY: 0.25,
    corridorWidth: 0.7,
    corridorHeight: 1.0,
    numSegments: 22,
    perspectiveStrength: 1.25,
    lineColor: '#ffddaa',
    doors: allDoors.map(d => ({ id: d.id, position: d.position, side: d.side, isPath: d.isPath })),
  }), [allDoors]);

  // Calculate which doors are ahead and behind
  const doorsAhead = allDoors.filter(d => d.position > currentPos).slice(0, 3);
  const doorsBehind = allDoors.filter(d => d.position <= currentPos).slice(-2);

  // Door category colors
  const getCategoryColor = (category?: string) => {
    switch(category) {
      case 'emergency': return '#ff4444';
      case 'clinic': return '#00ff88';
      case 'admin': return '#00d4ff';
      case 'service': return '#ffa500';
      default: return '#00d4ff';
    }
  };

  // Proximity alert (door within 5m)
  const nearbyDoor = doorsAhead.find(d => (d.position - currentPos) * 2 <= 5);

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.titleText}>Koridor Navigasyon</Text>
        <Text style={styles.headingText}>{Math.round(heading)}°</Text>
      </View>
      
      {/* Stats bar */}
      {targetDoor && distanceToTarget > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>🎯 Hedefe</Text>
            <Text style={styles.statValue}>{distanceToTarget}m</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>🚶 Hız</Text>
            <Text style={styles.statValue}>{walkingSpeed} m/s</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>⏱️ Süre</Text>
            <Text style={styles.statValue}>{arrivalTime}s</Text>
          </View>
        </View>
      )}
      
      <View style={styles.canvasBox}>
        <CorridorCanvas settings={settings} cameraZ={cameraZ} onNavigate={() => {}} />
      </View>
      
      {/* Door summary panel */}
      <View style={styles.doorSummary}>
        <Text style={styles.summaryTitle}>📍 {currentNodeLabel || 'Koridor A1'}</Text>
        
        {/* Proximity alert */}
        {nearbyDoor && (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>🔔 Yaklaşıyorsunuz: {nearbyDoor.id} - {nearbyDoor.description}</Text>
          </View>
        )}
        
        {/* Doors ahead */}
        <View style={styles.doorSection}>
          <Text style={styles.sectionLabel}>İlerde (3):</Text>
          {doorsAhead.map((door, i) => {
            const distance = Math.round((door.position - currentPos) * 2);
            return (
              <View key={door.id} style={[styles.doorItem, { borderLeftColor: getCategoryColor(door.category) }]}>
                <Text style={[styles.doorIcon, door.isPath && styles.targetDoor]}>
                  {door.isPath ? '🎯' : door.side === 'left' ? '◀️' : '▶️'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.doorNum, door.isPath && styles.targetText]}>
                    {door.id} {door.isPath && '(HEDEFİNİZ)'}
                  </Text>
                  <Text style={styles.doorDesc}>{door.description}</Text>
                  {door.sponsor && <Text style={styles.doorSponsor}>{door.sponsor}</Text>}
                </View>
                <View style={styles.doorRight}>
                  <Text style={styles.doorDist}>{distance}m</Text>
                  <Text style={styles.doorEta}>{Math.ceil(distance / walkingSpeed)}s</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Doors behind */}
        {doorsBehind.length > 0 && (
          <View style={styles.doorSection}>
            <Text style={styles.sectionLabel}>Geride (2):</Text>
            {doorsBehind.map(door => (
              <View key={door.id} style={[styles.doorItem, styles.passedDoor]}>
                <Text style={styles.doorIcon}>✓</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.doorNum}>{door.id}</Text>
                  <Text style={styles.doorDesc}>{door.description}</Text>
                </View>
                <Text style={styles.doorDist}>Geçildi</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Quick actions */}
        <View style={styles.quickActions}>
          <View style={styles.actionBtn}>
            <Text style={styles.actionText}>🔍 Ara</Text>
          </View>
          <View style={styles.actionBtn}>
            <Text style={styles.actionText}>⭐ Favorile</Text>
          </View>
          <View style={styles.actionBtn}>
            <Text style={styles.actionText}>🔊 Sesli</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1d22',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2a2d32',
  },
  titleText: { color: '#ffddaa', fontWeight: '700', fontSize: 13 },
  headingText: { color: '#00d4ff', fontWeight: '600', fontSize: 12 },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#1a1d22',
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#00d4ff',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#b0b3b8',
    fontSize: 10,
    marginBottom: 2,
  },
  statValue: {
    color: '#00d4ff',
    fontSize: 14,
    fontWeight: '700',
  },
  canvasBox: { height: 220 },
  doorSummary: {
    backgroundColor: '#2a2d32',
    padding: 12,
    maxHeight: 280,
  },
  summaryTitle: {
    color: '#00d4ff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  alertBox: {
    backgroundColor: '#ff4444',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  alertText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  doorSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    color: '#ffddaa',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  doorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3d42',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#00d4ff',
  },
  passedDoor: {
    opacity: 0.6,
    borderLeftColor: '#6a6d72',
  },
  doorIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  targetDoor: {
    fontSize: 18,
  },
  doorNum: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  targetText: {
    color: '#00ff88',
  },
  doorDesc: {
    color: '#b0b3b8',
    fontSize: 12,
    marginTop: 2,
  },
  doorSponsor: {
    color: '#ffd700',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  doorRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  doorDist: {
    color: '#00d4ff',
    fontSize: 14,
    fontWeight: '700',
  },
  doorEta: {
    color: '#b0b3b8',
    fontSize: 10,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#3a3d42',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  actionText: {
    color: '#00d4ff',
    fontSize: 12,
    fontWeight: '600',
  },
});
