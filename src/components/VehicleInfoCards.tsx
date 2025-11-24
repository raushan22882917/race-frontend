import { VehicleSelector } from './VehicleSelector';
import { Car, X, Gauge, Clock, Activity } from 'lucide-react';
import { useTelemetryStore } from '../store/telemetryStore';
import { useModal } from '../contexts/ModalContext';

export function VehicleInfoCards() {
  const { showVehicleSelector, setShowVehicleSelector, sidebarCollapsed } = useModal();
  const { vehicles, leaderboard, selectedVehicleId } = useTelemetryStore();

  // Calculate average speed of all vehicles
  const calculateAverageSpeed = () => {
    const vehicleArray = Object.values(vehicles);
    if (vehicleArray.length === 0) return 0;
    
    const speeds = vehicleArray
      .map(v => v.telemetry?.speed || 0)
      .filter(speed => speed > 0); // Only count vehicles with speed > 0
    
    if (speeds.length === 0) return 0;
    return speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
  };

  const averageSpeed = calculateAverageSpeed();
  const allVehiclesRunning = Object.keys(vehicles).length > 0 && averageSpeed > 0;

  // Get only the selected vehicle
  const selectedVehicle = selectedVehicleId && vehicles[selectedVehicleId]
    ? (() => {
        const vehicle = vehicles[selectedVehicleId];
        const leaderboardEntry = leaderboard.find(e => e.vehicle_id === selectedVehicleId);
        return {
          vehicleId: selectedVehicleId,
          vehicle,
          position: leaderboardEntry?.position || 999,
          leaderboardEntry,
        };
      })()
    : null;

  const getPositionColor = (position: number) => {
    if (position === 1) return {
      bg: 'from-yellow-600/90 to-yellow-500/90',
      border: 'border-yellow-400/50',
      badge: 'bg-yellow-500 text-yellow-900',
    };
    if (position === 2) return {
      bg: 'from-gray-400/90 to-gray-300/90',
      border: 'border-gray-300/50',
      badge: 'bg-gray-300 text-gray-900',
    };
    if (position === 3) return {
      bg: 'from-orange-600/90 to-orange-500/90',
      border: 'border-orange-400/50',
      badge: 'bg-orange-500 text-orange-900',
    };
    return {
      bg: 'from-gray-700/90 to-gray-600/90',
      border: 'border-gray-600/50',
      badge: 'bg-gray-600 text-white',
    };
  };

  const getSpeedColor = (speed: number) => {
    // Speed-based color indicator
    // Low speed (0-50 km/h): Green
    // Medium speed (50-150 km/h): Yellow/Orange
    // High speed (150+ km/h): Red
    if (speed < 50) return 'bg-green-400';
    if (speed < 150) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const getSpeedometerColor = (speed: number) => {
    // Speed-based color for speedometer fill
    // Low speed (0-50 km/h): Green
    // Medium speed (50-150 km/h): Yellow/Orange
    // High speed (150+ km/h): Red
    if (speed < 50) return 'text-green-400';
    if (speed < 150) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSpeedometerFillColor = (speed: number) => {
    // Speed-based fill color for speedometer background
    // Low speed (0-50 km/h): Green
    // Medium speed (50-150 km/h): Yellow/Orange
    // High speed (150+ km/h): Red
    if (speed < 50) return 'bg-green-400/20';
    if (speed < 150) return 'bg-yellow-400/20';
    return 'bg-red-400/20';
  };

  const getSpeedometerRingColor = (speed: number) => {
    // Speed-based ring color for speedometer border
    if (speed < 50) return 'border-green-400/50';
    if (speed < 150) return 'border-yellow-400/50';
    return 'border-red-400/50';
  };

  return (
    <div className="w-full max-w-4xl">
      {/* Selected Vehicle Info Card - Single Line */}
      {!selectedVehicle ? (
        <div className="flex items-center gap-3 py-2 px-3">
          {/* Default Icon on Left */}
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-700/50 border border-gray-600/50">
            <Car className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex-1 flex items-center justify-center gap-3">
            <div className="text-sm text-gray-400">No vehicle selected</div>
            <button
              onClick={() => setShowVehicleSelector(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
            >
              <Car className="h-4 w-4" />
              <span className="text-sm font-semibold">Select Vehicle</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 py-1.5 px-3">
          {(() => {
            const { vehicleId, vehicle, position, leaderboardEntry } = selectedVehicle;
            const telemetry = vehicle.telemetry;
            const speed = telemetry.speed || 0;
            const lap = telemetry.lap || 0;
            const gear = telemetry.gear || 0;
            const colors = getPositionColor(position);

            return (
              <>
                {/* Default Icon on Left */}
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-lg border-2 ${getSpeedometerRingColor(speed)} ${getSpeedometerFillColor(speed)} transition-colors duration-300`}>
                  <Car className={`h-5 w-5 ${getSpeedometerColor(speed)} transition-colors duration-300`} />
                  {/* Speed Indicator */}
                  <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 ${getSpeedColor(speed)} rounded-full animate-pulse border border-gray-900 shadow-md`}></div>
                </div>
                {/* Position Badge - Only show if position is valid (not 999) */}
                {position !== 999 && (
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-lg font-bold text-base
                    ${colors.badge}
                  `}>
                    {position}
                  </div>
                )}

                {/* Vehicle Name */}
                <div className="min-w-[100px]">
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span className="truncate">{leaderboardEntry?.vehicle || vehicleId}</span>
                  </div>
                  {leaderboardEntry?.vehicle && leaderboardEntry.vehicle !== vehicleId && (
                    <div className="text-[10px] text-gray-300/80 mt-0.5 truncate">
                      ID: <span className="font-bold">{vehicleId}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {/* Speed */}
                  <div className="relative flex items-center justify-center w-20 h-20">
                    {/* Fill Color Background */}
                    <div className={`absolute inset-0 rounded-full ${getSpeedometerFillColor(speed)} transition-colors duration-300`}></div>
                    {/* Ring Border */}
                    {/* Gauge Icon */}
                    {/* Speed Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                      <div className="text-sm font-bold text-white leading-none">
                        {speed.toFixed(0)}
                      </div>
                      <div className={`text-[9px] ${getSpeedometerColor(speed)} mt-0.5 transition-colors duration-300`}>km/h</div>
                    </div>
                    {/* Speed Indicator - Visible pulsing dot */}
                    <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 ${getSpeedColor(speed)} rounded-full animate-pulse border-2 border-gray-900 shadow-lg z-20 transition-colors duration-300`}></div>
                  </div>
                  {/* Average Speed Display - Show when all vehicles are running */}
                  {allVehiclesRunning && (
                    <div className={`relative flex flex-col items-start gap-0.5 px-2 py-1 ${getSpeedometerFillColor(averageSpeed)} rounded-lg border-2 ${getSpeedometerRingColor(averageSpeed)} transition-colors duration-300`}>
                      <div className="text-[8px] text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
                        <span>Avg Speed</span>
                        <div className={`w-1.5 h-1.5 ${getSpeedColor(averageSpeed)} rounded-full animate-pulse`}></div>
                      </div>
                      <div className={`text-xs font-bold ${getSpeedometerColor(averageSpeed)} transition-colors duration-300`}>
                        {averageSpeed.toFixed(0)} km/h
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Enhanced Vehicle Selector Modal/Overlay - Slides from Left */}
      {showVehicleSelector && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowVehicleSelector(false);
            }
          }}
        >
          <div className={`fixed top-0 bottom-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 shadow-2xl border-r border-gray-700/50 p-8 overflow-y-auto animate-slide-in-from-left transition-all duration-300 ${
            sidebarCollapsed
              ? 'right-[61px] w-[calc(100vw-61px)]' // Collapsed: 16px + 40px + 5px = 61px from right
              : 'right-[213px] w-[calc(100vw-213px)]' // Expanded: 16px + 192px + 5px = 213px from right
          }`}>
            {/* Decorative gradient border */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 opacity-50 blur-xl -z-10"></div>
            
            {/* Close Button */}
            <button
              onClick={() => setShowVehicleSelector(false)}
              className="absolute top-5 left-5 p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 border border-gray-700/50 hover:border-gray-600 hover:scale-110 active:scale-95 group z-10"
              aria-label="Close"
            >
              <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
            </button>

            {/* Modal Header */}
            <div className="mb-6 pr-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
                  <Car className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Select Vehicle</h2>
              </div>
              <p className="text-sm text-gray-400 ml-12">
                Choose a vehicle to view detailed telemetry and position data
              </p>
            </div>

            {/* Vehicle Selector Content */}
            <div className="pr-2">
              <VehicleSelector />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
