import { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
  showVehicleSelector: boolean;
  showFullscreenMap: boolean;
  showCharts: boolean;
  showLeaderboard: boolean;
  sidebarCollapsed: boolean;
  setShowVehicleSelector: (show: boolean) => void;
  setShowFullscreenMap: (show: boolean) => void;
  setShowCharts: (show: boolean) => void;
  setShowLeaderboard: (show: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [showVehicleSelector, setShowVehicleSelectorState] = useState(false);
  const [showFullscreenMap, setShowFullscreenMapState] = useState(false);
  const [showCharts, setShowChartsState] = useState(false);
  const [showLeaderboard, setShowLeaderboardState] = useState(true); // Default open leaderboard
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Default collapsed (icons only)

  return (
    <ModalContext.Provider
      value={{
        showVehicleSelector,
        showFullscreenMap,
        showCharts,
        showLeaderboard,
        sidebarCollapsed,
        setShowVehicleSelector: setShowVehicleSelectorState,
        setShowFullscreenMap: setShowFullscreenMapState,
        setShowCharts: setShowChartsState,
        setShowLeaderboard: setShowLeaderboardState,
        setSidebarCollapsed,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

