import { useState, Suspense } from 'react';
import { BarChart3, Users, Zap, X, ChevronLeft, Gauge, Brain } from 'lucide-react';
import { PostEventAnalysis } from '../pages/PostEventAnalysis';
import { DriverTrainingInsights } from '../pages/DriverTrainingInsights';
import { RealTimeAnalytics } from '../pages/RealTimeAnalytics';
import { Performance } from '../pages/Performance';
import { LiveTelemetry } from '../pages/LiveTelemetry';

interface RightSidebarProps {
  activeComponent: string | null;
  onClose: () => void;
  onNavigateToPerformance?: () => void;
}

export function RightSidebar({ activeComponent, onClose, onNavigateToPerformance }: RightSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const components: Record<string, { title: string; icon: any; component: React.ReactNode }> = {
    'live-telemetry': {
      title: 'Live Telemetry',
      icon: Gauge,
      component: <LiveTelemetry />,
    },
    
    
    
    
  };

  if (!activeComponent || !components[activeComponent]) return null;

  const active = components[activeComponent];

  return (
    <div
      className={`
        fixed right-0 top-16 bottom-0 bg-gray-900 border-l border-gray-800 z-40
        transition-all duration-300 ease-in-out shadow-2xl
        ${isCollapsed ? 'w-16' : 'w-[600px] lg:w-[700px]'}
      `}
    >
      {/* Header */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-800/50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <active.icon className="h-5 w-5 text-blue-400" />
          </div>
          {!isCollapsed && (
            <h2 className="text-lg font-bold text-white">{active.title}</h2>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronLeft
              className={`h-5 w-5 text-gray-400 transition-transform ${
                isCollapsed ? 'rotate-180' : ''
              }`}
            />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Close"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="h-[calc(100vh-4rem)] overflow-y-auto">
          <Suspense fallback={<div className="p-6 text-gray-400">Loading...</div>}>
            <div className="p-6">{active.component}</div>
          </Suspense>
        </div>
      )}
    </div>
  );
}

