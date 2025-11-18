/**
 * WebSocket Provider
 * Provides a single shared WebSocket connection across the application
 * Prevents multiple connections and manages reconnection logic centrally
 */

import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { WebSocketMessage, MessageType, ConnectionStatus } from '../types/websocket';

// ============================================================================
// TYPES
// ============================================================================

interface WebSocketContextType {
  status: ConnectionStatus;
  isConnected: boolean;
  isAuthenticated: boolean;
  send: (message: WebSocketMessage) => void;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
  addMessageHandler: (id: string, handler: (message: WebSocketMessage) => void) => void;
  removeMessageHandler: (id: string) => void;
  connect: () => void;
  disconnect: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface WebSocketProviderProps {
  url?: string;
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  children: React.ReactNode;
}

export function WebSocketProvider({
  url = `${process.env.REACT_APP_WS_URL || 'ws://localhost:8080'}`,
  autoReconnect = true,
  reconnectAttempts = 5,
  reconnectDelay = 1000,
  children,
}: WebSocketProviderProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const messageHandlersRef = useRef<Map<string, (message: WebSocketMessage) => void>>(new Map());
  const subscriptionsRef = useRef<Set<string>>(new Set());

  /**
   * Connect to WebSocket - only one instance per provider
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setStatus(ConnectionStatus.CONNECTING);

      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket connected (shared connection)');
        setStatus(ConnectionStatus.CONNECTED);
        reconnectAttemptsRef.current = 0;

        // Send authentication message
        authenticateWebSocket(ws);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          // Handle authentication response
          if (message.type === MessageType.AUTHENTICATED) {
            setStatus(ConnectionStatus.AUTHENTICATED);
            setIsAuthenticated(true);

            // Re-subscribe to channels after reconnect
            if (subscriptionsRef.current.size > 0) {
              const channels = Array.from(subscriptionsRef.current);
              send({
                type: MessageType.SUBSCRIBE,
                timestamp: Date.now(),
                data: { channels },
              });
            }
          }

          // Handle errors
          if (message.type === MessageType.ERROR) {
            console.error('WebSocket error:', message.error?.message);
          }

          // Call all registered message handlers
          messageHandlersRef.current.forEach((handler) => {
            try {
              handler(message);
            } catch (error) {
              console.error('Error in message handler:', error);
            }
          });
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setStatus(ConnectionStatus.ERROR);
      };

      ws.onclose = () => {
        console.log('WebSocket closed (shared connection)');
        setStatus(ConnectionStatus.DISCONNECTED);
        setIsAuthenticated(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (autoReconnect && reconnectAttemptsRef.current < reconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = reconnectDelay * reconnectAttemptsRef.current;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setStatus(ConnectionStatus.ERROR);
    }
  }, [url, autoReconnect, reconnectAttempts, reconnectDelay]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus(ConnectionStatus.DISCONNECTED);
    setIsAuthenticated(false);
  }, []);

  /**
   * Send message - only if connected
   */
  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  /**
   * Subscribe to channels
   */
  const subscribe = useCallback((channels: string[]) => {
    channels.forEach((ch) => subscriptionsRef.current.add(ch));

    send({
      type: MessageType.SUBSCRIBE,
      timestamp: Date.now(),
      data: { channels },
    });
  }, [send]);

  /**
   * Unsubscribe from channels
   */
  const unsubscribe = useCallback((channels: string[]) => {
    channels.forEach((ch) => subscriptionsRef.current.delete(ch));

    send({
      type: MessageType.UNSUBSCRIBE,
      timestamp: Date.now(),
      data: { channels },
    });
  }, [send]);

  /**
   * Add a message handler
   */
  const addMessageHandler = useCallback((id: string, handler: (message: WebSocketMessage) => void) => {
    messageHandlersRef.current.set(id, handler);
  }, []);

  /**
   * Remove a message handler
   */
  const removeMessageHandler = useCallback((id: string) => {
    messageHandlersRef.current.delete(id);
  }, []);

  /**
   * Authenticate WebSocket
   */
  const authenticateWebSocket = (ws: WebSocket) => {
    const token = localStorage.getItem('auth_token');

    if (token) {
      const message: WebSocketMessage = {
        type: MessageType.AUTHENTICATE,
        timestamp: Date.now(),
        data: { token },
      };

      ws.send(JSON.stringify(message));
    }
  };

  /**
   * Auto-connect on mount
   */
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  /**
   * Heartbeat - send ping periodically
   */
  useEffect(() => {
    if (status !== ConnectionStatus.AUTHENTICATED) {
      return;
    }

    const heartbeatInterval = setInterval(() => {
      send({
        type: MessageType.PING,
        timestamp: Date.now(),
      });
    }, 30000); // 30 seconds

    return () => clearInterval(heartbeatInterval);
  }, [status, send]);

  const value: WebSocketContextType = {
    status,
    isConnected: status !== ConnectionStatus.DISCONNECTED && status !== ConnectionStatus.ERROR,
    isAuthenticated,
    send,
    subscribe,
    unsubscribe,
    addMessageHandler,
    removeMessageHandler,
    connect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Hook to use WebSocket context
 */
export function useSharedWebSocket(): WebSocketContextType {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error('useSharedWebSocket must be used within WebSocketProvider');
  }

  return context;
}
