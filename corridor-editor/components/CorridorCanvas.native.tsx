
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Polygon, G, Defs, Pattern, Rect, Filter, FeGaussianBlur, FeMerge, FeMergeNode, FeTurbulence, Text as SvgText } from 'react-native-svg';
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
        <Defs>
          {/* NOTE: Complex filters and patterns can be performance-intensive. Keeping them for now. */}
        </Defs>

        {/* Walls */}
        <G>
            <Polygon points={`${p_far_bl.x},${p_far_bl.y} ${p_far_br.x},${p_far_br.y} ${width},${height} 0,${height}`} fill="#202020" />
            <Polygon points={`${p_far_tl.x},${p_far_tl.y} ${p_far_tr.x},${p_far_tr.y} ${width},0 0,0`} fill="#282828" />
            <Polygon points={`${p_far_tl.x},${p_far_tl.y} ${p_far_bl.x},${p_far_bl.y} 0,${height} 0,0`} fill="#1a1a1a" />
            <Polygon points={`${p_far_tr.x},${p_far_tr.y} ${p_far_br.x},${p_far_br.y} ${width},${height} ${width},0`} fill="#1a1a1a" />
        </G>

        {/* Corridor Segments */}
        <G stroke={lineColor} strokeWidth="1.5" fill="none">
          {Array.from({ length: numSegments }).map((_, i) => {
            const z = numSegments - i - cameraZ;
            if (z <= 0.1) return null;

            const p_tl = getPoint(z, -1, -1);
            const p_tr = getPoint(z, 1, -1);
            const p_bl = getPoint(z, -1, 1);
            const p_br = getPoint(z, 1, 1);
            
            const pathData = `M ${p_tl.x} ${p_tl.y} L ${p_tr.x} ${p_tr.y} L ${p_br.x} ${p_br.y} L ${p_bl.x} ${p_bl.y} Z`;
            
            return <Path key={`segment-${i}`} d={pathData} opacity={(1 - z / numSegments) * 0.5} />;
          })}
        </G>

        {/* Doors and Signs */}
        <G>
          {visibleDoors.map(door => {
            const z1 = door.position - cameraZ;
            const z2 = door.position - 1 - cameraZ;
            if (z1 <= 0 || z2 <=0) return null;

            const x = door.side === 'left' ? -1 : 1;
            const doorHeight = 0.7;
            const y_bottom = 1;
            const y_top = 1 - doorHeight;

            const p1 = getPoint(z1, x, y_bottom);
            const p2 = getPoint(z1, x, y_top);
            const p3 = getPoint(z2, x, y_top);
            const p4 = getPoint(z2, x, y_bottom);

            const points = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;

            const signHeight = 0.2;
            const signMargin = 0.05;
            const y_sign_bottom = y_top - signMargin;
            const y_sign_top = y_sign_bottom - signHeight;

            const p_sign_nb = getPoint(z1, x, y_sign_bottom);
            const p_sign_nt = getPoint(z1, x, y_sign_top);
            const p_sign_ft = getPoint(z2, x, y_sign_top);
            const p_sign_fb = getPoint(z2, x, y_sign_bottom);
            const signPoints = `${p_sign_nb.x},${p_sign_nb.y} ${p_sign_nt.x},${p_sign_nt.y} ${p_sign_ft.x},${p_sign_ft.y} ${p_sign_fb.x},${p_sign_fb.y}`;

            const textX = (p_sign_nb.x + p_sign_ft.x) / 2;
            const textY = (p_sign_nt.y + p_sign_fb.y) / 2;
            const textScale = Math.pow(z1 / numSegments, 0.5);
            const fontSize = Math.max(4, 30 * textScale);

            return (
              <G key={door.id} onPress={() => handleDoorClick(door.id)}>
                {/* Door Sign */}
                <Polygon points={signPoints} fill={lineColor} opacity="0.9" />
                <SvgText
                    x={textX}
                    y={textY}
                    dy={fontSize * 0.35}
                    textAnchor="middle"
                    fill="#000"
                    fontSize={fontSize}
                    fontWeight="bold"
                    fontFamily="monospace"
                >
                    {door.id}
                </SvgText>

                {/* Door */}
                <Polygon
                  points={points}
                  fill={door.isPath ? `${lineColor}33` : '#5D4037'}
                  stroke={door.isPath ? lineColor : '#3E2723'}
                  strokeWidth="2"
                />
              </G>
            );
          })}
        </G>
      </Svg>}
    </View>
  );
};

const styles = StyleSheet.create({
    full: {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'black',
    },
    absolute: {
        position: 'absolute',
        top: 0,
        left: 0,
    }
});

export default CorridorCanvas;
