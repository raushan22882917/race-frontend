import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseSSEOptions {
  url: string;
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  autoConnect?: boolean; // Control whether to auto-connect on mount
  enabled?: boolean; // Control whether SSE is enabled at all
}

export function useSSE<T = any>(options: UseSSEOptions) {
  const {
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = Infinity,
    autoConnect = true, // Default to auto-connect for backwards compatibility
    enabled = true, // Default to enabled
  } = options;

  // Store callbacks in refs to avoid dependency issues
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
  }, [onMessage, onOpen, onClose, onError]);

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const lastErrorLogRef = useRef(0);
  const connectionAttemptRef = useRef(0);

  const connect = useCallback(() => {
    console.log(`[SSE] connect() called for ${url}, enabled: ${enabled}`);
    
    // Don't connect if SSE is disabled
    if (!enabled) {
      console.log(`[SSE] Connection skipped - SSE disabled for ${url}`);
      return;
    }

    // Don't reconnect if we've exceeded max attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log(`[SSE] Connection skipped - max attempts reached (${reconnectAttemptsRef.current}/${maxReconnectAttempts}) for ${url}`);
      return;
    }

    // Don't connect if already connected or connecting
    if (eventSourceRef.current?.readyState === EventSource.OPEN || 
        eventSourceRef.current?.readyState === EventSource.CONNECTING) {
      console.log(`[SSE] Connection skipped - already ${eventSourceRef.current?.readyState === EventSource.OPEN ? 'OPEN' : 'CONNECTING'} for ${url}`);
      return;
    }

    // Clean up existing connection
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (e) {
        // Ignore errors when closing
      }
    }

    try {
      const attemptId = ++connectionAttemptRef.current;
      console.log(`[SSE] Attempting to connect to: ${url} (attempt ${reconnectAttemptsRef.current + 1})`);
      
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log(`[SSE] ✅ Successfully connected to: ${url}`);
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
        onOpenRef.current?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessageRef.current?.(data);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        // Log errors to help debug connection issues
        const now = Date.now();
        const state = eventSource.readyState;
        
        // More detailed error logging - always log first error, then throttle
        if (reconnectAttemptsRef.current === 0 || now - lastErrorLogRef.current > 5000) {
          console.error(`❌ [SSE] Connection error to ${url}`);
          console.error(`   State: ${state} (0=CONNECTING, 1=OPEN, 2=CLOSED)`);
          console.error(`   Error event:`, error);
          console.error(`   Full URL: ${url}`);
          console.error(`   Possible causes:`);
          console.error(`   - SSE endpoint not available on server`);
          console.error(`   - Network/firewall blocking SSE connection`);
          console.error(`   - Server not configured for SSE`);
          console.error(`   - CORS or security policy blocking connection`);
          console.error(`   - Check server logs for SSE errors`);
          if (reconnectAttemptsRef.current > 0) {
            console.info(`   Attempt ${reconnectAttemptsRef.current + 1} - Will retry automatically...`);
          } else {
            console.info(`   💡 Tip: Test the SSE URL directly in browser:`);
            console.info(`   const es = new EventSource('${url}'); es.onerror = (e) => console.error('SSE Error:', e);`);
          }
          lastErrorLogRef.current = now;
        }
        
        setIsConnected(false);
        onErrorRef.current?.(error);

        // SSE automatically reconnects, but we can handle it manually if needed
        if (state === EventSource.CLOSED && shouldReconnectRef.current && reconnect && attemptId === connectionAttemptRef.current) {
          reconnectAttemptsRef.current++;
          // Exponential backoff: min 3s, max 30s
          const backoffTime = Math.min(
            reconnectInterval * Math.pow(1.5, Math.min(reconnectAttemptsRef.current - 1, 5)),
            30000
          );
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldReconnectRef.current && attemptId === connectionAttemptRef.current) {
              connect();
            }
          }, backoffTime);
        }
      };
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      reconnectAttemptsRef.current++;
      
      if (shouldReconnectRef.current && reconnect) {
        const backoffTime = Math.min(
          reconnectInterval * Math.pow(1.5, Math.min(reconnectAttemptsRef.current - 1, 5)),
          30000
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoffTime);
      }
    }
  }, [url, reconnect, reconnectInterval, maxReconnectAttempts, enabled]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    reconnectAttemptsRef.current = 0;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (e) {
        // Ignore errors
      }
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Auto-connect on mount and auto-reconnect on disconnect (only if enabled and autoConnect is true)
  useEffect(() => {
    console.log(`[SSE Hook] Initializing for ${url}, enabled: ${enabled}, autoConnect: ${autoConnect}`);
    
    // Don't auto-connect if disabled or autoConnect is false
    if (!enabled || !autoConnect) {
      console.log(`[SSE Hook] Skipping auto-connect for ${url} (enabled: ${enabled}, autoConnect: ${autoConnect})`);
      return;
    }

    // Small delay to avoid connection storms when multiple components mount
    const initialDelay = setTimeout(() => {
      if (shouldReconnectRef.current && enabled) {
        console.log(`[SSE Hook] Triggering connect() for ${url}`);
        connect();
      } else {
        console.log(`[SSE Hook] Not connecting - shouldReconnect: ${shouldReconnectRef.current}, enabled: ${enabled}`);
      }
    }, 100);

    return () => {
      // Cleanup on unmount
      clearTimeout(initialDelay);
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        try {
          eventSourceRef.current.close();
        } catch (e) {
          // Ignore errors
        }
        eventSourceRef.current = null;
      }
    };
  }, [connect, enabled, autoConnect]);

  return {
    isConnected,
    lastMessage,
    disconnect,
    reconnect: connect,
  };
}

