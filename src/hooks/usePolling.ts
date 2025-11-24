import { useEffect, useRef, useState, useCallback } from 'react';

export interface UsePollingOptions<T> {
  fetchFn: (signal?: AbortSignal) => Promise<T>;
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
  const fetchFnRef = useRef(fetchFn);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef(false);

  // Update refs when callbacks change (without causing re-renders)
  useEffect(() => {
    onDataRef.current = onData;
    onErrorRef.current = onError;
    fetchFnRef.current = fetchFn;
  }, [onData, onError, fetchFn]);

  const fetchData = useCallback(async () => {
    if (!enabled || !isMountedRef.current || isFetchingRef.current) {
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const currentAbortController = new AbortController();
    abortControllerRef.current = currentAbortController;
    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Pass the abort signal to fetchFn so it can cancel the request
      const result = await fetchFnRef.current(currentAbortController.signal);
      // Only update state if this request wasn't aborted and component is still mounted
      if (isMountedRef.current && !currentAbortController.signal.aborted && abortControllerRef.current === currentAbortController) {
        setData(result);
        onDataRef.current?.(result);
      }
    } catch (err) {
      // Don't set error if request was aborted or component unmounted
      if (currentAbortController.signal.aborted || !isMountedRef.current) {
        return;
      }
      // Only set error if this is still the current request
      if (abortControllerRef.current === currentAbortController) {
        const error = err instanceof Error ? err : new Error(String(err));
        // Don't set error state for 503s during polling - they're expected and will retry
        // The error is already logged as a warning in apiService
        const is503Error = error.message.includes('503') || error.message.includes('Service Unavailable');
        if (!is503Error) {
          setError(error);
        }
        // Always call onError callback so services can handle it
        onErrorRef.current?.(error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      // Only clear fetching flag if this is still the current request
      if (abortControllerRef.current === currentAbortController) {
        isFetchingRef.current = false;
      }
    }
  }, [enabled]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      // Clean up if disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      isFetchingRef.current = false;
    };
  }, [fetchData, interval, enabled, immediate]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isFetchingRef.current = false;
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

