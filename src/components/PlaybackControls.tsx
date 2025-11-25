import { Play, Pause, Gauge } from 'lucide-react';
import { useTelemetryStore } from '../store/telemetryStore';
import { useTelemetryServiceWS as useTelemetryService } from '../services/telemetryServiceWS';
import { useModal } from '../contexts/ModalContext';
import { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/apiService';

export function PlaybackControls() {
  const { 
    isPaused, 
    isPlaying,
    resetVehiclesToStart, 
    vehicles, 
    selectedVehicleId, 
    leaderboard, 
    weather, 
    weatherEnabled,
    raceFinished,
    winnerVehicleId,
    setRaceFinished,
    resetRace,
    setPaused
  } = useTelemetryStore();
  const { play, pause, restart } = useTelemetryService();
  const { setShowLeaderboard } = useModal();
  const [vehicleInfo, setVehicleInfo] = useState<Record<string, { driver_number?: number; car_number?: number }>>({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const hasResetVehiclesRef = useRef(false);

  // Auto-stop race when winner is detected (from TrackMap)
  useEffect(() => {
    if (raceFinished && isPlaying && winnerVehicleId) {
      // Auto-pause when race is finished
      pause().catch(console.error);
      setPaused(true);
      // Show leaderboard when winner is decided
      setShowLeaderboard(true);
    }
  }, [raceFinished, winnerVehicleId, isPlaying, pause, setPaused, setShowLeaderboard]);

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

  // Check if data is loaded (vehicles or leaderboard) - use length to avoid object reference issues
  const vehicleCount = Object.keys(vehicles).length;
  const leaderboardCount = leaderboard.length;
  
  useEffect(() => {
    // Only check once when data becomes available
    if (isDataLoaded) return;
    
    const hasVehicles = vehicleCount > 0;
    const hasLeaderboard = leaderboardCount > 0;
    
    if (hasVehicles || hasLeaderboard) {
      setIsDataLoaded(true);
      // Reset vehicles to start position once data is loaded (only once)
      if (!hasResetVehiclesRef.current) {
        // Use setTimeout to avoid immediate state update loop
        setTimeout(() => {
          resetVehiclesToStart();
          hasResetVehiclesRef.current = true;
        }, 100);
      }
    }
  }, [vehicleCount, leaderboardCount, isDataLoaded]); // Use counts instead of objects
  
  // Reset the ref when race is paused/stopped (separate effect)
  useEffect(() => {
    if (!isPlaying && hasResetVehiclesRef.current) {
      hasResetVehiclesRef.current = false;
    }
  }, [isPlaying]);

  // Get selected vehicle info
  const selectedVehicleInfo = selectedVehicleId ? vehicleInfo[selectedVehicleId] : null;
  const leaderboardEntry = selectedVehicleId ? leaderboard.find(e => e.vehicle_id === selectedVehicleId) : null;
  const vehicleNumber = selectedVehicleInfo?.car_number || leaderboardEntry?.vehicle || selectedVehicleId;

  // Calculate average speed of all vehicles (same logic as VehicleInfoCards)
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
  
  // Get selected vehicle speed
  const selectedVehicle = selectedVehicleId ? vehicles[selectedVehicleId] : undefined;
  const vehicleSpeed = selectedVehicle?.telemetry?.speed || 0;

  // Speed color functions (same as VehicleInfoCards)
  const getSpeedColor = (speed: number) => {
    if (speed < 50) return 'bg-green-400';
    if (speed < 150) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const getSpeedometerColor = (speed: number) => {
    if (speed < 50) return 'text-green-400';
    if (speed < 150) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSpeedometerFillColor = (speed: number) => {
    if (speed < 50) return 'bg-green-400/20';
    if (speed < 150) return 'bg-yellow-400/20';
    return 'bg-red-400/20';
  };

  const getSpeedometerRingColor = (speed: number) => {
    if (speed < 50) return 'border-green-400/50';
    if (speed < 150) return 'border-yellow-400/50';
    return 'border-red-400/50';
  };

  // Weather condition inference (same as WeatherDisplay)
  const inferWeatherCondition = (
    airTemp: number | undefined,
    humidity: number | undefined,
    windSpeed: number | undefined,
    rain: number | undefined
  ): string => {
    if (rain && rain > 0) return 'rainy';
    if (humidity && humidity >= 70) return 'humid';
    if (windSpeed && windSpeed >= 6) return 'windy';
    if (humidity && humidity >= 60) return 'overcast';
    if (airTemp && airTemp >= 30 && windSpeed && windSpeed >= 6) return 'hotandwindy';
    if (airTemp && airTemp >= 30) return 'sunny';
    return 'clear';
  };

  const weatherCondition = weather ? inferWeatherCondition(
    weather.air_temp ?? undefined,
    weather.humidity ?? undefined,
    weather.wind_speed ?? undefined,
    weather.rain ?? undefined
  ) : null;

  const handlePlay = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't start if data is not loaded
    if (!isDataLoaded) {
      console.log('Waiting for data to load...');
      return;
    }
    
    // Don't start if already starting
    if (isStarting) {
      return;
    }
    
    setIsStarting(true);
    
    try {
      // Step 1: Reset race state when starting new race
      resetRace();
      
      // Step 2: Reset vehicles to start position BEFORE starting race
      resetVehiclesToStart();
      
      // Step 3: Wait a moment to ensure vehicles are reset
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Step 4: Restart the race backend
      await restart();
      
      // Step 5: Wait a moment for restart to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Step 6: Now start the race
      await play();
      
      setIsStarting(false);
    } catch (error) {
      console.error('Play failed:', error);
      setIsStarting(false);
    }
  };

  const handlePause = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await pause();
      // Reset vehicles to start when paused
      resetVehiclesToStart();
    } catch (error) {
      console.error('Pause failed:', error);
    }
  };


  return (
    <div className="fixed bottom-6 left-6 z-50 pointer-events-auto">
      {/* Car Dashboard Style Control Panel */}
      <div className="relative">
        {/* Main Control Panel - Racing Car Style */}
        <div className="relative bg-transparent rounded-2xl p-4 shadow-2xl border-2 border-gray-700/50 backdrop-blur-sm">
          {/* Dashboard Frame */}
          <div className="absolute inset-0 rounded-2xl border-2 border-gray-600/30 pointer-events-none"></div>
          
          {/* Glossy Top Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-gray-600/40 to-transparent rounded-t-2xl"></div>
          
          {/* Grid Layout: 2 rows, 3 columns */}
          <div className="grid grid-cols-3 gap-3">
            {/* Row 1: Vehicle Number Header (spans all 3 columns) */}
            <div className="col-span-3 pb-3 border-b border-gray-700/50 relative">
              {/* Weather Display - Left Corner */}
              {weather && weatherEnabled && (
                <div className="absolute top-0 left-0 flex items-center gap-1.5">
                  <img
                    src={`/assets/weather/${weatherCondition}.png`}
                    alt={weatherCondition || 'weather'}
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/weather/clear.png';
                    }}
                  />
                  <div className="text-[9px] text-black leading-tight">
                    <div>{weather.air_temp?.toFixed(0)}°C</div>
                    {weather.rain && weather.rain > 0 && (
                      <div className="text-black">{weather.rain.toFixed(1)}mm</div>
                    )}
                  </div>
                </div>
              )}
              
              {selectedVehicleId ? (
                <div className="flex flex-col items-center">
                  <div className="text-lg font-bold text-black">
                    #{vehicleNumber}
                  </div>
                  {selectedVehicleInfo?.driver_number && (
                    <div className="text-[10px] text-black mt-0.5">
                      Driver {selectedVehicleInfo.driver_number}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="text-[10px] text-black uppercase tracking-wider mb-1">Vehicle</div>
                  <div className="text-sm text-black">No Selection</div>
                </div>
              )}
              {/* Status Indicator - Right Corner */}
              <div className={`absolute top-0 right-0 w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></div>
            </div>

            {/* Row 2, Column 1: Play Control Button */}
            <div className="flex items-center justify-center">
      <button
        onClick={isPaused ? handlePlay : handlePause}
                className={`
                  relative w-16 h-16 rounded-full flex items-center justify-center
                  transition-all duration-300 transform hover:scale-105 active:scale-95
                  shadow-xl z-10 overflow-hidden group
                  ${!isDataLoaded || isStarting
                    ? 'bg-gradient-to-br from-gray-600 via-gray-500 to-gray-700 shadow-gray-500/60 border-4 border-gray-400/80 cursor-not-allowed opacity-60'
                    : isPaused 
                    ? 'bg-gradient-to-br from-green-600 via-green-500 to-green-700 shadow-green-500/60 border-4 border-green-400/80' 
                    : 'bg-gradient-to-br from-red-600 via-red-500 to-red-700 shadow-red-500/60 border-4 border-red-400/80'
                  }
                `}
                title={
                  !isDataLoaded 
                    ? 'Loading data...' 
                    : isStarting 
                    ? 'Starting race...' 
                    : isPaused 
                    ? (raceFinished ? 'Race Finished - Click to Start New Race' : 'Start Race') 
                    : 'Pause Race'
                }
                disabled={!isDataLoaded || isStarting}
        type="button"
      >
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Inner Ring */}
                <div className={`absolute inset-2 rounded-full border-2 ${isPaused ? 'border-green-300/50' : 'border-red-300/50'}`}></div>
                
                {/* Icon */}
                <div className="relative z-10">
                  {isStarting ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : isPaused ? (
                    <Play className="w-6 h-6 text-white fill-white drop-shadow-lg" />
                  ) : (
                    <Pause className="w-6 h-6 text-white fill-white drop-shadow-lg" />
                  )}
                </div>
                
                {/* Race Finished Indicator */}
                {raceFinished && winnerVehicleId && !isStarting && (
                  <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-yellow-300">
                    WINNER
                  </div>
                )}
                
                {/* Data Loading Indicator */}
                {!isDataLoaded && (
                  <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-blue-300">
                    LOADING
                  </div>
                )}
                
                {/* Pulsing Ring Effect */}
                {isPaused && (
                  <div className="absolute inset-0 rounded-full border-4 border-green-400/50 animate-ping"></div>
                )}
          </button>
        </div>

            {/* Row 2, Column 2: Vehicle Speed */}
            <div className="flex items-center justify-center">
              {selectedVehicle ? (
                <div className={`relative flex items-start gap-2 p-2 rounded-lg border-2 ${getSpeedometerRingColor(vehicleSpeed)} ${getSpeedometerFillColor(vehicleSpeed)} transition-colors duration-300 w-full`}>
                  <div className="flex flex-col items-center">
                    <Gauge className={`h-5 w-5 ${getSpeedometerColor(vehicleSpeed)} transition-colors duration-300`} />
                    <div className={`absolute -top-1 -right-1 w-2 h-2 ${getSpeedColor(vehicleSpeed)} rounded-full animate-pulse border border-gray-900`}></div>
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="text-lg font-bold text-black transition-colors duration-300">
                      {vehicleSpeed.toFixed(0)}
                    </div>
                    <div className="text-[9px] text-black uppercase tracking-wider">km/h</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-2 rounded-lg border-2 border-gray-700/50 bg-transparent w-full">
                  <Gauge className="h-5 w-5 text-black" />
                  <div className="flex flex-col items-start">
                    <div className="text-lg font-bold text-black">--</div>
                    <div className="text-[9px] text-black uppercase tracking-wider">km/h</div>
                  </div>
                </div>
              )}
            </div>

            {/* Row 2, Column 3: Average Speed */}
            <div className="flex items-center justify-center">
              {averageSpeed > 0 ? (
                <div className={`relative flex items-start gap-2 p-2 rounded-lg border-2 ${getSpeedometerRingColor(averageSpeed)} ${getSpeedometerFillColor(averageSpeed)} transition-colors duration-300 w-full`}>
                  <div className="flex flex-col items-center">
                    <Gauge className={`h-5 w-5 ${getSpeedometerColor(averageSpeed)} transition-colors duration-300`} />
                    <div className={`absolute -top-1 -right-1 w-2 h-2 ${getSpeedColor(averageSpeed)} rounded-full animate-pulse border border-gray-900`}></div>
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="text-lg font-bold text-black transition-colors duration-300">
                      {averageSpeed.toFixed(0)}
                    </div>
                    <div className="text-[9px] text-black uppercase tracking-wider">Avg</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-2 rounded-lg border-2 border-gray-700/50 bg-transparent w-full">
                  <Gauge className="h-5 w-5 text-black" />
                  <div className="flex flex-col items-start">
                    <div className="text-lg font-bold text-black">--</div>
                    <div className="text-[9px] text-black uppercase tracking-wider">Avg</div>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>

        {/* Corner Accents - Racing Style */}
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-yellow-500/50 rounded-tl-lg"></div>
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-yellow-500/50 rounded-tr-lg"></div>
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-yellow-500/50 rounded-bl-lg"></div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-yellow-500/50 rounded-br-lg"></div>
      </div>
    </div>
  );
}
