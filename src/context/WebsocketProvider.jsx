import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const WebsocketContext = createContext(null);

const HEARTBEAT_INTERVAL_MS = 5000;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

export { WebsocketContext };

export function WebsocketProvider({ children, clientType, name }) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [activeClients, setActiveClients] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);

  const wsRef = useRef(null);
  const heartbeatRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const connectRef = useRef(() => {});
  const manuallyClosedRef = useRef(false);
  const subscribersRef = useRef(new Set());

  const wsUrl = useMemo(
    () => import.meta.env.VITE_WS_URL || 'ws://9.0.0.10:1337',
    []
  );

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const sendJson = useCallback((payload) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  const notifySubscribers = useCallback((message) => {
    subscribersRef.current.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        console.error('WebSocket subscriber failed:', error);
      }
    });
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (manuallyClosedRef.current) return;

    clearReconnectTimer();
    reconnectAttemptsRef.current += 1;

    const delay = Math.min(
      RECONNECT_MAX_DELAY_MS,
      RECONNECT_BASE_DELAY_MS * 2 ** (reconnectAttemptsRef.current - 1)
    );

    reconnectTimerRef.current = setTimeout(() => {
      connectRef.current();
    }, delay);
  }, [clearReconnectTimer]);

  const connect = useCallback(() => {
    clearReconnectTimer();

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setConnectionState('connected');
      reconnectAttemptsRef.current = 0;

      sendJson({
        type: 'identify',
        clientType,
        name,
      });

      clearHeartbeat();
      heartbeatRef.current = setInterval(() => {
        sendJson({ type: 'heartbeat' });
      }, HEARTBEAT_INTERVAL_MS);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastEvent(message);

        if (message.type === 'active_clients') {
          setActiveClients(message.data);
        }

        notifySubscribers(message);
      } catch (error) {
        console.error('Invalid WS message payload:', error);
      }
    };

    socket.onerror = () => {
      setConnectionState('error');
    };

    socket.onclose = () => {
      setIsConnected(false);
      setConnectionState('disconnected');
      clearHeartbeat();
      wsRef.current = null;
      scheduleReconnect();
    };
  }, [clearHeartbeat, clearReconnectTimer, clientType, name, notifySubscribers, scheduleReconnect, sendJson, wsUrl]);

  const disconnect = useCallback(() => {
    manuallyClosedRef.current = true;
    clearReconnectTimer();
    clearHeartbeat();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionState('disconnected');
  }, [clearHeartbeat, clearReconnectTimer]);

  const reconnect = useCallback(() => {
    manuallyClosedRef.current = false;
    disconnect();
    manuallyClosedRef.current = false;
    connect();
  }, [connect, disconnect]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const subscribe = useCallback((listener) => {
    subscribersRef.current.add(listener);

    return () => {
      subscribersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    manuallyClosedRef.current = false;
    connect();

    return () => {
      manuallyClosedRef.current = true;
      clearReconnectTimer();
      clearHeartbeat();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [clearHeartbeat, clearReconnectTimer, connect]);

  const value = useMemo(
    () => ({
      isConnected,
      connectionState,
      activeClients,
      lastEvent,
      sendJson,
      reconnect,
      disconnect,
      subscribe,
    }),
    [activeClients, connectionState, disconnect, isConnected, lastEvent, reconnect, sendJson, subscribe]
  );

  return <WebsocketContext.Provider value={value}>{children}</WebsocketContext.Provider>;
}
