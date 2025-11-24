import { useState, useEffect, useMemo } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { analysisService } from '../services/analysisService';
import {
  Car, ChevronDown, ChevronRight, X, Brain, Gauge, LineChart,
  PlayCircle, Target, Square, CornerUpRight, BarChart3, TrendingUp,
  CheckCircle, AlertCircle, Loader2, Sparkles
} from 'lucide-react';

interface Vehicle {
  id: string;
  name: string;
  file?: string;
  vehicle_number?: number;
  car_number?: number;
  driver_number?: number;
  has_endurance_data?: boolean;
}

interface DriverSidebarProps {
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  activePage?: string;
  onPageChange?: (page: string) => void;
  selectedVehicle?: string;
  onVehicleChange?: (vehicleId: string) => void;
}

export function DriverSidebar({
  collapsed = false,
  onCollapseChange,
  activePage = 'ai-insights',
  onPageChange,
  selectedVehicle,
  onVehicleChange
}: DriverSidebarProps) {
  const { vehicles: telemetryVehicles, leaderboard, selectedVehicleId: storeSelectedVehicle, setSelectedVehicle: setStoreSelectedVehicle } = useTelemetryStore();
  
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [vehicleInfoMap, setVehicleInfoMap] = useState<Record<string, Vehicle>>({});

  // Fetch vehicle info from API
  useEffect(() => {
    const fetchVehicleInfo = async () => {
      try {
        const response = await analysisService.getVehicles() as { vehicles?: any[] };
        const infoMap: Record<string, Vehicle> = {};
        response.vehicles?.forEach((v: any) => {
          infoMap[v.id] = {
            id: v.id,
            name: v.name,
            file: v.file,
            vehicle_number: v.vehicle_number,
            car_number: v.car_number,
            driver_number: v.driver_number,
            has_endurance_data: v.has_endurance_data
          };
        });
        setVehicleInfoMap(infoMap);
      } catch (error) {
        console.error('Failed to fetch vehicle info:', error);
      }
    };
    
    fetchVehicleInfo();
  }, []);

  // Convert telemetry store vehicles to Vehicle format
  const vehicles = useMemo<Vehicle[]>(() => {
    return Object.keys(telemetryVehicles).map(vehicleId => {
      const leaderboardEntry = leaderboard.find(e => e.vehicle_id === vehicleId);
      const apiInfo = vehicleInfoMap[vehicleId];
      return {
        id: vehicleId,
        name: leaderboardEntry?.vehicle || vehicleId,
        file: `${vehicleId}.csv`,
        vehicle_number: apiInfo?.vehicle_number,
        car_number: apiInfo?.car_number,
        driver_number: apiInfo?.driver_number,
        has_endurance_data: apiInfo?.has_endurance_data
      };
    }).sort((a, b) => a.id.localeCompare(b.id));
  }, [telemetryVehicles, leaderboard, vehicleInfoMap]);

  // Get selected vehicle info
  const selectedVehicleInfo = useMemo(() => {
    return vehicles.find(v => v.id === (selectedVehicle || storeSelectedVehicle));
  }, [vehicles, selectedVehicle, storeSelectedVehicle]);

  const handleVehicleSelect = (vehicleId: string) => {
    setStoreSelectedVehicle(vehicleId);
    onVehicleChange?.(vehicleId);
    setVehicleDropdownOpen(false);
  };

  const pages = [
    { id: 'driver-training-insights', label: 'Driver Training', icon: Brain, description: 'Comprehensive driver analysis', badge: 'New' },
    { id: 'performance', label: 'Performance Overview', icon: Gauge, description: 'Performance metrics' },
  ];

  return (
    <div className={`
      bg-[#1a242a] border-r border-[#3b4b54] transition-all duration-300 ease-in-out
      ${collapsed ? 'w-20' : 'w-80'}
      flex flex-col h-full
    `}>
      {/* Sidebar Header */}
      <div className="p-6 border-b border-[#3b4b54] relative">
        {!collapsed && (
          <>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Driver Training</h1>
                <p className="text-xs text-gray-400">AI-Powered Insights</p>
              </div>
            </div>
            
            {/* Vehicle Selection */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Vehicle</label>
                <div className="relative vehicle-dropdown-container">
                  <button
                    type="button"
                    onClick={() => setVehicleDropdownOpen(!vehicleDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-[#283339] border border-[#3b4b54] rounded-lg text-white text-sm hover:bg-[#3b4b54] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <Car className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0 text-left">
                        <div className={selectedVehicleInfo ? 'text-white truncate' : 'text-gray-500'}>
                          {selectedVehicleInfo?.name || selectedVehicle || storeSelectedVehicle || 'Select vehicle...'}
                        </div>
                        {selectedVehicleInfo?.driver_number !== undefined && (
                          <div className="text-xs text-[#9db0b9]">
                            Driver #{selectedVehicleInfo.driver_number}
                            {selectedVehicleInfo.car_number !== undefined && ` • Car #${selectedVehicleInfo.car_number}`}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${vehicleDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {vehicleDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-[#1a242a] border border-[#3b4b54] rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {vehicles.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-[#9db0b9] text-center">
                          No vehicles available. Waiting for telemetry data...
                        </div>
                      ) : (
                        vehicles.map((vehicle) => {
                          const leaderboardEntry = leaderboard.find(e => e.vehicle_id === vehicle.id);
                          const displayName = leaderboardEntry?.vehicle || vehicle.name || vehicle.id;
                          const isSelected = (selectedVehicle || storeSelectedVehicle) === vehicle.id;
                          
                          return (
                            <button
                              key={vehicle.id}
                              type="button"
                              onClick={() => handleVehicleSelect(vehicle.id)}
                              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm text-left hover:bg-[#283339] transition-colors ${
                                isSelected
                                  ? 'bg-blue-600/20 text-blue-400'
                                  : 'text-[#EAEAEA]'
                              }`}
                            >
                              <Car className="h-4 w-4 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="truncate">{displayName}</div>
                                <div className="text-xs text-[#9db0b9] truncate">
                                  {vehicle.driver_number !== undefined && `Driver #${vehicle.driver_number}`}
                                  {vehicle.driver_number !== undefined && vehicle.car_number !== undefined && ' • '}
                                  {vehicle.car_number !== undefined && `Car #${vehicle.car_number}`}
                                  {!vehicle.driver_number && !vehicle.car_number && vehicle.id}
                                </div>
                              </div>
                              {isSelected && (
                                <ChevronRight className="h-4 w-4 ml-auto flex-shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                {vehicles.length > 0 ? (
                  <p className="mt-1 text-xs text-[#9db0b9]">
                    {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} available
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-[#fa5f38]">
                    No vehicles available. Waiting for telemetry data...
                  </p>
                )}
              </div>
              
              {/* Selected Vehicle Info */}
              {selectedVehicleInfo && (
                <div className="mt-3 p-3 bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Vehicle Analysis</span>
                    {selectedVehicleInfo.has_endurance_data ? (
                      <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">No Data</span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {selectedVehicleInfo.driver_number !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#9db0b9]">Driver Number:</span>
                        <span className="text-white font-semibold">#{selectedVehicleInfo.driver_number}</span>
                      </div>
                    )}
                    {selectedVehicleInfo.car_number !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#9db0b9]">Car Number:</span>
                        <span className="text-white font-semibold">#{selectedVehicleInfo.car_number}</span>
                      </div>
                    )}
                    {selectedVehicleInfo.vehicle_number !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#9db0b9]">Vehicle #:</span>
                        <span className="text-white font-semibold">#{selectedVehicleInfo.vehicle_number}</span>
                      </div>
                    )}
                    {!selectedVehicleInfo.has_endurance_data && (
                      <div className="mt-2 pt-2 border-t border-yellow-500/20">
                        <p className="text-yellow-400 text-xs">
                          This vehicle doesn't have race data. Select another vehicle for analysis.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Collapse Button */}
        <button
          onClick={() => onCollapseChange?.(!collapsed)}
          className="absolute top-4 right-4 p-2 hover:bg-[#283339] rounded-lg transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          ) : (
            <X className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </div>

      {/* Navigation Pages */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3">
          <nav className="space-y-1">
            {pages.map((page) => {
              const Icon = page.icon;
              const isActive = activePage === page.id;
              
              return (
                <button
                  key={page.id}
                  onClick={() => onPageChange?.(page.id)}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/50 shadow-lg' 
                      : 'hover:bg-[#283339] border border-transparent'
                    }
                  `}
                >
                  <div className={`
                    p-2 rounded-lg transition-colors
                    ${isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-[#283339] text-[#9db0b9]'}
                  `}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                        {page.label}
                      </span>
                      {page.badge && (
                        <span className="px-1.5 py-0.5 text-xs font-semibold bg-green-500/20 text-green-400 rounded">
                          {page.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#9db0b9] mt-0.5">{page.description}</p>
                  </div>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-blue-400" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Collapsed Navigation */}
      {collapsed && (
        <div className="flex-1 overflow-y-auto p-3">
          <nav className="space-y-1">
            {pages.map((page) => {
              const Icon = page.icon;
              const isActive = activePage === page.id;
              
              return (
                <button
                  key={page.id}
                  onClick={() => onPageChange?.(page.id)}
                  className={`
                    w-full flex items-center justify-center p-3 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/50' 
                      : 'hover:bg-[#283339] border border-transparent'
                    }
                  `}
                  title={page.label}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-blue-400' : 'text-[#9db0b9]'}`} />
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}

