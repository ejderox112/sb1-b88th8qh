import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Circle, Text as SvgText } from 'react-native-svg';
import { FloorGraph } from '@/hooks/useFloorGraph';

interface Props {
  graph: FloorGraph;
  width?: number;
  height?: number;
  pathIds?: string[];
}

export function FloorMiniMap({ graph, width = 320, height = 200, pathIds }: Props) {
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];

  const margin = 10;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);

  const project = (x: number, y: number) => {
    const px = margin + ((x - minX) / spanX) * (width - margin * 2);
    const py = margin + ((y - minY) / spanY) * (height - margin * 2);
    return { px, py };
  };

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {edges.map((e) => {
          const from = nodes.find((n) => n.id === e.from_node);
          const to = nodes.find((n) => n.id === e.to_node);
          if (!from || !to) return null;
          const { px: x1, py: y1 } = project(from.x, from.y);
          const { px: x2, py: y2 } = project(to.x, to.y);
          const isOnPath = pathIds && pathIds.length > 1 && pathIds.includes(e.from_node) && pathIds.includes(e.to_node);
          return (
            <Line
              key={e.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isOnPath ? '#f97316' : '#4ade80'}
              strokeWidth={isOnPath ? 3 : 2}
              strokeOpacity={0.8}
            />
          );
        })}
        {nodes.map((n) => {
          const { px, py } = project(n.x, n.y);
          const color = n.type === 'door' ? '#fbbf24' : n.type === 'room' ? '#60a5fa' : '#cbd5e1';
          return (
            <React.Fragment key={n.id}>
              <Circle cx={px} cy={py} r={4} fill={color} />
              <SvgText
                x={px + 6}
                y={py - 4}
                fill="#e5e7eb"
                fontSize="10"
              >
                {n.name || n.type}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

export default FloorMiniMap;
