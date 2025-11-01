
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CorridorSettings } from '../types';

interface Corridor3DProps {
  settings: CorridorSettings;
  onNavigate: (id: string) => void;
}

const Wall: React.FC<{ position: [number, number, number], rotation: [number, number, number], size: [number, number] }> = ({ position, rotation, size }) => {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshStandardMaterial color="#f0e6d2" side={THREE.DoubleSide} />
    </mesh>
  );
};

const FloorCeiling: React.FC<{ position: [number, number, number], rotation: [number, number, number], size: [number, number], color: string }> = ({ position, rotation, size, color }) => {
    return (
      <mesh position={position} rotation={rotation}>
        <planeGeometry args={size} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    );
  };

const Door: React.FC<{ doorData: CorridorSettings['doors'][0], onNavigate: (id: string) => void }> = ({ doorData, onNavigate }) => {
    const CORRIDOR_LENGTH = 50;
    const CORRIDOR_WIDTH = 10;

    const zPos = -(doorData.position / 40) * CORRIDOR_LENGTH + (CORRIDOR_LENGTH / 2);
    const xPos = doorData.side === 'left' ? -CORRIDOR_WIDTH / 2 : CORRIDOR_WIDTH / 2;

    return (
        <mesh 
            position={[xPos, 0, zPos]}
            onClick={() => onNavigate(doorData.id)}
        >
            <planeGeometry args={[2, 4]} />
            <meshStandardMaterial color={doorData.isPath ? '#66ff66' : '#8B4513'} />
        </mesh>
    )
}

const CorridorScene: React.FC<Corridor3DProps> = ({ settings, onNavigate }) => {
  const CORRIDOR_LENGTH = 50;
  const CORRIDOR_WIDTH = 10;
  const CORRIDOR_HEIGHT = 5;

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 10, -5]} intensity={0.7} />
      
      {/* Walls */}
      <Wall position={[-CORRIDOR_WIDTH/2, 0, 0]} rotation={[0, Math.PI / 2, 0]} size={[CORRIDOR_LENGTH, CORRIDOR_HEIGHT]} />
      <Wall position={[CORRIDOR_WIDTH/2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} size={[CORRIDOR_LENGTH, CORRIDOR_HEIGHT]} />

      {/* Floor & Ceiling */}
      <FloorCeiling position={[0, -CORRIDOR_HEIGHT/2, 0]} rotation={[-Math.PI / 2, 0, 0]} size={[CORRIDOR_WIDTH, CORRIDOR_LENGTH]} color="#888888" />
      <FloorCeiling position={[0, CORRIDOR_HEIGHT/2, 0]} rotation={[Math.PI / 2, 0, 0]} size={[CORRIDOR_WIDTH, CORRIDOR_LENGTH]} color="#ffffff" />

      {/* Doors */}
      {settings.doors.map(door => (
          <Door key={door.id} doorData={door} onNavigate={onNavigate} />
      ))}
    </>
  );
};

const Corridor3D: React.FC<Corridor3DProps> = (props) => {
    return (
        <Canvas camera={{ position: [0, 0, 25], fov: 75 }}>
            <CorridorScene {...props} />
        </Canvas>
    )
}

export default Corridor3D;
