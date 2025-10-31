
import React from 'react';

interface MiniMapProps {
  path: string[];
  currentId: string;
}

const MiniMap: React.FC<MiniMapProps> = ({ path, currentId }) => {
  if (!path || path.length === 0) {
    return null;
  }

  const width = 200;
  const height = 200;
  const padding = 25;
  const currentIndex = path.findIndex(p => p === currentId);

  // Calculate node positions in a simple grid/zig-zag to fit more nodes visibly
  const nodePositions = path.map((_, i) => {
    const maxCols = 3;
    const row = Math.floor(i / maxCols);
    let col = i % maxCols;
    // Reverse direction on even rows for a zig-zag pattern
    if (row % 2 !== 0) {
      col = maxCols - 1 - col;
    }
    const x = padding + col * ((width - padding * 2) / (maxCols - 1));
    const y = padding + row * 40; 
    return { x, y };
  });
  
  // Dynamically adjust height based on content
  const contentHeight = nodePositions.length > 0 ? nodePositions[nodePositions.length - 1].y + padding : height;
  const viewboxHeight = Math.max(height, contentHeight);

  return (
    <div className="bg-black/50 p-2 rounded-md border border-gray-600">
      <svg viewBox={`0 0 ${width} ${viewboxHeight}`} width="100%" height="auto">
        <defs>
          <filter id="minimap-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <style>
          {`
            @keyframes pulse-dot {
              0% { r: 5; opacity: 1; }
              50% { r: 8; opacity: 0.7; }
              100% { r: 5; opacity: 1; }
            }
            .current-node-pulse {
              animation: pulse-dot 2s infinite;
            }
          `}
        </style>

        {/* Radar Background & Grid */}
        <rect x="0" y="0" width={width} height={viewboxHeight} fill="#000" />
        <g opacity="0.3">
          <circle cx={width / 2} cy={viewboxHeight / 2} r={width * 0.45} stroke="#0f0" strokeWidth="0.5" fill="none" />
          <circle cx={width / 2} cy={viewboxHeight / 2} r={width * 0.3} stroke="#0f0" strokeWidth="0.5" fill="none" />
          <line x1={width / 2} y1="0" x2={width / 2} y2={viewboxHeight} stroke="#0f0" strokeWidth="0.5" />
          <line x1="0" y1={viewboxHeight / 2} x2={width} y2={viewboxHeight / 2} stroke="#0f0" strokeWidth="0.5" />
        </g>
        
        {/* Fancy Border */}
        <g stroke="#66f" strokeWidth="2">
            {/* Top-left corner */}
            <path d={`M10 1 L1 1 L1 10`} fill="none" />
            {/* Top-right corner */}
            <path d={`M${width-10} 1 L${width-1} 1 L${width-1} 10`} fill="none" />
            {/* Bottom-left corner */}
            <path d={`M10 ${viewboxHeight-1} L1 ${viewboxHeight-1} L1 ${viewboxHeight-10}`} fill="none" />
            {/* Bottom-right corner */}
            <path d={`M${width-10} ${viewboxHeight-1} L${width-1} ${viewboxHeight-1} L${width-1} ${viewboxHeight-10}`} fill="none" />
        </g>


        {/* Path Lines */}
        <g>
          {nodePositions.slice(0, -1).map((pos, i) => {
            const nextPos = nodePositions[i + 1];
            const isVisited = i < currentIndex;
            const isUpcoming = i >= currentIndex;

            return (
              <line
                key={`line-${i}`}
                x1={pos.x}
                y1={pos.y}
                x2={nextPos.x}
                y2={nextPos.y}
                stroke={isVisited ? '#0077ff' : '#55eeff'} // Blue for visited, Light Blue for upcoming
                strokeWidth="2"
                strokeDasharray={isUpcoming ? '4 2' : 'none'}
              />
            );
          })}
        </g>

        {/* Path Nodes */}
        <g>
          {nodePositions.map((pos, i) => {
            const isCurrent = i === currentIndex;
            return (
              <circle
                key={`node-${i}`}
                cx={pos.x}
                cy={pos.y}
                r={isCurrent ? 5 : 3}
                fill="#0f0" // Green indicators
                stroke="#fff"
                strokeWidth={isCurrent ? 1.5 : 0.5}
                className={isCurrent ? 'current-node-pulse' : ''}
                style={{ filter: isCurrent ? 'url(#minimap-glow)' : 'none' }}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default MiniMap;







