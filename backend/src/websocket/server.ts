/**
 * WebSocket Server
 * Manages WebSocket connections with authentication and message handling
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  WebSocketConfig,
  DEFAULT_WEBSOCKET_CONFIG,
  ClientConnection,
  ConnectionStatus,
  WebSocketMessage,
  MessageType,
  ConnectionEvent,
} from './types';

// ============================================================================
// WEBSOCKET SERVER
// ============================================================================

export class WebSocketServer extends EventEmitter {
  private wss: WebSocket.Server | null = null;
  private config: WebSocketConfig;
  private clients: Map<string, ClientConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> Set of clientIds
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  constructor(config: Partial<WebSocketConfig> = {}) {
    super();
    this.config = { ...DEFAULT_WEBSOCKET_CONFIG, ...config };
  }

  /**
   * Start the WebSocket server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocket.Server({
          port: this.config.port,
          host: this.config.host,
          maxPayload: this.config.maxMessageSize,
        });

        this.wss.on('connection', (ws) => this.handleConnection(ws));
        this.wss.on('error', (error) => this.handleServerError(error));

        this.isRunning = true;
        console.log(`WebSocket server started on ws://${this.config.host}:${this.config.port}`);

        this.emit('started', { timestamp: Date.now() });
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the WebSocket server
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.wss) {
        resolve();
        return;
      }

      // Close all client connections
      for (const [clientId, client] of this.clients) {
        this.disconnectClient(clientId);
      }

      // Close server
      this.wss.close((error) => {
        if (error) {
          reject(error);
        } else {
          this.isRunning = false;
          console.log('WebSocket server stopped');
          this.emit('stopped', { timestamp: Date.now() });
          resolve();
        }
      });
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    const clientId = uuidv4();

    // Set up connection timeout
    const connectionTimeout = setTimeout(() => {
      if (!this.clients.has(clientId)) {
        ws.close(1000, 'Authentication timeout');
      }
    }, this.config.connectionTimeout);

    ws.on('message', (data) => {
      clearTimeout(connectionTimeout);
      this.handleMessage(clientId, ws, data);
    });

    ws.on('close', () => this.handleDisconnect(clientId));
    ws.on('error', (error) => this.handleClientError(clientId, error));
    ws.on('pong', () => this.handlePong(clientId));

    console.log(`New WebSocket connection: ${clientId}`);
    this.emit('connection_received', { clientId, timestamp: Date.now() });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(clientId: string, ws: WebSocket, data: WebSocket.Data): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      // Validate message
      if (!message.type) {
        this.sendError(ws, 'INVALID_MESSAGE', 'Message type is required');
        return;
      }

      const client = this.clients.get(clientId);

      // Handle authentication
      if (message.type === MessageType.AUTHENTICATE) {
        this.handleAuthenticate(clientId, ws, message);
        return;
      }

      // Require authentication for other messages
      if (!client || client.status !== ConnectionStatus.AUTHENTICATED) {
        this.sendError(ws, 'UNAUTHENTICATED', 'Client must authenticate first');
        return;
      }

      // Update last activity
      client.lastActivity = Date.now();
      client.messageCount++;

      // Handle message by type
      switch (message.type) {
        case MessageType.PING:
          this.handlePing(clientId);
          break;

        case MessageType.SUBSCRIBE:
          this.handleSubscribe(clientId, message);
          break;

        case MessageType.UNSUBSCRIBE:
          this.handleUnsubscribe(clientId, message);
          break;

        default:
          this.emit('message_received', {
            clientId,
            userId: client.userId,
            message,
            timestamp: Date.now(),
          });
      }
    } catch (error) {
      console.error(`Error handling message from ${clientId}:`, error);
      this.sendError(ws, 'MESSAGE_ERROR', 'Failed to process message');
    }
  }

  /**
   * Handle authentication
   */
  private handleAuthenticate(clientId: string, ws: WebSocket, message: WebSocketMessage): void {
    try {
      const token = message.data?.token;

      if (!token) {
        this.sendError(ws, 'AUTH_FAILED', 'Token is required');
        return;
      }

      // Verify token (in production, this would validate JWT)
      // For now, extract user info from token structure
      const decoded = this.decodeToken(token);

      if (!decoded) {
        this.sendError(ws, 'AUTH_FAILED', 'Invalid token');
        return;
      }

      // Create client connection
      const client: ClientConnection = {
        clientId,
        userId: decoded.userId,
        walletAddress: decoded.walletAddress,
        status: ConnectionStatus.AUTHENTICATED,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        messageCount: 0,
        subscriptions: new Set(),
      };

      this.clients.set(clientId, client);

      // Track user connections
      if (!this.userConnections.has(decoded.userId)) {
        this.userConnections.set(decoded.userId, new Set());
      }
      this.userConnections.get(decoded.userId)!.add(clientId);

      // Start heartbeat
      this.startHeartbeat(clientId, ws);

      // Send authenticated response
      this.send(ws, {
        type: MessageType.AUTHENTICATED,
        timestamp: Date.now(),
        data: { clientId, userId: decoded.userId },
      });

      this.emit('client_authenticated', {
        clientId,
        userId: decoded.userId,
        timestamp: Date.now(),
      } as ConnectionEvent);

      console.log(`Client authenticated: ${clientId} (user: ${decoded.userId})`);
    } catch (error) {
      console.error(`Authentication error for ${clientId}:`, error);
      this.sendError(ws, 'AUTH_ERROR', 'Authentication failed');
    }
  }

  /**
   * Handle subscribe request
   */
  private handleSubscribe(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const channels = message.data?.channels || [];
    if (!Array.isArray(channels)) {
      return;
    }

    for (const channel of channels) {
      client.subscriptions.add(channel);
    }

    this.emit('client_subscribed', {
      clientId,
      channels,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle unsubscribe request
   */
  private handleUnsubscribe(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const channels = message.data?.channels || [];
    if (!Array.isArray(channels)) {
      return;
    }

    for (const channel of channels) {
      client.subscriptions.delete(channel);
    }

    this.emit('client_unsubscribed', {
      clientId,
      channels,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle ping message
   */
  private handlePing(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastActivity = Date.now();
    }
  }

  /**
   * Handle pong message
   */
  private handlePong(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastActivity = Date.now();
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);

    if (client) {
      // Remove from user connections
      const userClients = this.userConnections.get(client.userId);
      if (userClients) {
        userClients.delete(clientId);
        if (userClients.size === 0) {
          this.userConnections.delete(client.userId);
        }
      }

      this.clients.delete(clientId);
    }

    // Stop heartbeat
    const heartbeatInterval = this.heartbeatIntervals.get(clientId);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      this.heartbeatIntervals.delete(clientId);
    }

    console.log(`Client disconnected: ${clientId}`);

    this.emit('client_disconnected', {
      clientId,
      userId: client?.userId,
      timestamp: Date.now(),
    } as ConnectionEvent);
  }

  /**
   * Disconnect a client
   */
  private disconnectClient(clientId: string): void {
    // Find and close the WebSocket connection
    this.wss?.clients.forEach((ws) => {
      if ((ws as any).clientId === clientId) {
        ws.close(1000, 'Server shutdown');
      }
    });
  }

  /**
   * Start heartbeat for client
   */
  private startHeartbeat(clientId: string, ws: WebSocket): void {
    const interval = setInterval(() => {
      const client = this.clients.get(clientId);

      if (!client) {
        clearInterval(interval);
        return;
      }

      // Check if client is still responsive
      const timeSinceLastActivity = Date.now() - client.lastActivity;
      if (timeSinceLastActivity > this.config.heartbeatTimeout!) {
        ws.close(1000, 'Heartbeat timeout');
        return;
      }

      // Send ping
      this.send(ws, {
        type: MessageType.PING,
        timestamp: Date.now(),
      });
    }, this.config.heartbeatInterval);

    this.heartbeatIntervals.set(clientId, interval);
  }

  /**
   * Broadcast message to all authenticated clients
   */
  broadcastToAll(message: WebSocketMessage): void {
    if (!this.wss) return;

    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.send(ws, message);
      }
    });
  }

  /**
   * Broadcast message to specific user's clients
   */
  broadcastToUser(userId: string, message: WebSocketMessage): void {
    const clientIds = this.userConnections.get(userId);
    if (!clientIds) return;

    for (const clientId of clientIds) {
      this.wss?.clients.forEach((ws) => {
        if ((ws as any).clientId === clientId && ws.readyState === WebSocket.OPEN) {
          this.send(ws, message);
        }
      });
    }
  }

  /**
   * Broadcast message to clients subscribed to a channel
   */
  broadcastToChannel(channel: string, message: WebSocketMessage): void {
    for (const [clientId, client] of this.clients) {
      if (client.subscriptions.has(channel)) {
        this.wss?.clients.forEach((ws) => {
          if ((ws as any).clientId === clientId && ws.readyState === WebSocket.OPEN) {
            this.send(ws, message);
          }
        });
      }
    }
  }

  /**
   * Send message to specific WebSocket
   */
  private send(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message
   */
  private sendError(ws: WebSocket, code: string, message: string): void {
    this.send(ws, {
      type: MessageType.ERROR,
      timestamp: Date.now(),
      error: { code, message },
    });
  }

  /**
   * Decode token (simplified - in production use JWT verification)
   */
  private decodeToken(token: string): { userId: string; walletAddress: string } | null {
    try {
      // In production, use jwt.verify()
      // For now, expect token format: userId:walletAddress
      const [userId, walletAddress] = token.split(':');
      if (userId && walletAddress) {
        return { userId, walletAddress };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Handle client error
   */
  private handleClientError(clientId: string, error: Error): void {
    console.error(`WebSocket error for ${clientId}:`, error);
    this.emit('client_error', { clientId, error: error.message, timestamp: Date.now() });
  }

  /**
   * Handle server error
   */
  private handleServerError(error: Error): void {
    console.error('WebSocket server error:', error);
    this.emit('error', { error: error.message, timestamp: Date.now() });
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    isRunning: boolean;
    totalConnections: number;
    authenticatedConnections: number;
    totalUsers: number;
    messageCount: number;
  } {
    let messageCount = 0;
    for (const client of this.clients.values()) {
      messageCount += client.messageCount;
    }

    return {
      isRunning: this.isRunning,
      totalConnections: this.clients.size,
      authenticatedConnections: Array.from(this.clients.values()).filter(
        (c) => c.status === ConnectionStatus.AUTHENTICATED
      ).length,
      totalUsers: this.userConnections.size,
      messageCount,
    };
  }

  /**
   * Get client info
   */
  getClientInfo(clientId: string): ClientConnection | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get user's connected clients
   */
  getUserClients(userId: string): string[] {
    const clientIds = this.userConnections.get(userId);
    return clientIds ? Array.from(clientIds) : [];
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: WebSocketServer | null = null;

export function getWebSocketServer(config?: Partial<WebSocketConfig>): WebSocketServer {
  if (!instance) {
    instance = new WebSocketServer(config);
  }
  return instance;
}

export function resetWebSocketServer(): void {
  if (instance) {
    instance.removeAllListeners();
  }
  instance = null;
}
