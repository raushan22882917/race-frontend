import { useState, useEffect, useMemo } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { apiService } from '../services/apiService';
import { 
  Gauge, Zap, TrendingUp, Activity, Navigation, Layers, 
  MapPin, GaugeCircle, Wind, Car, Clock, Target
} from 'lucide-react';

const VEHICLE_COLORS: Record<string, string> = {
  '13': '#3b82f6', // Blue
  '22': '#ef4444', // Red
  '46': '#10b981', // Green
  '88': '#f59e0b', // Orange
  '51': '#8b5cf6', // Purple
};

interface ProgressBarProps {
  value: number;
  max: number;
  color: string;
}

function ProgressBar({ value, max, color }: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center space-x-2">
      <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
      <span className="text-xs text-gray-300 font-semibold w-10 text-right">
        {value.toFixed(0)}%
      </span>
    </div>
  );
}

export function LiveTelemetry() {
  const { vehicles, leaderboard } = useTelemetryStore();
  const [vehicleInfo, setVehicleInfo] = useState<Record<string, { driver_number?: number; car_number?: number }>>({});

  // Load vehicle info with driver numbers
  useEffect(() => {
    const loadVehicleInfo = async () => {
      try {
        const data = await apiService.getVehicles() as { vehicles?: Array<{ id: string; driver_number?: number; car_number?: number }> };
        const infoMap: Record<string, { driver_number?: number; car_number?: number }> = {};
        data.vehicles?.forEach((v) => {
          infoMap[v.id] = {
            driver_number: v.driver_number,
            car_number: v.car_number,
          };
        });
        setVehicleInfo(infoMap);
      } catch (err) {
        console.error('Failed to load vehicle info:', err);
      }
    };
    loadVehicleInfo();
    // Refresh every 30 seconds
    const interval = setInterval(loadVehicleInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  // Sort vehicles by leaderboard position
  const sortedVehicles = useMemo(() => {
    return Object.entries(vehicles)
      .map(([vehicleId, vehicle]) => {
        const entry = leaderboard.find(e => e.vehicle_id === vehicleId);
        const info = vehicleInfo[vehicleId] || {};
        return {
          vehicleId,
          vehicle,
          position: entry?.position || 999,
          leaderboardEntry: entry,
          driverNumber: info.driver_number,
          carNumber: info.car_number,
        };
      })
      .sort((a, b) => a.position - b.position);
  }, [vehicles, leaderboard, vehicleInfo]);

  if (sortedVehicles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Car className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Waiting for vehicle telemetry data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Live Vehicle Telemetry</h2>
        </div>
        <div className="text-sm text-gray-400">
          {sortedVehicles.length} {sortedVehicles.length === 1 ? 'Vehicle' : 'Vehicles'} Active
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/80 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-900/80 z-10">
                  <div className="flex items-center space-x-2">
                    <Car className="h-4 w-4" />
                    <span>Vehicle</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center justify-center space-x-1">
                    <Target className="h-4 w-4" />
                    <span>Pos</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center justify-center space-x-1">
                    <Layers className="h-4 w-4" />
                    <span>Lap</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center justify-center space-x-1">
                    <Gauge className="h-4 w-4 text-blue-400" />
                    <span>Speed</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center justify-center space-x-1">
                    <Zap className="h-4 w-4 text-red-400" />
                    <span>RPM</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <span>Gear</span>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center justify-center space-x-1">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span>Throttle</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center justify-center space-x-1">
                    <Activity className="h-4 w-4 text-orange-400" />
                    <span>Brake</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center justify-center space-x-1">
                    <Navigation className="h-4 w-4 text-purple-400" />
                    <span>Steering</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center justify-center space-x-1">
                    <MapPin className="h-4 w-4 text-yellow-400" />
                    <span>Distance</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center justify-center space-x-1">
                    <Wind className="h-4 w-4 text-indigo-400" />
                    <span>Altitude</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center justify-center space-x-1">
                    <GaugeCircle className="h-4 w-4 text-pink-400" />
                    <span>Accel</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center justify-center space-x-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>Last Update</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {sortedVehicles.map(({ vehicleId, vehicle, position, leaderboardEntry, driverNumber, carNumber }) => {
                const vehicleColor = VEHICLE_COLORS[vehicleId] || '#6b7280';
                const telemetry = vehicle.telemetry;
                const vehicleName = leaderboardEntry?.vehicle || vehicleId;
                const displayName = carNumber ? `#${carNumber}` : vehicleName;
                const speed = telemetry.speed || 0;
                const gear = telemetry.gear || 0;
                const rpm = telemetry.rpm || 0;
                const throttle = telemetry.throttle || 0;
                const brakeFront = telemetry.brake_front || 0;
                const brakeRear = telemetry.brake_rear || 0;
                const steering = telemetry.steering || 0;
                const lap = telemetry.lap || 0;
                const lapDistance = telemetry.lap_distance || 0;
                const altitude = telemetry.altitude || 0;
                const accelX = telemetry.acceleration_x || 0;
                const accelY = telemetry.acceleration_y || 0;

                return (
                  <tr
                    key={vehicleId}
                    className="hover:bg-gray-800/50 transition-colors"
                    style={{
                      borderLeft: `3px solid ${vehicleColor}`
                    }}
                  >
                    {/* Vehicle */}
                    <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-gray-800/95 z-10">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: vehicleColor }}
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{displayName}</span>
                          <div className="flex items-center space-x-2 text-xs text-gray-400">
                            {driverNumber && (
                              <span>Driver #{driverNumber}</span>
                            )}
                            {(leaderboardEntry?.vehicle && leaderboardEntry.vehicle !== vehicleId) && (
                              <span>• ID: {vehicleId}</span>
                          )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Position */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm"
                        style={{
                          background: `linear-gradient(135deg, ${vehicleColor}, ${vehicleColor}dd)`,
                          border: `1px solid ${vehicleColor}`
                        }}
                      >
                        {position}
                      </div>
                    </td>

                    {/* Lap */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="text-white font-semibold">{lap}</span>
                    </td>

                    {/* Speed */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-center">
                        <div className="text-white font-bold">{speed.toFixed(0)}</div>
                        <div className="text-xs text-gray-400">km/h</div>
                        <div className="mt-1 h-1 bg-gray-700/50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min((speed / 200) * 100, 100)}%`,
                              backgroundColor: '#3b82f6'
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* RPM */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="text-white font-bold">
                        {rpm > 0 ? rpm.toFixed(0) : 'N/A'}
                      </div>
                    </td>

                    {/* Gear */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div
                        className="inline-block px-2 py-1 rounded font-bold text-lg"
                        style={{
                          color: vehicleColor,
                          background: `${vehicleColor}20`,
                          border: `1px solid ${vehicleColor}40`
                        }}
                      >
                        {gear > 0 ? `G${gear}` : 'N'}
                      </div>
                    </td>

                    {/* Throttle */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="min-w-[100px]">
                        <ProgressBar
                          value={throttle * 100}
                          max={100}
                          color="#10b981"
                        />
                      </div>
                    </td>

                    {/* Brake */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="min-w-[100px]">
                        <ProgressBar
                          value={((brakeFront + brakeRear) / 2) * 100}
                          max={100}
                          color="#f59e0b"
                        />
                      </div>
                    </td>

                    {/* Steering */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="min-w-[120px]">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="h-0.5 w-full bg-purple-500/30" />
                            </div>
                            <div
                              className="h-full bg-purple-400 rounded-full transition-all relative"
                              style={{
                                width: `${Math.abs(steering) * 100}%`,
                                marginLeft: steering < 0 ? '0' : 'auto',
                                marginRight: steering < 0 ? 'auto' : '0'
                              }}
                            />
                          </div>
                          <span className="text-xs text-purple-300 font-semibold w-10 text-right">
                            {(steering * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Distance */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="text-white font-semibold">
                        {(lapDistance / 1000).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">km</div>
                    </td>

                    {/* Altitude */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="text-white font-semibold">{altitude.toFixed(1)}</div>
                      <div className="text-xs text-gray-400">m</div>
                    </td>

                    {/* Acceleration */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="text-xs">
                        <div className="text-white font-semibold">X: {accelX.toFixed(2)}</div>
                        <div className="text-gray-400">Y: {accelY.toFixed(2)}</div>
                      </div>
                    </td>

                    {/* Last Update */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {telemetry.timestamp ? (
                        <div className="text-xs text-gray-400">
                          {new Date(telemetry.timestamp).toLocaleTimeString()}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

