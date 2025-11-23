import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  autoConnect?: boolean; // Control whether to auto-connect on mount
  enabled?: boolean; // Control whether WebSocket is enabled at all
}

export function useWebSocket<T = any>(options: UseWebSocketOptions) {
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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const lastErrorLogRef = useRef(0);
  const connectionAttemptRef = useRef(0);

  const connect = useCallback(() => {
    console.log(`[WebSocket] connect() called for ${url}, enabled: ${enabled}`);
    
    // Don't connect if WebSocket is disabled
    if (!enabled) {
      console.log(`[WebSocket] Connection skipped - WebSocket disabled for ${url}`);
      return;
    }

    // Don't reconnect if we've exceeded max attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log(`[WebSocket] Connection skipped - max attempts reached (${reconnectAttemptsRef.current}/${maxReconnectAttempts}) for ${url}`);
      return;
    }

    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log(`[WebSocket] Connection skipped - already ${wsRef.current?.readyState === WebSocket.OPEN ? 'OPEN' : 'CONNECTING'} for ${url}`);
      return;
    }

    // Clean up existing connection
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // Ignore errors when closing
      }
    }

    try {
      const attemptId = ++connectionAttemptRef.current;
      console.log(`[WebSocket] Attempting to connect to: ${url} (attempt ${reconnectAttemptsRef.current + 1})`);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`[WebSocket] ✅ Successfully connected to: ${url}`);
        console.log(`[WebSocket] Connection ready state: ${ws.readyState} (1=OPEN)`);
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
        onOpenRef.current?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessageRef.current?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        
        // Log all close events for debugging
        const now = Date.now();
        const closeCodeMessages: Record<number, string> = {
          1000: 'Normal closure',
          1001: 'Going away',
          1002: 'Protocol error',
          1003: 'Unsupported data',
          1006: 'Abnormal closure (no close frame) - Connection refused or network error',
          1011: 'Server error',
          1015: 'TLS handshake failure',
          1002: 'Protocol error',
          1003: 'Unsupported data type'
        };
        
        // Log unexpected closures - always log first failure
        if (event.code !== 1000 && event.code !== 1001) {
          // Throttle error logging to once per 5 seconds
          if (now - lastErrorLogRef.current > 5000) {
            // Always log first attempt, then every 10th attempt
            if (reconnectAttemptsRef.current === 0 || reconnectAttemptsRef.current % 10 === 0) {
              const reason = closeCodeMessages[event.code] || `Unknown code ${event.code}`;
              console.error(`❌ [WebSocket] Connection closed to ${url}`);
              console.error(`   Close code: ${event.code} (${reason})`);
              console.error(`   Reason: ${event.reason || 'No reason provided'}`);
              console.error(`   Was clean: ${event.wasClean}`);
              console.error(`   Attempt: ${reconnectAttemptsRef.current + 1}`);
              if (event.code === 1006) {
                console.error(`   ⚠️ Code 1006 usually means:`);
                console.error(`   - Server is not accepting WebSocket connections`);
                console.error(`   - Network/firewall is blocking the connection`);
                console.error(`   - WebSocket endpoint path is incorrect`);
                console.error(`   - Server requires authentication or headers`);
              }
              if (reconnectAttemptsRef.current === 0) {
                console.info('   Will retry automatically. This is normal if the server is starting...');
              }
            }
            lastErrorLogRef.current = now;
          }
        } else {
          // Log normal closures too, but less frequently
          if (reconnectAttemptsRef.current === 0) {
            console.log(`[WebSocket] Connection closed normally: ${url}`);
          }
        }
        
        onCloseRef.current?.();

        if (shouldReconnectRef.current && reconnect && attemptId === connectionAttemptRef.current) {
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

      ws.onerror = (error) => {
        // Log errors to help debug connection issues
        const now = Date.now();
        const state = ws.readyState;
        
        // More detailed error logging - always log first error, then throttle
        if (reconnectAttemptsRef.current === 0 || now - lastErrorLogRef.current > 5000) {
          console.error(`❌ [WebSocket] Connection error to ${url}`);
          console.error(`   State: ${state} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)`);
          console.error(`   Ready state: ${ws.readyState}`);
          console.error(`   Error event:`, error);
          console.error(`   Full URL: ${url}`);
          console.error(`   Possible causes:`);
          console.error(`   - WebSocket endpoint not available on server`);
          console.error(`   - Network/firewall blocking WebSocket connection`);
          console.error(`   - Server not configured for WebSocket (wss://)`);
          console.error(`   - CORS or security policy blocking connection`);
          console.error(`   - Check server logs for WebSocket errors`);
          if (reconnectAttemptsRef.current > 0) {
            console.info(`   Attempt ${reconnectAttemptsRef.current + 1} - Will retry automatically...`);
          } else {
            console.info(`   💡 Tip: Test the WebSocket URL directly in browser console:`);
            console.info(`   const ws = new WebSocket('${url}'); ws.onerror = (e) => console.error('WS Error:', e);`);
          }
          lastErrorLogRef.current = now;
        }
        onErrorRef.current?.(error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
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

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    reconnectAttemptsRef.current = 0;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // Ignore errors
      }
      wsRef.current = null;
    }
  }, []);

  // Auto-connect on mount and auto-reconnect on disconnect (only if enabled and autoConnect is true)
  useEffect(() => {
    console.log(`[WebSocket Hook] Initializing for ${url}, enabled: ${enabled}, autoConnect: ${autoConnect}`);
    
    // Don't auto-connect if disabled or autoConnect is false
    if (!enabled || !autoConnect) {
      console.log(`[WebSocket Hook] Skipping auto-connect for ${url} (enabled: ${enabled}, autoConnect: ${autoConnect})`);
      return;
    }

    // Small delay to avoid connection storms when multiple components mount
    const initialDelay = setTimeout(() => {
      if (shouldReconnectRef.current && enabled) {
        console.log(`[WebSocket Hook] Triggering connect() for ${url}`);
        connect();
      } else {
        console.log(`[WebSocket Hook] Not connecting - shouldReconnect: ${shouldReconnectRef.current}, enabled: ${enabled}`);
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
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {
          // Ignore errors
        }
        wsRef.current = null;
      }
    };
  }, [connect, enabled, autoConnect]);

  return {
    isConnected,
    lastMessage,
    send,
    disconnect,
    reconnect: connect,
  };
}

