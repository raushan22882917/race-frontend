import { useState, useMemo, useEffect } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { apiService } from '../services/apiService';
import { Car, ChevronLeft, ChevronRight } from 'lucide-react';

// Vehicle colors for icons - matching TrackMap colors
const VEHICLE_COLORS: Record<string, string> = {
  '13': '#ef4444', // Red
  '22': '#10b981', // Green
  '46': '#f59e0b', // Orange
  '88': '#8b5cf6', // Purple
  '51': '#ec4899', // Pink
  '2': '#f97316',  // Orange-red
  '3': '#14b8a6',  // Teal
  '5': '#a855f7',  // Violet
  '7': '#eab308',  // Yellow
  '16': '#dc2626', // Dark red
  '18': '#059669', // Emerald
  '21': '#d97706', // Amber
  '26': '#f43f5e', // Rose
  '31': '#7c3aed', // Deep purple
  '47': '#06b6d4', // Cyan
  '55': '#84cc16', // Lime
  '72': '#6366f1', // Indigo
  '78': '#fbbf24', // Amber yellow
  '80': '#14b8a6', // Teal
  '93': '#f97316', // Orange-red
  '98': '#ec4899', // Pink
  '113': '#a855f7', // Violet
  '4': '#fbbf24',  // Yellow
  '6': '#dc2626',  // Dark red
  '10': '#059669', // Emerald
  '15': '#d97706', // Amber
  '30': '#f43f5e', // Rose
  '33': '#7c3aed', // Deep purple
  '36': '#06b6d4', // Cyan
  '38': '#84cc16', // Lime
  '40': '#6366f1', // Indigo
  '49': '#fbbf24', // Yellow
  '60': '#dc2626', // Dark red
  '63': '#059669', // Emerald
  '65': '#d97706', // Amber
};

// Function to get vehicle color from vehicleId
const getVehicleColor = (vehicleId: string): string => {
  const parts = vehicleId.split('-');
  
  // Try last part as vehicle number
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    if (VEHICLE_COLORS[lastPart]) {
      return VEHICLE_COLORS[lastPart];
    }
  }
  
  // Try middle part (like GR86-026-72, try "026" or "26")
  if (parts.length >= 2) {
    const middlePart = parts[parts.length - 2];
    const numPart = middlePart.replace(/^0+/, '');
    if (VEHICLE_COLORS[middlePart]) {
      return VEHICLE_COLORS[middlePart];
    }
    if (VEHICLE_COLORS[numPart]) {
      return VEHICLE_COLORS[numPart];
    }
  }
  
  // Generate color based on vehicleId hash
  let hash = 0;
  for (let i = 0; i < vehicleId.length; i++) {
    hash = vehicleId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const vibrantColors = [
    '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
    '#f97316', '#14b8a6', '#a855f7', '#eab308', '#dc2626',
    '#059669', '#d97706', '#f43f5e', '#7c3aed', '#06b6d4',
    '#84cc16', '#6366f1', '#fbbf24',
  ];
  
  const colorIndex = Math.abs(hash) % vibrantColors.length;
  return vibrantColors[colorIndex];
};

// Vehicle SVG Icon Component - uses SVG car icon with vehicle color
function VehicleImage({ vehicleId, vehicleName, isSelected, size = 'md' }: { vehicleId: string; vehicleName: string; isSelected: boolean; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  const iconSize = size === 'sm' ? 16 : 20;
  const vehicleColor = getVehicleColor(vehicleId);
  const displayColor = isSelected ? '#3b82f6' : vehicleColor;
  
  return (
    <div className={`
      flex items-center justify-center ${sizeClass} rounded flex-shrink-0 overflow-hidden relative
      ${isSelected ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-gray-700/50 border border-gray-600/50'}
    `}>
      <Car 
        size={iconSize} 
        style={{ color: displayColor }}
        className={isSelected ? 'text-blue-400' : ''}
      />
    </div>
  );
}

export function VehicleList() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { vehicles, leaderboard, selectedVehicleId, setSelectedVehicle, isPlaying } = useTelemetryStore();
  
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
  
  // Combine vehicles from store with all vehicles from API
  const sortedVehicles = useMemo(() => {
    // Create a map of vehicles from store
    const storeVehiclesMap = new Map(Object.keys(vehicles).map(vehicleId => [vehicleId, vehicles[vehicleId]]));
    
    // Create entries for all vehicles
    const allVehicleEntries = allVehicles.map(vehicle => {
      const storeVehicle = storeVehiclesMap.get(vehicle.id);
      const leaderboardEntry = leaderboard.find(e => e.vehicle_id === vehicle.id);
      
      return {
        vehicleId: vehicle.id,
        vehicle: storeVehicle, // May be undefined if race hasn't started
        position: leaderboardEntry?.position || (isPlaying ? 999 : 0),
        vehicleName: leaderboardEntry?.vehicle || vehicle.name || vehicle.id,
        leaderboardEntry,
        hasData: !!storeVehicle, // Track if vehicle has telemetry data
      };
    });
    
    // If no vehicles from API, use vehicles from store
    if (allVehicleEntries.length === 0) {
      return Object.entries(vehicles)
        .map(([vehicleId, vehicle]) => {
          const leaderboardEntry = leaderboard.find(e => e.vehicle_id === vehicleId);
          return {
            vehicleId,
            vehicle,
            position: leaderboardEntry?.position || (isPlaying ? 999 : 0),
            vehicleName: leaderboardEntry?.vehicle || vehicleId,
            leaderboardEntry,
            hasData: true,
          };
        })
        .sort((a, b) => {
          // If race is playing, sort by position
          if (isPlaying) {
            return a.position - b.position;
          }
          // Otherwise sort by vehicle ID
          return a.vehicleId.localeCompare(b.vehicleId);
        });
    }
    
    // Sort vehicles
    return allVehicleEntries.sort((a, b) => {
      // If race is playing, sort by position
      if (isPlaying) {
        return a.position - b.position;
      }
      // Otherwise sort by vehicle ID
      return a.vehicleId.localeCompare(b.vehicleId);
    });
  }, [vehicles, leaderboard, allVehicles, isPlaying]);

  if (sortedVehicles.length === 0) {
    return (
      <div className="bg-transparent rounded-lg p-3 border border-gray-700 backdrop-blur-sm">
        <div className="text-xs text-gray-400 text-center">No vehicles available</div>
      </div>
    );
  }

  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
    if (position === 2) return 'text-gray-300 bg-gray-500/20 border-gray-500/50';
    if (position === 3) return 'text-orange-400 bg-orange-500/20 border-orange-500/50';
    return 'text-gray-400 bg-gray-700/20 border-gray-600/50';
  };

  return (
    <div className={`bg-transparent rounded-lg border border-gray-700 backdrop-blur-sm shadow-xl transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-64'}`}>
      {/* Header */}
      <div className="p-2 border-b border-gray-700 flex items-center justify-between">
        {!isCollapsed && (
          <h3 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
            <Car size={12} className="text-blue-400" />
            Vehicles ({sortedVehicles.length})
          </h3>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-700 rounded transition-colors ml-auto"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </div>

      {/* Vehicle List */}
      {!isCollapsed ? (
        <div className="p-1.5 max-h-[400px] overflow-y-auto">
          <div className="flex flex-col gap-1">
            {sortedVehicles.map(({ vehicleId, vehicle, position, vehicleName, leaderboardEntry }) => {
              const isSelected = vehicleId === selectedVehicleId;
              const colors = getPositionColor(position);
              
              return (
                <button
                  key={vehicleId}
                  onClick={() => setSelectedVehicle(vehicleId)}
                  className={`
                    group relative flex items-center gap-1.5 p-1.5 rounded-md transition-all duration-200
                    ${isSelected 
                      ? 'bg-blue-600/30 border border-blue-500/50 shadow-md' 
                      : `${colors} border hover:bg-gray-700/30`
                    }
                    hover:scale-[1.02] active:scale-[0.98]
                  `}
                  title={
                    isPlaying && position !== 999 && position > 0
                      ? `${vehicleName} - Position ${position}`
                      : vehicleName
                  }
                >
                  {/* Position Badge - Show if race is playing and position is valid */}
                  {isPlaying && position !== 999 && position > 0 && (
                    <div className={`
                      flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold flex-shrink-0
                      ${position === 1 ? 'bg-yellow-500 text-yellow-900' :
                        position === 2 ? 'bg-gray-300 text-gray-900' :
                        position === 3 ? 'bg-orange-500 text-orange-900' :
                        'bg-gray-600 text-white'
                      }
                    `}>
                      {position}
                    </div>
                  )}
                  {/* Show "#" placeholder when race hasn't started */}
                  {!isPlaying && (
                    <div className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold flex-shrink-0 bg-gray-600/50 text-gray-400">
                      #
                    </div>
                  )}

                  {/* Vehicle Image */}
                  <VehicleImage vehicleId={vehicleId} vehicleName={vehicleName} isSelected={isSelected} size="md" />

                  {/* Vehicle Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className={`
                      text-xs font-semibold truncate
                      ${isSelected ? 'text-blue-300' : 'text-gray-300'}
                    `}>
                      {vehicleName}
                    </div>
                    {leaderboardEntry?.vehicle && leaderboardEntry.vehicle !== vehicleId && (
                      <div className="text-[10px] text-gray-500 truncate">
                        #{vehicleId}
                      </div>
                    )}
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0 animate-pulse"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-1.5 flex flex-col gap-1">
          {sortedVehicles.map(({ vehicleId, vehicle, position, vehicleName }) => {
            const isSelected = vehicleId === selectedVehicleId;
            
            return (
              <button
                key={vehicleId}
                onClick={() => setSelectedVehicle(vehicleId)}
                className={`
                  group relative p-2 rounded-md transition-all duration-200
                  ${isSelected 
                    ? 'bg-blue-600/30 border border-blue-500/50 shadow-md' 
                    : 'bg-gray-700/20 border border-gray-600/50 hover:bg-gray-700/30'
                  }
                  hover:scale-105 active:scale-95 flex items-center justify-center
                `}
                title={
                  isPlaying && position !== 999 && position > 0
                    ? `Position ${position} - ${vehicleName}`
                    : vehicleName
                }
              >
                <VehicleImage vehicleId={vehicleId} vehicleName={vehicleName} isSelected={isSelected} size="sm" />
                {isSelected && (
                  <div className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

