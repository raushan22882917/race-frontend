import { useEffect, useState } from 'react';
// Use WebSocket for real-time data streaming
import { useTelemetryServiceWS as useTelemetryService } from '../services/telemetryServiceWS';
import { useEnduranceServiceWS as useEnduranceService } from '../services/enduranceServiceWS';
import { useLeaderboardServiceWS as useLeaderboardService } from '../services/leaderboardServiceWS';
import { TrackMap } from './TrackMap';
import { TelemetryUI } from './TelemetryUI';
import { Leaderboard } from './Leaderboard';
import { VehicleSelector } from './VehicleSelector';
import { LapCharts } from './LapCharts';
import { ServerStatus } from './ServerStatus';
import { DriverInsights } from './DriverInsights';
import { TrackInfo } from './TrackInfo';
import { ModalSidebar } from './ModalSidebar';
import { VehicleList } from './VehicleList';
import { RecordingControl } from './RecordingControl';
import { PlaybackControls } from './PlaybackControls';
import { useTelemetryStore } from '../store/telemetryStore';
import { useModal } from '../contexts/ModalContext';
import { API_CONFIG } from '../config/api';
import { Play, X } from 'lucide-react';

interface TelemetryViewerProps {
  rightSidebarOpen?: boolean;
  activeComponent?: string | null;
  onComponentChange?: (component: string | null) => void;
}

export function TelemetryViewer({ rightSidebarOpen = false, activeComponent = null, onComponentChange }: TelemetryViewerProps) {
  const telemetryService = useTelemetryService();
  const enduranceService = useEnduranceService();
  const leaderboardService = useLeaderboardService();
  const { vehicles, showAllVehicles, selectedVehicleId, leaderboard } = useTelemetryStore();
  const { showCharts, setShowCharts, setShowVehicleSelector, setShowFullscreenMap, showLeaderboard, setShowLeaderboard, sidebarCollapsed, setSidebarCollapsed } = useModal();

  const allConnected =
    telemetryService.isConnected &&
    enduranceService.isConnected &&
    leaderboardService.isConnected;
  
  const hasVehicles = Object.keys(vehicles).length > 0;

  // Auto-start playback when connected and no vehicles (playback is paused by default)
  useEffect(() => {
    if (allConnected && !hasVehicles) {
      // Try to start playback after a short delay
      const timer = setTimeout(() => {
        telemetryService.play().catch(err => {
          console.log('Auto-play failed (may need manual start):', err);
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allConnected, hasVehicles]); // Removed telemetryService from deps - it's stable

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setShowCharts(!showCharts);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showCharts, setShowCharts]);

  // Auto-connect when component mounts (automatic WebSocket connection)
  useEffect(() => {
    // WebSocket connections are automatically established via useTelemetryService hooks
    // No manual connection needed - React hooks handle it automatically
  }, []);

  return (
    <div className="w-full h-screen bg-gray-900 text-white overflow-hidden">
    
      

      {/* Google Map - Always show all vehicles */}
      <div className="absolute inset-0">
          <TrackMap
            vehicles={Object.fromEntries(
              Object.entries(vehicles)
                .filter(([id, vehicle]) => {
                  // Filter by showAllVehicles toggle
                  if (!showAllVehicles && selectedVehicleId && id !== selectedVehicleId) {
                    return false;
                  }
                  // Filter by GPS coordinates
                  return vehicle.telemetry.gps_lat != null && 
                         vehicle.telemetry.gps_lon != null &&
                         !isNaN(vehicle.telemetry.gps_lat) &&
                         !isNaN(vehicle.telemetry.gps_lon);
                })
                .map(([id, vehicle]) => [
                  id,
                  {
                    position: {
                      lat: vehicle.telemetry.gps_lat!,
                      lng: vehicle.telemetry.gps_lon!,
                    },
                    heading: vehicle.rotation?.y || 0,
                    speed: vehicle.telemetry.speed || 0,
                    vehicleId: id,
                  },
                ])
            )}
            showStartFinish={true}
            showCheckpoints={false}
          />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="pointer-events-auto">
          {/* Playback Controls - Fixed at bottom left */}
          <PlaybackControls />
          
          {/* Left Sidebar - Only Vehicles */}
          <div className="absolute left-4 top-[100px] max-h-[calc(100vh-140px)] overflow-y-auto pr-2">
            <VehicleList />
          </div>

          {/* Center Top - Selected Vehicle Number */}
          {selectedVehicleId && (() => {
            const leaderboardEntry = leaderboard.find(e => e.vehicle_id === selectedVehicleId);
            const position = leaderboardEntry?.position;
            return position && position !== 999 ? (
              <div className="absolute top-[100px] left-1/2 -translate-x-1/2 pointer-events-auto z-10">
                <div className="flex items-center justify-center">
                  <div className={`
                    flex items-center justify-center w-16 h-16 rounded-lg font-bold text-2xl shadow-lg
                    ${position === 1 ? 'bg-yellow-500 text-yellow-900' :
                      position === 2 ? 'bg-gray-300 text-gray-900' :
                      position === 3 ? 'bg-orange-500 text-orange-900' :
                      'bg-gray-600 text-white'
                    }
                  `}>
                    {position}
                  </div>
                </div>
              </div>
            ) : null;
          })()}

          {/* Center Top - Telemetry UI, Driver Insights */}
          <div className="absolute top-[88px] left-1/2 -translate-x-1/2 flex gap-2 items-start max-w-[95vw] overflow-x-auto pointer-events-auto z-10">
            <div className="flex-shrink-0">
              <TelemetryUI />
            </div>
            <div className="flex-shrink-0">
              <DriverInsights />
            </div>
          </div>

          {/* Modal Sidebar - Icons for all modals (positioned on right side) */}
          <div className={`absolute top-[100px] transition-all duration-300 z-20 ${rightSidebarOpen ? 'right-[720px] lg:right-[720px]' : 'right-4'}`}>
            <ModalSidebar
              onVehicleSelector={() => setShowVehicleSelector(true)}
              onFullscreenMap={() => setShowFullscreenMap(true)}
              onCharts={() => setShowCharts(!showCharts)}
              onLeaderboard={() => setShowLeaderboard(!showLeaderboard)}
              onLiveTelemetry={() => {
                // This will be handled by Navigation component for fullscreen
              }}
              onPostEventAnalysis={() => onComponentChange?.(activeComponent === 'post-event' ? null : 'post-event')}
              onDriverTraining={() => onComponentChange?.(activeComponent === 'driver-training-insights' ? null : 'driver-training-insights')}
              onRealTimeAnalytics={() => onComponentChange?.(activeComponent === 'realtime' ? null : 'realtime')}
              isLeaderboardOpen={showLeaderboard}
              isChartsOpen={showCharts}
              activeComponent={activeComponent}
              onCollapsedChange={setSidebarCollapsed}
            />
          </div>

          {/* Left Side Dialogs - Only one open at a time, positioned with 5px gap from right sidebar */}
          {/* Leaderboard - Left Side */}
          {showLeaderboard && (
            <div className={`absolute top-[100px] transition-all duration-300 z-10 ${
              sidebarCollapsed 
                ? 'left-[calc(100%-381px)] lg:left-[calc(100%-445px)]' // Collapsed: 16px(right-4) + 40px(w-10) + 5px(gap) + 320px(w-80) = 381px
                : 'left-[calc(100%-533px)] lg:left-[calc(100%-597px)]' // Expanded: 16px(right-4) + 192px(w-48) + 5px(gap) + 320px(w-80) = 533px
            }`}>
              <Leaderboard />
            </div>
          )}

          {/* Dashboard Panel - Slides from Right */}
          {showCharts && (
            <div className={`fixed top-[100px] right-0 bottom-0 bg-gray-900 shadow-2xl border-l border-gray-700/50 overflow-y-auto transition-all duration-300 z-[100] ${
              sidebarCollapsed
                ? 'w-[calc(100vw-61px)]' // Collapsed: 16px + 40px + 5px = 61px from right
                : 'w-[calc(100vw-213px)]' // Expanded: 16px + 192px + 5px = 213px from right
            }`}>
              <div className="sticky top-0 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 z-10 flex items-center justify-between px-4 py-3">
                <h2 className="text-lg font-bold text-white">Dashboard</h2>
                <button
                  onClick={() => setShowCharts(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
                  title="Close dashboard"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <LapCharts />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connection Warning */}
      {!allConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
          <div className="text-center max-w-2xl mx-4">
            <h2 className="text-2xl font-bold mb-4">Connecting to server...</h2>
            <p className="text-gray-400 mb-2">
              Connecting to backend at: <code className="bg-gray-700 px-2 py-1 rounded text-yellow-400">{API_CONFIG.BASE_URL}</code>
            </p>
            <p className="text-gray-500 text-sm mb-4">
              Using REST API with polling for real-time data streaming
            </p>
            <div className="bg-gray-800 rounded-lg p-4 text-left text-sm">
              <p className="text-yellow-400 font-semibold mb-2">Troubleshooting:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                <li>Check browser console for polling errors and REST API status</li>
                <li>Verify the backend server is accessible at: <code className="bg-gray-700 px-1 rounded">{API_CONFIG.BASE_URL}</code></li>
                <li>Test the health endpoint: <code className="bg-gray-700 px-1 rounded">{API_CONFIG.BASE_URL}/api/health</code></li>
                <li>REST API endpoints:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                    <li>Telemetry: <code className="bg-gray-700 px-1 rounded text-xs">{API_CONFIG.BASE_URL}{API_CONFIG.API.TELEMETRY}</code> (polling: 100ms)</li>
                    <li>Endurance: <code className="bg-gray-700 px-1 rounded text-xs">{API_CONFIG.BASE_URL}{API_CONFIG.API.ENDURANCE}</code> (polling: 500ms)</li>
                    <li>Leaderboard: <code className="bg-gray-700 px-1 rounded text-xs">{API_CONFIG.BASE_URL}{API_CONFIG.API.LEADERBOARD}</code> (polling: 1000ms)</li>
                    <li>Control: <code className="bg-gray-700 px-1 rounded text-xs">{API_CONFIG.BASE_URL}{API_CONFIG.API.CONTROL}</code></li>
                  </ul>
                </li>
                <li className="mt-2 pt-2 border-t border-gray-700">
                  <strong className="text-yellow-400">Configuration:</strong> Backend URL is set via <code className="bg-gray-700 px-1 rounded">VITE_API_BASE_URL</code> in <code className="bg-gray-700 px-1 rounded">.env</code> file
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Data Warning - Connected but no data */}
      {allConnected && !hasVehicles && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
          <div className="flex flex-col items-center gap-6">
            {/* Gaming-style Play Button */}
            <div className="flex items-center gap-4">
              {/* Round Gaming Play Button */}
              <button
                onClick={() => {
                  telemetryService.play().then(() => {
                    console.log('✅ Playback started');
                  }).catch(err => {
                    console.error('Failed to start playback:', err);
                  });
                }}
                className="relative group"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 shadow-2xl shadow-blue-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-blue-400/70 active:scale-95">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                  <Play className="w-10 h-10 text-white ml-1 fill-white" strokeWidth={3} />
                </div>
                {/* Pulsing ring effect */}
                <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-20"></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

