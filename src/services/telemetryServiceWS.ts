import { usePolling } from '../hooks/usePolling';
import { useTelemetryStore } from '../store/telemetryStore';
import { TelemetryFrame, ControlMessage } from '../types/telemetry';
import { geoToUnity, setReference } from '../utils/gpsUtils';
import { apiService } from './apiService';

// Set GPS reference (from Unity code)
setReference(33.530494689941406, -86.62052154541016, 1.0);

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

  const { data, isLoading, error } = usePolling<any>({
    fetchFn: () => apiService.getTelemetry(),
    interval: TELEMETRY_POLL_INTERVAL,
    enabled: true,
    immediate: true,
    onData: (frame: any) => {
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
          Object.entries(frame.vehicles).forEach(([vehicleId, telemetry]: [string, any]) => {
            // Extract GPS coordinates if available
            const lat = telemetry.gps_lat;
            const lon = telemetry.gps_lon;
            const altitude = telemetry.altitude || 0;

            let position = undefined;
            if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
              position = geoToUnity(lat, lon, altitude);
            }

            // Always update vehicle, even without GPS coordinates
            updateVehicle(vehicleId, {
              ...telemetry,
              timestamp: frame.timestamp,
            }, position);
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
      console.error('Telemetry polling error:', error);
    },
  });

  const play = async () => {
    try {
      await apiService.sendControlCommand({ type: 'control', cmd: 'play' } as ControlMessage);
      setPlaying(true);
    } catch (error) {
      console.error('Failed to send play command:', error);
    }
  };

  const pause = async () => {
    try {
      await apiService.sendControlCommand({ type: 'control', cmd: 'pause' } as ControlMessage);
      setPaused(true);
    } catch (error) {
      console.error('Failed to send pause command:', error);
    }
  };

  const reverse = async () => {
    try {
      await apiService.sendControlCommand({ type: 'control', cmd: 'reverse' } as ControlMessage);
      setPlaying(true);
    } catch (error) {
      console.error('Failed to send reverse command:', error);
    }
  };

  const restart = async () => {
    try {
      await apiService.sendControlCommand({ type: 'control', cmd: 'restart' } as ControlMessage);
      setPlaying(true);
    } catch (error) {
      console.error('Failed to send restart command:', error);
    }
  };

  const setSpeed = async (speed: number) => {
    try {
      await apiService.sendControlCommand({ type: 'control', cmd: 'speed', value: speed } as ControlMessage);
      setPlaybackSpeed(speed);
    } catch (error) {
      console.error('Failed to send speed command:', error);
    }
  };

  // Return connection status based on polling state
  return {
    isConnected: !error && !isLoading,
    play,
    pause,
    reverse,
    restart,
    setSpeed,
  };
}

