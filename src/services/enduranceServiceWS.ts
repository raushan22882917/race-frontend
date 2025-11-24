import { useState, useCallback } from 'react';
import { usePolling } from '../hooks/usePolling';
import { useTelemetryStore } from '../store/telemetryStore';
import { LapEvent } from '../types/telemetry';
import { apiService } from './apiService';

// Polling interval: 500ms = 2Hz (recommended for lap events)
const ENDURANCE_POLL_INTERVAL = 500;

export function useEnduranceServiceWS() {
  console.log('[EnduranceService] Initializing REST polling at', ENDURANCE_POLL_INTERVAL, 'ms interval');
  
  const { addLapEvent } = useTelemetryStore();
  const [hasReceivedData, setHasReceivedData] = useState(false);

  // Stable fetch function reference - accepts abort signal from usePolling
  const fetchEndurance = useCallback((signal?: AbortSignal) => {
    return apiService.getEndurance(signal);
  }, []);

  // Stable onData callback
  const handleData = useCallback((data: any) => {
    setHasReceivedData(true);
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
  }, [addLapEvent]);

  // Stable onError callback
  const handleError = useCallback((error: Error) => {
    console.error('Endurance polling error:', error);
  }, []);

  const { isLoading, error } = usePolling<any>({
    fetchFn: fetchEndurance,
    interval: ENDURANCE_POLL_INTERVAL,
    enabled: true,
    immediate: true,
    onData: handleData,
    onError: handleError,
  });

  // Return connection status - consider connected if we've received data or no error
  return { isConnected: hasReceivedData || (!error) };
}

