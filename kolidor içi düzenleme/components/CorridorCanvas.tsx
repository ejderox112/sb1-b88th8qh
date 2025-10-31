

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { CorridorSettings } from '../types';

interface CorridorCanvasProps {
  settings: CorridorSettings;
  cameraZ: number;
  onNavigate: (id: string) => void;
}

interface Point { x: number; y: number; }

const CorridorCanvas: React.FC<CorridorCanvasProps> = ({ settings, cameraZ, onNavigate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredDoorInfo, setHoveredDoorInfo] = useState<{ id: string; description: string; x: number; y: number; } | null>(null);
  const [clickedDoorId, setClickedDoorId] = useState<string | null>(null);
  const prevCameraZRef = useRef(cameraZ);
  
  // Use a state to trigger re-animation on movement
  const [movementKey, setMovementKey] = useState(0);

  useEffect(() => {
    if (cameraZ !== prevCameraZRef.current) {
      setMovementKey(prev => prev + 1);
    }
    prevCameraZRef.current = cameraZ;
  }, [cameraZ]);

  useEffect(() => {
    setClickedDoorId(null);
  }, [settings.id]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

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
    if (z <= 0) z = 0.01; // Prevent division by zero or negative scales
    const scale = Math.pow(z / numSegments, perspectiveStrength);
    const screenX = vpx + x * width * corridorWidth * scale;
    const screenY = vpy + y * height * corridorHeight * scale;
    return { x: screenX, y: screenY };
  };

  const handleDoorClick = (doorId: string) => {
    setClickedDoorId(doorId);
    setTimeout(() => onNavigate(doorId), 100); // Allow click animation to start
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
      <svg width={width} height={height} className="absolute inset-0">
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

        <style>
          {`
            @keyframes pulse-glow-opacity {
              0% { opacity: 0.6; }
              50% { opacity: 1; }
              100% { opacity: 0.6; }
            }
            .door-hitbox:hover .door-frame {
                stroke: ${lineColor};
                stroke-width: 4;
            }
            .door-hitbox:hover .door-glow-rect {
                opacity: 0.8;
            }
            @keyframes door-click-effect {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(1.5); opacity: 0; }
            }
            .door-clicked-effect {
                animation: door-click-effect 0.5s ease-out forwards;
                transform-origin: center;
            }
            @keyframes pulse-arrow {
                0% { opacity: 0; transform: scaleY(0.8); }
                50% { opacity: 0.6; }
                100% { opacity: 0; transform: scaleY(1.2); }
            }
            .pulsing-arrow {
                animation: pulse-arrow 3s ease-in-out infinite;
                transform-origin: 50% 100%;
            }
          `}
        </style>

        {/* Walls */}
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

            const p_tl = getPoint(z, -1, -1);
            const p_tr = getPoint(z, 1, -1);
            const p_bl = getPoint(z, -1, 1);
            const p_br = getPoint(z, 1, 1);
            
            const pathData = `M ${p_tl.x} ${p_tl.y} L ${p_tr.x} ${p_tr.y} L ${p_br.x} ${p_br.y} L ${p_bl.x} ${p_bl.y} Z`;
            
            return <path key={`segment-${i}`} d={pathData} opacity={(1 - z / numSegments) * 0.5} />;
          })}
        </g>
        
        {/* Pulsing Floor Arrows */}
        <g key={movementKey}>
          {Array.from({ length: 10 }).map((_, i) => {
            const z = (i * 4) + 2;
            const effectiveZ = z - (cameraZ % 4);
            if (effectiveZ < 1) return null;
            
            const scale = Math.pow(effectiveZ / numSegments, perspectiveStrength);
            if (scale < 0.01) return null;

            const tipZ = effectiveZ + 0.8;
            const baseWidth = 0.25;

            const p_tip = getPoint(tipZ, 0, 1);
            const p_left = getPoint(effectiveZ, -baseWidth, 1);
            const p_right = getPoint(effectiveZ, baseWidth, 1);

            const arrowPath = `M ${p_left.x} ${p_left.y} L ${p_tip.x} ${p_tip.y} L ${p_right.x} ${p_right.y}`;
            
            return (
              <path
                key={`arrow-${i}`}
                d={arrowPath}
                fill="none"
                stroke={lineColor}
                strokeWidth={Math.max(1, 8 * scale)}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pulsing-arrow"
                style={{ animationDelay: `${(i % 5) * 0.3}s` }}
              />
            );
          })}
        </g>

        {/* Doors and Signs */}
        <g>
          {visibleDoors.map(door => {
            const z1 = door.position - cameraZ;
            const z2 = door.position - 1 - cameraZ;
            if (z1 <= 0 || z2 <=0) return null;

            const x = door.side === 'left' ? -1 : 1;
            const doorHeight = 0.7;
            const y_bottom = 1;
            const y_top = 1 - doorHeight;

            const p1 = getPoint(z1, x, y_bottom); // Near bottom
            const p2 = getPoint(z1, x, y_top);    // Near top
            const p3 = getPoint(z2, x, y_top);    // Far top
            const p4 = getPoint(z2, x, y_bottom); // Far bottom

            const points = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;
            const centerX = (p1.x + p2.x + p3.x + p4.x) / 4;
            const centerY = (p1.y + p2.y + p3.y + p4.y) / 4;
            
            const isClicked = clickedDoorId === door.id;

            // --- Door Sign Calculation ---
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
            const textScale = Math.pow(z1 / numSegments, 0.5); // Use a less aggressive scale for font size
            const fontSize = Math.max(4, 30 * textScale);

            return (
              <React.Fragment key={door.id}>
                {/* Door Sign */}
                <g>
                    <polygon points={signPoints} fill={lineColor} opacity="0.9" />
                    <text
                        x={textX}
                        y={textY}
                        dy=".3em"
                        textAnchor="middle"
                        fill="#000"
                        fontSize={fontSize}
                        fontWeight="bold"
                        fontFamily="monospace"
                        className="pointer-events-none"
                    >
                        {door.id}
                    </text>
                </g>

                {/* Door */}
                <g
                    className="door-hitbox"
                    onClick={() => handleDoorClick(door.id)}
                    onMouseEnter={() => setHoveredDoorInfo({ id: door.id, description: door.description || `Door to ${door.id}`, x: centerX, y: p2.y - 10 })}
                    onMouseLeave={() => setHoveredDoorInfo(null)}
                    style={{ cursor: 'pointer' }}
                >
                    <polygon points={points} fill="transparent" />
                    <polygon
                    className="door-frame"
                    points={points}
                    fill={door.isPath ? `${lineColor}33` : '#5D4037'}
                    stroke={door.isPath ? lineColor : '#3E2723'}
                    strokeWidth="2"
                    style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                    />
                    <rect 
                    className="door-glow-rect"
                    x={Math.min(p2.x, p3.x)}
                    y={p2.y}
                    width={Math.abs(p2.x-p3.x) + Math.abs(p1.x-p4.x)} // Approx
                    height={Math.abs(p1.y-p2.y)}
                    fill={lineColor}
                    opacity={door.isPath ? 0.4 : 0}
                    style={{ animation: door.isPath ? 'pulse-glow-opacity 2s infinite' : 'none', transition: 'opacity 0.3s' }}
                    filter={door.isPath ? "url(#door-glow)" : "none"}
                    />
                    {isClicked && (
                    <circle cx={centerX} cy={centerY} r="10" fill={lineColor} className="door-clicked-effect" />
                    )}
                </g>
              </React.Fragment>
            );
          })}
        </g>
      </svg>
      {hoveredDoorInfo && (
        <div
            className="absolute p-2 text-sm bg-gray-900/80 border border-gray-500 rounded-md pointer-events-none"
            style={{
                left: hoveredDoorInfo.x,
                top: hoveredDoorInfo.y,
                transform: 'translate(-50%, -100%)',
                color: lineColor
            }}
        >
          {hoveredDoorInfo.description}
        </div>
      )}
    </div>
  );
};

export default CorridorCanvas;
