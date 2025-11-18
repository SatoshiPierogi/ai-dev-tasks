/**
 * Connection Manager Tests
 * Tests for message queueing and reconnection logic
 */

import {
  ConnectionManager,
  getConnectionManager,
  resetConnectionManager,
} from './connectionManager';
import { MessageType } from './types';

// ============================================================================
// CONNECTION MANAGER TESTS
// ============================================================================

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    resetConnectionManager();
    manager = new ConnectionManager(100, 5);
  });

  afterEach(() => {
    resetConnectionManager();
  });

  it('should initialize manager', () => {
    expect(manager).toBeDefined();
  });

  it('should queue messages for offline users', () => {
    const message = {
      type: MessageType.TRANSACTION_UPDATE,
      timestamp: Date.now(),
      data: { tx_hash: '0xabc' },
    };

    const success = manager.queueMessage('user1', message);

    expect(success).toBe(true);
    expect(manager.getQueuedMessages('user1')).toHaveLength(1);
  });

  it('should retrieve queued messages', () => {
    const message1 = {
      type: MessageType.TRANSACTION_UPDATE,
      timestamp: Date.now(),
      data: { tx_hash: '0xabc' },
    };

    const message2 = {
      type: MessageType.AGENT_STATUS_UPDATE,
      timestamp: Date.now(),
      data: { agent_id: '123' },
    };

    manager.queueMessage('user1', message1);
    manager.queueMessage('user1', message2);

    const queued = manager.getQueuedMessages('user1');

    expect(queued).toHaveLength(2);
    expect(queued[0].message.data.tx_hash).toBe('0xabc');
    expect(queued[1].message.data.agent_id).toBe('123');
  });

  it('should clear message queue', () => {
    const message = {
      type: MessageType.TRANSACTION_UPDATE,
      timestamp: Date.now(),
      data: { tx_hash: '0xabc' },
    };

    manager.queueMessage('user1', message);
    const cleared = manager.clearQueue('user1');

    expect(cleared).toBe(1);
    expect(manager.getQueuedMessages('user1')).toHaveLength(0);
  });

  it('should respect maximum queue size', () => {
    const message = {
      type: MessageType.TRANSACTION_UPDATE,
      timestamp: Date.now(),
      data: { tx_hash: '0xabc' },
    };

    // Queue messages beyond max size
    for (let i = 0; i < 150; i++) {
      manager.queueMessage('user1', message);
    }

    const queued = manager.getQueuedMessages('user1');
    expect(queued.length).toBeLessThanOrEqual(100);
  });

  it('should mark user as offline', () => {
    manager.markOffline('user1');

    const status = manager.getOfflineStatus('user1');
    expect(status.isOffline).toBe(true);
    expect(status.offlineSince).toBeDefined();
  });

  it('should mark user as online', () => {
    const message = {
      type: MessageType.TRANSACTION_UPDATE,
      timestamp: Date.now(),
      data: { tx_hash: '0xabc' },
    };

    manager.queueMessage('user1', message);
    manager.markOffline('user1');

    const queued = manager.markOnline('user1');

    expect(queued).toHaveLength(1);
    expect(manager.isOffline('user1')).toBe(false);
  });

  it('should check if user is offline', () => {
    expect(manager.isOffline('user1')).toBe(false);

    manager.markOffline('user1');

    expect(manager.isOffline('user1')).toBe(true);
  });

  it('should track reconnection attempts', () => {
    const success1 = manager.recordReconnectionAttempt('user1');
    const success2 = manager.recordReconnectionAttempt('user1');
    const success3 = manager.recordReconnectionAttempt('user1');

    expect(success1).toBe(true);
    expect(success2).toBe(true);
    expect(success3).toBe(true);
  });

  it('should fail after max reconnection attempts', () => {
    for (let i = 0; i < 5; i++) {
      manager.recordReconnectionAttempt('user1');
    }

    const result = manager.recordReconnectionAttempt('user1');

    expect(result).toBe(false);
  });

  it('should mark message as delivered', () => {
    const message = {
      type: MessageType.TRANSACTION_UPDATE,
      timestamp: Date.now(),
      data: { tx_hash: '0xabc' },
    };

    manager.queueMessage('user1', message);
    const queued = manager.getQueuedMessages('user1');
    const messageId = queued[0].id;

    const success = manager.markMessageDelivered('user1', messageId);

    expect(success).toBe(true);
    expect(manager.getQueuedMessages('user1')).toHaveLength(0);
  });

  it('should retry failed messages', () => {
    const message = {
      type: MessageType.TRANSACTION_UPDATE,
      timestamp: Date.now(),
      data: { tx_hash: '0xabc' },
    };

    manager.queueMessage('user1', message);
    const queued = manager.getQueuedMessages('user1');
    const messageId = queued[0].id;

    const retry1 = manager.retryMessage('user1', messageId);
    const retry2 = manager.retryMessage('user1', messageId);
    const retry3 = manager.retryMessage('user1', messageId);

    expect(retry1).toBe(true);
    expect(retry2).toBe(true);
    expect(retry3).toBe(false); // Exceeded max retries
  });

  it('should emit message_queued event', () => {
    const listener = jest.fn();
    manager.on('message_queued', listener);

    const message = {
      type: MessageType.TRANSACTION_UPDATE,
      timestamp: Date.now(),
      data: { tx_hash: '0xabc' },
    };

    manager.queueMessage('user1', message);

    expect(listener).toHaveBeenCalled();
  });

  it('should emit user_offline event', () => {
    const listener = jest.fn();
    manager.on('user_offline', listener);

    manager.markOffline('user1');

    expect(listener).toHaveBeenCalled();
  });

  it('should emit user_online event', () => {
    const listener = jest.fn();
    manager.on('user_online', listener);

    manager.markOffline('user1');
    manager.markOnline('user1');

    expect(listener).toHaveBeenCalled();
  });

  it('should emit reconnection_failed event', () => {
    const listener = jest.fn();
    manager.on('reconnection_failed', listener);

    for (let i = 0; i < 6; i++) {
      manager.recordReconnectionAttempt('user1');
    }

    expect(listener).toHaveBeenCalled();
  });
});

// ============================================================================
// QUEUE STATISTICS
// ============================================================================

describe('Queue Statistics', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    resetConnectionManager();
    manager = new ConnectionManager(100, 5);
  });

  afterEach(() => {
    resetConnectionManager();
  });

  it('should get queue statistics', () => {
    const message = {
      type: MessageType.TRANSACTION_UPDATE,
      timestamp: Date.now(),
      data: { tx_hash: '0xabc' },
    };

    manager.queueMessage('user1', message);
    manager.queueMessage('user2', message);
    manager.markOffline('user1');

    const stats = manager.getQueueStats();

    expect(stats.totalQueued).toBe(2);
    expect(stats.offlineUsers).toBe(1);
    expect(stats.queuesByUser['user1']).toBe(1);
    expect(stats.queuesByUser['user2']).toBe(1);
  });

  it('should get reconnection statistics', () => {
    manager.recordReconnectionAttempt('user1');
    manager.recordReconnectionAttempt('user1');
    manager.recordReconnectionAttempt('user2');

    const stats = manager.getReconnectionStats();

    expect(stats.attemptingUsers).toBe(2);
    expect(stats.attemptsByUser['user1']).toBe(2);
    expect(stats.attemptsByUser['user2']).toBe(1);
  });
});

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

describe('ConnectionManager Singleton', () => {
  beforeEach(() => {
    resetConnectionManager();
  });

  afterEach(() => {
    resetConnectionManager();
  });

  it('should return same instance', () => {
    const manager1 = getConnectionManager();
    const manager2 = getConnectionManager();

    expect(manager1).toBe(manager2);
  });

  it('should reset singleton', () => {
    const manager1 = getConnectionManager();
    resetConnectionManager();
    const manager2 = getConnectionManager();

    expect(manager1).not.toBe(manager2);
  });
});

// ============================================================================
// REAL-WORLD SCENARIOS
// ============================================================================

describe('Real-world Scenarios', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    resetConnectionManager();
    manager = new ConnectionManager(1000, 10);
  });

  afterEach(() => {
    resetConnectionManager();
  });

  it('should handle user disconnection and reconnection', () => {
    const message = {
      type: MessageType.TRANSACTION_UPDATE,
      timestamp: Date.now(),
      data: { tx_hash: '0xabc' },
    };

    // User connected, receives message
    manager.queueMessage('user1', message);

    // User goes offline
    manager.markOffline('user1');
    expect(manager.isOffline('user1')).toBe(true);

    // User reconnects and gets queued messages
    const queued = manager.markOnline('user1');
    expect(queued).toHaveLength(1);
    expect(manager.isOffline('user1')).toBe(false);
  });

  it('should handle multiple users with different offline states', () => {
    const message = {
      type: MessageType.TRANSACTION_UPDATE,
      timestamp: Date.now(),
      data: { tx_hash: '0xabc' },
    };

    // Multiple users go offline
    for (let i = 1; i <= 5; i++) {
      manager.queueMessage(`user${i}`, message);
      if (i % 2 === 0) {
        manager.markOffline(`user${i}`);
      }
    }

    const stats = manager.getQueueStats();

    expect(stats.totalQueued).toBe(5);
    expect(stats.offlineUsers).toBe(2);
  });

  it('should handle rapid message queueing', () => {
    for (let i = 0; i < 500; i++) {
      const message = {
        type: MessageType.TRANSACTION_UPDATE,
        timestamp: Date.now(),
        data: { tx_hash: `0x${i}` },
      };

      manager.queueMessage('user1', message);
    }

    const stats = manager.getQueueStats();
    expect(stats.totalQueued).toBeLessThanOrEqual(1000); // Max queue size
  });

  it('should handle message delivery and queue cleanup', () => {
    const messages = [];
    for (let i = 0; i < 5; i++) {
      const message = {
        type: MessageType.TRANSACTION_UPDATE,
        timestamp: Date.now(),
        data: { tx_hash: `0x${i}` },
      };

      manager.queueMessage('user1', message);
      messages.push(manager.getQueuedMessages('user1')[i].id);
    }

    // Deliver some messages
    manager.markMessageDelivered('user1', messages[0]);
    manager.markMessageDelivered('user1', messages[1]);

    const remaining = manager.getQueuedMessages('user1');
    expect(remaining).toHaveLength(3);
  });
});
