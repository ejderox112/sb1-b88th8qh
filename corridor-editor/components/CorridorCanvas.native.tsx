
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Polygon, G, Defs, Pattern, Rect, Filter, FeGaussianBlur, FeMerge, FeMergeNode, FeTurbulence, Text as SvgText, Circle, RadialGradient, Stop, LinearGradient, Ellipse, Line } from 'react-native-svg';
import type { CorridorSettings } from '../types';

interface CorridorCanvasProps {
  settings: CorridorSettings;
  cameraZ: number;
  onNavigate: (id: string) => void;
}

interface Point { x: number; y: number; }

// Tile pattern for realistic floor with perspective
const TilePattern: React.FC<{ id: string }> = ({ id }) => (
  <Pattern id={id} x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse" patternTransform="skewY(-15)">
    <Rect x="0" y="0" width="50" height="50" fill="#95a5a6" />
    <Rect x="2" y="2" width="46" height="46" fill="#bdc3c7" stroke="#7f8c8d" strokeWidth="1" />
    <Rect x="4" y="4" width="42" height="42" fill="#95a5a6" opacity="0.3" />
  </Pattern>
);

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
    const depth = Math.max(0.01, z);
    const invDepth = 1 / (1 + depth * perspectiveStrength * 0.35);
    const scale = invDepth;
    const screenX = vpx + x * width * corridorWidth * scale;
    const screenY = vpy + y * height * corridorHeight * scale;
    return { x: screenX, y: screenY };
  };

  // Get perspective-correct wall point (for doors on walls)
  const getWallPoint = (z: number, side: 'left' | 'right', y: number): Point => {
    const x = side === 'left' ? -1 : 1;
    return getPoint(z, x, y);
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

  const p_near_tl = getPoint(-cameraZ, -1, -1);
  const p_near_tr = getPoint(-cameraZ, 1, -1);
  const p_near_bl = getPoint(-cameraZ, -1, 1);
  const p_near_br = getPoint(-cameraZ, 1, 1);

  // Ceiling light spots (realistic daylight from ceiling)
  const ceilingLights = useMemo(() => {
    const lights = [];
    const lightSpacing = 3; // Every 3 segments
    for (let i = 0; i < numSegments; i += lightSpacing) {
      const z = i - cameraZ;
      if (z > 0.5 && z < numSegments - 2) {
        const lightCenter = getPoint(z, 0, -0.85);
        lights.push({ z, center: lightCenter, id: `light-${i}` });
      }
    }
    return lights;
  }, [cameraZ, numSegments]);

  return (
    <View style={styles.full} onLayout={onLayout}>
      {width > 0 && <Svg width={width} height={height} style={styles.absolute}>
        <Defs>
          {/* Tile pattern for floor */}
          <TilePattern id="floorTiles" />
          
          {/* Realistic gradients - Anthracite tones */}
          <LinearGradient id="floorGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <Stop offset="0%" stopColor="#6c7a89" stopOpacity="0.9" />
            <Stop offset="50%" stopColor="#95a5a6" stopOpacity="1" />
            <Stop offset="100%" stopColor="#4a4a4a" stopOpacity="0.8" />
          </LinearGradient>
          
          <LinearGradient id="ceilingGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <Stop offset="0%" stopColor="#ecf0f1" stopOpacity="1" />
            <Stop offset="50%" stopColor="#bdc3c7" stopOpacity="1" />
            <Stop offset="100%" stopColor="#95a5a6" stopOpacity="0.9" />
          </LinearGradient>
          
          <LinearGradient id="wallGrad" x1="0%" y1="50%" x2="100%" y2="50%">
            <Stop offset="0%" stopColor="#34495e" stopOpacity="1" />
            <Stop offset="50%" stopColor="#2c3e50" stopOpacity="1" />
            <Stop offset="100%" stopColor="#34495e" stopOpacity="1" />
          </LinearGradient>

          {/* Light beam effect */}
          <RadialGradient id="lightBeam" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#f39c12" stopOpacity="0.8" />
            <Stop offset="40%" stopColor="#f1c40f" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#f39c12" stopOpacity="0" />
          </RadialGradient>

          <LinearGradient id="depthFogGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <Stop offset="0%" stopColor="#000" stopOpacity="0.35" />
            <Stop offset="60%" stopColor="#000" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#000" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Background - dark anthracite */}
        <Rect x="0" y="0" width={width} height={height} fill="#2c3e50" />

        {/* Floor with perspective grid lines */}
        <Polygon
          points={`${p_near_bl.x},${p_near_bl.y} ${p_near_br.x},${p_near_br.y} ${p_far_br.x},${p_far_br.y} ${p_far_bl.x},${p_far_bl.y}`}
          fill="#95a5a6"
          stroke="#7f8c8d"
          strokeWidth="1"
        />
        
        {/* Floor tile lines - horizontal (going to vanishing point) */}
        {Array.from({ length: 10 }, (_, i) => {
          const segmentRatio = (i + 1) / 10;
          const z = -cameraZ + segmentRatio * numSegments;
          const left = getPoint(z, -1, 1);
          const right = getPoint(z, 1, 1);
          return (
            <Line
              key={`floor-h-${i}`}
              x1={left.x}
              y1={left.y}
              x2={right.x}
              y2={right.y}
              stroke="#7f8c8d"
              strokeWidth="1"
              opacity="0.6"
            />
          );
        })}
        
        {/* Floor tile lines - vertical (parallel to corridor) */}
        {[-0.5, 0, 0.5].map((xPos, i) => (
          <Line
            key={`floor-v-${i}`}
            x1={getPoint(-cameraZ, xPos, 1).x}
            y1={getPoint(-cameraZ, xPos, 1).y}
            x2={getPoint(numSegments - cameraZ, xPos, 1).x}
            y2={getPoint(numSegments - cameraZ, xPos, 1).y}
            stroke="#7f8c8d"
            strokeWidth="1"
            opacity="0.6"
          />
        ))}

        {/* Navigation arrows on floor */}
        {[13, 15, 17].map((segmentPos, arrowIndex) => {
          const z = segmentPos - cameraZ;
          if (z <= 0.5 || z >= numSegments - 2) return null;

          const bodyFrontLeft = getPoint(z + 0.12, -0.06, 0.82);
          const bodyFrontRight = getPoint(z + 0.12, 0.06, 0.82);
          const bodyBackRight = getPoint(z - 0.04, 0.06, 0.9);
          const bodyBackLeft = getPoint(z - 0.04, -0.06, 0.9);

          const triangleBaseZ = z + 0.40;
          const triangleTipZ = z + 0.96;
          const tip = getPoint(triangleTipZ, 0, 0.78);
          const tipLeft = getPoint(triangleBaseZ, -0.12, 0.82);
          const tipRight = getPoint(triangleBaseZ, 0.12, 0.82);

          return (
            <G key={'arrow-' + arrowIndex}>
              <Polygon
                points={bodyFrontLeft.x + ',' + bodyFrontLeft.y + ' ' + bodyFrontRight.x + ',' + bodyFrontRight.y + ' ' + bodyBackRight.x + ',' + bodyBackRight.y + ' ' + bodyBackLeft.x + ',' + bodyBackLeft.y}
                fill="#00d4ff"
                opacity={0.95}
              />
              <Polygon
                points={tipLeft.x + ',' + tipLeft.y + ' ' + tip.x + ',' + tip.y + ' ' + tipRight.x + ',' + tipRight.y}
                fill="#00d4ff"
                opacity={0.95}
              />
            </G>
          );
        })}

        {/* Ceiling - light anthracite with daylight effect */}
        <Polygon
          points={`${p_near_tl.x},${p_near_tl.y} ${p_near_tr.x},${p_near_tr.y} ${p_far_tr.x},${p_far_tr.y} ${p_far_tl.x},${p_far_tl.y}`}
          fill="url(#ceilingGrad)"
          stroke="#95a5a6"
          strokeWidth="1"
        />

        {/* Ceiling light spots (daylight from above) */}
        {ceilingLights.map((light) => {
          const lightRadius = 30 / light.z; // Perspective-adjusted size
          return (
            <G key={light.id}>
              {/* Light fixture */}
              <Ellipse
                cx={light.center.x}
                cy={light.center.y}
                rx={lightRadius * 1.5}
                ry={lightRadius * 0.8}
                fill="#f39c12"
                opacity="0.9"
              />
              {/* Light glow */}
              <Ellipse
                cx={light.center.x}
                cy={light.center.y}
                rx={lightRadius * 3}
                ry={lightRadius * 2}
                fill="url(#lightBeam)"
                opacity="0.6"
              />
            </G>
          );
        })}

        {/* Left Wall - anthracite */}
        <Polygon
          points={`${p_near_tl.x},${p_near_tl.y} ${p_near_bl.x},${p_near_bl.y} ${p_far_bl.x},${p_far_bl.y} ${p_far_tl.x},${p_far_tl.y}`}
          fill="url(#wallGrad)"
          stroke="#2c3e50"
          strokeWidth="1.5"
        />

        {/* Right Wall - anthracite */}
        <Polygon
          points={`${p_near_tr.x},${p_near_tr.y} ${p_near_br.x},${p_near_br.y} ${p_far_br.x},${p_far_br.y} ${p_far_tr.x},${p_far_tr.y}`}
          fill="url(#wallGrad)"
          stroke="#2c3e50"
          strokeWidth="1.5"
        />

        {/* Doors with realistic perspective - TRAPEZOID shape */}
        {visibleDoors.map((door) => {
          const z = door.position - cameraZ;
          if (z <= 0.5) return null;

          // Sadece 101-104 için etiket göster; sonrası yazısız
          const showLabel = ['101', '102', '103', '104'].includes(door.id);
          
          // Calculate 4 corners with PROPER TRAPEZOID perspective
          // DAHA GENİŞ kapılar (3x wider)
          const wallSide = door.side === 'left' ? -1 : 1;
          
          // Door spans wider along corridor (3x genişlik)
          const zNear = z - 0.9; // 0.3 * 3
          const zFar = z + 0.9;
          
          // TOP of door (higher up, narrower due to perspective)
          const topY = -0.7;
          const topLeft = getPoint(door.side === 'left' ? zNear : zFar, wallSide, topY);
          const topRight = getPoint(door.side === 'left' ? zFar : zNear, wallSide, topY);
          
          // BOTTOM of door (near floor, wider)
          const bottomY = 0.9;
          const bottomLeft = getPoint(door.side === 'left' ? zNear : zFar, wallSide, bottomY);
          const bottomRight = getPoint(door.side === 'left' ? zFar : zNear, wallSide, bottomY);

          const isClicked = clickedDoorId === door.id;

          return (
            <G key={door.id} onPress={() => handleDoorClick(door.id)}>
              {/* Door frame - SADECE KAHVERENGI KUTU (perspektife uygun trapez) */}
              <Polygon
                points={`${topLeft.x},${topLeft.y} ${topRight.x},${topRight.y} ${bottomRight.x},${bottomRight.y} ${bottomLeft.x},${bottomLeft.y}`}
                fill={isClicked ? "#7d5a3b" : "#654321"}
                stroke="#4a3216"
                strokeWidth="3"
              />

              {/* İç panel highlight */}
              <Polygon
                points={`${(topLeft.x + topRight.x) / 2},${(topLeft.y + topRight.y) / 2} ${(topRight.x + bottomRight.x) / 2},${(topRight.y + bottomRight.y) / 2} ${(bottomRight.x + bottomLeft.x) / 2},${(bottomRight.y + bottomLeft.y) / 2} ${(bottomLeft.x + topLeft.x) / 2},${(bottomLeft.y + topLeft.y) / 2}`}
                fill="rgba(255,255,255,0.08)"
              />
              
              {/* Door label - Sadece yakın kapılarda göster */}
              {showLabel && (
                <SvgText
                  x={(topLeft.x + topRight.x + bottomLeft.x + bottomRight.x) / 4}
                  y={(topLeft.y + topRight.y + bottomLeft.y + bottomRight.y) / 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={Math.max(12, 24 / z)}
                  fontWeight="bold"
                >
                  {door.label}
                </SvgText>
              )}
            </G>
          );
        })}

        {/* Depth fog overlay for distant vanishing effect */}
        <Rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="url(#depthFogGrad)"
          pointerEvents="none"
        />

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
