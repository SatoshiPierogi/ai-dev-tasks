/**
 * WebSocket Event Emitter
 * Broadcasts transaction, verification, and agent updates to connected clients
 */

import { EventEmitter } from 'events';
import { MessageType, WebSocketMessage } from './types';
import { getWebSocketServer } from './server';
import { getConnectionManager } from './connectionManager';

// ============================================================================
// WEBSOCKET EVENT EMITTER
// ============================================================================

export class WebSocketEventEmitter extends EventEmitter {
  private wsServer = getWebSocketServer();
  private connectionManager = getConnectionManager();

  /**
   * Emit transaction update to user's clients
   */
  emitTransactionUpdate(userId: string, txData: any): void {
    const message: WebSocketMessage = {
      type: MessageType.TRANSACTION_UPDATE,
      timestamp: Date.now(),
      data: txData,
    };

    // Broadcast to user's authenticated clients
    this.wsServer.broadcastToUser(userId, message);

    // Queue for offline users
    if (this.connectionManager.isOffline(userId)) {
      this.connectionManager.queueMessage(userId, message);
    }

    this.emit('transaction_update_sent', {
      userId,
      txHash: txData.tx_hash,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit transaction verified notification
   */
  emitTransactionVerified(userId: string, txHash: string, verificationData: any): void {
    const message: WebSocketMessage = {
      type: MessageType.TRANSACTION_VERIFIED,
      timestamp: Date.now(),
      data: {
        tx_hash: txHash,
        block_number: verificationData.block_number,
        confirmations: verificationData.confirmations,
        etherscan_url: verificationData.etherscan_url,
        verified_at: verificationData.verified_at,
      },
    };

    this.wsServer.broadcastToUser(userId, message);

    if (this.connectionManager.isOffline(userId)) {
      this.connectionManager.queueMessage(userId, message);
    }

    this.emit('transaction_verified_sent', {
      userId,
      txHash,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit transaction failed notification
   */
  emitTransactionFailed(userId: string, txHash: string, error: string): void {
    const message: WebSocketMessage = {
      type: MessageType.TRANSACTION_FAILED,
      timestamp: Date.now(),
      data: {
        tx_hash: txHash,
        error,
      },
    };

    this.wsServer.broadcastToUser(userId, message);

    if (this.connectionManager.isOffline(userId)) {
      this.connectionManager.queueMessage(userId, message);
    }

    this.emit('transaction_failed_sent', {
      userId,
      txHash,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit verification status update
   */
  emitVerificationUpdate(userId: string, txHash: string, status: string, details?: any): void {
    const message: WebSocketMessage = {
      type: MessageType.VERIFICATION_UPDATE,
      timestamp: Date.now(),
      data: {
        tx_hash: txHash,
        status,
        ...details,
      },
    };

    this.wsServer.broadcastToUser(userId, message);

    if (this.connectionManager.isOffline(userId)) {
      this.connectionManager.queueMessage(userId, message);
    }

    this.emit('verification_update_sent', {
      userId,
      txHash,
      status,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit agent status update
   */
  emitAgentStatusUpdate(userId: string, agentData: any): void {
    const message: WebSocketMessage = {
      type: MessageType.AGENT_STATUS_UPDATE,
      timestamp: Date.now(),
      data: agentData,
    };

    this.wsServer.broadcastToUser(userId, message);

    if (this.connectionManager.isOffline(userId)) {
      this.connectionManager.queueMessage(userId, message);
    }

    this.emit('agent_status_update_sent', {
      userId,
      agentId: agentData.agent_id,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit agent added notification
   */
  emitAgentAdded(userId: string, agentData: any): void {
    const message: WebSocketMessage = {
      type: MessageType.AGENT_ADDED,
      timestamp: Date.now(),
      data: agentData,
    };

    this.wsServer.broadcastToUser(userId, message);

    if (this.connectionManager.isOffline(userId)) {
      this.connectionManager.queueMessage(userId, message);
    }

    this.emit('agent_added_sent', {
      userId,
      agentId: agentData.agent_id,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit agent removed notification
   */
  emitAgentRemoved(userId: string, agentId: string): void {
    const message: WebSocketMessage = {
      type: MessageType.AGENT_REMOVED,
      timestamp: Date.now(),
      data: { agent_id: agentId },
    };

    this.wsServer.broadcastToUser(userId, message);

    if (this.connectionManager.isOffline(userId)) {
      this.connectionManager.queueMessage(userId, message);
    }

    this.emit('agent_removed_sent', {
      userId,
      agentId,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast to channel (agent activity feed)
   */
  broadcastToChannel(channel: string, message: WebSocketMessage): void {
    this.wsServer.broadcastToChannel(channel, message);

    this.emit('channel_broadcast', {
      channel,
      messageType: message.type,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastToAll(message: WebSocketMessage): void {
    this.wsServer.broadcastToAll(message);

    this.emit('broadcast_all', {
      messageType: message.type,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit error notification
   */
  emitError(userId: string, code: string, message: string, details?: any): void {
    const wsMessage: WebSocketMessage = {
      type: MessageType.ERROR,
      timestamp: Date.now(),
      error: { code, message },
      data: details,
    };

    this.wsServer.broadcastToUser(userId, wsMessage);
  }

  /**
   * Get event emitter statistics
   */
  getStats(): {
    wsServerStats: any;
    queueStats: any;
  } {
    return {
      wsServerStats: this.wsServer.getStats(),
      queueStats: this.connectionManager.getQueueStats(),
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: WebSocketEventEmitter | null = null;

export function getWebSocketEventEmitter(): WebSocketEventEmitter {
  if (!instance) {
    instance = new WebSocketEventEmitter();
  }
  return instance;
}

export function resetWebSocketEventEmitter(): void {
  if (instance) {
    instance.removeAllListeners();
  }
  instance = null;
}
