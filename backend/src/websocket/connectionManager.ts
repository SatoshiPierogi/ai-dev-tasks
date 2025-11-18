/**
 * Connection Manager
 * Handles client connections, message queueing, and reconnection
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketMessage, QueuedMessage } from './types';

// ============================================================================
// CONNECTION MANAGER
// ============================================================================

export class ConnectionManager extends EventEmitter {
  private messageQueues: Map<string, QueuedMessage[]> = new Map(); // userId -> queued messages
  private maxQueueSize: number;
  private offlineUsers: Map<string, number> = new Map(); // userId -> offline timestamp
  private reconnectionAttempts: Map<string, number> = new Map(); // userId -> attempt count
  private maxReconnectionAttempts: number;

  constructor(maxQueueSize: number = 1000, maxReconnectionAttempts: number = 10) {
    super();
    this.maxQueueSize = maxQueueSize;
    this.maxReconnectionAttempts = maxReconnectionAttempts;
  }

  /**
   * Queue message for offline user
   */
  queueMessage(userId: string, message: WebSocketMessage): boolean {
    // Get or create queue
    if (!this.messageQueues.has(userId)) {
      this.messageQueues.set(userId, []);
    }

    const queue = this.messageQueues.get(userId)!;

    // Check queue size
    if (queue.length >= this.maxQueueSize) {
      console.warn(`Message queue full for user ${userId}, dropping oldest message`);
      queue.shift(); // Remove oldest message
    }

    // Add to queue
    const queuedMessage: QueuedMessage = {
      id: uuidv4(),
      message,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
    };

    queue.push(queuedMessage);

    this.emit('message_queued', {
      userId,
      messageId: queuedMessage.id,
      queueSize: queue.length,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Get all queued messages for user
   */
  getQueuedMessages(userId: string): QueuedMessage[] {
    const queue = this.messageQueues.get(userId) || [];
    return [...queue];
  }

  /**
   * Clear queue for user
   */
  clearQueue(userId: string): number {
    const queue = this.messageQueues.get(userId);
    if (!queue) return 0;

    const count = queue.length;
    this.messageQueues.delete(userId);

    this.emit('queue_cleared', {
      userId,
      messageCount: count,
      timestamp: Date.now(),
    });

    return count;
  }

  /**
   * Mark user as offline
   */
  markOffline(userId: string): void {
    this.offlineUsers.set(userId, Date.now());

    this.emit('user_offline', {
      userId,
      timestamp: Date.now(),
    });
  }

  /**
   * Mark user as online (and get queued messages)
   */
  markOnline(userId: string): QueuedMessage[] {
    const queue = this.messageQueues.get(userId) || [];
    const wasOffline = this.offlineUsers.has(userId);
    const offlineTime = wasOffline ? Date.now() - this.offlineUsers.get(userId)! : 0;

    this.offlineUsers.delete(userId);
    this.reconnectionAttempts.delete(userId);

    this.emit('user_online', {
      userId,
      queuedMessages: queue.length,
      offlineTime,
      timestamp: Date.now(),
    });

    return queue;
  }

  /**
   * Record reconnection attempt
   */
  recordReconnectionAttempt(userId: string): boolean {
    const attempts = (this.reconnectionAttempts.get(userId) || 0) + 1;
    this.reconnectionAttempts.set(userId, attempts);

    if (attempts > this.maxReconnectionAttempts) {
      this.emit('reconnection_failed', {
        userId,
        attempts,
        maxAttempts: this.maxReconnectionAttempts,
        timestamp: Date.now(),
      });

      return false;
    }

    return true;
  }

  /**
   * Mark message as delivered
   */
  markMessageDelivered(userId: string, messageId: string): boolean {
    const queue = this.messageQueues.get(userId);
    if (!queue) return false;

    const index = queue.findIndex((m) => m.id === messageId);
    if (index !== -1) {
      queue.splice(index, 1);
      this.emit('message_delivered', {
        userId,
        messageId,
        timestamp: Date.now(),
      });
      return true;
    }

    return false;
  }

  /**
   * Check if user is offline
   */
  isOffline(userId: string): boolean {
    return this.offlineUsers.has(userId);
  }

  /**
   * Get offline status for user
   */
  getOfflineStatus(userId: string): { isOffline: boolean; offlineSince?: number } {
    const offlineSince = this.offlineUsers.get(userId);
    return {
      isOffline: !!offlineSince,
      offlineSince,
    };
  }

  /**
   * Retry failed message
   */
  retryMessage(userId: string, messageId: string): boolean {
    const queue = this.messageQueues.get(userId);
    if (!queue) return false;

    const message = queue.find((m) => m.id === messageId);
    if (!message) return false;

    message.retries++;

    if (message.retries >= message.maxRetries) {
      // Remove message after max retries
      const index = queue.findIndex((m) => m.id === messageId);
      if (index !== -1) {
        queue.splice(index, 1);
      }

      this.emit('message_max_retries', {
        userId,
        messageId,
        retries: message.retries,
        timestamp: Date.now(),
      });

      return false;
    }

    return true;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    totalQueued: number;
    offlineUsers: number;
    queuesByUser: Record<string, number>;
  } {
    const queuesByUser: Record<string, number> = {};
    let totalQueued = 0;

    for (const [userId, queue] of this.messageQueues) {
      queuesByUser[userId] = queue.length;
      totalQueued += queue.length;
    }

    return {
      totalQueued,
      offlineUsers: this.offlineUsers.size,
      queuesByUser,
    };
  }

  /**
   * Get reconnection stats
   */
  getReconnectionStats(): {
    attemptingUsers: number;
    attemptsByUser: Record<string, number>;
  } {
    const attemptsByUser: Record<string, number> = {};

    for (const [userId, attempts] of this.reconnectionAttempts) {
      attemptsByUser[userId] = attempts;
    }

    return {
      attemptingUsers: this.reconnectionAttempts.size,
      attemptsByUser,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.messageQueues.clear();
    this.offlineUsers.clear();
    this.reconnectionAttempts.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: ConnectionManager | null = null;

export function getConnectionManager(): ConnectionManager {
  if (!instance) {
    instance = new ConnectionManager();
  }
  return instance;
}

export function resetConnectionManager(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}
