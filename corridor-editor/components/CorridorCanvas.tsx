
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { CorridorSettings } from '../types';

interface CorridorCanvasProps {
  settings: CorridorSettings;
  cameraZ: number;
  onNavigate: (id: string) => void;
}

interface Point { x: number; y: number; }

const useContainerDimensions = (ref: React.RefObject<HTMLDivElement>) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateDimensions = () => {
            if (ref.current) {
                setDimensions({
                    width: ref.current.offsetWidth,
                    height: ref.current.offsetHeight,
                });
            }
        };

        updateDimensions();
        const resizeObserver = new ResizeObserver(updateDimensions);
        if (ref.current) {
            resizeObserver.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                resizeObserver.unobserve(ref.current);
            }
        };
    }, [ref]);

    return dimensions;
};

const CorridorCanvas: React.FC<CorridorCanvasProps> = ({ settings, cameraZ, onNavigate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useContainerDimensions(containerRef);
  const [hoveredDoorInfo, setHoveredDoorInfo] = useState<{ id: string; description: string; x: number; y: number; } | null>(null);
  const [clickedDoorId, setClickedDoorId] = useState<string | null>(null);

  useEffect(() => {
    setClickedDoorId(null);
  }, [settings.id]);

  const { width, height } = dimensions;
  const {
    vanishingPointX, vanishingPointY, corridorWidth, corridorHeight,
    numSegments, perspectiveStrength, lineColor, doors,
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
    setTimeout(() => onNavigate(doorId), 100);
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
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-black">
      {width > 0 && <svg width={width} height={height} className="absolute inset-0">
        <defs>
            <filter id="door-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="glow" />
                <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
           <pattern id="wall-pattern" patternUnits="userSpaceOnUse" width="128" height="128">
                <filter id="noise">
                    <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="1" stitchTiles="stitch" />
                </filter>
                <rect width="128" height="128" fill="#1a1a1a" />
                <rect width="128" height="128" filter="url(#noise)" opacity="0.2" />
            </pattern>
            <pattern id="floor-pattern" patternUnits="userSpaceOnUse" width="100" height="100">
                <rect width="100" height="100" fill="#202020"/>
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#303030" strokeWidth="2"/>
            </pattern>
            <pattern id="ceiling-pattern" patternUnits="userSpaceOnUse" width="256" height="256">
                <rect width="256" height="256" fill="#282828" />
            </pattern>
        </defs>

        <style>{`
            /* ... styles remain the same ... */
        `}</style>

        {/* Walls with patterns */}
        <g>
            <polygon points={`0,0 ${width},0 ${p_far_tr.x},${p_far_tr.y} ${p_far_tl.x},${p_far_tl.y}`} fill="url(#ceiling-pattern)" />
            <polygon points={`0,${height} ${width},${height} ${p_far_br.x},${p_far_br.y} ${p_far_bl.x},${p_far_bl.y}`} fill="url(#floor-pattern)" />
            <polygon points={`0,0 0,${height} ${p_far_bl.x},${p_far_bl.y} ${p_far_tl.x},${p_far_tl.y}`} fill="url(#wall-pattern)" />
            <polygon points={`${width},0 ${width},${height} ${p_far_br.x},${p_far_br.y} ${p_far_tr.x},${p_far_tr.y}`} fill="url(#wall-pattern)" />
        </g>

        {/* Corridor Segments */}
        <g stroke={lineColor} strokeWidth="1.5" fill="none">
          {Array.from({ length: numSegments }).map((_, i) => {
            const z = numSegments - i - cameraZ;
            if (z <= 0.1) return null;
            const p_tl = getPoint(z, -1, -1), p_tr = getPoint(z, 1, -1), p_bl = getPoint(z, -1, 1), p_br = getPoint(z, 1, 1);
            const pathData = `M ${p_tl.x} ${p_tl.y} L ${p_tr.x} ${p_tr.y} L ${p_br.x} ${p_br.y} L ${p_bl.x} ${p_bl.y} Z`;
            return <path key={`segment-${i}`} d={pathData} opacity={(1 - z / numSegments) * 0.5} />;
          })}
        </g>
        
        {/* Doors and Signs */}
        <g>
          {visibleDoors.map(door => {
            const z1 = door.position - cameraZ, z2 = door.position - 1 - cameraZ;
            if (z1 <= 0 || z2 <=0) return null;
            const x = door.side === 'left' ? -1 : 1;
            const p1 = getPoint(z1, x, 1), p2 = getPoint(z1, x, 1 - 0.7), p3 = getPoint(z2, x, 1-0.7), p4 = getPoint(z2, x, 1);
            const points = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;
            const centerX = (p1.x + p3.x) / 2, centerY = (p1.y + p3.y) / 2;
            const textX = centerX, textY = p2.y - (30 * Math.pow(z1 / numSegments, 0.5));
            const fontSize = Math.max(4, 30 * Math.pow(z1 / numSegments, 0.5));

            return (
              <g key={door.id} onClick={() => handleDoorClick(door.id)} onMouseEnter={() => setHoveredDoorInfo({ id: door.id, description: door.description || `Door to ${door.id}`, x: centerX, y: p2.y - 10 })} onMouseLeave={() => setHoveredDoorInfo(null)} style={{ cursor: 'pointer' }}>
                  <polygon points={points} fill={door.isPath ? `${lineColor}33` : '#5D4037'} stroke={door.isPath ? lineColor : '#3E2723'} strokeWidth="2" />
                  <text x={textX} y={textY} textAnchor="middle" fill={lineColor} fontSize={fontSize} fontWeight="bold">{door.id}</text>
              </g>
            );
          })}
        </g>
      </svg>}
      {hoveredDoorInfo && (
        <div className="absolute p-2 text-sm bg-gray-900/80 border border-gray-500 rounded-md pointer-events-none" style={{ left: hoveredDoorInfo.x, top: hoveredDoorInfo.y, transform: 'translate(-50%, -100%)', color: lineColor }}>
          {hoveredDoorInfo.description}
        </div>
      )}
    </div>
  );
};

export default CorridorCanvas;
