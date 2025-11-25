import { useMemo, useState, useEffect, useRef } from 'react';
import { GoogleMap, useLoadScript, Polyline, Polygon, Marker } from '@react-google-maps/api';
import trackData from '../data/track.json';
import { useTelemetryStore } from '../store/telemetryStore';
import { useModal } from '../contexts/ModalContext';
import { apiService } from '../services/apiService';
import { getTrackProgress } from '../utils/trackPathUtils';
import { geoToUnity } from '../utils/gpsUtils';

const containerStyle = {
  width: '100%',
  height: '100%',
};

// Default center (will be calculated from track data)
const defaultCenter = {
  lat: 33.532687202828264,
  lng: -86.61964077924488,
};

// Google Maps API key - you'll need to replace this with your own
// For development, you can use a free API key from Google Cloud Console
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Static libraries array for Google Maps LoadScript to prevent unnecessary reloads
const GOOGLE_MAPS_LIBRARIES: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places'];

// Vehicle colors for markers - distinct vibrant colors for each vehicle
const VEHICLE_COLORS: Record<string, string> = {
  '13': '#ef4444', // Red
  '22': '#10b981', // Green
  '46': '#f59e0b', // Orange
  '88': '#8b5cf6', // Purple
  '51': '#ec4899', // Pink
  '2': '#f97316',  // Orange-red
  '3': '#14b8a6',  // Teal
  '5': '#a855f7',  // Violet
  '7': '#eab308',  // Yellow
  '16': '#dc2626', // Dark red
  '18': '#059669', // Emerald
  '21': '#d97706', // Amber
  '26': '#f43f5e', // Rose
  '31': '#7c3aed', // Deep purple
  '47': '#06b6d4', // Cyan
  '55': '#84cc16', // Lime
  '72': '#6366f1', // Indigo
  '78': '#fbbf24', // Amber yellow
  '80': '#14b8a6', // Teal
  '93': '#f97316', // Orange-red
  '98': '#ec4899', // Pink
  '113': '#a855f7', // Violet
  '4': '#fbbf24',  // Yellow
  '6': '#dc2626',  // Dark red
  '10': '#059669', // Emerald
  '15': '#d97706', // Amber
  '30': '#f43f5e', // Rose
  '33': '#7c3aed', // Deep purple
  '36': '#06b6d4', // Cyan
  '38': '#84cc16', // Lime
  '40': '#6366f1', // Indigo
  '49': '#fbbf24', // Yellow
  '60': '#dc2626', // Dark red
  '63': '#059669', // Emerald
  '65': '#d97706', // Amber
};

// Function to get vehicle color from vehicleId
const getVehicleColor = (vehicleId: string): string => {
  // Try to extract vehicle number from ID (format: GR86-XXX-YY or similar)
  const parts = vehicleId.split('-');
  
  // Try last part as vehicle number
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    if (VEHICLE_COLORS[lastPart]) {
      return VEHICLE_COLORS[lastPart];
    }
  }
  
  // Try middle part (like GR86-026-72, try "026" or "26")
  if (parts.length >= 2) {
    const middlePart = parts[parts.length - 2];
    const numPart = middlePart.replace(/^0+/, ''); // Remove leading zeros
    if (VEHICLE_COLORS[middlePart]) {
      return VEHICLE_COLORS[middlePart];
    }
    if (VEHICLE_COLORS[numPart]) {
      return VEHICLE_COLORS[numPart];
    }
  }
  
  // Generate color based on vehicleId hash for consistent coloring
  // Use vibrant, distinct colors avoiding blue
  let hash = 0;
  for (let i = 0; i < vehicleId.length; i++) {
    hash = vehicleId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Predefined vibrant color palette for fallback
  const vibrantColors = [
    '#ef4444', // Red
    '#10b981', // Green
    '#f59e0b', // Orange
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#f97316', // Orange-red
    '#14b8a6', // Teal
    '#a855f7', // Violet
    '#eab308', // Yellow
    '#dc2626', // Dark red
    '#059669', // Emerald
    '#d97706', // Amber
    '#f43f5e', // Rose
    '#7c3aed', // Deep purple
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#6366f1', // Indigo
    '#fbbf24', // Amber yellow
  ];
  
  // Use hash to select from vibrant colors
  const colorIndex = Math.abs(hash) % vibrantColors.length;
  return vibrantColors[colorIndex];
};

interface VehicleData {
  position: { lat: number; lng: number };
  heading?: number;
  speed?: number;
  vehicleId?: string;
}

interface TrackMapProps {
  vehicles?: Record<string, VehicleData>;
  showStartFinish?: boolean;
  showCheckpoints?: boolean;
}

interface FinishCelebration {
  vehicleId: string;
  position: { lat: number; lng: number };
  timestamp: number;
  speed?: number;
  heading?: number;
}

export function TrackMap({ vehicles, showStartFinish = true, showCheckpoints = false }: TrackMapProps) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const { vehiclePaths, isPlaying, vehicles: telemetryVehicles, setRaceFinished, resetRace, leaderboard } = useTelemetryStore();
  const { setShowLeaderboard } = useModal();
  const [firstFinisher, setFirstFinisher] = useState<FinishCelebration | null>(null);
  const [showWinnerDialog, setShowWinnerDialog] = useState(false);
  const [allVehicles, setAllVehicles] = useState<Array<{ id: string; name?: string }>>([]);
  const previousProgress = useRef<Record<string, number>>({});
  
  // Load all vehicles from API
  useEffect(() => {
    const loadAllVehicles = async () => {
      try {
        const data = await apiService.getVehicles() as { vehicles?: Array<{ id: string; name?: string }> };
        if (data.vehicles) {
          setAllVehicles(data.vehicles);
        }
      } catch (err) {
        console.error('Failed to load vehicles:', err);
      }
    };
    loadAllVehicles();
    // Refresh every 30 seconds
    const interval = setInterval(loadAllVehicles, 30000);
    return () => clearInterval(interval);
  }, []);

  // Create hardcoded vehicle icon - stylized racing car pointing in direction of travel
  const createVehicleIcon = (color: string, heading: number): google.maps.Icon | undefined => {
    const googleMaps = window.google?.maps;
    if (!googleMaps) {
      return undefined;
    }

    // Hardcoded vehicle icon - stylized racing car SVG, rotated to show direction
    const iconSize = 80;
    const viewBoxSize = 800;
    const viewBoxHeight = 300;
    const centerX = viewBoxSize / 2;
    const centerY = viewBoxHeight / 2;
    
    // Convert vehicle heading (0° = north) to SVG rotation (car points right/east by default)
    // Car SVG points right (east = 90°), so subtract 90° to align with vehicle heading
    const svgRotation = heading - 90;
    
    // Create the racing car SVG with custom color and rotation
    const iconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxHeight}" width="${iconSize}" height="${iconSize * (viewBoxHeight / viewBoxSize)}" role="img" aria-labelledby="title desc">
        <title id="title">Stylized Racing Car</title>
        <desc id="desc">A stylized racing car with two wheels, spoiler and racing stripes.</desc>
        <defs>
          <linearGradient id="bodyGrad-${color.replace('#', '')}" x1="0" x2="1">
            <stop offset="0" stop-color="${color}"/>
            <stop offset="1" stop-color="${color}" stop-opacity="0.8"/>
          </linearGradient>
          <linearGradient id="stripeGrad-${color.replace('#', '')}" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
            <stop offset="1" stop-color="#e6e6e6" stop-opacity="0.8"/>
          </linearGradient>
          <radialGradient id="rimGrad-${color.replace('#', '')}" cx="30%" cy="30%">
            <stop offset="0" stop-color="#ffffff"/>
            <stop offset="1" stop-color="#555555"/>
          </radialGradient>
          <filter id="shadow-${color.replace('#', '')}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.3"/>
          </filter>
        </defs>
        <g transform="rotate(${svgRotation} ${centerX} ${centerY})">
          <!-- Ground / motion blur -->
          <rect x="0" y="240" width="${viewBoxSize}" height="60" fill="#111" opacity="0.06"/>
          <!-- Motion lines (suggesting speed) -->
          <g opacity="0.45" stroke-linecap="round" stroke-width="6" stroke="${color}">
            <line x1="80" y1="110" x2="20" y2="100"/>
            <line x1="80" y1="130" x2="10" y2="120"/>
            <line x1="80" y1="150" x2="20" y2="140"/>
          </g>
          <!-- Car shadow -->
          <ellipse cx="400" cy="235" rx="170" ry="18" fill="#000" opacity="0.12"/>
          <!-- Car body group -->
          <g filter="url(#shadow-${color.replace('#', '')})">
            <!-- Main body -->
            <path d="M120 200
                     C120 160, 180 120, 340 120
                     L540 120
                     C580 120, 640 140, 700 170
                     C720 185, 730 200, 730 212
                     L720 212
                     C710 230, 660 245, 600 245
                     L220 245
                     C170 245, 130 230, 120 200 Z"
                  fill="url(#bodyGrad-${color.replace('#', '')})" stroke="#b33" stroke-width="2"/>
            <!-- Roof / cockpit -->
            <path d="M300 130
                     C340 110, 420 110, 480 130
                     L520 130
                     C540 130, 560 140, 570 150
                     L560 170
                     C520 160, 460 150, 420 150
                     C380 150, 340 150, 300 160 Z"
                  fill="#2b2b2b" opacity="0.92" />
            <!-- Window -->
            <path d="M315 135
                     C350 120, 430 120, 470 135
                     L495 135
                     C505 135, 515 140, 520 145
                     L515 160
                     C475 150, 410 145, 360 150
                     C330 152, 320 148, 315 135 Z"
                  fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
            <!-- Front splitter -->
            <path d="M560 170 L700 170 L660 188 L540 188 Z" fill="#1b1b1b" opacity="0.9"/>
            <!-- Rear spoiler -->
            <g transform="translate(580,100)">
              <rect x="-10" y="-8" width="120" height="10" rx="3" fill="#222" transform="skewX(-12)"/>
              <rect x="-2" y="-2" width="90" height="8" rx="3" fill="#333"/>
              <rect x="10" y="6" width="12" height="30" rx="3" fill="#222"/>
              <rect x="68" y="6" width="12" height="30" rx="3" fill="#222"/>
            </g>
            <!-- Racing stripes -->
            <g transform="translate(230,125)">
              <rect x="-40" y="-6" width="60" height="20" rx="6" fill="url(#stripeGrad-${color.replace('#', '')})" transform="skewX(-6)"/>
              <rect x="0" y="-8" width="30" height="24" rx="6" fill="url(#stripeGrad-${color.replace('#', '')})" transform="skewX(-6)"/>
            </g>
            <!-- Number plate -->
            <rect x="360" y="160" width="48" height="30" rx="6" fill="#fff" stroke="#ddd" stroke-width="2"/>
            <text x="384" y="182" font-family="Verdana" font-size="16" font-weight="700" text-anchor="middle" fill="#111">7</text>
          </g>
          <!-- Wheels -->
          <g>
            <!-- Rear wheel -->
            <g transform="translate(240,245)">
              <circle cx="0" cy="-5" r="34" fill="#0b0b0b" />
              <circle cx="0" cy="-5" r="20" fill="url(#rimGrad-${color.replace('#', '')})"/>
              <circle cx="0" cy="-5" r="6" fill="#111"/>
              <!-- hub spokes -->
              <g stroke="#111" stroke-width="2" opacity="0.7">
                <line x1="-2" y1="-8" x2="10" y2="-20"/>
                <line x1="2" y1="-8" x2="-12" y2="-20"/>
                <line x1="-15" y1="-2" x2="15" y2="-2"/>
              </g>
            </g>
            <!-- Front wheel -->
            <g transform="translate(560,245)">
              <circle cx="0" cy="-5" r="34" fill="#0b0b0b"/>
              <circle cx="0" cy="-5" r="20" fill="url(#rimGrad-${color.replace('#', '')})"/>
              <circle cx="0" cy="-5" r="6" fill="#111"/>
              <g stroke="#111" stroke-width="2" opacity="0.7">
                <line x1="-2" y1="-8" x2="10" y2="-20"/>
                <line x1="2" y1="-8" x2="-12" y2="-20"/>
                <line x1="-15" y1="-2" x2="15" y2="-2"/>
              </g>
            </g>
          </g>
          <!-- Small details: air intake & accents -->
          <g>
            <ellipse cx="440" cy="170" rx="40" ry="12" fill="#000" opacity="0.12"/>
            <rect x="250" y="185" width="42" height="8" rx="3" fill="#0d0d0d" opacity="0.35"/>
          </g>
        </g>
      </svg>
    `;
    
    const iconUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(iconSvg);
    const iconHeight = iconSize * (viewBoxHeight / viewBoxSize);
    
    return {
      url: iconUrl,
      scaledSize: new googleMaps.Size(iconSize, iconHeight),
      anchor: new googleMaps.Point(iconSize / 2, iconHeight / 2),
    };
  };

  // Create label card icon showing vehicle number and speed
  const createVehicleLabelIcon = (vehicleId: string, speed: number, color: string): google.maps.Icon | undefined => {
    const googleMaps = window.google?.maps;
    if (!googleMaps) {
      return undefined;
    }

    // Extract vehicle number from ID
    const parts = vehicleId.split('-');
    const vehicleNumber = parts.length > 0 ? parts[parts.length - 1] : vehicleId;
    
    // Create a label with vehicle number and speed (no background)
    const labelWidth = 80;
    const labelHeight = 30;
    
    const labelSvg = `
      <svg width="${labelWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="textShadow-${color.replace('#', '')}">
            <feDropShadow dx="1" dy="1" stdDeviation="2" flood-color="#000000" flood-opacity="0.8"/>
          </filter>
        </defs>
        <text x="${labelWidth/2}" y="12" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="${color}" text-anchor="middle" filter="url(#textShadow-${color.replace('#', '')})" stroke="#FFFFFF" stroke-width="0.5">#${vehicleNumber}</text>
        <text x="${labelWidth/2}" y="24" font-family="Arial, sans-serif" font-size="9" fill="#FFFFFF" text-anchor="middle" filter="url(#textShadow-${color.replace('#', '')})" stroke="#000000" stroke-width="0.3">${speed.toFixed(0)} km/h</text>
      </svg>
    `;
    
    const labelUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(labelSvg);
    
    return {
      url: labelUrl,
      scaledSize: new googleMaps.Size(labelWidth, labelHeight),
      anchor: new googleMaps.Point(labelWidth / 2, labelHeight),
    };
  };

  // Count vehicles with valid GPS coordinates
  const vehicleCount = useMemo(() => {
    if (!vehicles) return 0;
    return Object.values(vehicles).filter(
      (v) => v.position && v.position.lat && v.position.lng
    ).length;
  }, [vehicles]);

  // Use useLoadScript hook for better error handling
  const { isLoaded, loadError: scriptLoadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Handle load errors
  useEffect(() => {
    if (scriptLoadError) {
      console.error('Google Maps script load error:', scriptLoadError);
      setLoadError(scriptLoadError.message || 'Failed to load Google Maps');
    } else if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === '') {
      setLoadError('API_KEY_MISSING');
    } else {
      setLoadError(null);
    }
  }, [scriptLoadError]);
  
  // Extract track path coordinates
  const trackPath = useMemo(() => {
    return trackData.trackPath.map((point) => ({
      lat: point.latitude,
      lng: point.longitude,
    }));
  }, []);

  // Function to project a GPS coordinate onto the nearest point on the track path
  // Uses proper GPS distance calculation (Haversine approximation for small distances)
  const projectToTrack = useMemo(() => {
    return (lat: number, lng: number): { lat: number; lng: number } => {
      if (trackPath.length === 0) {
        return { lat, lng };
      }

      if (trackPath.length === 1) {
        return trackPath[0];
      }

      let minDistance = Infinity;
      let closestPoint = trackPath[0];

      // Helper function to calculate approximate distance between two GPS points
      // For small distances (race track), this approximation is accurate enough
      const distance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const dLat = lat2 - lat1;
        const dLng = lng2 - lng1;
        // Account for latitude scaling (degrees longitude shrink as you move away from equator)
        const avgLat = (lat1 + lat2) / 2;
        const latScale = Math.cos(avgLat * Math.PI / 180);
        return Math.sqrt(dLat * dLat + (dLng * latScale) * (dLng * latScale));
      };

      // Calculate distance from point to each segment of the track
      for (let i = 0; i < trackPath.length; i++) {
        const start = trackPath[i];
        const end = trackPath[(i + 1) % trackPath.length]; // Wrap around for closed track

        // Calculate distance from point to line segment
        const dx = end.lng - start.lng;
        const dy = end.lat - start.lat;
        const avgLat = (start.lat + end.lat) / 2;
        const latScale = Math.cos(avgLat * Math.PI / 180);
        const lengthSq = dy * dy + (dx * latScale) * (dx * latScale);

        if (lengthSq === 0) {
          // Segment is a point
          const dist = distance(lat, lng, start.lat, start.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closestPoint = start;
          }
          continue;
        }

        // Calculate parameter t (position along segment: 0 = start, 1 = end)
        const t = Math.max(0, Math.min(1,
          ((lat - start.lat) * dy + (lng - start.lng) * dx * latScale * latScale) / lengthSq
        ));

        // Calculate closest point on segment
        const closestLat = start.lat + t * dy;
        const closestLng = start.lng + t * dx;

        // Calculate distance
        const dist = distance(lat, lng, closestLat, closestLng);

        if (dist < minDistance) {
          minDistance = dist;
          closestPoint = { lat: closestLat, lng: closestLng };
        }
      }

      return closestPoint;
    };
  }, [trackPath]);

  // Auto-fit bounds when vehicles change
  useEffect(() => {
    if (mapInstance && isMapReady && window.google?.maps && trackPath.length > 0) {
      const googleBounds = new window.google.maps.LatLngBounds();
      
      // Add track path to bounds
      trackPath.forEach((point) => {
        googleBounds.extend(new window.google.maps.LatLng(point.lat, point.lng));
      });
      
      // Add all vehicle positions to bounds
      if (vehicles && vehicleCount > 0) {
        Object.values(vehicles).forEach((vehicle) => {
          if (vehicle.position && vehicle.position.lat && vehicle.position.lng) {
            googleBounds.extend(new window.google.maps.LatLng(vehicle.position.lat, vehicle.position.lng));
          }
        });
      }
      
      // Fit bounds with padding and maintain tilt
      mapInstance.fitBounds(googleBounds, 50);
      
      // Ensure tilt is maintained for 3D view
      if (mapInstance.getTilt() !== 45) {
        mapInstance.setTilt(45);
      }
    }
  }, [mapInstance, isMapReady, vehicles, vehicleCount, trackPath]);

  // Calculate center and bounds
  const { center, bounds } = useMemo(() => {
    if (trackPath.length === 0) {
      return { center: defaultCenter, bounds: undefined };
    }

    const lats = trackPath.map((p) => p.lat);
    const lngs = trackPath.map((p) => p.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const center = {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    };

    const bounds = {
      north: maxLat,
      south: minLat,
      east: maxLng,
      west: minLng,
    };

    return { center, bounds };
  }, [trackPath]);

  // Calculate track boundaries (inner and outer edges)
  const { trackBoundaries, centerLine } = useMemo(() => {
    if (trackPath.length < 2) {
      return { trackBoundaries: { inner: [], outer: [] }, centerLine: [] };
    }

    const TRACK_WIDTH_METERS = 15; // Racing track width (~15 meters for better visibility)
    const EARTH_RADIUS = 6378137; // Earth radius in meters

    const innerBoundary: Array<{ lat: number; lng: number }> = [];
    const outerBoundary: Array<{ lat: number; lng: number }> = [];

    // Helper function to calculate perpendicular offset
    const calculatePerpendicularOffset = (
      point: { lat: number; lng: number },
      prevPoint: { lat: number; lng: number },
      nextPoint: { lat: number; lng: number },
      offsetMeters: number
    ): { lat: number; lng: number } => {
      // Calculate bearing from previous to next point
      const lat1 = prevPoint.lat * (Math.PI / 180);
      const lon1 = prevPoint.lng * (Math.PI / 180);
      const lat2 = nextPoint.lat * (Math.PI / 180);
      const lon2 = nextPoint.lng * (Math.PI / 180);

      const dLon = lon2 - lon1;
      const y = Math.sin(dLon) * Math.cos(lat2);
      const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
      const bearing = Math.atan2(y, x);

      // Perpendicular bearing (90 degrees)
      const perpBearing = bearing + Math.PI / 2;

      // Calculate offset in degrees
      const offsetLat =
        (offsetMeters / EARTH_RADIUS) * Math.cos(perpBearing) * (180 / Math.PI);
      const offsetLng =
        ((offsetMeters / EARTH_RADIUS) *
          Math.sin(perpBearing) *
          (180 / Math.PI)) /
        Math.cos(point.lat * (Math.PI / 180));

      return {
        lat: point.lat + offsetLat,
        lng: point.lng + offsetLng,
      };
    };

    for (let i = 0; i < trackPath.length; i++) {
      const current = trackPath[i];
      const next = trackPath[(i + 1) % trackPath.length];
      const prev = trackPath[i === 0 ? trackPath.length - 1 : i - 1];

      // Calculate offset for inner and outer boundaries
      const halfWidth = TRACK_WIDTH_METERS / 2;

      // For inner boundary (left side when looking forward)
      const innerOffset = calculatePerpendicularOffset(current, prev, next, -halfWidth);
      innerBoundary.push(innerOffset);

      // For outer boundary (right side when looking forward)
      const outerOffset = calculatePerpendicularOffset(current, prev, next, halfWidth);
      outerBoundary.push(outerOffset);
    }

    return {
      trackBoundaries: { inner: innerBoundary, outer: outerBoundary },
      centerLine: trackPath,
    };
  }, [trackPath]);

  // Create polygon path for track surface (combine outer and inner boundaries)
  const trackSurfacePath = useMemo(() => {
    if (trackBoundaries.outer.length === 0 || trackBoundaries.inner.length === 0) {
      return [];
    }
    // Close the polygon by connecting outer to inner
    return [
      ...trackBoundaries.outer,
      ...trackBoundaries.inner.slice().reverse(),
      trackBoundaries.outer[0], // Close the polygon
    ];
  }, [trackBoundaries]);

  // Polyline options for centerline (racing line) - bright yellow racing line
  const centerLineOptions = useMemo(
    () => ({
      strokeColor: '#FFFF00', // Bright yellow racing line
      strokeOpacity: 1.0,
      strokeWeight: 4,
      clickable: false,
      draggable: false,
      editable: false,
      visible: true,
      zIndex: 3,
    }),
    []
  );

  // Polyline options for track boundaries - colorful red and white stripes
  const boundaryOptions = useMemo(
    () => ({
      strokeColor: '#FF0000', // Red track boundaries
      strokeOpacity: 1.0,
      strokeWeight: 4,
      clickable: false,
      draggable: false,
      editable: false,
      visible: true,
      zIndex: 2,
    }),
    []
  );

  // Polygon options for track surface (asphalt) - colorful racing track
  const trackSurfaceOptions = useMemo(
    () => ({
      fillColor: '#1a1a2e', // Dark blue-gray track surface
      fillOpacity: 0.95,
      strokeColor: '#FFD700', // Gold track edge
      strokeOpacity: 1.0,
      strokeWeight: 4,
      clickable: false,
      draggable: false,
      editable: false,
      visible: true,
      zIndex: 1,
    }),
    []
  );

  // Start/Finish marker
  const startFinishPoint = trackPath[0];
  const finishPoint = trackPath[trackPath.length - 1];
  
  // Combine vehicles from store with all vehicles from API for display
  const vehiclesToShow = useMemo(() => {
    if (isPlaying && vehicles && Object.keys(vehicles).length > 0) {
      // During race, show vehicles from store
      return Object.entries(vehicles).map(([vehicleId, vehicle]) => ({
        vehicleId,
        vehicle,
        hasData: true,
      }));
    } else if (!isPlaying && allVehicles.length > 0) {
      // Before race, show all vehicles from API at start point
      return allVehicles.map((v) => ({
        vehicleId: v.id,
        vehicle: vehicles?.[v.id] || null,
        hasData: false,
      }));
    } else if (vehicles && Object.keys(vehicles).length > 0) {
      // Fallback to vehicles from store
      return Object.entries(vehicles).map(([vehicleId, vehicle]) => ({
        vehicleId,
        vehicle,
        hasData: true,
      }));
    }
    return [];
  }, [vehicles, allVehicles, isPlaying]);

  // Clear celebrations and progress when paused or race is reset
  useEffect(() => {
    if (!isPlaying) {
      setFirstFinisher(null);
      setShowWinnerDialog(false);
      previousProgress.current = {};
      // Reset race state when paused
      resetRace();
    }
  }, [isPlaying, resetRace]);

  // Detect finish line crossings
  useEffect(() => {
    if (!isPlaying || !vehicles) return;

    Object.entries(vehicles).forEach(([vehicleId, vehicle]) => {
      if (!vehicle.position || !vehicle.position.lat || !vehicle.position.lng) return;

      try {
        // Convert GPS position to 3D position for progress calculation
        const altitude = (vehicle.position as any)?.altitude || 0;
        const unityPosition = geoToUnity(vehicle.position.lat, vehicle.position.lng, altitude);
        const currentProgress = getTrackProgress(unityPosition);
        const previousProg = previousProgress.current[vehicleId] ?? 0;

        // Detect finish line crossing: progress goes from > 0.9 back to < 0.1
        // This means vehicle completed a lap
        if (previousProg > 0.9 && currentProgress < 0.1 && previousProg !== 0) {
          // Only track the first finisher
          setFirstFinisher((prev) => {
            // If no finisher yet, this is the first one
            if (!prev) {
              const finisherData: FinishCelebration = {
                vehicleId,
                position: {
                  lat: vehicle.position.lat,
                  lng: vehicle.position.lng,
                },
                timestamp: Date.now(),
                speed: vehicle.speed,
                heading: vehicle.heading,
              };
              // Mark race as finished and set winner
              setRaceFinished(true, vehicleId);
              // Show leaderboard when winner is decided
              setShowLeaderboard(true);
              // Show winner dialog
              setShowWinnerDialog(true);
              return finisherData;
            }
            // Already have a finisher, don't update
            return prev;
          });
        }

        previousProgress.current[vehicleId] = currentProgress;
      } catch (error) {
        console.warn(`Error detecting finish for vehicle ${vehicleId}:`, error);
      }
    });
  }, [vehicles, isPlaying]);

  // Checkpoint markers (every 10 points)
  const checkpoints = useMemo(() => {
    if (!showCheckpoints) return [];
    return trackPath
      .map((point, index) => ({ point, index }))
      .filter((_, index) => index % 10 === 0 && index > 0 && index < trackPath.length - 1);
  }, [trackPath, showCheckpoints]);

  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: true,
      mapTypeId: 'satellite' as google.maps.MapTypeId, // Show satellite view to see stadium
      fullscreenControl: true,
      tilt: 45, // 3D tilt view (0-45 degrees)
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'transit',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'landscape',
          stylers: [{ saturation: 50 }, { lightness: 10 }],
        },
      ],
    }),
    []
  );

  // If no API key, show a message but still try to load with a demo key approach
  const hasApiKey = GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== '';

  // Show loading state
  if (!isLoaded && !loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading Google Maps...</p>
          <p className="text-sm text-gray-400 mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (loadError || !hasApiKey) {
    const errorType = loadError === 'API_KEY_MISSING' || !hasApiKey ? 'missing' : 'error';
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
        <div className="text-center p-8 max-w-2xl">
          <h3 className="text-xl font-bold mb-4">
            {errorType === 'missing' ? 'Google Maps API Key Required' : 'Error Loading Google Maps'}
          </h3>
          {errorType === 'missing' ? (
            <>
          <p className="text-gray-400 mb-4">
            To display the track on Google Maps, please add your API key:
          </p>
          <ol className="text-left text-sm text-gray-300 space-y-2 list-decimal list-inside mb-4">
            <li>Get a free API key from{' '}
              <a
                href="https://console.cloud.google.com/google/maps-apis"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Google Cloud Console
              </a>
            </li>
                <li>Create a <code className="bg-gray-700 px-2 py-1 rounded">.env</code> file in the race-frontend directory</li>
            <li>Add: <code className="bg-gray-700 px-2 py-1 rounded">VITE_GOOGLE_MAPS_API_KEY=your_api_key_here</code></li>
            <li>Restart the development server</li>
          </ol>
            </>
          ) : (
            <div className="text-left text-sm text-gray-300 space-y-2 mb-4">
              <p className="text-red-400 font-semibold">Error: {loadError}</p>
              <p className="text-gray-400">Possible causes:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Invalid API key</li>
                <li>API key restrictions (check allowed domains/IPs)</li>
                <li>Billing not enabled on Google Cloud project</li>
                <li>Maps JavaScript API not enabled</li>
              </ul>
            </div>
          )}
          <div className="mt-6 p-4 bg-gray-700 rounded">
            <p className="text-sm text-gray-300">
              <strong>Note:</strong> The track path is still available in the 3D view. This map view is optional.
            </p>
          </div>
          <div className="mt-4 p-4 bg-blue-900/30 rounded border border-blue-500">
            <p className="text-sm text-blue-200">
              <strong>Track Info:</strong> {trackData.trackName} - {trackData.totalPoints} points
            </p>
            <p className="text-xs text-blue-300 mt-2">
              Vehicles in system: {vehicleCount}
            </p>
            {hasApiKey && (
              <p className="text-xs text-yellow-300 mt-2">
                API Key detected: {GOOGLE_MAPS_API_KEY.substring(0, 10)}...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Get winner details from telemetry store
  const winnerVehicle = firstFinisher ? telemetryVehicles[firstFinisher.vehicleId] : null;
  const winnerDisplayVehicle = firstFinisher ? vehicles?.[firstFinisher.vehicleId] : null;

  return (
    <>
      {/* Winner Celebration Dialog Card */}
      {showWinnerDialog && firstFinisher && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
          {/* Animated background effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-900 via-yellow-800 to-orange-900 rounded-2xl shadow-2xl border-4 border-yellow-500 p-8 max-w-lg w-full mx-4 relative transform scale-100 animate-pulse">
            {/* Close button */}
            <button
              onClick={() => setShowWinnerDialog(false)}
              className="absolute top-4 right-4 text-white hover:text-yellow-300 transition-colors z-10 bg-black/30 rounded-full p-2 hover:bg-black/50"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Winner Header with animation */}
            <div className="text-center mb-6 relative z-10">
              <div className="text-8xl mb-4 animate-bounce">🏆</div>
              <h2 className="text-4xl font-bold text-white mb-2 animate-pulse">WINNER!</h2>
              <div className="text-yellow-300 text-2xl font-semibold mb-1">Vehicle #{firstFinisher.vehicleId}</div>
              <div className="text-yellow-200 text-lg">First to Cross the Finish Line</div>
            </div>

            {/* Winner Details */}
            <div className="space-y-4 bg-black bg-opacity-30 rounded-lg p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-300 text-sm mb-1">Vehicle ID</div>
                  <div className="text-white font-bold text-lg">{firstFinisher.vehicleId}</div>
                </div>
                <div>
                  <div className="text-gray-300 text-sm mb-1">Finish Speed</div>
                  <div className="text-white font-bold text-lg">
                    {winnerDisplayVehicle?.speed 
                      ? `${winnerDisplayVehicle.speed.toFixed(1)} km/h`
                      : firstFinisher.speed 
                      ? `${firstFinisher.speed.toFixed(1)} km/h`
                      : 'N/A'}
                  </div>
                </div>
              </div>

              {winnerVehicle?.telemetry && (
                <>
                  {winnerVehicle.telemetry.lap !== undefined && (
                    <div>
                      <div className="text-gray-300 text-sm mb-1">Total Laps</div>
                      <div className="text-white font-bold text-lg">{winnerVehicle.telemetry.lap}</div>
                    </div>
                  )}
                  {winnerVehicle.telemetry.rpm !== undefined && (
                    <div>
                      <div className="text-gray-300 text-sm mb-1">RPM</div>
                      <div className="text-white font-bold text-lg">{Math.round(winnerVehicle.telemetry.rpm)}</div>
                    </div>
                  )}
                  {winnerVehicle.telemetry.gear !== undefined && (
                    <div>
                      <div className="text-gray-300 text-sm mb-1">Gear</div>
                      <div className="text-white font-bold text-lg">{winnerVehicle.telemetry.gear}</div>
                    </div>
                  )}
                </>
              )}

              {/* Leaderboard Position */}
              {(() => {
                const leaderboardEntry = leaderboard.find(e => e.vehicle_id === firstFinisher.vehicleId);
                return (
                  <div className="pt-4 border-t border-yellow-500 border-opacity-30">
                    <div className="text-gray-300 text-sm mb-1">Finish Position</div>
                    <div className="text-yellow-300 font-bold text-3xl flex items-center justify-center gap-2">
                      <span className="text-4xl">🥇</span>
                      <span>1st Place</span>
                    </div>
                    {leaderboardEntry && (
                      <div className="mt-2 text-sm text-gray-300">
                        {leaderboardEntry.laps && <span>Completed {leaderboardEntry.laps} laps</span>}
                        {leaderboardEntry.best_lap_time && (
                          <span className="ml-2">Best Lap: {leaderboardEntry.best_lap_time}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {firstFinisher.timestamp && (
                <div className="text-gray-400 text-xs mt-4 text-center">
                  Finished at: {new Date(firstFinisher.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowWinnerDialog(false);
                  setShowLeaderboard(true);
                }}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                View Leaderboard
              </button>
              <button
                onClick={() => setShowWinnerDialog(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        options={mapOptions}
        onLoad={(map) => {
          setIsMapReady(true);
          setMapInstance(map);
          console.log('Google Map loaded successfully');
          // Automatically fit bounds to track and vehicles with 3D tilt
          if (window.google?.maps && trackPath.length > 0) {
            const googleBounds = new window.google.maps.LatLngBounds();
            
            // Add track path to bounds
            trackPath.forEach((point) => {
              googleBounds.extend(new window.google.maps.LatLng(point.lat, point.lng));
            });
            
            // Also include vehicle positions in bounds if available
            if (vehicles && vehicleCount > 0) {
              Object.values(vehicles).forEach((vehicle) => {
                if (vehicle.position && vehicle.position.lat && vehicle.position.lng) {
                  googleBounds.extend(new window.google.maps.LatLng(vehicle.position.lat, vehicle.position.lng));
                }
              });
            }
            
            // Fit bounds with padding and apply tilt
            map.fitBounds(googleBounds, 50);
            
            // Set tilt for 3D view (if not already set in options)
            if (map.getTilt() !== 45) {
              map.setTilt(45);
            }
          }
        }}
      >
        {/* Track Visualization Layers (rendered in order from bottom to top) */}
        
        {/* Layer 1: Track Surface (Asphalt) - Dark polygon representing the track surface */}
        {trackSurfacePath.length > 0 && (
          <Polygon paths={trackSurfacePath} options={trackSurfaceOptions} />
        )}

        {/* Layer 2: Track Boundaries - White lines marking track edges */}
        {trackBoundaries.outer.length > 0 && (
          <Polyline path={trackBoundaries.outer} options={boundaryOptions} />
        )}
        {trackBoundaries.inner.length > 0 && (
          <Polyline path={trackBoundaries.inner} options={boundaryOptions} />
        )}

        {/* Layer 3: Center Line (Racing Line) - Yellow line showing optimal racing line */}
        {centerLine.length > 0 && (
          <Polyline path={centerLine} options={centerLineOptions} />
        )}

        {/* Start/Finish Marker - Prominent Checkered Flag */}
        {showStartFinish && startFinishPoint && window.google?.maps && (
          <>
              <Marker
                position={startFinishPoint}
                icon={{
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="18" fill="#000000" stroke="#FFFFFF" stroke-width="3"/>
                    <text x="20" y="28" font-size="24" text-anchor="middle">🏁</text>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(40, 40),
                anchor: new window.google.maps.Point(20, 20),
                }}
                zIndex={200}
              />
          </>
        )}

        {/* Checkpoint Markers */}
        {checkpoints.map((checkpoint, idx) => {
          try {
            const googleMaps = window.google?.maps;
            if (!googleMaps || !googleMaps.SymbolPath) {
              return null;
            }
            return (
              <Marker
                key={`checkpoint-${checkpoint.index}`}
                position={checkpoint.point}
                icon={{
                  path: googleMaps.SymbolPath.CIRCLE,
                  scale: 5,
                  fillColor: '#FFFF00',
                  fillOpacity: 0.8,
                  strokeColor: '#000000',
                  strokeWeight: 1,
                }}
                label={{
                  text: `CP${idx + 1}`,
                  color: '#000000',
                  fontSize: '10px',
                  fontWeight: 'bold',
                }}
              />
            );
          } catch (error) {
            console.warn(`Error creating checkpoint marker ${idx}:`, error);
            return null;
          }
        })}

        {/* Vehicle Paths - Draw paths for each vehicle, projected onto track */}
        {vehicles && vehiclePaths && Object.entries(vehicles).map(([vehicleId, vehicle]) => {
          const path = vehiclePaths[vehicleId];
          if (!path || path.length < 2) return null;
          
          // Convert 3D positions to GPS coordinates (if needed) or use stored GPS
          const pathCoordinates = path
            .filter((pos, idx) => idx % 5 === 0) // Reduce points for performance
            .map((pos: any) => {
              // If path stores GPS coordinates directly
              if (pos.lat && pos.lng) {
                // Project onto track to ensure path stays on track
                return projectToTrack(pos.lat, pos.lng);
              }
              // Otherwise skip (would need conversion from 3D to GPS)
              return null;
            })
            .filter(Boolean) as Array<{ lat: number; lng: number }>;
          
          if (pathCoordinates.length < 2) return null;
          
          const vehicleColor = getVehicleColor(vehicleId);
          
          return (
            <Polyline
              key={`path-${vehicleId}`}
              path={pathCoordinates}
              options={{
                strokeColor: vehicleColor,
                strokeOpacity: 0.6,
                strokeWeight: 3,
                zIndex: 5,
                geodesic: true,
              }}
            />
          );
        })}

        {/* Vehicle Markers - Show ALL vehicles with real icons, projected onto track */}
        {vehiclesToShow.length > 0 && (
          <>
            {vehiclesToShow.map(({ vehicleId, vehicle: vehicleData, hasData }) => {
                // Determine position: use start point if race hasn't started, otherwise use vehicle position
                let vehiclePosition: { lat: number; lng: number };
                let heading = 0;
                let speed = 0;
                
                if (!isPlaying || !hasData || !vehicleData?.position) {
                  // Race not started or vehicle has no data - use start point
                  vehiclePosition = trackPath.length > 0 ? trackPath[0] : { lat: 0, lng: 0 };
                  heading = 0; // Default heading
                  speed = 0;
                } else {
                  // Race is playing and vehicle has data - use actual position
                  if (!vehicleData.position || 
                      vehicleData.position.lat == null || 
                      vehicleData.position.lng == null ||
                      isNaN(vehicleData.position.lat) ||
                      isNaN(vehicleData.position.lng)) {
                    return null;
                  }
                  
                  // Project vehicle position onto the nearest point on the track
                  vehiclePosition = projectToTrack(vehicleData.position.lat, vehicleData.position.lng);
                  
                  // Calculate heading in degrees
                  if (vehicleData.heading !== undefined && vehicleData.heading != null) {
                    heading = (vehicleData.heading * 180) / Math.PI;
                    if (heading < 0) heading += 360;
                  }
                  
                  speed = vehicleData.speed || 0;
                }

                const vehicleColor = getVehicleColor(vehicleId);

                const googleMaps = window.google?.maps;
                if (!googleMaps) return null;
                
                // Use simple vehicle icon pointing in direction of travel
                const iconConfig = createVehicleIcon(vehicleColor, heading);
                
                // Create label card icon for vehicle number and speed
                const labelIconConfig = createVehicleLabelIcon(vehicleId, speed, vehicleColor);
                
                // Calculate position for label (above the vehicle)
                const labelOffset = 0.00015; // Offset in degrees to position label above vehicle
                const labelPosition = {
                  lat: vehiclePosition.lat + labelOffset,
                  lng: vehiclePosition.lng,
                };

                return (
                  <>
                    {/* Vehicle icon marker */}
                    <Marker
                      key={`vehicle-${vehicleId}`}
                      position={vehiclePosition}
                      icon={iconConfig}
                      title={isPlaying ? `Race Car #${vehicleId}\nSpeed: ${speed.toFixed(1)} km/h` : `Vehicle #${vehicleId} - Ready`}
                      zIndex={1000}
                    />
                    {/* Label card marker showing vehicle number and speed */}
                    <Marker
                      key={`vehicle-label-${vehicleId}`}
                      position={labelPosition}
                      icon={labelIconConfig}
                      title={`Vehicle #${vehicleId} - ${speed.toFixed(1)} km/h`}
                      zIndex={1001}
                    />
                  </>
                );
              })}
          </>
        )}

        {/* Finish Line Celebration - Only First Finisher */}
        {firstFinisher && (() => {
          const vehicle = vehicles?.[firstFinisher.vehicleId];
          if (!vehicle) return null;

          const googleMaps = window.google?.maps;
          if (!googleMaps) return null;

          // Create celebration icon with only "FINISH" text
          const celebrationIconUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="120" height="80" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="grad-finish">
                  <stop offset="0%" stop-color="#FFD700" />
                  <stop offset="100%" stop-color="#FF6B00" />
                </radialGradient>
                <filter id="glow-finish">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <rect x="0" y="0" width="120" height="80" rx="10" fill="url(#grad-finish)" stroke="#FFD700" stroke-width="3" filter="url(#glow-finish)"/>
              <text x="60" y="50" font-size="24" font-weight="bold" text-anchor="middle" fill="white" filter="url(#glow-finish)">FINISH</text>
            </svg>
          `);

          return (
            <Marker
              key={`celebration-${firstFinisher.vehicleId}`}
              position={firstFinisher.position}
              icon={{
                url: celebrationIconUrl,
                scaledSize: new googleMaps.Size(120, 80),
                anchor: new googleMaps.Point(60, 40),
              }}
              zIndex={2000}
              title={`Vehicle #${firstFinisher.vehicleId} - First Finisher!`}
            />
          );
        })()}
        
       
      </GoogleMap>
    </>
  );
}

