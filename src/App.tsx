import { useState, Suspense } from 'react';
import { Navigation } from './components/Navigation';
import { TelemetryViewer } from './components/TelemetryViewer';
import { AIChat } from './components/AIChat';
import { ModalProvider } from './contexts/ModalContext';
import { CameraControlsProvider } from './contexts/CameraControlsContext';
import { PostEventAnalysis } from './pages/PostEventAnalysis';
import { RealTimeAnalytics } from './pages/RealTimeAnalytics';
import { Performance } from './pages/Performance';
import { DriverTrainingInsights } from './pages/DriverTrainingInsights';
import { PredictiveAnalysis } from './pages/PredictiveAnalysis';
import { LiveTelemetry } from './pages/LiveTelemetry';
import { X } from 'lucide-react';

function FullscreenViewer({ component, onClose, onNavigateToPerformance }: { component: string | null; onClose: () => void; onNavigateToPerformance?: () => void }) {
  if (!component) return null;

  const components: Record<string, React.ReactNode> = {
    'post-event': <PostEventAnalysis />,
    'driver-training-insights': <DriverTrainingInsights />,
    'realtime': <RealTimeAnalytics />,
    'performance': <Performance />,
    'predictive-analysis': <PredictiveAnalysis />,
    'live-telemetry-fullscreen': <LiveTelemetry />,
  };

  const titles: Record<string, string> = {
    'post-event': 'Post-Event Analysis',
    'driver-training-insights': 'Driver Training & Insights',
    'realtime': 'Real-Time Analytics',
    'predictive-analysis': 'Predictive Analysis',
    'live-telemetry-fullscreen': 'Live Telemetry',
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900">
      {/* Header */}
      <div className="h-16 border-b border-gray-700 flex items-center justify-between px-6 bg-gray-800/50">
        <h1 className="text-xl font-bold text-white">{titles[component] || 'Analysis'}</h1>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title="Close Fullscreen"
        >
          <X className="h-6 w-6 text-gray-400" />
        </button>
      </div>
      {/* Content */}
      <div className="h-[calc(100vh-4rem)] overflow-y-auto">
        <Suspense fallback={<div className="p-6 text-gray-400">Loading...</div>}>
          {components[component]}
        </Suspense>
      </div>
    </div>
  );
}

function App() {
  const [activeComponent, setActiveComponent] = useState<string | null>(null);
  const [fullscreenComponent, setFullscreenComponent] = useState<string | null>(null);

  return (
    <ModalProvider>
      <CameraControlsProvider>
        <div className="min-h-screen bg-gray-900">
          <Navigation 
            activeComponent={activeComponent} 
            onComponentChange={setActiveComponent}
            fullscreenComponent={fullscreenComponent}
            onFullscreenChange={setFullscreenComponent}
          />
          
          {/* Fullscreen Viewer */}
          {fullscreenComponent && (
            <FullscreenViewer 
              component={fullscreenComponent} 
              onClose={() => setFullscreenComponent(null)}
              onNavigateToPerformance={() => setFullscreenComponent('performance')}
            />
          )}
          
          {/* Regular View - Only show if not in fullscreen */}
          {!fullscreenComponent && (
            <>
              <TelemetryViewer 
                rightSidebarOpen={false}
                activeComponent={null}
                onComponentChange={setActiveComponent}
              />
              <AIChat activeComponent={activeComponent} />
            </>
          )}
        </div>
      </CameraControlsProvider>
    </ModalProvider>
  );
}

export default App;

