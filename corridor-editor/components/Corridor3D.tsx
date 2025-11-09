
import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import type { CorridorSettings } from '../types';

const FLOOR_TEXTURE_URL = 'https://i.imgur.com/GkvJ3jC.jpg';
const WALL_TEXTURE_URL = 'https://i.imgur.com/F8xR2G1.jpg';

interface Corridor3DProps {
  settings: CorridorSettings;
  onNavigate: (id: string) => void;
  cameraRotationY?: number; // New prop for camera rotation
}

const Wall: React.FC<{ position: [number, number, number], rotation: [number, number, number], size: [number, number], texture: THREE.Texture }> = ({ position, rotation, size, texture }) => { /* ... */ };
const FloorCeiling: React.FC<{ position: [number, number, number], rotation: [number, number, number], size: [number, number], texture?: THREE.Texture, color?: string }> = ({ position, rotation, size, texture, color }) => { /* ... */ };
const Door: React.FC<{ doorData: CorridorSettings['doors'][0], onNavigate: (id: string) => void }> = ({ doorData, onNavigate }) => { /* ... */ };


// This new component will handle the camera rotation
const CameraController: React.FC<{ rotationY: number }> = ({ rotationY }) => {
  useFrame((state) => {
    // Smoothly interpolate the camera rotation for a nicer effect
    state.camera.rotation.y = THREE.MathUtils.lerp(state.camera.rotation.y, rotationY, 0.1);
    state.camera.updateProjectionMatrix();
  });
  return null;
};


const CorridorScene: React.FC<Corridor3DProps> = ({ settings, onNavigate, cameraRotationY = 0 }) => {
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
      <CameraController rotationY={cameraRotationY} />
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
