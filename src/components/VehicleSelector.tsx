import React from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { useTelemetryServiceWS } from '../services/telemetryServiceWS';
import { Car } from 'lucide-react';

export function VehicleSelector() {
  const { vehicles, selectedVehicleId, setSelectedVehicle } = useTelemetryStore();
  const vehicleIds = Object.keys(vehicles);

  // Debug: Log vehicles when they change
  React.useEffect(() => {
    if (vehicleIds.length > 0) {
      console.log('VehicleSelector: Vehicles in store:', vehicleIds);
      vehicleIds.forEach(id => {
        const v = vehicles[id];
        console.log(`  - ${id}: position=${JSON.stringify(v.position)}, hasGPS=${!!(v.telemetry.gps_lat && v.telemetry.gps_lon)}`);
      });
    }
  }, [vehicleIds.length, vehicles]);

  if (vehicleIds.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="p-4 bg-gray-700/50 rounded-full mb-4">
            <Car size={24} className="text-gray-500" />
          </div>
          <h3 className="text-base font-semibold mb-2 text-gray-300">No Vehicles Available</h3>
          <div className="text-sm text-gray-400 text-center">Waiting for vehicle data to load...</div>
          <div className="text-xs text-gray-500 mt-3 px-4 py-2 bg-gray-900/50 rounded-lg border border-gray-700/30">
            Check browser console for debug info
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl p-1 border border-gray-700/50">
      <div className="grid grid-cols-3 gap-3 p-2">
        {vehicleIds.map((vehicleId) => {
          const isSelected = vehicleId === selectedVehicleId;
          return (
            <button
              key={vehicleId}
              onClick={() => setSelectedVehicle(vehicleId)}
              className={`
                group relative p-4 rounded-xl text-sm font-semibold transition-all duration-300
                transform hover:scale-105 active:scale-95 overflow-hidden
                ${
                  isSelected
                    ? 'bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/50 border-2 border-blue-400'
                    : 'bg-gray-700/70 text-gray-300 hover:bg-gray-700 border-2 border-gray-600/50 hover:border-gray-500'
                }
              `}
            >
              {/* Shine effect for selected */}
              {isSelected && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              )}
              <span className="relative z-10">{vehicleId}</span>
              {isSelected && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full shadow-lg"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

