import { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import { Activity, Wifi, WifiOff } from 'lucide-react';
import { useTelemetryServiceWS } from '../services/telemetryServiceWS';
import { useEnduranceServiceWS } from '../services/enduranceServiceWS';
import { useLeaderboardServiceWS } from '../services/leaderboardServiceWS';

export function ServerStatus() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connectionLogs, setConnectionLogs] = useState<string[]>([]);
  
  // Get SSE connection status from services
  const { isConnected: telemetryConnected } = useTelemetryServiceWS();
  const { isConnected: enduranceConnected } = useEnduranceServiceWS();
  const { isConnected: leaderboardConnected } = useLeaderboardServiceWS();
  
  // Monitor connection status changes
  useEffect(() => {
    const status = {
      telemetry: telemetryConnected ? '✅' : '❌',
      endurance: enduranceConnected ? '✅' : '❌',
      leaderboard: leaderboardConnected ? '✅' : '❌',
    };
    const statusStr = `T:${status.telemetry} E:${status.endurance} L:${status.leaderboard}`;
    setConnectionLogs(prev => {
      const newLogs = [...prev, `${new Date().toLocaleTimeString()}: ${statusStr}`];
      return newLogs.slice(-5); // Keep last 5 entries
    });
  }, [telemetryConnected, enduranceConnected, leaderboardConnected]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await apiService.healthCheck();
        setHealth(data);
        setLoading(false);
      } catch (error) {
        console.error('Health check failed:', error);
        setLoading(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800 bg-opacity-90 rounded-lg p-3 text-xs">
        <div className="flex items-center gap-2">
          <Activity size={14} className="animate-pulse" />
          <span>Checking server...</span>
        </div>
      </div>
    );
  }

  const serverOnline = health?.status === 'healthy';

  return (
    <div className="bg-gray-800 bg-opacity-90 rounded-lg p-3 text-xs">
      <div className="flex items-center gap-2 mb-2">
        <Activity size={14} className={serverOnline ? 'text-green-500' : 'text-red-500'} />
        <span className="font-semibold">Integrated Server (Port 8000)</span>
        <span className={serverOnline ? 'text-green-500' : 'text-red-500'}>
          {serverOnline ? '✓' : '✗'}
        </span>
      </div>
      
      {health && (
        <div className="space-y-1 mt-2">
          <div className="text-gray-400 text-[10px]">
            Status: {health.status}
          </div>
          
          {/* REST API Polling Status */}
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="text-gray-300 text-[10px] font-semibold mb-1">REST API Polling:</div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-[10px]">
                {telemetryConnected ? (
                  <Wifi size={10} className="text-green-500" />
                ) : (
                  <WifiOff size={10} className="text-red-500" />
                )}
                <span className={telemetryConnected ? 'text-green-400' : 'text-red-400'}>
                  Telemetry {telemetryConnected ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                {enduranceConnected ? (
                  <Wifi size={10} className="text-green-500" />
                ) : (
                  <WifiOff size={10} className="text-red-500" />
                )}
                <span className={enduranceConnected ? 'text-green-400' : 'text-red-400'}>
                  Endurance {enduranceConnected ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                {leaderboardConnected ? (
                  <Wifi size={10} className="text-green-500" />
                ) : (
                  <WifiOff size={10} className="text-red-500" />
                )}
                <span className={leaderboardConnected ? 'text-green-400' : 'text-red-400'}>
                  Leaderboard {leaderboardConnected ? '✓' : '✗'}
                </span>
              </div>
            </div>
          </div>
          
          {health.connections && (
            <div className="text-gray-500 text-[9px] mt-1">
              Server connections: T:{health.connections.telemetry || 0} E:{health.connections.endurance || 0} L:{health.connections.leaderboard || 0}
            </div>
          )}
          
          {/* Show warning if server is healthy but polling is failing */}
          {serverOnline && !telemetryConnected && !enduranceConnected && !leaderboardConnected && (
            <div className="mt-2 pt-2 border-t border-yellow-600">
              <div className="text-yellow-400 text-[9px] font-semibold mb-1">⚠️ Polling Issue</div>
              <div className="text-yellow-300 text-[9px]">
                Server is reachable but REST API polling is failing. Check browser console for details.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

