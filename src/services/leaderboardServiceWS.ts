import { useState, useCallback } from 'react';
import { usePolling } from '../hooks/usePolling';
import { useTelemetryStore } from '../store/telemetryStore';
import { LeaderboardEntry } from '../types/telemetry';
import { apiService } from './apiService';

// Polling interval: 1000ms = 1Hz (recommended for leaderboard updates)
const LEADERBOARD_POLL_INTERVAL = 1000;

export function useLeaderboardServiceWS() {
  console.log('[LeaderboardService] Initializing REST polling at', LEADERBOARD_POLL_INTERVAL, 'ms interval');
  
  const { updateLeaderboard } = useTelemetryStore();
  const [hasReceivedData, setHasReceivedData] = useState(false);

  // Stable fetch function reference - accepts abort signal from usePolling
  const fetchLeaderboard = useCallback((signal?: AbortSignal) => {
    return apiService.getLeaderboard(signal);
  }, []);

  // Stable onData callback
  const handleData = useCallback((data: any) => {
    setHasReceivedData(true);
    // Handle leaderboard data - could be array of entries or single entry
    if (Array.isArray(data.leaderboard)) {
      data.leaderboard.forEach((entry: LeaderboardEntry) => {
        if (entry.type === 'leaderboard_entry') {
          updateLeaderboard(entry);
        }
      });
    } else if (data.type === 'leaderboard_entry') {
      updateLeaderboard(data);
    } else if (data.leaderboard) {
      // Handle case where leaderboard is nested
      if (Array.isArray(data.leaderboard)) {
        data.leaderboard.forEach((entry: LeaderboardEntry) => {
          updateLeaderboard(entry);
        });
      }
    }
  }, [updateLeaderboard]);

  // Stable onError callback
  const handleError = useCallback((error: Error) => {
    console.error('Leaderboard polling error:', error);
  }, []);

  const { isLoading, error } = usePolling<any>({
    fetchFn: fetchLeaderboard,
    interval: LEADERBOARD_POLL_INTERVAL,
    enabled: true,
    immediate: true,
    onData: handleData,
    onError: handleError,
  });

  // Return connection status - consider connected if we've received data or no error
  return { isConnected: hasReceivedData || (!error) };
}

