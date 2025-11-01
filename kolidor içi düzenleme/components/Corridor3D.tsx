
import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import type { CorridorSettings } from '../types';

// Using user-provided textures
const FLOOR_TEXTURE_URL = 'https://i.imgur.com/GkvJ3jC.jpg';
const WALL_TEXTURE_URL = 'https://i.imgur.com/F8xR2G1.jpg'; // User-provided wall texture

interface Corridor3DProps {
  settings: CorridorSettings;
  onNavigate: (id: string) => void;
}

const Wall: React.FC<{ position: [number, number, number], rotation: [number, number, number], size: [number, number], texture: THREE.Texture }> = ({ position, rotation, size, texture }) => {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
};

const FloorCeiling: React.FC<{ position: [number, number, number], rotation: [number, number, number], size: [number, number], texture?: THREE.Texture, color?: string }> = ({ position, rotation, size, texture, color }) => {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={texture} color={color} />
    </mesh>
  );
};

const Door: React.FC<{ doorData: CorridorSettings['doors'][0], onNavigate: (id: string) => void }> = ({ doorData, onNavigate }) => {
    const CORRIDOR_LENGTH = 40;
    const CORRIDOR_WIDTH = 8;
    const DOOR_HEIGHT = 4;
    const DOOR_WIDTH = 3;

    const zPos = -(doorData.position / 40) * CORRIDOR_LENGTH;
    const xPos = doorData.side === 'left' ? -CORRIDOR_WIDTH / 2 + 0.05 : CORRIDOR_WIDTH / 2 - 0.05;
    const yPos = -(5 - DOOR_HEIGHT) / 2;

    return (
        <mesh position={[xPos, yPos, zPos]} rotation={doorData.side === 'left' ? [0, Math.PI / 2, 0] : [0, -Math.PI / 2, 0]} onClick={() => onNavigate(doorData.id)}>
            <planeGeometry args={[DOOR_WIDTH, DOOR_HEIGHT]} />
            <meshStandardMaterial color="#3b2a1a" roughness={0.8} metalness={0.2} />
        </mesh>
    );
};

const CorridorScene: React.FC<Corridor3DProps> = ({ settings, onNavigate }) => {
  const CORRIDOR_LENGTH = 40;
  const CORRIDOR_WIDTH = 8;
  const CORRIDOR_HEIGHT = 5;

  const [floorTexture, wallTexture] = useTexture([FLOOR_TEXTURE_URL, WALL_TEXTURE_URL]);

  const textures = useMemo(() => {
      floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
      floorTexture.repeat.set(CORRIDOR_WIDTH / 0.75, CORRIDOR_LENGTH / 0.5);

      wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
      wallTexture.repeat.set(CORRIDOR_LENGTH / 5, CORRIDOR_HEIGHT / 5);
      return { floor: floorTexture, wall: wallTexture };
  }, [floorTexture, wallTexture]);

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[0, CORRIDOR_HEIGHT / 2 - 1, 18]} intensity={1.0} distance={30} color="#ffddaa" />
      
      <Wall position={[-CORRIDOR_WIDTH/2, 0, 0]} rotation={[0, Math.PI / 2, 0]} size={[CORRIDOR_LENGTH, CORRIDOR_HEIGHT]} texture={textures.wall} />
      <Wall position={[CORRIDOR_WIDTH/2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} size={[CORRIDOR_LENGTH, CORRIDOR_HEIGHT]} texture={textures.wall} />

      <FloorCeiling position={[0, -CORRIDOR_HEIGHT/2, 0]} rotation={[-Math.PI / 2, 0, 0]} size={[CORRIDOR_WIDTH, CORRIDOR_LENGTH]} texture={textures.floor} />
      <FloorCeiling position={[0, CORRIDOR_HEIGHT/2, 0]} rotation={[Math.PI / 2, 0, 0]} size={[CORRIDOR_WIDTH, CORRIDOR_LENGTH]} color="#ffffff" />
      
      <mesh position={[0, 0, -CORRIDOR_LENGTH/2]}>
        <planeGeometry args={[CORRIDOR_WIDTH, CORRIDOR_HEIGHT]} />
        <meshStandardMaterial map={textures.wall} />
      </mesh>

      {settings.doors.map(door => (
          <Door key={door.id} doorData={door} onNavigate={onNavigate} />
      ))}
    </>
  );
};

const Corridor3D: React.FC<Corridor3DProps> = (props) => {
    return (
        <Canvas camera={{ position: [0, 0, 18], fov: 55 }}>
            <React.Suspense fallback={null}>
              <CorridorScene {...props} />
            </React.Suspense>
        </Canvas>
    )
}

export default Corridor3D;
