/**
 * Track Path Utilities
 * Projects vehicle positions onto the track path defined in track.json
 */

import { Vector3, geoToUnity, setReferenceFromPoints } from './gpsUtils';
import trackData from '../data/track.json';

// Cache track points in 3D space
let cachedTrackPoints: Vector3[] | null = null;
let trackPointsInitialized = false;

/**
 * Initialize track points from track.json
 * This should be called once when the app starts
 */
export function initializeTrackPoints(): Vector3[] {
  if (cachedTrackPoints && trackPointsInitialized) {
    return cachedTrackPoints;
  }

  // Convert GPS coordinates to 3D positions
  const gpsPoints = trackData.trackPath.map((point) => ({
    lat: point.latitude,
    lon: point.longitude,
  }));

  // Set reference from track points if not already set
  if (gpsPoints.length > 0) {
    setReferenceFromPoints(gpsPoints, 1.0);
  }

  // Convert all track points to 3D coordinates
  cachedTrackPoints = gpsPoints.map((point) => geoToUnity(point.lat, point.lon, 0));
  trackPointsInitialized = true;

  return cachedTrackPoints;
}

/**
 * Get the track points array
 */
export function getTrackPoints(): Vector3[] {
  return initializeTrackPoints();
}

/**
 * Calculate distance between two 3D points (ignoring Y axis)
 */
function distance2D(p1: Vector3, p2: Vector3): number {
  const dx = p1.x - p2.x;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Calculate distance from a point to a line segment
 * Returns the closest point on the segment and the distance
 */
function pointToLineSegment(
  point: Vector3,
  lineStart: Vector3,
  lineEnd: Vector3
): { closestPoint: Vector3; distance: number; t: number } {
  const dx = lineEnd.x - lineStart.x;
  const dz = lineEnd.z - lineStart.z;
  const lengthSq = dx * dx + dz * dz;

  if (lengthSq === 0) {
    // Line segment is a point
    const dist = distance2D(point, lineStart);
    return { closestPoint: { ...lineStart, y: point.y }, distance: dist, t: 0 };
  }

  // Calculate parameter t (position along segment: 0 = start, 1 = end)
  const t = Math.max(0, Math.min(1, 
    ((point.x - lineStart.x) * dx + (point.z - lineStart.z) * dz) / lengthSq
  ));

  // Calculate closest point on segment
  const closestPoint: Vector3 = {
    x: lineStart.x + t * dx,
    y: point.y, // Preserve original Y (altitude)
    z: lineStart.z + t * dz,
  };

  const distance = distance2D(point, closestPoint);

  return { closestPoint, distance, t };
}

/**
 * Project a vehicle position onto the nearest point on the track path centerline
 * This ensures vehicles always follow the exact track path coordinates
 * Returns both the projected position and rotation (direction along track)
 */
export function projectToTrackPath(vehiclePosition: Vector3): { position: Vector3; rotation: number } {
  const trackPoints = getTrackPoints();
  
  if (trackPoints.length === 0) {
    return { 
      position: vehiclePosition, 
      rotation: 0 
    };
  }

  if (trackPoints.length === 1) {
    // Only one point, snap to it
    return { 
      position: { ...trackPoints[0], y: vehiclePosition.y }, 
      rotation: 0 
    };
  }

  let minDistance = Infinity;
  let closestPoint: Vector3 = vehiclePosition;
  let bestSegmentIndex = 0;
  let bestT = 0;

  // Check each segment of the track
  for (let i = 0; i < trackPoints.length; i++) {
    const start = trackPoints[i];
    const end = trackPoints[(i + 1) % trackPoints.length]; // Wrap around for closed track

    const { closestPoint: segmentClosest, distance, t } = pointToLineSegment(
      vehiclePosition,
      start,
      end
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = segmentClosest;
      bestSegmentIndex = i;
      bestT = t;
    }
  }

  // Calculate rotation based on track direction
  const start = trackPoints[bestSegmentIndex];
  const end = trackPoints[(bestSegmentIndex + 1) % trackPoints.length];
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  
  // Calculate angle in radians (rotation around Y axis)
  // atan2 gives angle from positive X axis, but we need angle from positive Z axis (north)
  // In Unity/Three.js: 0 = forward (Z+), positive = clockwise
  const rotation = Math.atan2(dx, dz);

  return {
    position: closestPoint,
    rotation: rotation
  };
}

/**
 * Get the track progress (0-1) for a vehicle position
 * Returns the normalized position along the track path
 */
export function getTrackProgress(vehiclePosition: Vector3): number {
  const trackPoints = getTrackPoints();
  
  if (trackPoints.length < 2) {
    return 0;
  }

  let minDistance = Infinity;
  let bestT = 0;
  let bestSegmentIndex = 0;

  // Find the closest segment
  for (let i = 0; i < trackPoints.length; i++) {
    const start = trackPoints[i];
    const end = trackPoints[(i + 1) % trackPoints.length];

    const { distance, t } = pointToLineSegment(vehiclePosition, start, end);

    if (distance < minDistance) {
      minDistance = distance;
      bestT = t;
      bestSegmentIndex = i;
    }
  }

  // Calculate progress: (segmentIndex + t) / totalSegments
  const progress = (bestSegmentIndex + bestT) / trackPoints.length;
  return Math.max(0, Math.min(1, progress)); // Clamp to [0, 1]
}

/**
 * Get position on track path at a given progress (0-1)
 */
export function getPositionAtProgress(progress: number, altitude: number = 0): Vector3 {
  const trackPoints = getTrackPoints();
  
  if (trackPoints.length === 0) {
    return { x: 0, y: altitude, z: 0 };
  }

  if (trackPoints.length === 1) {
    return { ...trackPoints[0], y: altitude };
  }

  // Clamp progress to [0, 1]
  const clampedProgress = Math.max(0, Math.min(1, progress));
  
  // Calculate which segment and position within that segment
  const totalLength = trackPoints.length;
  const exactPosition = clampedProgress * totalLength;
  const segmentIndex = Math.floor(exactPosition) % trackPoints.length;
  const t = exactPosition - segmentIndex;

  const start = trackPoints[segmentIndex];
  const end = trackPoints[(segmentIndex + 1) % trackPoints.length];

  return {
    x: start.x + t * (end.x - start.x),
    y: altitude,
    z: start.z + t * (end.z - start.z),
  };
}

