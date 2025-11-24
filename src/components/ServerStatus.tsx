import { useEffect, useState, useRef } from 'react';
import { apiService } from '../services/apiService';
import { Activity, Wifi, WifiOff, Server } from 'lucide-react';
import { useTelemetryServiceWS } from '../services/telemetryServiceWS';
import { useEnduranceServiceWS } from '../services/enduranceServiceWS';
import { useLeaderboardServiceWS } from '../services/leaderboardServiceWS';

export function ServerStatus() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  
  // Get connection status from services
  const { isConnected: telemetryConnected } = useTelemetryServiceWS();
  const { isConnected: enduranceConnected } = useEnduranceServiceWS();
  const { isConnected: leaderboardConnected } = useLeaderboardServiceWS();

  useEffect(() => {
    isMountedRef.current = true;

    const checkHealth = async () => {
      // Cancel any pending health check
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const data = await apiService.healthCheck();
        // Only update state if this request wasn't aborted and component is still mounted
        if (isMountedRef.current && !abortController.signal.aborted && abortControllerRef.current === abortController) {
          setHealth(data);
          setLoading(false);
        }
      } catch (error) {
        // Don't log aborted requests as errors
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
          return; // Silently ignore aborted health checks
        }
        // Only update state if component is still mounted and this is still the current request
        if (isMountedRef.current && abortControllerRef.current === abortController) {
          console.error('Health check failed:', error);
          setLoading(false);
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Check every 10 seconds

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const serverOnline = health?.status === 'healthy';

  return (
    <div className="bg-gray-800 bg-opacity-90 rounded-lg px-3 py-2">
      <div className="flex items-center gap-3">
        {/* Server Status */}
        {loading ? (
          <div title="Checking server...">
            <Activity size={16} className="animate-pulse text-gray-400" />
          </div>
        ) : (
          <div title={serverOnline ? 'Server Online' : 'Server Offline'}>
            <Server 
              size={16} 
              className={serverOnline ? 'text-green-500' : 'text-red-500'} 
            />
          </div>
        )}
        
        {/* Telemetry */}
        <div title={telemetryConnected ? 'Telemetry Connected' : 'Telemetry Disconnected'}>
          {telemetryConnected ? (
            <Wifi size={16} className="text-green-500" />
          ) : (
            <WifiOff size={16} className="text-red-500" />
          )}
        </div>
        
        {/* Endurance */}
        <div title={enduranceConnected ? 'Endurance Connected' : 'Endurance Disconnected'}>
          {enduranceConnected ? (
            <Wifi size={16} className="text-green-500" />
          ) : (
            <WifiOff size={16} className="text-red-500" />
          )}
        </div>
        
        {/* Leaderboard */}
        <div title={leaderboardConnected ? 'Leaderboard Connected' : 'Leaderboard Disconnected'}>
          {leaderboardConnected ? (
            <Wifi size={16} className="text-green-500" />
          ) : (
            <WifiOff size={16} className="text-red-500" />
          )}
        </div>
      </div>
    </div>
  );
}

