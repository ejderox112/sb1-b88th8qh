
import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, G, Rect, Defs, Filter, FeGaussianBlur, FeMerge, FeMergeNode, Line } from 'react-native-svg';

interface MiniMapProps {
  path: string[];
  currentId: string;
  lineColor: string;
}

const MiniMap: React.FC<MiniMapProps> = ({ path, currentId, lineColor }) => {
  if (!path || path.length === 0) {
    return null;
  }

  const width = 200;
  const height = 200;
  const padding = 25;
  const currentIndex = path.findIndex(p => p === currentId);

  const nodePositions = path.map((_, i) => {
    const maxCols = 3;
    const row = Math.floor(i / maxCols);
    let col = i % maxCols;
    if (row % 2 !== 0) {
      col = maxCols - 1 - col;
    }
    const x = padding + col * ((width - padding * 2) / (maxCols - 1 || 1));
    const y = padding + row * 40;
    return { x, y };
  });

  const contentHeight = nodePositions.length > 0 ? nodePositions[nodePositions.length - 1].y + padding : height;
  const viewboxHeight = Math.max(height, contentHeight);

  return (
    <View style={{ height: viewboxHeight, width: '100%' }}>
      <Svg viewBox={`0 0 ${width} ${viewboxHeight}`} width="100%" height="100%">
        <Defs>
          <Filter id="minimap-glow" x="-50%" y="-50%" width="200%" height="200%">
            <FeGaussianBlur stdDeviation="3" result="glow" />
            <FeMerge>
              <FeMergeNode in="glow" />
              <FeMergeNode in="glow" />
              <FeMergeNode in="SourceGraphic" />
            </FeMerge>
          </Filter>
        </Defs>

        <Rect x="0" y="0" width={width} height={viewboxHeight} fill="#000" />
        <G opacity="0.3">
          <Circle cx={width / 2} cy={viewboxHeight / 2} r={width * 0.45} stroke={lineColor} strokeWidth="0.5" fill="none" />
          <Circle cx={width / 2} cy={viewboxHeight / 2} r={width * 0.3} stroke={lineColor} strokeWidth="0.5" fill="none" />
        </G>

        <G>
          {nodePositions.slice(0, -1).map((pos, i) => {
            const nextPos = nodePositions[i + 1];
            const isVisited = i < currentIndex;
            return (
              <Line
                key={`line-${i}`}
                x1={pos.x}
                y1={pos.y}
                x2={nextPos.x}
                y2={nextPos.y}
                stroke={isVisited ? lineColor : '#555'}
                strokeWidth="2"
                strokeDasharray={isVisited ? undefined : '4 2'}
              />
            );
          })}
        </G>

        <G>
          {nodePositions.map((pos, i) => {
            const isCurrent = i === currentIndex;
            return (
              <Circle
                key={`node-${i}`}
                cx={pos.x}
                cy={pos.y}
                r={isCurrent ? 5 : 3}
                fill={lineColor}
                stroke="#fff"
                strokeWidth={isCurrent ? 1.5 : 0.5}
                filter={isCurrent ? 'url(#minimap-glow)' : undefined}
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
};

export default MiniMap;
