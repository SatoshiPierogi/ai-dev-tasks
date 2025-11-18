/**
 * WebSocket Types and Interfaces
 * Defines message schemas and connection management
 */

import { EventEmitter } from 'events';

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
// MESSAGE INTERFACES
// ============================================================================

export interface WebSocketMessage {
  type: MessageType;
  id?: string; // Message ID for correlation
  timestamp: number;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Transaction Update Message
 */
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

/**
 * Transaction Verified Message
 */
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

/**
 * Verification Update Message
 */
export interface VerificationUpdateMessage extends WebSocketMessage {
  type: MessageType.VERIFICATION_UPDATE;
  data: {
    tx_hash: string;
    status: 'pending' | 'verified' | 'unverified' | 'failed';
    confirmations?: number;
    error?: string;
  };
}

/**
 * Agent Status Update Message
 */
export interface AgentStatusUpdateMessage extends WebSocketMessage {
  type: MessageType.AGENT_STATUS_UPDATE;
  data: {
    agent_id: string;
    agent_address: string;
    status: 'active' | 'inactive' | 'paused';
    last_activity: string;
    transaction_count: number;
  };
}

/**
 * Agent Added Message
 */
export interface AgentAddedMessage extends WebSocketMessage {
  type: MessageType.AGENT_ADDED;
  data: {
    agent_id: string;
    agent_address: string;
    name: string;
    created_at: string;
  };
}

/**
 * Auth Challenge
 */
export interface AuthMessage extends WebSocketMessage {
  type: MessageType.AUTHENTICATE;
  data: {
    token?: string;
  };
}

/**
 * Error Message
 */
export interface ErrorMessage extends WebSocketMessage {
  type: MessageType.ERROR;
  data: {
    code: string;
    message: string;
    details?: any;
  };
}

// ============================================================================
// CONNECTION INTERFACES
// ============================================================================

export interface ClientConnection {
  clientId: string;
  userId: string;
  walletAddress: string;
  status: ConnectionStatus;
  connectedAt: number;
  lastActivity: number;
  messageCount: number;
  subscriptions: Set<string>; // Channel subscriptions (agent_ids, etc)
}

export interface ConnectionEvent {
  clientId: string;
  userId: string;
  timestamp: number;
  data?: any;
}

// ============================================================================
// MESSAGE QUEUE
// ============================================================================

export interface QueuedMessage {
  id: string;
  message: WebSocketMessage;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

// ============================================================================
// EVENT EMITTER INTERFACE
// ============================================================================

export interface WebSocketEmitter extends EventEmitter {
  // Connection events
  on(event: 'client_connected', listener: (data: ConnectionEvent) => void): this;
  on(event: 'client_disconnected', listener: (data: ConnectionEvent) => void): this;
  on(event: 'client_authenticated', listener: (data: ConnectionEvent) => void): this;

  // Transaction events
  on(event: 'transaction_received', listener: (data: any) => void): this;
  on(event: 'transaction_verified', listener: (data: any) => void): this;
  on(event: 'transaction_failed', listener: (data: any) => void): this;

  // Verification events
  on(event: 'verification_updated', listener: (data: any) => void): this;
  on(event: 'verification_complete', listener: (data: any) => void): this;

  // Agent events
  on(event: 'agent_status_changed', listener: (data: any) => void): this;
  on(event: 'agent_added', listener: (data: any) => void): this;
  on(event: 'agent_removed', listener: (data: any) => void): this;
}

// ============================================================================
// CONFIG
// ============================================================================

export interface WebSocketConfig {
  port: number;
  host?: string;
  maxConnections?: number;
  messageQueueSize?: number;
  heartbeatInterval?: number; // ms
  heartbeatTimeout?: number; // ms
  connectionTimeout?: number; // ms
  maxMessageSize?: number; // bytes
}

export const DEFAULT_WEBSOCKET_CONFIG: WebSocketConfig = {
  port: 8080,
  host: 'localhost',
  maxConnections: 10000,
  messageQueueSize: 1000,
  heartbeatInterval: 30000, // 30 seconds
  heartbeatTimeout: 60000, // 60 seconds
  connectionTimeout: 30000, // 30 seconds
  maxMessageSize: 1024 * 1024, // 1MB
};
