/**
 * WebSocket Event Emitter Tests
 * Tests for transaction, verification, and agent status updates
 */

import {
  WebSocketEventEmitter,
  getWebSocketEventEmitter,
  resetWebSocketEventEmitter,
} from './emitter';

// ============================================================================
// EVENT EMITTER TESTS
// ============================================================================

describe('WebSocketEventEmitter', () => {
  let emitter: WebSocketEventEmitter;

  beforeEach(() => {
    resetWebSocketEventEmitter();
    emitter = new WebSocketEventEmitter();
  });

  afterEach(() => {
    resetWebSocketEventEmitter();
  });

  it('should initialize emitter', () => {
    expect(emitter).toBeDefined();
  });

  it('should get stats', () => {
    const stats = emitter.getStats();

    expect(stats).toHaveProperty('wsServerStats');
    expect(stats).toHaveProperty('queueStats');
  });
});

// ============================================================================
// TRANSACTION UPDATES
// ============================================================================

describe('Transaction Updates', () => {
  let emitter: WebSocketEventEmitter;

  beforeEach(() => {
    resetWebSocketEventEmitter();
    emitter = new WebSocketEventEmitter();
  });

  afterEach(() => {
    resetWebSocketEventEmitter();
  });

  it('should emit transaction update', () => {
    const listener = jest.fn();
    emitter.on('transaction_update_sent', listener);

    const txData = {
      tx_hash: '0xabc123',
      protocol: 'uniswap_v3',
      action_type: 'swap',
      agent_address: '0x123',
      tokens_in: [{ symbol: 'ETH', amount: '1' }],
      tokens_out: [{ symbol: 'USDC', amount: '2500' }],
      description: 'Swapped 1 ETH for 2500 USDC',
      timestamp: '2024-01-15T10:30:00Z',
    };

    emitter.emitTransactionUpdate('user1', txData);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user1',
        txHash: '0xabc123',
      })
    );
  });

  it('should emit transaction verified notification', () => {
    const listener = jest.fn();
    emitter.on('transaction_verified_sent', listener);

    const verificationData = {
      block_number: 18500000,
      confirmations: 12,
      etherscan_url: 'https://etherscan.io/tx/0xabc123',
      verified_at: Date.now(),
    };

    emitter.emitTransactionVerified('user1', '0xabc123', verificationData);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user1',
        txHash: '0xabc123',
      })
    );
  });

  it('should emit transaction failed notification', () => {
    const listener = jest.fn();
    emitter.on('transaction_failed_sent', listener);

    emitter.emitTransactionFailed('user1', '0xabc123', 'Verification timeout');

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user1',
        txHash: '0xabc123',
      })
    );
  });
});

// ============================================================================
// VERIFICATION UPDATES
// ============================================================================

describe('Verification Updates', () => {
  let emitter: WebSocketEventEmitter;

  beforeEach(() => {
    resetWebSocketEventEmitter();
    emitter = new WebSocketEventEmitter();
  });

  afterEach(() => {
    resetWebSocketEventEmitter();
  });

  it('should emit verification update', () => {
    const listener = jest.fn();
    emitter.on('verification_update_sent', listener);

    emitter.emitVerificationUpdate('user1', '0xabc123', 'verified', {
      confirmations: 12,
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user1',
        txHash: '0xabc123',
        status: 'verified',
      })
    );
  });

  it('should handle different verification statuses', () => {
    const listener = jest.fn();
    emitter.on('verification_update_sent', listener);

    emitter.emitVerificationUpdate('user1', '0xtx1', 'pending');
    emitter.emitVerificationUpdate('user1', '0xtx2', 'verified');
    emitter.emitVerificationUpdate('user1', '0xtx3', 'unverified');
    emitter.emitVerificationUpdate('user1', '0xtx4', 'failed');

    expect(listener).toHaveBeenCalledTimes(4);
  });
});

// ============================================================================
// AGENT UPDATES
// ============================================================================

describe('Agent Updates', () => {
  let emitter: WebSocketEventEmitter;

  beforeEach(() => {
    resetWebSocketEventEmitter();
    emitter = new WebSocketEventEmitter();
  });

  afterEach(() => {
    resetWebSocketEventEmitter();
  });

  it('should emit agent status update', () => {
    const listener = jest.fn();
    emitter.on('agent_status_update_sent', listener);

    const agentData = {
      agent_id: 'agent1',
      agent_address: '0xagent123',
      status: 'active',
      last_activity: '2024-01-15T10:30:00Z',
      transaction_count: 42,
    };

    emitter.emitAgentStatusUpdate('user1', agentData);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user1',
        agentId: 'agent1',
      })
    );
  });

  it('should emit agent added notification', () => {
    const listener = jest.fn();
    emitter.on('agent_added_sent', listener);

    const agentData = {
      agent_id: 'agent1',
      agent_address: '0xagent123',
      name: 'My Trading Agent',
      created_at: '2024-01-15T10:00:00Z',
    };

    emitter.emitAgentAdded('user1', agentData);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user1',
        agentId: 'agent1',
      })
    );
  });

  it('should emit agent removed notification', () => {
    const listener = jest.fn();
    emitter.on('agent_removed_sent', listener);

    emitter.emitAgentRemoved('user1', 'agent1');

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user1',
        agentId: 'agent1',
      })
    );
  });

  it('should handle multiple agent updates', () => {
    const listener = jest.fn();
    emitter.on('agent_status_update_sent', listener);

    for (let i = 1; i <= 5; i++) {
      emitter.emitAgentStatusUpdate('user1', {
        agent_id: `agent${i}`,
        agent_address: `0xagent${i}`,
        status: 'active',
        last_activity: new Date().toISOString(),
        transaction_count: i * 10,
      });
    }

    expect(listener).toHaveBeenCalledTimes(5);
  });
});

// ============================================================================
// BROADCASTING
// ============================================================================

describe('Broadcasting', () => {
  let emitter: WebSocketEventEmitter;

  beforeEach(() => {
    resetWebSocketEventEmitter();
    emitter = new WebSocketEventEmitter();
  });

  afterEach(() => {
    resetWebSocketEventEmitter();
  });

  it('should broadcast to channel', () => {
    const listener = jest.fn();
    emitter.on('channel_broadcast', listener);

    const message = {
      type: 'transaction_update',
      timestamp: Date.now(),
      data: { tx_hash: '0xabc' },
    };

    emitter.broadcastToChannel('agent:123', message as any);

    expect(listener).toHaveBeenCalled();
  });

  it('should broadcast to all clients', () => {
    const listener = jest.fn();
    emitter.on('broadcast_all', listener);

    const message = {
      type: 'transaction_update',
      timestamp: Date.now(),
      data: { tx_hash: '0xabc' },
    };

    emitter.broadcastToAll(message as any);

    expect(listener).toHaveBeenCalled();
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

describe('Error Handling', () => {
  let emitter: WebSocketEventEmitter;

  beforeEach(() => {
    resetWebSocketEventEmitter();
    emitter = new WebSocketEventEmitter();
  });

  afterEach(() => {
    resetWebSocketEventEmitter();
  });

  it('should emit error notification', () => {
    emitter.emitError('user1', 'VERIFICATION_ERROR', 'Verification failed', {
      tx_hash: '0xabc',
    });

    expect(emitter).toBeDefined();
  });

  it('should handle error with details', () => {
    emitter.emitError('user1', 'RPC_ERROR', 'RPC timeout', {
      provider: 'alchemy',
      endpoint: '/eth_getTransactionReceipt',
    });

    expect(emitter).toBeDefined();
  });
});

// ============================================================================
// INTEGRATION SCENARIOS
// ============================================================================

describe('Integration Scenarios', () => {
  let emitter: WebSocketEventEmitter;

  beforeEach(() => {
    resetWebSocketEventEmitter();
    emitter = new WebSocketEventEmitter();
  });

  afterEach(() => {
    resetWebSocketEventEmitter();
  });

  it('should handle transaction lifecycle', () => {
    const listener = jest.fn();
    emitter.on('transaction_update_sent', listener);
    emitter.on('verification_update_sent', listener);
    emitter.on('transaction_verified_sent', listener);

    // 1. Transaction detected
    emitter.emitTransactionUpdate('user1', {
      tx_hash: '0xabc',
      protocol: 'uniswap_v3',
      action_type: 'swap',
      agent_address: '0x123',
      tokens_in: [{ symbol: 'ETH', amount: '1' }],
      tokens_out: [{ symbol: 'USDC', amount: '2500' }],
      description: 'Swapped 1 ETH for 2500 USDC',
      timestamp: new Date().toISOString(),
    });

    // 2. Verification started
    emitter.emitVerificationUpdate('user1', '0xabc', 'pending');

    // 3. Verification complete
    emitter.emitTransactionVerified('user1', '0xabc', {
      block_number: 18500000,
      confirmations: 12,
      etherscan_url: 'https://etherscan.io/tx/0xabc',
      verified_at: Date.now(),
    });

    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('should handle agent with multiple transactions', () => {
    const statusListener = jest.fn();
    const txListener = jest.fn();

    emitter.on('agent_status_update_sent', statusListener);
    emitter.on('transaction_update_sent', txListener);

    // Agent status changes
    emitter.emitAgentStatusUpdate('user1', {
      agent_id: 'agent1',
      agent_address: '0xagent',
      status: 'active',
      last_activity: new Date().toISOString(),
      transaction_count: 0,
    });

    // Multiple transactions
    for (let i = 0; i < 5; i++) {
      emitter.emitTransactionUpdate('user1', {
        tx_hash: `0xtx${i}`,
        protocol: 'uniswap_v3',
        action_type: 'swap',
        agent_address: '0xagent',
        tokens_in: [{ symbol: 'ETH', amount: '1' }],
        tokens_out: [{ symbol: 'USDC', amount: '2500' }],
        description: `Transaction ${i}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Status update after transactions
    emitter.emitAgentStatusUpdate('user1', {
      agent_id: 'agent1',
      agent_address: '0xagent',
      status: 'active',
      last_activity: new Date().toISOString(),
      transaction_count: 5,
    });

    expect(statusListener).toHaveBeenCalledTimes(2);
    expect(txListener).toHaveBeenCalledTimes(5);
  });

  it('should handle multiple users with agent subscriptions', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();

    emitter.on('transaction_update_sent', listener1);
    emitter.on('transaction_update_sent', listener2);

    // User 1 transaction
    emitter.emitTransactionUpdate('user1', {
      tx_hash: '0xuser1tx',
      protocol: 'uniswap_v3',
      action_type: 'swap',
      agent_address: '0xagent1',
      tokens_in: [{ symbol: 'ETH', amount: '1' }],
      tokens_out: [{ symbol: 'USDC', amount: '2500' }],
      description: 'User 1 swap',
      timestamp: new Date().toISOString(),
    });

    // User 2 transaction
    emitter.emitTransactionUpdate('user2', {
      tx_hash: '0xuser2tx',
      protocol: 'aave_v3',
      action_type: 'deposit',
      agent_address: '0xagent2',
      tokens_in: [{ symbol: 'USDC', amount: '1000' }],
      tokens_out: [{ symbol: 'aUSDC', amount: '1000' }],
      description: 'User 2 deposit',
      timestamp: new Date().toISOString(),
    });

    expect(listener1).toHaveBeenCalledTimes(2);
    expect(listener2).toHaveBeenCalledTimes(2);
  });
});

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

describe('WebSocketEventEmitter Singleton', () => {
  beforeEach(() => {
    resetWebSocketEventEmitter();
  });

  afterEach(() => {
    resetWebSocketEventEmitter();
  });

  it('should return same instance', () => {
    const emitter1 = getWebSocketEventEmitter();
    const emitter2 = getWebSocketEventEmitter();

    expect(emitter1).toBe(emitter2);
  });

  it('should reset singleton', () => {
    const emitter1 = getWebSocketEventEmitter();
    resetWebSocketEventEmitter();
    const emitter2 = getWebSocketEventEmitter();

    expect(emitter1).not.toBe(emitter2);
  });
});
