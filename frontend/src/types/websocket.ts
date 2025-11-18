/**
 * Frontend WebSocket Types
 * Client-side type definitions for WebSocket communication
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum MessageType {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  AUTH_FAILED = 'auth_failed',
  PING = 'ping',
  PONG = 'pong',

  // Transaction Updates
  TRANSACTION_UPDATE = 'transaction_update',
  TRANSACTION_VERIFIED = 'transaction_verified',
  TRANSACTION_FAILED = 'transaction_failed',

  // Verification Updates
  VERIFICATION_UPDATE = 'verification_update',
  VERIFICATION_COMPLETE = 'verification_complete',

  // Agent Status
  AGENT_STATUS_UPDATE = 'agent_status_update',
  AGENT_ADDED = 'agent_added',
  AGENT_REMOVED = 'agent_removed',

  // System
  ERROR = 'error',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
}

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AUTHENTICATED = 'authenticated',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

// ============================================================================
// MESSAGE INTERFACE
// ============================================================================

export interface WebSocketMessage {
  type: MessageType;
  id?: string;
  timestamp: number;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// SPECIFIC MESSAGE TYPES
// ============================================================================

export interface TransactionUpdateMessage extends WebSocketMessage {
  type: MessageType.TRANSACTION_UPDATE;
  data: {
    tx_hash: string;
    protocol: string;
    action_type: string;
    agent_address: string;
    tokens_in: Array<{ symbol: string; amount: string }>;
    tokens_out: Array<{ symbol: string; amount: string }>;
    description: string;
    timestamp: string;
  };
}

export interface TransactionVerifiedMessage extends WebSocketMessage {
  type: MessageType.TRANSACTION_VERIFIED;
  data: {
    tx_hash: string;
    block_number: number;
    confirmations: number;
    etherscan_url: string;
    verified_at: number;
  };
}

export interface AgentStatusMessage extends WebSocketMessage {
  type: MessageType.AGENT_STATUS_UPDATE;
  data: {
    agent_id: string;
    agent_address: string;
    status: 'active' | 'inactive' | 'paused';
    last_activity: string;
    transaction_count: number;
  };
}
