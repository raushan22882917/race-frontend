import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CameraControlsContextType {
  zoomIn: () => void;
  zoomOut: () => void;
  refresh: () => void;
  setZoomIn: (fn: () => void) => void;
  setZoomOut: (fn: () => void) => void;
  setRefresh: (fn: () => void) => void;
}

const CameraControlsContext = createContext<CameraControlsContextType | undefined>(undefined);

export function CameraControlsProvider({ children }: { children: ReactNode }) {
  const [zoomInFn, setZoomInFn] = useState<(() => void) | null>(null);
  const [zoomOutFn, setZoomOutFn] = useState<(() => void) | null>(null);
  const [refreshFn, setRefreshFn] = useState<(() => void) | null>(null);

  const zoomIn = useCallback(() => {
    zoomInFn?.();
  }, [zoomInFn]);

  const zoomOut = useCallback(() => {
    zoomOutFn?.();
  }, [zoomOutFn]);

  const refresh = useCallback(() => {
    refreshFn?.();
  }, [refreshFn]);

  return (
    <CameraControlsContext.Provider
      value={{
        zoomIn,
        zoomOut,
        refresh,
        setZoomIn: setZoomInFn,
        setZoomOut: setZoomOutFn,
        setRefresh: setRefreshFn,
      }}
    >
      {children}
    </CameraControlsContext.Provider>
  );
}

export function useCameraControls() {
  const context = useContext(CameraControlsContext);
  if (context === undefined) {
    throw new Error('useCameraControls must be used within a CameraControlsProvider');
  }
  return context;
}

