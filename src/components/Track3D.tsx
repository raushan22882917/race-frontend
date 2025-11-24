import { useMemo } from 'react';
import { Vector3 } from '../utils/gpsUtils';
import { VehicleState } from '../types/telemetry';
import { Line, Text } from '@react-three/drei';
import { getTrackPoints, initializeTrackPoints } from '../utils/trackPathUtils';
import trackData from '../data/track.json';
import * as THREE from 'three';

interface Track3DProps {
  vehicles: Record<string, VehicleState>;
  showCenterLine?: boolean;
  showTrackEdges?: boolean;
  showCheckpoints?: boolean;
  showTurnMarkers?: boolean;
  showGrid?: boolean;
}

export function Track3D({ 
  vehicles, 
  showCenterLine = true, 
  showTrackEdges = false, // Disable edges by default
  showCheckpoints = false,
  showTurnMarkers = true,
  showGrid = false,
}: Track3DProps) {
  // Generate simple track path from track.json GPS coordinates
  const trackPoints = useMemo(() => {
    // Initialize track points (this ensures reference is set)
    initializeTrackPoints();
    
    // Get track points from shared utility - these are the centerline points
    return getTrackPoints();
  }, []);

  // Create smooth line points - connect points with straight segments
  const linePoints = useMemo(() => {
    if (trackPoints.length < 2) return [];
    
    // Map track points to line format - straight segments between points
    // This creates a simple line that follows the track path naturally
    const points = trackPoints.map((p) => [p.x, 0.02, p.z] as [number, number, number]);
    
    // Close the track by adding the first point at the end
    if (points.length > 0) {
      points.push(points[0]);
    }
    
    return points;
  }, [trackPoints]);

  // Calculate track bounds for ground plane
  const trackBounds = useMemo(() => {
    if (trackPoints.length === 0) return null;
    
    const xs = trackPoints.map(p => p.x);
    const zs = trackPoints.map(p => p.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const width = maxX - minX + 200; // Add padding
    const height = maxZ - minZ + 200; // Add padding
    
    return { centerX, centerZ, width, height };
  }, [trackPoints]);

  if (trackPoints.length < 2) return null;

  return (
    <group>
      {/* Track Ground Surface - Large plane under track */}
      {trackBounds && (
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[trackBounds.centerX, 0, trackBounds.centerZ]} 
          receiveShadow
        >
          <planeGeometry args={[trackBounds.width, trackBounds.height]} />
          <meshStandardMaterial 
            color="#1a1a1a" 
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
      )}

      {/* Simple Track Line - Single inside line following the track path */}
      {linePoints.length > 1 && (
        <Line
          points={linePoints}
          color="#FFFFFF"
          lineWidth={4}
        />
      )}

      {/* Grid */}
      {showGrid && trackBounds && (
        <group>
          {Array.from({ length: 20 }).map((_, i) => {
            const x = trackBounds.centerX - trackBounds.width / 2 + (trackBounds.width / 20) * i;
            const z1 = trackBounds.centerZ - trackBounds.height / 2;
            const z2 = trackBounds.centerZ + trackBounds.height / 2;
            return (
              <Line
                key={`grid-x-${i}`}
                points={[[x, 0.01, z1], [x, 0.01, z2]]}
                color="#333333"
                lineWidth={1}
                dashed
                dashScale={5}
                dashSize={2}
                gapSize={2}
              />
            );
          })}
          {Array.from({ length: 20 }).map((_, i) => {
            const z = trackBounds.centerZ - trackBounds.height / 2 + (trackBounds.height / 20) * i;
            const x1 = trackBounds.centerX - trackBounds.width / 2;
            const x2 = trackBounds.centerX + trackBounds.width / 2;
            return (
              <Line
                key={`grid-z-${i}`}
                points={[[x1, 0.01, z], [x2, 0.01, z]]}
                color="#333333"
                lineWidth={1}
                dashed
                dashScale={5}
                dashSize={2}
                gapSize={2}
              />
            );
          })}
        </group>
      )}


      {/* Checkpoints */}
      {showCheckpoints && trackPoints.length > 0 && (
        <>
          {trackPoints.map((point, idx) => {
            if (idx % 10 !== 0 || idx === 0) return null;
            return (
              <group key={`checkpoint-${idx}`} position={[point.x, 0.1, point.z]}>
                <mesh>
                  <cylinderGeometry args={[0.5, 0.5, 2, 8]} />
                  <meshStandardMaterial color="#FFD700" />
                </mesh>
                <Text
                  position={[0, 1.5, 0]}
                  fontSize={0.5}
                  color="#FFFFFF"
                  anchorX="center"
                  anchorY="middle"
                >
                  CP{Math.floor(idx / 10)}
                </Text>
              </group>
            );
          })}
        </>
      )}

      {/* Turn Markers */}
      {showTurnMarkers && trackPoints.length > 0 && trackData.turns && (
        <>
          {trackData.turns.map((turn: any) => {
            const pointIndex = turn.point;
            if (pointIndex >= 0 && pointIndex < trackPoints.length) {
              const point = trackPoints[pointIndex];
              return (
                <group key={`turn-${turn.id}`} position={[point.x, 0.1, point.z]}>
                  <mesh>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="#FF0000" />
                  </mesh>
                  <Text
                    position={[0, 1, 0]}
                    fontSize={0.6}
                    color="#FFFFFF"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.05}
                    outlineColor="#000000"
                  >
                    {turn.name}
                  </Text>
                </group>
              );
            }
            return null;
          })}
        </>
      )}

      {/* Start/Finish Line */}
      {trackPoints.length > 1 && (() => {
        const startPoint = trackPoints[0];
        const nextPoint = trackPoints[1];
        const dx = nextPoint.x - startPoint.x;
        const dz = nextPoint.z - startPoint.z;
        const angle = Math.atan2(dx, dz);
        const lineLength = 20;
        
        // Calculate perpendicular direction for the line
        const perpX = Math.cos(angle + Math.PI / 2);
        const perpZ = Math.sin(angle + Math.PI / 2);
        
        return (
          <group position={[startPoint.x, 0.05, startPoint.z]} rotation={[0, angle, 0]}>
            {/* Start/Finish Marker - Simple yellow line perpendicular to track */}
            <Line
              points={[
                [-lineLength / 2, 0, 0],
                [lineLength / 2, 0, 0]
              ]}
              color="#FFFF00"
              lineWidth={4}
            />
            
            {/* Start/Finish text */}
            <Text
              position={[0, 0.1, 0]}
              fontSize={0.8}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.05}
              outlineColor="#000000"
            >
              START/FINISH
            </Text>
          </group>
        );
      })()}
    </group>
  );
}


