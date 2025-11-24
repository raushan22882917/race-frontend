import { useState, useEffect, useCallback } from 'react';
import { usePolling } from '../hooks/usePolling';
import { useTelemetryStore } from '../store/telemetryStore';
import { ControlMessage } from '../types/telemetry';
import { geoToUnity, setReference } from '../utils/gpsUtils';
import { projectToTrackPath, initializeTrackPoints } from '../utils/trackPathUtils';
import { apiService } from './apiService';

// Set GPS reference (from Unity code)
setReference(33.530494689941406, -86.62052154541016, 1.0);

// Initialize track points when module loads
initializeTrackPoints();

// Polling interval: 100ms = 10Hz (recommended for real-time telemetry)
const TELEMETRY_POLL_INTERVAL = 100;

export function useTelemetryServiceWS() {
  console.log('[TelemetryService] Initializing REST polling at', TELEMETRY_POLL_INTERVAL, 'ms interval');
  
  const {
    updateVehicle,
    setWeather,
    setPlaying,
    setPaused,
    setPlaybackSpeed,
  } = useTelemetryStore();

  const [hasReceivedData, setHasReceivedData] = useState(false);
  
  // Stable fetch function reference - accepts abort signal from usePolling
  const fetchTelemetry = useCallback((signal?: AbortSignal) => {
    return apiService.getTelemetry(signal);
  }, []);
  
  const { isLoading, error } = usePolling<any>({
    fetchFn: fetchTelemetry,
    interval: TELEMETRY_POLL_INTERVAL,
    enabled: true,
    immediate: true,
    onData: (frame: any) => {
      setHasReceivedData(true);
      // Handle different message types
      if (frame.type === 'connected') {
        console.log('Telemetry data available:', frame);
        if (!frame.has_data) {
          console.warn('⚠️ Server connected but no telemetry data loaded. Check CSV files in telemetry-server/logs/vehicles/');
        }
      } else if (frame.type === 'telemetry_frame' || frame.vehicles) {
        // Update weather
        if (frame.weather) {
          setWeather(frame.weather);
        }

        // Update vehicles
        if (frame.vehicles) {
          const vehicleCount = Object.keys(frame.vehicles).length;
          if (vehicleCount > 0) {
            console.log(`📡 Received ${vehicleCount} vehicle(s) in telemetry frame:`, Object.keys(frame.vehicles));
          }
          
          Object.entries(frame.vehicles).forEach(([vehicleId, telemetry]: [string, any]) => {
            // Extract GPS coordinates if available
            const lat = telemetry.gps_lat;
            const lon = telemetry.gps_lon;
            const altitude = telemetry.altitude || 0;

            let position = undefined;
            let rotation = undefined;
            
            if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
              // Convert GPS to 3D position
              const rawPosition = geoToUnity(lat, lon, altitude);
              
              // Project onto track path centerline to ensure vehicle follows exact track coordinates
              // This returns both position (on centerline) and rotation (direction along track)
              const projected = projectToTrackPath(rawPosition);
              position = projected.position;
              rotation = { x: 0, y: projected.rotation, z: 0 };
            }

            // Always update vehicle, even without GPS coordinates
            updateVehicle(vehicleId, {
              ...telemetry,
              timestamp: frame.timestamp,
            }, position, rotation);
          });
        } else {
          console.warn('Telemetry frame has no vehicles');
        }
      } else if (frame.type === 'telemetry_end') {
        console.log('Telemetry playback ended');
        setPaused(true);
      }
      // Silently ignore unknown frame types
    },
    onError: (error) => {
      // For 503 errors, just log a warning (already logged in apiService)
      // Don't spam console with repeated 503 errors during polling
      const is503Error = error instanceof Error && error.message.includes('503');
      if (is503Error) {
        // Only log once per minute to reduce noise
        const now = Date.now();
        const last503Log = (window as any).__lastTelemetry503Log || 0;
        if (now - last503Log > 60000) { // Log max once per minute
          console.warn('⚠️ Telemetry endpoint unavailable (503) - Will continue retrying. This is normal if no race data exists yet.');
          (window as any).__lastTelemetry503Log = now;
        }
      } else {
        console.error('Telemetry polling error:', error);
      }
    },
  });

  const play = async () => {
    try {
      await apiService.sendControlCommand({ type: 'control', cmd: 'play' } as ControlMessage);
      setPlaying(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Failed to send play command:', error);
      // Don't update state if command failed
      if (errorMsg.includes('503')) {
        console.warn('⚠️ Control endpoint unavailable (503). The backend may need race data to be initialized first.');
      }
      throw error; // Re-throw so callers can handle it
    }
  };

  const pause = async () => {
    try {
      await apiService.sendControlCommand({ type: 'control', cmd: 'pause' } as ControlMessage);
      setPaused(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Failed to send pause command:', error);
      // Don't update state if command failed
      if (errorMsg.includes('503')) {
        console.warn('⚠️ Control endpoint unavailable (503). The backend may need race data to be initialized first.');
      }
      throw error; // Re-throw so callers can handle it
    }
  };

  const reverse = async () => {
    try {
      await apiService.sendControlCommand({ type: 'control', cmd: 'reverse' } as ControlMessage);
      setPlaying(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Failed to send reverse command:', error);
      if (errorMsg.includes('503')) {
        console.warn('⚠️ Control endpoint unavailable (503). The backend may need race data to be initialized first.');
      }
      throw error;
    }
  };

  const restart = async () => {
    try {
      await apiService.sendControlCommand({ type: 'control', cmd: 'restart' } as ControlMessage);
      setPlaying(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Failed to send restart command:', error);
      if (errorMsg.includes('503')) {
        console.warn('⚠️ Control endpoint unavailable (503). The backend may need race data to be initialized first.');
      }
      throw error;
    }
  };

  const setSpeed = async (speed: number) => {
    try {
      await apiService.sendControlCommand({ type: 'control', cmd: 'speed', value: speed } as ControlMessage);
      setPlaybackSpeed(speed);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Failed to send speed command:', error);
      if (errorMsg.includes('503')) {
        console.warn('⚠️ Control endpoint unavailable (503). The backend may need race data to be initialized first.');
      }
      throw error;
    }
  };

  // Return connection status - consider connected if we've received data or no error
  return {
    isConnected: hasReceivedData || (!error),
    play,
    pause,
    reverse,
    restart,
    setSpeed,
  };
}

