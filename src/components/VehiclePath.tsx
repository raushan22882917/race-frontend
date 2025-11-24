import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { Vector3 } from '../utils/gpsUtils';

interface VehiclePathProps {
  path: Vector3[];
  color: string;
  vehicleId: string;
  opacity?: number;
}

export function VehiclePath({ path, color, vehicleId, opacity = 0.6 }: VehiclePathProps) {
  const linePoints = useMemo(() => {
    if (path.length < 2) return [];
    return path.map((p) => [p.x, p.y + 0.2, p.z] as [number, number, number]);
  }, [path]);

  if (linePoints.length < 2) return null;

  return (
    <Line
      points={linePoints}
      color={color}
      lineWidth={3}
      transparent
      opacity={opacity}
      key={`path-${vehicleId}`}
    />
  );
}

