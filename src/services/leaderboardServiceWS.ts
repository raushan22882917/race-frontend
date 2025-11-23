import { usePolling } from '../hooks/usePolling';
import { useTelemetryStore } from '../store/telemetryStore';
import { LeaderboardEntry } from '../types/telemetry';
import { apiService } from './apiService';

// Polling interval: 1000ms = 1Hz (recommended for leaderboard updates)
const LEADERBOARD_POLL_INTERVAL = 1000;

export function useLeaderboardServiceWS() {
  console.log('[LeaderboardService] Initializing REST polling at', LEADERBOARD_POLL_INTERVAL, 'ms interval');
  
  const { updateLeaderboard } = useTelemetryStore();

  const { isLoading, error } = usePolling<any>({
    fetchFn: () => apiService.getLeaderboard(),
    interval: LEADERBOARD_POLL_INTERVAL,
    enabled: true,
    immediate: true,
    onData: (data: any) => {
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
    },
    onError: (error) => {
      console.error('Leaderboard polling error:', error);
    },
  });

  // Return connection status based on polling state
  return { isConnected: !error && !isLoading };
}

