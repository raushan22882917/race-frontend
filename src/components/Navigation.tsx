import { BarChart3, Zap, Gauge, Brain, Target } from 'lucide-react';

interface NavigationProps {
  activeComponent: string | null;
  onComponentChange: (component: string | null) => void;
  fullscreenComponent?: string | null;
  onFullscreenChange?: (component: string | null) => void;
}

export function Navigation({ activeComponent, onComponentChange, fullscreenComponent, onFullscreenChange }: NavigationProps) {

  const fullscreenNavItems = [
    { id: 'live-telemetry-fullscreen', label: 'Live Telemetry', icon: Gauge, color: 'text-blue-400' },
    { id: 'post-event', label: 'Post-Event Analysis', icon: BarChart3, color: 'text-purple-400' },
    { id: 'driver-training-insights', label: 'Driver Training', icon: Brain, color: 'text-green-400' },
    { id: 'realtime', label: 'Real-Time Analytics', icon: Zap, color: 'text-yellow-400' },
    { id: 'predictive-analysis', label: 'Predictive Analysis', icon: Target, color: 'text-blue-400' },
  ];

  const handleFullscreenClick = (componentId: string) => {
    if (fullscreenComponent === componentId) {
      onFullscreenChange?.(null);
    } else {
      onFullscreenChange?.(componentId);
      // Close sidebar if open
      if (activeComponent) {
        onComponentChange(null);
      }
    }
  };

  return (
    <>
      {/* Top Bar Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b border-gray-700 min-h-[80px]">
        <div className="flex items-center justify-between h-full px-4 py-2">
          {/* Left Side - Empty (PlaybackControls now fixed at bottom-left) */}
          <div className="flex items-center">
            {/* PlaybackControls moved to fixed bottom-left position */}
          </div>
          
          {/* Center - Navigation Menu Items */}
          <div className="flex-1 flex items-center justify-center">
            {/* Fullscreen Navigation Items */}
            <div className="flex items-center gap-4">
              {fullscreenNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = fullscreenComponent === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleFullscreenClick(item.id)}
                    className={`
                      flex items-center space-x-2 px-4 py-2 rounded-lg transition-all
                      ${isActive 
                        ? 'bg-gray-800 border-2 border-gray-600 shadow-lg' 
                        : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-800/80'
                      }
                    `}
                    title={item.label}
                  >
                    <Icon className={`h-5 w-5 ${item.color}`} />
                    <span className="text-white font-medium text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

