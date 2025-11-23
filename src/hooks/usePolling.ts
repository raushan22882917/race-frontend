import { useEffect, useRef, useState, useCallback } from 'react';

export interface UsePollingOptions<T> {
  fetchFn: () => Promise<T>;
  interval: number; // Polling interval in milliseconds
  enabled?: boolean; // Control whether polling is enabled
  onData?: (data: T) => void; // Callback when new data arrives
  onError?: (error: Error) => void; // Callback on error
  immediate?: boolean; // Fetch immediately on mount (default: true)
}

export function usePolling<T = any>(options: UsePollingOptions<T>) {
  const {
    fetchFn,
    interval,
    enabled = true,
    onData,
    onError,
    immediate = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const onDataRef = useRef(onData);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onDataRef.current = onData;
    onErrorRef.current = onError;
  }, [onData, onError]);

  const fetchData = useCallback(async () => {
    if (!enabled || !isMountedRef.current) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      if (isMountedRef.current) {
        setData(result);
        onDataRef.current?.(result);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (isMountedRef.current) {
        setError(error);
        onErrorRef.current?.(error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchFn, enabled]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      return;
    }

    // Fetch immediately if requested
    if (immediate) {
      fetchData();
    }

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      fetchData();
    }, interval);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchData, interval, enabled, immediate]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (!intervalRef.current && enabled) {
      fetchData();
      intervalRef.current = setInterval(() => {
        fetchData();
      }, interval);
    }
  }, [fetchData, interval, enabled]);

  return {
    data,
    isLoading,
    error,
    stopPolling,
    startPolling,
    refetch: fetchData,
  };
}

