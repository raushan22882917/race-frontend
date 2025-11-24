import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PredictiveAnalysisSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function PredictiveAnalysisSidebar({ isOpen, onToggle, children }: PredictiveAnalysisSidebarProps) {
  return (
    <div
      className={`
        fixed left-0 top-16 bottom-0 bg-gray-900 border-r border-gray-800 z-40
        transition-all duration-300 ease-in-out shadow-2xl
        ${isOpen ? 'w-80' : 'w-16'}
      `}
    >
      {/* Header */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900/95 backdrop-blur-sm">
        {isOpen && (
          <h2 className="text-lg font-bold text-white">Controls</h2>
        )}
        <button
          onClick={onToggle}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
      </div>

      {/* Content */}
      <div className="h-[calc(100vh-4rem)] overflow-y-auto">
        {isOpen ? (
          <div className="p-4 space-y-4">
            {children}
          </div>
        ) : (
          <div className="p-2 flex flex-col items-center gap-2 pt-4">
            <Menu className="h-5 w-5 text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
}

