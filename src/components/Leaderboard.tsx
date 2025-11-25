import { useEffect, useMemo, useState } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { useModal } from '../contexts/ModalContext';
import { useLeaderboardServiceWS } from '../services/leaderboardServiceWS';
import { apiService } from '../services/apiService';
import { Trophy, Clock, ChevronDown, ChevronUp, Radio } from 'lucide-react';

export function Leaderboard() {
  const { leaderboard, isPlaying, updateLeaderboardFromVehicles } = useTelemetryStore();
  const { showLeaderboard, setShowLeaderboard } = useModal();
  
  // Connect to real-time leaderboard updates
  const { isConnected } = useLeaderboardServiceWS();
  
  // Get vehicles from store for the effect
  const vehicles = useTelemetryStore((state) => state.vehicles);
  
  // Load all vehicles from API
  const [allVehicles, setAllVehicles] = useState<Array<{ id: string; name?: string; vehicle_number?: number; car_number?: number; driver_number?: number }>>([]);
  
  useEffect(() => {
    const loadAllVehicles = async () => {
      try {
        const data = await apiService.getVehicles() as { vehicles?: Array<{ id: string; name?: string; vehicle_number?: number; car_number?: number; driver_number?: number }> };
        if (data.vehicles) {
          setAllVehicles(data.vehicles);
        }
      } catch (err) {
        console.error('Failed to load vehicles:', err);
      }
    };
    loadAllVehicles();
    // Refresh every 30 seconds
    const interval = setInterval(loadAllVehicles, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Auto-update leaderboard from vehicle positions during live race
  useEffect(() => {
    if (isPlaying && Object.keys(vehicles).length > 0) {
      // Update leaderboard positions based on vehicle track progress
      const intervalId = setInterval(() => {
        updateLeaderboardFromVehicles();
      }, 500); // Update every 500ms for smooth real-time updates
      
      return () => clearInterval(intervalId);
    }
  }, [isPlaying, vehicles, updateLeaderboardFromVehicles]);
  
  // Combine leaderboard entries with all vehicles to show all vehicles
  const combinedLeaderboard = useMemo(() => {
    // Create a map of leaderboard entries by vehicle_id
    const leaderboardMap = new Map(leaderboard.map(entry => [entry.vehicle_id, entry]));
    
    // Create entries for all vehicles
    const allEntries = allVehicles.map(vehicle => {
      const existingEntry = leaderboardMap.get(vehicle.id);
      if (existingEntry) {
        return existingEntry;
      }
      // Create a placeholder entry for vehicles not in leaderboard yet
      return {
        vehicle_id: vehicle.id,
        vehicle: vehicle.name || `Vehicle ${vehicle.id}`,
        position: 0,
        laps: 0,
        gap_first: null,
        gap_previous: null,
        best_lap_time: null,
        best_lap_kph: 0,
        best_lap_num: 0,
        elapsed: null,
        type: 'leaderboard_entry' as const,
        pic: 0,
        class_type: null,
      };
    });
    
    // If no vehicles from API, use leaderboard entries
    if (allEntries.length === 0) {
      return leaderboard;
    }
    
    return allEntries;
  }, [leaderboard, allVehicles]);
  
  // Sort leaderboard by position to ensure correct order
  const sortedLeaderboard = useMemo(() => {
    return [...combinedLeaderboard].sort((a, b) => {
      // If race is playing, sort by position
      if (isPlaying) {
        // First sort by position
        if (a.position !== b.position) {
          return a.position - b.position;
        }
        // Then by laps if positions are equal
        if (a.laps !== b.laps) {
          return (b.laps || 0) - (a.laps || 0);
        }
      }
      // Finally by vehicle_id for consistency
      return a.vehicle_id.localeCompare(b.vehicle_id);
    });
  }, [combinedLeaderboard, isPlaying]);

  const getPositionColor = (position: number) => {
    if (position === 1) return 'bg-yellow-600';
    if (position === 2) return 'bg-gray-400';
    if (position === 3) return 'bg-orange-600';
    return 'bg-gray-700';
  };

  return (
    <div className="bg-transparent rounded-r-lg w-80 lg:w-96 shadow-xl border-r border-t border-b border-gray-700 backdrop-blur-sm relative z-10">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
              <Trophy size={20} className="text-yellow-500" />
              Leaderboard
            </h3>
            {isPlaying && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-600/20 rounded-full">
                <Radio size={12} className="text-green-400 animate-pulse" />
                <span className="text-xs text-green-400 font-semibold">LIVE</span>
              </div>
            )}
            {!isConnected && !isPlaying && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-600/20 rounded-full">
                <Radio size={12} className="text-gray-400" />
                <span className="text-xs text-gray-400 font-semibold">OFFLINE</span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setShowLeaderboard(false)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Close"
          >
            <ChevronUp className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[calc(100vh-180px)] overflow-y-auto">
        {sortedLeaderboard.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-8">
            {isPlaying ? 'Waiting for race data...' : 'No leaderboard data yet'}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedLeaderboard.map((entry) => (
              <div
                key={entry.vehicle_id}
                className={`p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                  isPlaying && entry.position <= 3 ? getPositionColor(entry.position) : 'bg-transparent hover:bg-gray-700/30'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {isPlaying ? (
                      <span className={`font-bold text-xl flex-shrink-0 ${
                        entry.position === 1 ? 'text-yellow-900' :
                        entry.position === 2 ? 'text-gray-900' :
                        entry.position === 3 ? 'text-orange-900' :
                        'text-white'
                      }`}>
                        #{entry.position}
                      </span>
                    ) : (
                      <span className="font-bold text-xl flex-shrink-0 text-gray-400">
                        #
                      </span>
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-bold text-sm text-white truncate">
                        {entry.vehicle || `Vehicle ${entry.vehicle_id}`}
                      </span>
                      {entry.vehicle && entry.vehicle_id && entry.vehicle !== entry.vehicle_id && (
                        <span className="text-xs text-gray-300/80 mt-0.5 truncate">
                          ID: {entry.vehicle_id}
                        </span>
                      )}
                    </div>
                  </div>
                  {isPlaying && (
                    <div className="text-xs font-semibold flex-shrink-0 ml-2 text-gray-200 bg-transparent px-2 py-1 rounded">
                      {entry.laps || 0} laps
                    </div>
                  )}
                </div>

                {isPlaying && (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-2 pt-2 border-t border-gray-600/50">
                      <div>
                        <span className="text-gray-300">Gap to Leader:</span>{' '}
                        <span className="font-semibold text-white">{entry.gap_first || '--'}</span>
                      </div>
                      <div>
                        <span className="text-gray-300">Gap to Previous:</span>{' '}
                        <span className="font-semibold text-white">{entry.gap_previous || '--'}</span>
                      </div>
                    </div>

                    {entry.best_lap_time && (
                      <div className="flex items-center gap-1 text-xs mt-2 pt-2 border-t border-gray-600/50">
                        <Clock size={12} className="text-gray-400" />
                        <span className="text-gray-300">Best Lap:</span>
                        <span className="font-semibold text-white">{entry.best_lap_time}</span>
                        <span className="text-gray-400 ml-1">
                          ({entry.best_lap_kph.toFixed(1)} km/h)
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

