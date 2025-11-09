
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, Polygon } from 'react-native-svg';

interface MiniMapProps {
  heading: number | null; // User's current direction (0-360, North is 0)
  bearing: number | null; // Direction to the target (0-360)
  size?: number; // Size of the minimap circle
}

const MiniMap: React.FC<MiniMapProps> = ({ heading, bearing, size = 80 }) => {
  const radius = size / 2;
  const center = radius;

  // Rotate the entire SVG content based on the user's heading to keep North at the top
  const rotation = -(heading ?? 0);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius - 1}
          stroke="#444"
          strokeWidth="2"
          fill="rgba(0, 0, 0, 0.5)"
        />

        {/* North Indicator */}
        <SvgText
          fill="#fff"
          stroke="none"
          fontSize="10"
          fontWeight="bold"
          x={center}
          y="12"
          textAnchor="middle"
          transform={`rotate(${rotation} ${center} ${center})`}
        >
          N
        </SvgText>

        {/* Player/User Arrow (Always points up) */}
        <Polygon
          points={`${center},${center - 15} ${center - 5},${center} ${center + 5},${center}`}
          fill="#33FF99"
          stroke="white"
          strokeWidth="1"
        />

        {/* Target Dot */}
        {bearing !== null && (
          <Circle
            cx={center + (radius - 10) * Math.sin((bearing) * Math.PI / 180)}
            cy={center - (radius - 10) * Math.cos((bearing) * Math.PI / 180)}
            r="4"
            fill="red"
            transform={`rotate(${rotation} ${center} ${center})`}
          />
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 50,
    overflow: 'hidden',
  },
});

export default MiniMap;
