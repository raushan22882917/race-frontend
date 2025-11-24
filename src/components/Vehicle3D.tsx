import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Group } from 'three';
import * as THREE from 'three';
import { useTelemetryStore } from '../store/telemetryStore';
import { Text } from '@react-three/drei';

interface Vehicle3DProps {
  vehicleId: string;
  isSelected: boolean;
}

// Vehicle colors based on ID
const VEHICLE_COLORS: Record<string, string> = {
  '13': '#3b82f6', // Blue
  '22': '#ef4444', // Red
  '46': '#10b981', // Green
  '88': '#f59e0b', // Orange
  '51': '#8b5cf6', // Purple
  '2': '#ec4899',  // Pink
  '47': '#06b6d4', // Cyan
  '55': '#84cc16', // Lime
};


export function Vehicle3D({ vehicleId, isSelected }: Vehicle3DProps) {
  const groupRef = useRef<Group>(null);
  const { vehicles, leaderboard } = useTelemetryStore();
  const vehicle = vehicles[vehicleId];
  const previousPosition = useRef<{ x: number; y: number; z: number } | null>(null);
  const currentPosition = useRef(new THREE.Vector3());
  const targetPosition = useRef(new THREE.Vector3());
  const currentRotation = useRef(0);
  const targetRotation = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current || !vehicle) return;

    const { position, rotation } = vehicle;

    // Initialize previous position if needed
    if (!previousPosition.current) {
      previousPosition.current = { x: position.x, y: position.y, z: position.z };
      currentPosition.current.set(position.x, position.y, position.z);
      targetPosition.current.set(position.x, position.y, position.z);
      currentRotation.current = rotation.y || 0;
      targetRotation.current = rotation.y || 0;
    }

    // Update target position and rotation
    targetPosition.current.set(position.x, position.y, position.z);
    targetRotation.current = rotation.y || 0;

    // Smooth interpolation for position (real-time movement)
    const lerpFactor = Math.min(1, delta * 10); // Smooth movement based on frame delta
    currentPosition.current.lerp(targetPosition.current, lerpFactor);
    
    // Smooth rotation interpolation
    const rotationDiff = targetRotation.current - currentRotation.current;
    // Normalize rotation difference to shortest path
    let normalizedDiff = rotationDiff;
    if (normalizedDiff > Math.PI) normalizedDiff -= 2 * Math.PI;
    if (normalizedDiff < -Math.PI) normalizedDiff += 2 * Math.PI;
    currentRotation.current += normalizedDiff * lerpFactor;

    // Update vehicle position smoothly
    groupRef.current.position.copy(currentPosition.current);
    groupRef.current.rotation.y = currentRotation.current;

    // Update previous position
    previousPosition.current = { x: position.x, y: position.y, z: position.z };
  });

  if (!vehicle) return null;

  // Get vehicle color or use default
  const baseColor = VEHICLE_COLORS[vehicleId] || VEHICLE_COLORS[vehicleId.split('-')[2]] || '#ef4444';
  const color = isSelected ? '#3b82f6' : baseColor;
  const scale = isSelected ? 1.2 : 1.0;
  
  // Get position from leaderboard
  const leaderboardEntry = leaderboard.find(e => e.vehicle_id === vehicleId);
  const position = leaderboardEntry?.position || 0;
  const speed = vehicle.telemetry.speed || 0;

  return (
    <group ref={groupRef}>
      {/* 3D Car Model - Always use SVG-style 3D representation */}
      {/* Car Body - More realistic shape */}
      <mesh castShadow receiveShadow scale={[scale, scale, scale]} position={[0, 0.75, 0]}>
        <boxGeometry args={[4, 1.5, 2]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Car Roof */}
      <mesh castShadow receiveShadow scale={[scale, scale, scale]} position={[0, 1.5, 0]}>
        <boxGeometry args={[3, 0.8, 1.5]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Front Windshield */}
      <mesh castShadow scale={[scale, scale, scale]} position={[0, 1.3, 0.75]}>
        <boxGeometry args={[2.8, 0.6, 0.1]} />
        <meshStandardMaterial color="#87CEEB" transparent opacity={0.7} />
      </mesh>

      {/* Wheels */}
      <Wheel position={[-1.5, -0.75, 1]} rotation={vehicle.telemetry.steering || 0} />
      <Wheel position={[-1.5, -0.75, -1]} rotation={vehicle.telemetry.steering || 0} />
      <Wheel position={[1.5, -0.75, 1]} />
      <Wheel position={[1.5, -0.75, -1]} />

      {/* Base shadow/ground indicator */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 16]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.3} />
      </mesh>

      {/* Vehicle Number Label */}
      <Text
        position={[0, 2.5, 0]}
        fontSize={1}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.1}
        outlineColor="#000000"
      >
        #{vehicleId.split('-')[2] || vehicleId}
      </Text>

      {/* Position Badge */}
      {position > 0 && (
        <mesh position={[0, 3, 0]}>
          <cylinderGeometry args={[0.8, 0.8, 0.3, 16]} />
          <meshStandardMaterial color="#1a1a1a" />
          <Text
            position={[0, 0, 0.16]}
            fontSize={0.6}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {position}
          </Text>
        </mesh>
      )}

      {/* Speed Indicator */}
      <mesh position={[0, 1.8, -1.2]}>
        <planeGeometry args={[1.5, 0.4]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.7} />
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.3}
          color="#00ff00"
          anchorX="center"
          anchorY="middle"
        >
          {speed.toFixed(0)} km/h
        </Text>
      </mesh>

      {/* Selection Indicator */}
      {isSelected && (
        <>
          <mesh position={[0, 0.1, 0]}>
            <ringGeometry args={[2.5, 3, 32]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <ringGeometry args={[3, 3.5, 32]} />
            <meshBasicMaterial color="#60a5fa" transparent opacity={0.3} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Wheel({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const wheelRef = useRef<Mesh>(null);

  useFrame(() => {
    if (wheelRef.current) {
      wheelRef.current.rotation.x += 0.1;
    }
  });

  return (
    <mesh ref={wheelRef} position={position} rotation={[0, rotation, 0]} castShadow>
      <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
      <meshStandardMaterial color="#1a1a1a" />
    </mesh>
  );
}

