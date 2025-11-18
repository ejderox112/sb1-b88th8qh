
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Polygon, G, Defs, Pattern, Rect, Filter, FeGaussianBlur, FeMerge, FeMergeNode, FeTurbulence, Text as SvgText, Circle, RadialGradient, Stop } from 'react-native-svg';
import type { CorridorSettings } from '../types';

interface CorridorCanvasProps {
  settings: CorridorSettings;
  cameraZ: number;
  onNavigate: (id: string) => void;
}

interface Point { x: number; y: number; }

const CorridorCanvas: React.FC<CorridorCanvasProps> = ({ settings, cameraZ, onNavigate }) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [clickedDoorId, setClickedDoorId] = useState<string | null>(null);

  // When the corridor ID changes, reset the click animation state
  useEffect(() => {
    setClickedDoorId(null);
  }, [settings.id]);

  const { width, height } = dimensions;
  const {
    vanishingPointX,
    vanishingPointY,
    corridorWidth,
    corridorHeight,
    numSegments,
    perspectiveStrength,
    lineColor,
    doors,
  } = settings;

  const vpx = width * vanishingPointX;
  const vpy = height * vanishingPointY;

  const getPoint = (z: number, x: number, y: number): Point => {
    if (z <= 0) z = 0.01;
    const scale = Math.pow(z / numSegments, perspectiveStrength);
    const screenX = vpx + x * width * corridorWidth * scale;
    const screenY = vpy + y * height * corridorHeight * scale;
    return { x: screenX, y: screenY };
  };

  const handleDoorClick = (doorId: string) => {
    setClickedDoorId(doorId);
    setTimeout(() => onNavigate(doorId), 100); // Allow click feedback to be seen
  };
  
  const onLayout = (event: any) => {
      const { width, height } = event.nativeEvent.layout;
      setDimensions({ width, height });
  };

  const visibleDoors = useMemo(() =>
    doors.filter(door => {
      const z = door.position - cameraZ;
      return z > 0.5 && z < numSegments - 2;
    }), [doors, cameraZ, numSegments]);

  const p_far_tl = getPoint(numSegments - cameraZ, -1, -1);
  const p_far_tr = getPoint(numSegments - cameraZ, 1, -1);
  const p_far_bl = getPoint(numSegments - cameraZ, -1, 1);
  const p_far_br = getPoint(numSegments - cameraZ, 1, 1);

  return (
    <View style={styles.full} onLayout={onLayout}>
      {width > 0 && <Svg width={width} height={height} style={styles.absolute}>
        {/* Simple test SVG */}
        <Rect x="0" y="0" width={width} height={height} fill="#2a2d32" />
        <Rect x="50" y="50" width="200" height="100" fill="#00d4ff" opacity={0.5} />
        <Text x="150" y="100" textAnchor="middle" fill="#ffffff" fontSize={20}>
          TEST - Corridor Loading...
        </Text>
      </Svg>}
    </View>
  );
};

const styles = StyleSheet.create({
    full: {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#2a2d32',
    },
    absolute: {
        position: 'absolute',
        top: 0,
        left: 0,
    }
});

export default CorridorCanvas;
