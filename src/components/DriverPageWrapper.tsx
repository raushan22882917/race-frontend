import { useState } from 'react';
import { DriverSidebar } from './DriverSidebar';
import { DriverTrainingInsights } from '../pages/DriverTrainingInsights';
import { Performance } from '../pages/Performance';

interface DriverPageWrapperProps {
  initialPage?: string;
  onNavigateToPerformance?: () => void;
}

export function DriverPageWrapper({ initialPage = 'ai-insights', onNavigateToPerformance }: DriverPageWrapperProps) {
  const [activePage, setActivePage] = useState<string>(initialPage);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');

  const handlePageChange = (page: string) => {
    if (page === 'performance') {
      // Navigate to Performance page in fullscreen
      onNavigateToPerformance?.();
    } else {
      // Switch to different tab within DriverTraining
      setActivePage(page);
    }
  };

  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
  };

  return (
    <div className="w-full bg-[#101c22] min-h-screen flex">
      <DriverSidebar
        collapsed={sidebarCollapsed}
        onCollapseChange={setSidebarCollapsed}
        activePage={activePage}
        onPageChange={handlePageChange}
        selectedVehicle={selectedVehicle}
        onVehicleChange={handleVehicleChange}
      />
      
      <div className="flex-1 overflow-y-auto">
        <DriverTrainingInsights />
      </div>
    </div>
  );
}

