import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { Vehicle3D } from './Vehicle3D';
import { Track3D } from './Track3D';
import { VehiclePath } from './VehiclePath';
import { FinishCelebration } from './FinishCelebration';
import { useTelemetryStore } from '../store/telemetryStore';
import { useCameraControls } from '../contexts/CameraControlsContext';
import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RotateCw, ZoomIn, ZoomOut, RefreshCw, LayoutGrid, Eye, EyeOff, Camera, ChevronDown, ChevronUp, Grid3x3, MapPin, Route, Layers, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Move } from 'lucide-react';
import { LapEvent } from '../types/telemetry';
import { getPositionAtProgress } from '../utils/trackPathUtils';

export function Scene3D() {
  const { 
    vehicles, 
    selectedVehicleId, 
    showAllVehicles, 
    autoSelectFirstVehicle, 
    lapEvents, 
    isPlaying, 
    resetVehiclesToStart,
    vehiclePaths,
    showVehiclePaths,
    showGrid,
    showCheckpoints,
    showTurnMarkers,
    showCenterLine,
    showTrackEdges,
    cameraPreset,
    updateLeaderboardFromVehicles,
    setShowVehiclePaths,
    setShowGrid,
    setShowCheckpoints,
    setShowTurnMarkers,
    setShowCenterLine,
    setShowTrackEdges,
    setCameraPreset,
  } = useTelemetryStore();
  const { setZoomIn, setZoomOut, setRefresh } = useCameraControls();
  const controlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [followMode, setFollowMode] = useState(false);
  const [showControlsPanel, setShowControlsPanel] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(200); // Default zoom distance
  const previousSelectedId = useRef<string | null>(null);
  const [celebrations, setCelebrations] = useState<Array<{ vehicleId: string; lap: number; lapTime?: number | null; position: { x: number; y: number; z: number } }>>([]);
  const previousLapCounts = useRef<Record<string, number>>({});
  const previousIsPlaying = useRef<boolean>(false);
  
  // Reset vehicles to start position when race starts (handled by PlaybackControls)
  // This effect is kept for safety but PlaybackControls handles the main reset
  useEffect(() => {
    if (isPlaying && !previousIsPlaying.current) {
      // Race just started - ensure vehicles are at start (PlaybackControls should have already done this)
      // Only reset if vehicles exist but are not at start position
      const vehiclesAtStart = Object.values(vehicles).every(v => {
        const startPos = getPositionAtProgress(0, 0);
        return Math.abs(v.position.x - startPos.x) < 0.1 && 
               Math.abs(v.position.z - startPos.z) < 0.1;
      });
      if (!vehiclesAtStart && Object.keys(vehicles).length > 0) {
        resetVehiclesToStart();
      }
    }
    previousIsPlaying.current = isPlaying;
  }, [isPlaying, resetVehiclesToStart, vehicles]);

  // Update leaderboard positions in real-time based on vehicle track progress
  useEffect(() => {
    if (isPlaying && Object.keys(vehicles).length > 0) {
      // Update leaderboard positions based on track progress
      // Use requestAnimationFrame to batch updates and avoid performance issues
      const timeoutId = setTimeout(() => {
        updateLeaderboardFromVehicles();
      }, 100); // Update every 100ms for smooth real-time updates
      
      return () => clearTimeout(timeoutId);
    }
  }, [isPlaying, vehicles, updateLeaderboardFromVehicles]);
  
  // Filter vehicles based on showAllVehicles toggle
  const vehicleIds = showAllVehicles 
    ? Object.keys(vehicles)
    : selectedVehicleId 
      ? [selectedVehicleId].filter(id => vehicles[id]) // Only selected vehicle if exists
      : [];

  // Enable follow mode when vehicle is selected, with smooth transition
  useEffect(() => {
    if (selectedVehicleId && vehicles[selectedVehicleId]) {
      // Only set follow mode if vehicle changed
      if (previousSelectedId.current !== selectedVehicleId) {
        setFollowMode(true);
        previousSelectedId.current = selectedVehicleId;
      }
    } else {
      setFollowMode(false);
      previousSelectedId.current = null;
    }
  }, [selectedVehicleId, vehicles]);

  // Sync camera preset with follow mode
  useEffect(() => {
    if (cameraPreset === 'follow' && selectedVehicleId && vehicles[selectedVehicleId]) {
      setFollowMode(true);
    } else if (cameraPreset !== 'follow') {
      setFollowMode(false);
    }
  }, [cameraPreset, selectedVehicleId, vehicles]);

  // Handle camera preset changes
  const handleCameraPreset = useCallback((preset: 'top-down' | 'side' | 'follow' | 'free') => {
    setCameraPreset(preset);
    if (!controlsRef.current || !cameraRef.current) return;

    const controls = controlsRef.current;
    const camera = cameraRef.current;

    if (preset === 'top-down') {
      // Top-down view
      const targetPosition = new THREE.Vector3(0, 200, 0);
      const targetLookAt = new THREE.Vector3(0, 0, 0);
      
      const duration = 500;
      const startTime = Date.now();
      const startPosition = camera.position.clone();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 2);
        
        camera.position.lerpVectors(startPosition, targetPosition, eased);
        controls.target.lerp(new THREE.Vector3(0, 0, 0), eased);
        controls.update();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      animate();
    } else if (preset === 'side') {
      // Side view
      const targetPosition = new THREE.Vector3(200, 50, 0);
      const targetLookAt = new THREE.Vector3(0, 0, 0);
      
      const duration = 500;
      const startTime = Date.now();
      const startPosition = camera.position.clone();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 2);
        
        camera.position.lerpVectors(startPosition, targetPosition, eased);
        controls.target.lerp(new THREE.Vector3(0, 0, 0), eased);
        controls.update();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      animate();
    } else if (preset === 'follow' && selectedVehicleId && vehicles[selectedVehicleId]) {
      setFollowMode(true);
    } else if (preset === 'free') {
      setFollowMode(false);
    }
  }, [controlsRef, cameraRef, selectedVehicleId, vehicles, setCameraPreset]);

  // Debug: Log vehicles when they change
  useEffect(() => {
    if (vehicleIds.length > 0) {
      console.log(`🚗 Scene3D: Rendering ${vehicleIds.length} vehicle(s):`, vehicleIds);
      vehicleIds.forEach(id => {
        const v = vehicles[id];
        if (v) {
          console.log(`  - Vehicle ${id}: position=(${v.position.x.toFixed(2)}, ${v.position.y.toFixed(2)}, ${v.position.z.toFixed(2)}), speed=${v.telemetry.speed?.toFixed(1) || 'N/A'} km/h`);
        }
      });
    } else {
      console.log('🚗 Scene3D: No vehicles to render');
    }
  }, [vehicleIds.length, vehicles]);

  // Auto-select first vehicle when vehicles appear
  // Only depend on vehicleIds.length and selectedVehicleId, not the function itself
  useEffect(() => {
    if (vehicleIds.length > 0 && !selectedVehicleId) {
      autoSelectFirstVehicle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleIds.length, selectedVehicleId]);

  // Detect finish line crossings and trigger celebrations
  useEffect(() => {
    Object.keys(lapEvents).forEach((vehicleId) => {
      const events = lapEvents[vehicleId];
      if (events.length === 0) return;

      const currentLapCount = events.length;
      const previousLapCount = previousLapCounts.current[vehicleId] || 0;

      // If lap count increased, vehicle crossed finish line
      if (currentLapCount > previousLapCount && vehicles[vehicleId]) {
        const latestEvent = events[events.length - 1];
        const vehicle = vehicles[vehicleId];
        
        // Trigger celebration
        setCelebrations((prev) => [
          ...prev,
          {
            vehicleId,
            lap: latestEvent.lap,
            lapTime: latestEvent.lap_time || null,
            position: {
              x: vehicle.position.x,
              y: vehicle.position.y,
              z: vehicle.position.z,
            },
          },
        ]);
      }

      previousLapCounts.current[vehicleId] = currentLapCount;
    });
  }, [lapEvents, vehicles]);

  // Remove completed celebrations
  const removeCelebration = (vehicleId: string) => {
    setCelebrations((prev) => prev.filter((c) => c.vehicleId !== vehicleId));
  };

  // Handle rotate button click
  const handleRotate = () => {
    if (!controlsRef.current) return;
    
    setIsRotating(true);
    const controls = controlsRef.current;
    
    // Rotate 90 degrees (π/2 radians) around the vertical axis
    const currentAzimuthalAngle = controls.getAzimuthalAngle();
    const targetAngle = currentAzimuthalAngle + Math.PI / 2;
    
    // Animate rotation
    const startAngle = currentAzimuthalAngle;
    const duration = 500; // milliseconds
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth rotation
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentAngle = startAngle + (targetAngle - startAngle) * eased;
      
      controls.setAzimuthalAngle(currentAngle);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsRotating(false);
      }
    };
    
    animate();
  };

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    
    // Get current distance from target
    const target = controls.target;
    const distance = camera.position.distanceTo(target);
    
    // Zoom in by reducing distance (but not below min)
    const newDistance = Math.max(50, distance * 0.7);
    const direction = new THREE.Vector3()
      .subVectors(camera.position, target)
      .normalize();
    
    // Smooth zoom animation
    const startDistance = distance;
    const duration = 300;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      const currentDistance = startDistance + (newDistance - startDistance) * eased;
      
      camera.position.copy(target).add(direction.multiplyScalar(currentDistance));
      controls.update();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [controlsRef, cameraRef]);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    
    // Get current distance from target
    const target = controls.target;
    const distance = camera.position.distanceTo(target);
    
    // Zoom out by increasing distance (but not above max)
    const newDistance = Math.min(2000, distance * 1.4);
    setZoomLevel(newDistance);
    const direction = new THREE.Vector3()
      .subVectors(camera.position, target)
      .normalize();
    
    // Smooth zoom animation
    const startDistance = distance;
    const duration = 300;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      const currentDistance = startDistance + (newDistance - startDistance) * eased;
      
      camera.position.copy(target).add(direction.multiplyScalar(currentDistance));
      controls.update();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [controlsRef, cameraRef]);

  // Handle zoom slider change
  const handleZoomChange = useCallback((value: number) => {
    if (!controlsRef.current || !cameraRef.current || followMode) return;
    
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    const target = controls.target;
    const direction = new THREE.Vector3()
      .subVectors(camera.position, target)
      .normalize();
    
    setZoomLevel(value);
    camera.position.copy(target).add(direction.multiplyScalar(value));
    controls.update();
  }, [controlsRef, cameraRef, followMode]);

  // Handle horizontal pan (left/right)
  const handlePanHorizontal = useCallback((direction: 'left' | 'right') => {
    if (!controlsRef.current || !cameraRef.current || followMode) return;
    
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    const panAmount = 50; // Distance to pan
    const panDirection = direction === 'left' ? -1 : 1;
    
    // Get camera's right vector (perpendicular to view direction)
    const right = new THREE.Vector3();
    camera.getWorldDirection(new THREE.Vector3());
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    right.normalize();
    
    // Pan camera and target
    const panVector = right.multiplyScalar(panAmount * panDirection);
    camera.position.add(panVector);
    controls.target.add(panVector);
    controls.update();
  }, [controlsRef, cameraRef, followMode]);

  // Handle vertical pan (up/down)
  const handlePanVertical = useCallback((direction: 'up' | 'down') => {
    if (!controlsRef.current || !cameraRef.current || followMode) return;
    
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    const panAmount = 50; // Distance to pan
    const panDirection = direction === 'up' ? 1 : -1;
    
    // Pan vertically using world up vector
    const upVector = new THREE.Vector3(0, panAmount * panDirection, 0);
    camera.position.add(upVector);
    controls.target.add(upVector);
    controls.update();
  }, [controlsRef, cameraRef, followMode]);

  // Handle refresh (reset camera view)
  const handleRefresh = useCallback(() => {
    if (controlsRef.current && cameraRef.current) {
      const controls = controlsRef.current;
      const camera = cameraRef.current;
      
      // Reset to top-down view
      const targetPosition = new THREE.Vector3(0, 200, 0);
      const targetLookAt = new THREE.Vector3(0, 0, 0);
      setZoomLevel(200);
      
      const duration = 500;
      const startTime = Date.now();
      const startPosition = camera.position.clone();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 2);
        
        camera.position.lerpVectors(startPosition, targetPosition, eased);
        controls.target.lerp(new THREE.Vector3(0, 0, 0), eased);
        controls.update();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    }
  }, [controlsRef, cameraRef]);

  // Update zoom level when camera distance changes
  useEffect(() => {
    if (!controlsRef.current || !cameraRef.current || followMode) return;
    
    const updateZoomLevel = () => {
      const controls = controlsRef.current;
      const camera = cameraRef.current;
      if (!controls || !camera) return;
      
      const target = controls.target;
      const distance = camera.position.distanceTo(target);
      setZoomLevel(Math.max(50, Math.min(2000, distance)));
    };
    
    // Update zoom level periodically
    const interval = setInterval(updateZoomLevel, 100);
    return () => clearInterval(interval);
  }, [controlsRef, cameraRef, followMode]);

  // Expose zoom functions to context (after functions are defined)
  useEffect(() => {
    setZoomIn(() => handleZoomIn);
    setZoomOut(() => handleZoomOut);
    setRefresh(() => handleRefresh);
  }, [setZoomIn, setZoomOut, setRefresh, handleZoomIn, handleZoomOut, handleRefresh]);

  return (
    <div className="relative w-full h-full">
      <Canvas shadows>
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />

          {/* Camera - Dynamic view based on follow mode */}
          <PerspectiveCamera 
            ref={cameraRef}
            makeDefault 
            position={followMode ? [0, 50, 100] : [0, 200, 0]} 
            fov={followMode ? 70 : 60} 
          />
          {selectedVehicleId && vehicles[selectedVehicleId] && followMode && (
            <CameraFollow 
              vehicle={vehicles[selectedVehicleId]} 
              cameraRef={cameraRef}
              controlsRef={controlsRef}
            />
          )}
          {!followMode && (
            <CameraTopDown 
              cameraRef={cameraRef}
              controlsRef={controlsRef}
            />
          )}
          <OrbitControls
            ref={controlsRef}
            enablePan={!followMode}
            enableZoom={true}
            enableRotate={true}
            minDistance={followMode ? 30 : 50}
            maxDistance={2000}
            minPolarAngle={followMode ? Math.PI / 6 : Math.PI / 2 - 0.3}
            maxPolarAngle={followMode ? Math.PI / 2.5 : Math.PI / 2 + 0.1}
            target={followMode ? (selectedVehicleId && vehicles[selectedVehicleId] ? [vehicles[selectedVehicleId].position.x, 0, vehicles[selectedVehicleId].position.z] : [0, 0, 0]) : [0, 0, 0]}
            zoomSpeed={1.2}
            enabled={true}
          />

        {/* Environment */}
        <Environment preset="sunset" />

        {/* Ground - Removed, track has its own ground surface */}

        {/* Track */}
        <Track3D 
          vehicles={vehicles}
          showCenterLine={showCenterLine}
          showTrackEdges={showTrackEdges}
          showCheckpoints={showCheckpoints}
          showTurnMarkers={showTurnMarkers}
          showGrid={showGrid}
        />

        {/* Vehicle Paths - Only show when not playing and enabled */}
        {showVehiclePaths && !isPlaying && vehicleIds.map((vehicleId) => {
          const path = vehiclePaths[vehicleId];
          if (!path || path.length < 2) return null;
          
          // Get vehicle color (use a default color scheme)
          const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
          const colorIndex = parseInt(vehicleId.replace(/\D/g, '')) || 0;
          const vehicleColor = colors[colorIndex % colors.length];
          
          return (
            <VehiclePath
              key={`path-${vehicleId}`}
              path={path}
              color={vehicleColor}
              vehicleId={vehicleId}
              opacity={vehicleId === selectedVehicleId ? 0.8 : 0.4}
            />
          );
        })}

        {/* Vehicles */}
        {vehicleIds.map((vehicleId) => (
          <Vehicle3D
            key={vehicleId}
            vehicleId={vehicleId}
            isSelected={vehicleId === selectedVehicleId}
          />
        ))}

        {/* Finish Line Celebrations */}
        {celebrations.map((celebration, idx) => (
          <FinishCelebration
            key={`celebration-${celebration.vehicleId}-${celebration.lap}-${idx}`}
            vehicleId={celebration.vehicleId}
            lap={celebration.lap}
            lapTime={celebration.lapTime}
            position={celebration.position}
            onComplete={() => removeCelebration(celebration.vehicleId)}
          />
        ))}
      </Suspense>
    </Canvas>
    
    {/* Track Visualization Controls - Bottom Center */}
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto z-10">
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl border-2 border-gray-700/50 shadow-2xl">
        {/* Main Controls Bar */}
        <div className="flex items-center gap-2 p-3">
          {/* Camera Controls */}
          <div className="flex items-center gap-2 border-r border-gray-700 pr-2">
            <button
              onClick={() => handleCameraPreset('top-down')}
              className={`p-2 rounded-lg transition-all ${
                cameraPreset === 'top-down'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-300'
              }`}
              title="Top-Down View"
              type="button"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleCameraPreset('side')}
              className={`p-2 rounded-lg transition-all ${
                cameraPreset === 'side'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-300'
              }`}
              title="Side View"
              type="button"
            >
              <Camera className="h-4 w-4" />
            </button>
      <button
              onClick={() => handleCameraPreset('follow')}
              disabled={!selectedVehicleId}
              className={`p-2 rounded-lg transition-all ${
                cameraPreset === 'follow'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-300'
              } ${!selectedVehicleId ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Follow Vehicle"
        type="button"
      >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleCameraPreset('free')}
              className={`p-2 rounded-lg transition-all ${
                cameraPreset === 'free'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-300'
              }`}
              title="Free Camera"
              type="button"
            >
              <Camera className="h-4 w-4" />
      </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 border-r border-gray-700 pr-2">
            <button
              onClick={handleZoomIn}
              disabled={followMode}
              className={`p-2 rounded-lg transition-all ${
                followMode
                  ? 'bg-gray-600/50 cursor-not-allowed opacity-50' 
                  : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-300'
              }`}
              title="Zoom In"
              type="button"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1 px-2">
              <ZoomOut className="h-3 w-3 text-gray-400" />
              <input
                type="range"
                min="50"
                max="2000"
                step="10"
                value={zoomLevel}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                disabled={followMode}
                className={`w-24 h-1.5 rounded-lg appearance-none cursor-pointer ${
                  followMode ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((zoomLevel - 50) / (2000 - 50)) * 100}%, #374151 ${((zoomLevel - 50) / (2000 - 50)) * 100}%, #374151 100%)`
                }}
                title={`Zoom: ${zoomLevel.toFixed(0)}`}
              />
              <ZoomIn className="h-3 w-3 text-gray-400" />
            </div>
            <button
              onClick={handleZoomOut}
              disabled={followMode}
              className={`p-2 rounded-lg transition-all ${
                followMode
                  ? 'bg-gray-600/50 cursor-not-allowed opacity-50' 
                  : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-300'
              }`}
              title="Zoom Out"
              type="button"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
          </div>

          {/* Pan Controls */}
          <div className="flex items-center gap-1 border-r border-gray-700 pr-2">
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => handlePanVertical('up')}
                disabled={followMode}
                className={`p-1 rounded transition-all ${
                  followMode
                    ? 'bg-gray-600/50 cursor-not-allowed opacity-50' 
                    : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-300'
                }`}
                title="Pan Up"
                type="button"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <div className="flex gap-0.5">
                <button
                  onClick={() => handlePanHorizontal('left')}
                  disabled={followMode}
                  className={`p-1 rounded transition-all ${
                    followMode
                      ? 'bg-gray-600/50 cursor-not-allowed opacity-50' 
                      : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-300'
                  }`}
                  title="Pan Left"
                  type="button"
                >
                  <ArrowLeft className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handlePanHorizontal('right')}
                  disabled={followMode}
                  className={`p-1 rounded transition-all ${
                    followMode
                      ? 'bg-gray-600/50 cursor-not-allowed opacity-50' 
                      : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-300'
                  }`}
                  title="Pan Right"
                  type="button"
                >
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <button
                onClick={() => handlePanVertical('down')}
                disabled={followMode}
                className={`p-1 rounded transition-all ${
                  followMode
                    ? 'bg-gray-600/50 cursor-not-allowed opacity-50' 
                    : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-300'
                }`}
                title="Pan Down"
                type="button"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Rotation & Refresh */}
          <div className="flex items-center gap-2 border-r border-gray-700 pr-2">
            <button
              onClick={handleRotate}
              disabled={isRotating}
              className={`p-2 rounded-lg transition-all ${
                isRotating
                  ? 'bg-gray-600/50 cursor-not-allowed'
                  : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-300'
              }`}
              title="Rotate 90°"
              type="button"
            >
              <RotateCw className={`h-4 w-4 ${isRotating ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg transition-all bg-gray-800/80 hover:bg-gray-700/90 text-gray-300"
              title="Reset View"
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setShowControlsPanel(!showControlsPanel)}
            className="p-2 rounded-lg transition-all bg-gray-800/80 hover:bg-gray-700/90 text-gray-300"
            title={showControlsPanel ? 'Hide Options' : 'Show Options'}
            type="button"
          >
            {showControlsPanel ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>

        {/* Expanded Visualization Options */}
        {showControlsPanel && (
          <div className="border-t border-gray-700 p-3 space-y-3">
            {/* Track Overlays */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                <Layers className="h-3 w-3" />
                Track Overlays
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setShowVehiclePaths(!showVehiclePaths)}
                  className={`p-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                    showVehiclePaths
                      ? 'bg-green-600/50 text-green-300 border border-green-500'
                      : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-400 border border-gray-700'
                  }`}
                  type="button"
                >
                  {showVehiclePaths ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  Paths
                </button>
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                    showGrid
                      ? 'bg-green-600/50 text-green-300 border border-green-500'
                      : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-400 border border-gray-700'
                  }`}
                  type="button"
                >
                  {showGrid ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  Grid
                </button>
                <button
                  onClick={() => setShowCheckpoints(!showCheckpoints)}
                  className={`p-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                    showCheckpoints
                      ? 'bg-green-600/50 text-green-300 border border-green-500'
                      : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-400 border border-gray-700'
                  }`}
                  type="button"
                >
                  {showCheckpoints ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  Checkpoints
                </button>
                <button
                  onClick={() => setShowTurnMarkers(!showTurnMarkers)}
                  className={`p-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                    showTurnMarkers
                      ? 'bg-green-600/50 text-green-300 border border-green-500'
                      : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-400 border border-gray-700'
                  }`}
                  type="button"
                >
                  {showTurnMarkers ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  Turns
                </button>
                <button
                  onClick={() => setShowCenterLine(!showCenterLine)}
                  className={`p-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                    showCenterLine
                      ? 'bg-green-600/50 text-green-300 border border-green-500'
                      : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-400 border border-gray-700'
                  }`}
                  type="button"
                >
                  {showCenterLine ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  Center Line
                </button>
                <button
                  onClick={() => setShowTrackEdges(!showTrackEdges)}
                  className={`p-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                    showTrackEdges
                      ? 'bg-green-600/50 text-green-300 border border-green-500'
                      : 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-400 border border-gray-700'
                  }`}
                  type="button"
                >
                  {showTrackEdges ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  Edges
      </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

// Camera component that follows a vehicle with race track style view
function CameraFollow({ 
  vehicle, 
  cameraRef, 
  controlsRef 
}: { 
  vehicle: any; 
  cameraRef: React.RefObject<THREE.PerspectiveCamera>;
  controlsRef: React.RefObject<any>;
}) {
  const targetPosition = useRef(new THREE.Vector3());
  const currentPosition = useRef(new THREE.Vector3());
  const isInitialized = useRef(false);

  useFrame(() => {
    if (!cameraRef.current || !vehicle || !controlsRef.current) return;

    const { position, rotation } = vehicle;
    const controls = controlsRef.current;
    
    // Calculate camera position behind and above the vehicle (race track style)
    // Position: behind vehicle, slightly elevated
    const distanceBehind = 30; // Distance behind vehicle
    const heightAbove = 15; // Height above ground
    const sideOffset = 8; // Slight side offset for better view
    
    // Calculate direction vehicle is facing
    const forwardX = Math.sin(rotation.y);
    const forwardZ = Math.cos(rotation.y);
    
    // Calculate perpendicular direction for side offset
    const sideX = Math.cos(rotation.y);
    const sideZ = -Math.sin(rotation.y);
    
    // Target camera position: behind vehicle, elevated, slightly to the side
    targetPosition.current.set(
      position.x - forwardX * distanceBehind + sideX * sideOffset,
      position.y + heightAbove,
      position.z - forwardZ * distanceBehind + sideZ * sideOffset
    );
    
    // Initialize camera position immediately on first frame
    if (!isInitialized.current) {
      currentPosition.current.copy(targetPosition.current);
      cameraRef.current.position.copy(currentPosition.current);
      
      // Set initial look-at point
      const lookAheadDistance = 20;
      const initialLookAt = new THREE.Vector3(
        position.x + forwardX * lookAheadDistance,
        position.y + 3,
        position.z + forwardZ * lookAheadDistance
      );
      cameraRef.current.lookAt(initialLookAt);
      
      // Initialize OrbitControls target
      controls.target.set(position.x, position.y + 2, position.z);
      controls.update();
      isInitialized.current = true;
    } else {
      // Smooth camera movement (lerp for smooth following)
      const lerpFactor = 0.15; // Higher for more responsive following
      currentPosition.current.lerp(targetPosition.current, lerpFactor);
      
      // Update camera position - OrbitControls handles rotation when user rotates
      cameraRef.current.position.copy(currentPosition.current);
      
      // Update OrbitControls target to vehicle position
      // This allows rotation around the vehicle while following it
      controls.target.set(position.x, position.y + 2, position.z);
      controls.update();
    }
  });

  return null;
}

// Camera component for top-down view with smooth transitions
function CameraTopDown({ 
  cameraRef, 
  controlsRef 
}: { 
  cameraRef: React.RefObject<THREE.PerspectiveCamera>;
  controlsRef: React.RefObject<any>;
}) {
  const targetPosition = useRef(new THREE.Vector3(0, 200, 0));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    if (!cameraRef.current) return;

    // Smooth transition to top-down position
    const currentPos = cameraRef.current.position;
    const lerpFactor = 0.05;
    
    currentPos.lerp(targetPosition.current, lerpFactor);
    cameraRef.current.position.copy(currentPos);
    
    // Smooth look-at transition
    const currentLookAt = new THREE.Vector3();
    cameraRef.current.getWorldDirection(currentLookAt);
    currentLookAt.multiplyScalar(1000).add(cameraRef.current.position);
    currentLookAt.lerp(targetLookAt.current, lerpFactor);
    cameraRef.current.lookAt(currentLookAt);
    
    // Update FOV smoothly
    const targetFov = 60;
    const currentFov = cameraRef.current.fov;
    cameraRef.current.fov = currentFov + (targetFov - currentFov) * lerpFactor;
    cameraRef.current.updateProjectionMatrix();
    
    // Update OrbitControls target
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, lerpFactor);
      controlsRef.current.update();
    }
  });

  return null;
}

