/**
 * useWebSocket Hook
 * React hook for WebSocket connection management and message handling
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketMessage, MessageType, ConnectionStatus } from '../types/websocket';

// ============================================================================
// TYPES
// ============================================================================

export interface UseWebSocketOptions {
  url: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (message: WebSocketMessage) => void;
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface UseWebSocketReturn {
  status: ConnectionStatus;
  isConnected: boolean;
  isAuthenticated: boolean;
  send: (message: WebSocketMessage) => void;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
  connect: () => void;
  disconnect: () => void;
}

// ============================================================================
// WEBSOCKET HOOK
// ============================================================================

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const messageHandlerRef = useRef(options.onMessage);
  const subscriptionsRef = useRef<Set<string>>(new Set());

  // Update message handler ref when options change
  useEffect(() => {
    messageHandlerRef.current = options.onMessage;
  }, [options.onMessage]);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setStatus(ConnectionStatus.CONNECTING);

      const ws = new WebSocket(options.url);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setStatus(ConnectionStatus.CONNECTED);
        reconnectAttemptsRef.current = 0;

        if (options.onConnect) {
          options.onConnect();
        }

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
              subscribe(channels);
            }
          }

          // Handle errors
          if (message.type === MessageType.ERROR) {
            if (options.onError) {
              options.onError(new Error(message.error?.message || 'WebSocket error'));
            }
          }

          // Call message handler
          if (messageHandlerRef.current) {
            messageHandlerRef.current(message);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setStatus(ConnectionStatus.ERROR);

        if (options.onError) {
          options.onError(new Error('WebSocket error'));
        }
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setStatus(ConnectionStatus.DISCONNECTED);
        setIsAuthenticated(false);
        wsRef.current = null;

        if (options.onDisconnect) {
          options.onDisconnect();
        }

        // Attempt to reconnect
        if (options.autoReconnect && reconnectAttemptsRef.current < (options.reconnectAttempts || 5)) {
          reconnectAttemptsRef.current++;
          const delay = (options.reconnectDelay || 1000) * reconnectAttemptsRef.current;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setStatus(ConnectionStatus.ERROR);

      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error('Unknown error'));
      }
    }
  }, [options]);

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
   * Send message
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
    // Store subscriptions
    channels.forEach((ch) => subscriptionsRef.current.add(ch));

    // Send subscription message
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
    // Remove subscriptions
    channels.forEach((ch) => subscriptionsRef.current.delete(ch));

    // Send unsubscription message
    send({
      type: MessageType.UNSUBSCRIBE,
      timestamp: Date.now(),
      data: { channels },
    });
  }, [send]);

  /**
   * Authenticate WebSocket
   */
  const authenticateWebSocket = (ws: WebSocket) => {
    // Get token from localStorage
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

  return {
    status,
    isConnected: status !== ConnectionStatus.DISCONNECTED && status !== ConnectionStatus.ERROR,
    isAuthenticated,
    send,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
  };
}

// ============================================================================
// COMPOSITE HOOKS
// ============================================================================

/**
 * Hook for transaction updates
 */
export function useTransactionUpdates(userId: string) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { subscribe, unsubscribe, send } = useWebSocket({
    url: `${process.env.REACT_APP_WS_URL || 'ws://localhost:8080'}`,
    onMessage: (message) => {
      if (message.type === MessageType.TRANSACTION_UPDATE) {
        setTransactions((prev) => [message.data, ...prev]);
      }
    },
    autoReconnect: true,
  });

  useEffect(() => {
    // Subscribe to user's agent channels
    subscribe([userId]);
    setLoading(false);

    return () => {
      unsubscribe([userId]);
    };
  }, [userId, subscribe, unsubscribe]);

  return { transactions, loading };
}

/**
 * Hook for verification updates
 */
export function useVerificationUpdates() {
  const [verifications, setVerifications] = useState<any[]>([]);

  const { send } = useWebSocket({
    url: `${process.env.REACT_APP_WS_URL || 'ws://localhost:8080'}`,
    onMessage: (message) => {
      if (
        message.type === MessageType.TRANSACTION_VERIFIED ||
        message.type === MessageType.VERIFICATION_UPDATE
      ) {
        setVerifications((prev) => [message.data, ...prev]);
      }
    },
    autoReconnect: true,
  });

  return { verifications };
}

/**
 * Hook for agent status updates
 */
export function useAgentStatusUpdates(userId: string) {
  const [agents, setAgents] = useState<any[]>([]);

  const { subscribe, unsubscribe } = useWebSocket({
    url: `${process.env.REACT_APP_WS_URL || 'ws://localhost:8080'}`,
    onMessage: (message) => {
      if (message.type === MessageType.AGENT_STATUS_UPDATE) {
        setAgents((prev) => {
          const filtered = prev.filter((a) => a.agent_id !== message.data.agent_id);
          return [message.data, ...filtered];
        });
      } else if (message.type === MessageType.AGENT_ADDED) {
        setAgents((prev) => [message.data, ...prev]);
      } else if (message.type === MessageType.AGENT_REMOVED) {
        setAgents((prev) => prev.filter((a) => a.agent_id !== message.data.agent_id));
      }
    },
    autoReconnect: true,
  });

  useEffect(() => {
    subscribe([`agent:${userId}`]);

    return () => {
      unsubscribe([`agent:${userId}`]);
    };
  }, [userId, subscribe, unsubscribe]);

  return { agents };
}
