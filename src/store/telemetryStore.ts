import { create } from 'zustand';
import { VehicleState, WeatherData, LapEvent, LeaderboardEntry } from '../types/telemetry';
import { Vector3 } from '../utils/gpsUtils';
import { getPositionAtProgress, getTrackProgress } from '../utils/trackPathUtils';

interface TelemetryState {
  // Vehicles
  vehicles: Record<string, VehicleState>;
  selectedVehicleId: string | null;
  showAllVehicles: boolean; // Show all vehicles or only selected
  
  // Vehicle Paths - Track historical positions for path visualization
  vehiclePaths: Record<string, Vector3[]>;
  maxPathLength: number;
  
  // Weather
  weather: WeatherData | null;
  weatherEnabled: boolean;
  
  // Playback
  isPlaying: boolean;
  isPaused: boolean;
  playbackSpeed: number;
  
  // Lap events
  lapEvents: Record<string, LapEvent[]>;
  
  // Leaderboard
  leaderboard: LeaderboardEntry[];
  
  // Track Visualization
  showVehiclePaths: boolean;
  showGrid: boolean;
  showCheckpoints: boolean;
  showTurnMarkers: boolean;
  showCenterLine: boolean;
  showTrackEdges: boolean;
  cameraPreset: 'top-down' | 'side' | 'follow' | 'free';
  
  // Actions
  updateVehicle: (vehicleId: string, telemetry: Partial<VehicleState['telemetry']>, position?: Vector3, rotation?: { x: number; y: number; z: number }) => void;
  updateLeaderboardFromVehicles: () => void;
  addVehiclePathPoint: (vehicleId: string, position: Vector3) => void;
  clearVehiclePath: (vehicleId: string) => void;
  autoSelectFirstVehicle: () => void;
  setSelectedVehicle: (vehicleId: string | null) => void;
  setShowAllVehicles: (show: boolean) => void;
  setWeather: (weather: WeatherData) => void;
  setWeatherEnabled: (enabled: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setPaused: (paused: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  addLapEvent: (event: LapEvent) => void;
  updateLeaderboard: (entry: LeaderboardEntry) => void;
  resetVehiclesToStart: () => void;
  setShowVehiclePaths: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setShowCheckpoints: (show: boolean) => void;
  setShowTurnMarkers: (show: boolean) => void;
  setShowCenterLine: (show: boolean) => void;
  setShowTrackEdges: (show: boolean) => void;
  setCameraPreset: (preset: 'top-down' | 'side' | 'follow' | 'free') => void;
  reset: () => void;
}

const initialState: Omit<TelemetryState, 'updateVehicle' | 'updateLeaderboardFromVehicles' | 'addVehiclePathPoint' | 'clearVehiclePath' | 'autoSelectFirstVehicle' | 'setSelectedVehicle' | 'setShowAllVehicles' | 'setWeather' | 'setWeatherEnabled' | 'setPlaying' | 'setPaused' | 'setPlaybackSpeed' | 'addLapEvent' | 'updateLeaderboard' | 'resetVehiclesToStart' | 'setShowVehiclePaths' | 'setShowGrid' | 'setShowCheckpoints' | 'setShowTurnMarkers' | 'setShowCenterLine' | 'setShowTrackEdges' | 'setCameraPreset' | 'reset'> = {
  vehicles: {},
  selectedVehicleId: null,
  showAllVehicles: true, // Default to showing all vehicles
  vehiclePaths: {},
  maxPathLength: 1000, // Store last 1000 positions per vehicle
  weather: null,
  weatherEnabled: true,
  isPlaying: false,
  isPaused: true,
  playbackSpeed: 1.0,
  lapEvents: {},
  leaderboard: [],
  showVehiclePaths: false, // Disabled by default - don't draw paths when vehicles run
  showGrid: false,
  showCheckpoints: false,
  showTurnMarkers: true,
  showCenterLine: true,
  showTrackEdges: false, // Disabled by default - only show single inside line
  cameraPreset: 'top-down' as const,
};

export const useTelemetryStore = create<TelemetryState>((set) => ({
  ...initialState,

  updateVehicle: (vehicleId, telemetry, position, rotation) =>
    set((state) => {
      const existing = state.vehicles[vehicleId];
      const newPosition = position || existing?.position || { x: 0, y: 0, z: 0 };
      const newRotation = rotation || existing?.rotation || { x: 0, y: 0, z: 0 };
      
      // Auto-select first vehicle if none selected
      const shouldAutoSelect = !state.selectedVehicleId && Object.keys(state.vehicles).length === 0;
      
      // Add position to path if it changed significantly (reduce noise)
      const path = state.vehiclePaths[vehicleId] || [];
      const lastPathPoint = path[path.length - 1];
      const shouldAddToPath = !lastPathPoint || 
        Math.abs(lastPathPoint.x - newPosition.x) > 0.5 ||
        Math.abs(lastPathPoint.z - newPosition.z) > 0.5;
      
      // Only update paths if needed to avoid unnecessary re-renders
      let updatedPaths = state.vehiclePaths;
      if (shouldAddToPath) {
        const newPath = [...path, { ...newPosition }];
        // Limit path length
        if (newPath.length > state.maxPathLength) {
          newPath.shift();
        }
        updatedPaths = {
          ...state.vehiclePaths,
          [vehicleId]: newPath,
        };
      }
      
      // Build vehicle data
      const vehicleData = {
        position: newPosition,
        rotation: newRotation,
        telemetry: {
          ...existing?.telemetry,
          ...telemetry,
          vehicleId,
        } as VehicleState['telemetry'],
      };
      
      return {
        vehicles: {
          ...state.vehicles,
          [vehicleId]: vehicleData,
        },
        vehiclePaths: updatedPaths,
        selectedVehicleId: shouldAutoSelect ? vehicleId : state.selectedVehicleId,
      };
    }),

  addVehiclePathPoint: (vehicleId, position) =>
    set((state) => {
      const path = state.vehiclePaths[vehicleId] || [];
      const newPath = [...path, { ...position }];
      if (newPath.length > state.maxPathLength) {
        newPath.shift();
      }
      return {
        vehiclePaths: {
          ...state.vehiclePaths,
          [vehicleId]: newPath,
        },
      };
    }),

  clearVehiclePath: (vehicleId) =>
    set((state) => {
      const newPaths = { ...state.vehiclePaths };
      delete newPaths[vehicleId];
      return { vehiclePaths: newPaths };
    }),

  autoSelectFirstVehicle: () =>
    set((state) => {
      const vehicleIds = Object.keys(state.vehicles);
      if (vehicleIds.length > 0 && !state.selectedVehicleId) {
        return { selectedVehicleId: vehicleIds[0] };
      }
      return state;
    }),

  setSelectedVehicle: (vehicleId) =>
    set({ selectedVehicleId: vehicleId }),

  setShowAllVehicles: (show) =>
    set({ showAllVehicles: show }),

  setWeather: (weather) =>
    set({ weather }),

  setWeatherEnabled: (enabled) =>
    set({ weatherEnabled: enabled }),

  setPlaying: (playing) =>
    set({ isPlaying: playing, isPaused: !playing }),

  setPaused: (paused) =>
    set({ isPaused: paused, isPlaying: !paused }),

  setPlaybackSpeed: (speed) =>
    set({ playbackSpeed: speed }),

  addLapEvent: (event) =>
    set((state) => {
      const vehicleEvents = state.lapEvents[event.vehicle_id] || [];
      return {
        lapEvents: {
          ...state.lapEvents,
          [event.vehicle_id]: [...vehicleEvents, event],
        },
      };
    }),

  updateLeaderboard: (entry) =>
    set((state) => {
      const existing = state.leaderboard.findIndex((e) => e.vehicle_id === entry.vehicle_id);
      const newLeaderboard = [...state.leaderboard];
      
      if (existing >= 0) {
        // Preserve internal progress tracking if it exists
        const existingProgress = (newLeaderboard[existing] as any)._totalProgress;
        newLeaderboard[existing] = {
          ...entry,
          ...(existingProgress !== undefined && { _totalProgress: existingProgress }),
        };
      } else {
        newLeaderboard.push(entry);
      }
      
      // Sort by position (from server) or by progress if available
      newLeaderboard.sort((a, b) => {
        const progressA = (a as any)._totalProgress;
        const progressB = (b as any)._totalProgress;
        if (progressA !== undefined && progressB !== undefined) {
          return progressB - progressA; // Higher progress = better position
        }
        return a.position - b.position; // Fallback to server position
      });
      
      return { leaderboard: newLeaderboard };
    }),

  updateLeaderboardFromVehicles: () =>
    set((state) => {
      if (!state.isPlaying) return state;
      
      try {
        const vehicleEntries: Array<{ vehicleId: string; progress: number; lap: number }> = [];
        
        // Calculate progress for all vehicles
        Object.entries(state.vehicles).forEach(([vehicleId, vehicle]) => {
          if (vehicle.position) {
            const trackProgress = getTrackProgress(vehicle.position);
            const lap = vehicle.telemetry.lap || 0;
            const totalProgress = lap * 1000 + trackProgress * 1000;
            vehicleEntries.push({ vehicleId, progress: totalProgress, lap });
          }
        });
        
        // Sort by progress
        vehicleEntries.sort((a, b) => b.progress - a.progress);
        
        // Update leaderboard with new positions
        const updatedLeaderboard = vehicleEntries.map((entry, idx) => {
          const existing = state.leaderboard.find(e => e.vehicle_id === entry.vehicleId);
          return {
            ...existing,
            vehicle_id: entry.vehicleId,
            vehicle: existing?.vehicle || entry.vehicleId,
            position: idx + 1,
            laps: entry.lap,
            best_lap_time: existing?.best_lap_time || null,
            best_lap_kph: existing?.best_lap_kph || 0,
            best_lap_num: existing?.best_lap_num || 0,
            gap_first: existing?.gap_first || null,
            gap_previous: existing?.gap_previous || null,
            elapsed: existing?.elapsed || null,
            type: 'leaderboard_entry' as const,
            pic: existing?.pic || 0,
            class_type: existing?.class_type || null,
            _totalProgress: entry.progress,
          } as LeaderboardEntry;
        });
        
        return { leaderboard: updatedLeaderboard };
      } catch (error) {
        console.error('Error updating leaderboard from vehicles:', error);
        return state;
      }
    }),

  resetVehiclesToStart: () =>
    set((state) => {
      try {
        const startPosition = getPositionAtProgress(0, 0); // Start at point 0, altitude 0
        const startRotation = { x: 0, y: 0, z: 0 };
        
        // Reset all vehicles to start position
        const updatedVehicles: Record<string, VehicleState> = {};
        Object.keys(state.vehicles).forEach((vehicleId) => {
          const vehicle = state.vehicles[vehicleId];
          updatedVehicles[vehicleId] = {
            ...vehicle,
            position: { ...startPosition },
            rotation: { ...startRotation },
          };
        });
        
        // Clear vehicle paths
        const clearedPaths: Record<string, Vector3[]> = {};
        Object.keys(state.vehiclePaths).forEach((vehicleId) => {
          clearedPaths[vehicleId] = [];
        });
        
        return {
          vehicles: updatedVehicles,
          vehiclePaths: clearedPaths,
        };
      } catch (error) {
        console.error('Error resetting vehicles to start:', error);
        return state;
      }
    }),

  setShowVehiclePaths: (show) => set({ showVehiclePaths: show }),
  setShowGrid: (show) => set({ showGrid: show }),
  setShowCheckpoints: (show) => set({ showCheckpoints: show }),
  setShowTurnMarkers: (show) => set({ showTurnMarkers: show }),
  setShowCenterLine: (show) => set({ showCenterLine: show }),
  setShowTrackEdges: (show) => set({ showTrackEdges: show }),
  setCameraPreset: (preset) => set({ cameraPreset: preset }),

  reset: () => set(initialState),
}));

