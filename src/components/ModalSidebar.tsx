import { useState } from 'react';
import { Car, MapPin, BarChart3, Users, Trophy, Gauge, Zap, ChevronLeft, ChevronRight } from 'lucide-react';

interface ModalSidebarProps {
  onVehicleSelector: () => void;
  onFullscreenMap: () => void;
  onCharts: () => void;
  onLeaderboard: () => void;
  onDriverInsights?: () => void;
  onLiveTelemetry?: () => void;
  onPostEventAnalysis?: () => void;
  onDriverTraining?: () => void;
  onRealTimeAnalytics?: () => void;
  isLeaderboardOpen?: boolean;
  isChartsOpen?: boolean;
  activeComponent?: string | null;
  onCollapsedChange?: (isCollapsed: boolean) => void;
}

export function ModalSidebar({ 
  onVehicleSelector, 
  onFullscreenMap, 
  onCharts,
  onLeaderboard,
  onDriverInsights,
  onLiveTelemetry,
  onPostEventAnalysis,
  onDriverTraining,
  onRealTimeAnalytics,
  isLeaderboardOpen = true,
  isChartsOpen = false,
  activeComponent = null,
  onCollapsedChange
}: ModalSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed (icons only)
  
  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapsedChange?.(newState);
  };
  const menuItems = [
    {
      id: 'leaderboard',
      icon: Trophy,
      label: 'Leaderboard',
      onClick: onLeaderboard,
      color: 'text-yellow-400',
      bgColor: isLeaderboardOpen ? 'bg-yellow-500/30' : 'bg-yellow-500/20',
      hoverBg: 'hover:bg-yellow-500/30',
      isActive: isLeaderboardOpen,
    },
    
  ];

  return (
    <div className="relative flex flex-col items-center pointer-events-none">
      <div className={`bg-gray-800/95 backdrop-blur-sm rounded-lg border border-gray-700 shadow-xl pointer-events-auto transition-all duration-300 ${isCollapsed ? 'w-10' : 'w-48'}`}>
        {/* Collapse/Expand Button */}
        <div className="p-2 border-b border-gray-700 flex justify-center bg-gray-800/50">
          <button
            onClick={handleToggleCollapse}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors w-full flex items-center justify-center"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <ChevronLeft className="h-4 w-4 text-gray-300" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-300" />
            )}
          </button>
        </div>
        
        <div className="p-2 flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`
                  group relative rounded-md transition-all duration-200
                  ${item.bgColor} ${item.hoverBg}
                  ${item.isActive 
                    ? item.id === 'leaderboard' ? 'border border-yellow-500/50' 
                    : item.id === 'live-telemetry' ? 'border border-blue-500/50'
                    : item.id === 'post-event' ? 'border border-purple-500/50'
                    : item.id === 'driver-training-insights' ? 'border border-green-500/50'
                    : item.id === 'realtime' ? 'border border-yellow-500/50'
                    : 'border border-transparent'
                    : 'border border-transparent'
                  }
                  hover:border-gray-600 hover:scale-105 active:scale-95
                  flex items-center gap-2
                  ${isCollapsed ? 'p-2 justify-center' : 'p-2.5 justify-start'}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'} ${item.color} transition-transform group-hover:scale-110 flex-shrink-0`} />
                
                {/* Text label - only show when expanded */}
                {!isCollapsed && (
                  <span className="text-xs font-semibold text-gray-200 truncate transition-opacity duration-200">
                    {item.label}
                  </span>
                )}
                
                {/* Hover tooltip - only show when collapsed */}
                {isCollapsed && (
                  <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg border border-gray-700">
                      {item.label}
                      <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

