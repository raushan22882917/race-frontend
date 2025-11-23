import { usePolling } from '../hooks/usePolling';
import { useTelemetryStore } from '../store/telemetryStore';
import { LapEvent } from '../types/telemetry';
import { apiService } from './apiService';

// Polling interval: 500ms = 2Hz (recommended for lap events)
const ENDURANCE_POLL_INTERVAL = 500;

export function useEnduranceServiceWS() {
  console.log('[EnduranceService] Initializing REST polling at', ENDURANCE_POLL_INTERVAL, 'ms interval');
  
  const { addLapEvent } = useTelemetryStore();

  const { isLoading, error } = usePolling<any>({
    fetchFn: () => apiService.getEndurance(),
    interval: ENDURANCE_POLL_INTERVAL,
    enabled: true,
    immediate: true,
    onData: (data: any) => {
      // Handle endurance data - could be array of events or single event
      if (Array.isArray(data.events)) {
        data.events.forEach((event: LapEvent) => {
          if (event.type === 'lap_event') {
            addLapEvent(event);
          }
        });
      } else if (data.type === 'lap_event') {
        addLapEvent(data);
      }
    },
    onError: (error) => {
      console.error('Endurance polling error:', error);
    },
  });

  // Return connection status based on polling state
  return { isConnected: !error && !isLoading };
}

