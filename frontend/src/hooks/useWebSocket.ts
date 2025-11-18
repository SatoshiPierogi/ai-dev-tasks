/**
 * useWebSocket Hook
 * React hook for WebSocket connection management using shared provider
 * NOTE: This hook now uses a shared WebSocket connection via WebSocketProvider
 * to prevent multiple connections and optimize memory usage
 */

import { useEffect, useRef, useCallback, useState, useId } from 'react';
import { useSharedWebSocket } from '../providers/WebSocketProvider';
import { WebSocketMessage, MessageType, ConnectionStatus } from '../types/websocket';

// ============================================================================
// TYPES
// ============================================================================

export interface UseWebSocketOptions {
  url?: string; // Ignored - uses provider's URL
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (message: WebSocketMessage) => void;
  autoReconnect?: boolean; // Ignored - controlled by provider
  reconnectAttempts?: number; // Ignored - controlled by provider
  reconnectDelay?: number; // Ignored - controlled by provider
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
// WEBSOCKET HOOK (WRAPPER AROUND SHARED CONNECTION)
// ============================================================================

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  // Get shared WebSocket connection from provider
  const {
    status,
    isConnected,
    isAuthenticated,
    send: providerSend,
    subscribe: providerSubscribe,
    unsubscribe: providerUnsubscribe,
    addMessageHandler,
    removeMessageHandler,
    connect,
    disconnect,
  } = useSharedWebSocket();

  // Generate unique ID for this hook instance
  const handlerIdRef = useRef(useId());
  const onMessageRef = useRef(options.onMessage);
  const callbacksRef = useRef({
    onConnect: options.onConnect,
    onDisconnect: options.onDisconnect,
    onError: options.onError,
  });

  // Update callback refs when options change
  useEffect(() => {
    onMessageRef.current = options.onMessage;
    callbacksRef.current = {
      onConnect: options.onConnect,
      onDisconnect: options.onDisconnect,
      onError: options.onError,
    };
  }, [options.onMessage, options.onConnect, options.onDisconnect, options.onError]);

  // Register message handler
  useEffect(() => {
    const handler = (message: WebSocketMessage) => {
      try {
        if (onMessageRef.current) {
          onMessageRef.current(message);
        }
      } catch (error) {
        console.error('Error in message handler:', error);
        if (callbacksRef.current.onError) {
          callbacksRef.current.onError(error instanceof Error ? error : new Error('Unknown error'));
        }
      }
    };

    addMessageHandler(handlerIdRef.current, handler);

    return () => {
      removeMessageHandler(handlerIdRef.current);
    };
  }, [addMessageHandler, removeMessageHandler]);

  // Call connect/disconnect callbacks on status change
  useEffect(() => {
    if (status === ConnectionStatus.AUTHENTICATED && callbacksRef.current.onConnect) {
      callbacksRef.current.onConnect();
    }
  }, [status]);

  return {
    status,
    isConnected,
    isAuthenticated,
    send: providerSend,
    subscribe: providerSubscribe,
    unsubscribe: providerUnsubscribe,
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

  const { subscribe, unsubscribe } = useWebSocket({
    onMessage: (message) => {
      if (message.type === MessageType.TRANSACTION_UPDATE) {
        setTransactions((prev) => [message.data, ...prev]);
      }
    },
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

  useWebSocket({
    onMessage: (message) => {
      if (
        message.type === MessageType.TRANSACTION_VERIFIED ||
        message.type === MessageType.VERIFICATION_UPDATE
      ) {
        setVerifications((prev) => [message.data, ...prev]);
      }
    },
  });

  return { verifications };
}

/**
 * Hook for agent status updates
 */
export function useAgentStatusUpdates(userId: string) {
  const [agents, setAgents] = useState<any[]>([]);

  const { subscribe, unsubscribe } = useWebSocket({
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
  });

  useEffect(() => {
    subscribe([`agent:${userId}`]);

    return () => {
      unsubscribe([`agent:${userId}`]);
    };
  }, [userId, subscribe, unsubscribe]);

  return { agents };
}
