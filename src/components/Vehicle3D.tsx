import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo, useState, useEffect } from 'react';
import { Mesh, Group } from 'three';
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

// Get vehicle image path based on vehicle ID - tries both .png and .jpg
function getVehicleImagePath(vehicleId: string): string {
  // Extract vehicle number from ID (format: GR86-XXX-YY or similar)
  const parts = vehicleId.split('-');
  let baseName = '';
  
  if (parts.length >= 3) {
    // Format: GR86-026-72 -> GR86-026-72
    baseName = `${parts[0]}-${parts[1]}-${parts[2]}`;
  } else {
    // Fallback: try with just the last part
    const vehicleNumber = parts[parts.length - 1];
    baseName = `GR86-${vehicleNumber.padStart(3, '0')}-${vehicleNumber}`;
  }
  
  // Return base name - the loading logic will try both extensions
  return `/vehical/${baseName}`;
}

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

  // Load vehicle image texture - try both .png and .jpg
  const vehicleImageBase = useMemo(() => getVehicleImagePath(vehicleId), [vehicleId]);
  const [vehicleTexture, setVehicleTexture] = useState<THREE.Texture | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  useEffect(() => {
    setImageLoaded(false);
    setVehicleTexture(null);
    
    const loader = new THREE.TextureLoader();
    let loaded = false;
    
    // Try .png first, then .jpg
    const tryLoadImage = (extension: string) => {
      if (loaded) return;
      
      loader.load(
        `${vehicleImageBase}.${extension}`,
        (texture) => {
          if (!loaded) {
            loaded = true;
            texture.flipY = false;
            texture.encoding = THREE.sRGBEncoding;
            setVehicleTexture(texture);
            setImageLoaded(true);
          }
        },
        undefined,
        () => {
          // If .png fails, try .jpg
          if (extension === 'png' && !loaded) {
            tryLoadImage('jpg');
          } else if (!loaded) {
            // Both failed - will use 3D car model instead
            setVehicleTexture(null);
            setImageLoaded(false);
          }
        }
      );
    };
    
    // Start with .png
    tryLoadImage('png');
  }, [vehicleImageBase]);

  // Billboard ref for image sprite
  const billboardRef = useRef<Mesh>(null);
  const { camera } = useThree();

  // Make image always face camera
  useFrame(() => {
    if (billboardRef.current && imageLoaded) {
      billboardRef.current.lookAt(camera.position);
    }
  });

  return (
    <group ref={groupRef}>
      {imageLoaded && vehicleTexture ? (
        // Show vehicle image as a billboard that faces camera
        <>
          <mesh ref={billboardRef} position={[0, 1.2, 0]} scale={[scale * 1.2, scale * 1.2, scale]}>
            <planeGeometry args={[4, 3]} />
            <meshStandardMaterial 
              map={vehicleTexture}
              transparent
              side={THREE.DoubleSide}
              depthWrite={false}
              alphaTest={0.1}
            />
          </mesh>
          {/* Base shadow/ground indicator */}
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.5, 16]} />
            <meshStandardMaterial color="#000000" transparent opacity={0.3} />
          </mesh>
        </>
      ) : (
        // Show 3D car model if no image
        <>
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
        </>
      )}

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

