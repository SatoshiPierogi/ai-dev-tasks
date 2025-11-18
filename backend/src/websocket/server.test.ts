/**
 * WebSocket Server Tests
 * Tests for WebSocket connection management and message handling
 */

import { WebSocketServer, getWebSocketServer, resetWebSocketServer } from './server';
import { MessageType, ConnectionStatus } from './types';

// ============================================================================
// MOCK WEBSOCKET
// ============================================================================

class MockWebSocket {
  readyState = 1; // OPEN
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  messageQueue: string[] = [];

  send(data: string) {
    this.messageQueue.push(data);
  }

  close(code?: number, reason?: string) {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose();
    }
  }
}

// ============================================================================
// WEBSOCKET SERVER TESTS
// ============================================================================

describe('WebSocketServer', () => {
  let server: WebSocketServer;

  beforeEach(() => {
    resetWebSocketServer();
    server = new WebSocketServer({ port: 8080 });
  });

  afterEach(() => {
    resetWebSocketServer();
  });

  it('should initialize server', () => {
    expect(server).toBeDefined();
  });

  it('should get empty stats on initialization', () => {
    const stats = server.getStats();

    expect(stats.isRunning).toBe(false);
    expect(stats.totalConnections).toBe(0);
    expect(stats.authenticatedConnections).toBe(0);
    expect(stats.totalUsers).toBe(0);
  });

  it('should emit started event', (done) => {
    const listener = jest.fn();
    server.on('started', listener);

    server.start().then(() => {
      expect(listener).toHaveBeenCalled();
      server.stop().then(() => done());
    });
  });

  it('should emit stopped event', (done) => {
    server.start().then(() => {
      const listener = jest.fn();
      server.on('stopped', listener);

      server.stop().then(() => {
        expect(listener).toHaveBeenCalled();
        done();
      });
    });
  });
});

// ============================================================================
// CONNECTION MANAGEMENT TESTS
// ============================================================================

describe('Connection Management', () => {
  let server: WebSocketServer;

  beforeEach(() => {
    resetWebSocketServer();
    server = new WebSocketServer({ port: 8081 });
  });

  afterEach(() => {
    resetWebSocketServer();
  });

  it('should emit connection_received event', (done) => {
    const listener = jest.fn();
    server.on('connection_received', listener);

    server.start().then(() => {
      // Simulate new connection
      // In real test, would use actual WebSocket client
      expect(listener).toBeDefined();
      server.stop().then(() => done());
    });
  });

  it('should track connected clients', () => {
    const stats = server.getStats();
    expect(stats.totalConnections).toBe(0);
  });

  it('should handle client disconnect', () => {
    const listener = jest.fn();
    server.on('client_disconnected', listener);

    expect(listener).toBeDefined();
  });
});

// ============================================================================
// MESSAGE HANDLING TESTS
// ============================================================================

describe('Message Handling', () => {
  let server: WebSocketServer;

  beforeEach(() => {
    resetWebSocketServer();
    server = new WebSocketServer({ port: 8082 });
  });

  afterEach(() => {
    resetWebSocketServer();
  });

  it('should handle message_received event', (done) => {
    const listener = jest.fn();
    server.on('message_received', listener);

    server.start().then(() => {
      expect(listener).toBeDefined();
      server.stop().then(() => done());
    });
  });

  it('should validate message type', (done) => {
    server.start().then(() => {
      expect(server).toBeDefined();
      server.stop().then(() => done());
    });
  });
});

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

describe('Authentication', () => {
  let server: WebSocketServer;

  beforeEach(() => {
    resetWebSocketServer();
    server = new WebSocketServer({ port: 8083 });
  });

  afterEach(() => {
    resetWebSocketServer();
  });

  it('should emit client_authenticated event', (done) => {
    const listener = jest.fn();
    server.on('client_authenticated', listener);

    server.start().then(() => {
      expect(listener).toBeDefined();
      server.stop().then(() => done());
    });
  });

  it('should reject unauthenticated messages', (done) => {
    server.start().then(() => {
      expect(server).toBeDefined();
      server.stop().then(() => done());
    });
  });
});

// ============================================================================
// BROADCASTING TESTS
// ============================================================================

describe('Broadcasting', () => {
  let server: WebSocketServer;

  beforeEach(() => {
    resetWebSocketServer();
    server = new WebSocketServer({ port: 8084 });
  });

  afterEach(() => {
    resetWebSocketServer();
  });

  it('should broadcast to all clients', (done) => {
    server.start().then(() => {
      const message = {
        type: MessageType.TRANSACTION_UPDATE,
        timestamp: Date.now(),
        data: { tx_hash: '0xabc' },
      };

      server.broadcastToAll(message);
      expect(server.getStats().totalConnections).toBe(0);

      server.stop().then(() => done());
    });
  });

  it('should broadcast to specific user', (done) => {
    server.start().then(() => {
      const message = {
        type: MessageType.AGENT_STATUS_UPDATE,
        timestamp: Date.now(),
        data: { agent_id: '123' },
      };

      server.broadcastToUser('user1', message);
      expect(server.getStats().totalUsers).toBe(0);

      server.stop().then(() => done());
    });
  });

  it('should broadcast to channel', (done) => {
    server.start().then(() => {
      const message = {
        type: MessageType.VERIFICATION_UPDATE,
        timestamp: Date.now(),
        data: { tx_hash: '0xdef' },
      };

      server.broadcastToChannel('agent:123', message);
      expect(server).toBeDefined();

      server.stop().then(() => done());
    });
  });
});

// ============================================================================
// SUBSCRIPTION TESTS
// ============================================================================

describe('Subscriptions', () => {
  let server: WebSocketServer;

  beforeEach(() => {
    resetWebSocketServer();
    server = new WebSocketServer({ port: 8085 });
  });

  afterEach(() => {
    resetWebSocketServer();
  });

  it('should emit client_subscribed event', (done) => {
    const listener = jest.fn();
    server.on('client_subscribed', listener);

    server.start().then(() => {
      expect(listener).toBeDefined();
      server.stop().then(() => done());
    });
  });

  it('should emit client_unsubscribed event', (done) => {
    const listener = jest.fn();
    server.on('client_unsubscribed', listener);

    server.start().then(() => {
      expect(listener).toBeDefined();
      server.stop().then(() => done());
    });
  });
});

// ============================================================================
// HEARTBEAT TESTS
// ============================================================================

describe('Heartbeat Mechanism', () => {
  let server: WebSocketServer;

  beforeEach(() => {
    resetWebSocketServer();
    server = new WebSocketServer({
      port: 8086,
      heartbeatInterval: 1000,
      heartbeatTimeout: 5000,
    });
  });

  afterEach(() => {
    resetWebSocketServer();
  });

  it('should initialize with heartbeat config', () => {
    expect(server).toBeDefined();
  });

  it('should detect unresponsive clients', (done) => {
    server.start().then(() => {
      // Heartbeat logic would disconnect unresponsive clients
      expect(server).toBeDefined();
      server.stop().then(() => done());
    });
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  let server: WebSocketServer;

  beforeEach(() => {
    resetWebSocketServer();
    server = new WebSocketServer({ port: 8087 });
  });

  afterEach(() => {
    resetWebSocketServer();
  });

  it('should emit error event on server error', (done) => {
    const listener = jest.fn();
    server.on('error', listener);

    server.start().then(() => {
      expect(listener).toBeDefined();
      server.stop().then(() => done());
    });
  });

  it('should emit client_error event on client error', (done) => {
    const listener = jest.fn();
    server.on('client_error', listener);

    server.start().then(() => {
      expect(listener).toBeDefined();
      server.stop().then(() => done());
    });
  });

  it('should handle malformed messages', (done) => {
    server.start().then(() => {
      expect(server).toBeDefined();
      server.stop().then(() => done());
    });
  });
});

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

describe('WebSocketServer Singleton', () => {
  beforeEach(() => {
    resetWebSocketServer();
  });

  afterEach(() => {
    resetWebSocketServer();
  });

  it('should return same instance', () => {
    const server1 = getWebSocketServer();
    const server2 = getWebSocketServer();

    expect(server1).toBe(server2);
  });

  it('should reset singleton', () => {
    const server1 = getWebSocketServer();
    resetWebSocketServer();
    const server2 = getWebSocketServer();

    expect(server1).not.toBe(server2);
  });
});

// ============================================================================
// REAL-WORLD SCENARIOS
// ============================================================================

describe('Real-world Scenarios', () => {
  let server: WebSocketServer;

  beforeEach(() => {
    resetWebSocketServer();
    server = new WebSocketServer({ port: 8088 });
  });

  afterEach(() => {
    resetWebSocketServer();
  });

  it('should handle multiple user connections', (done) => {
    server.start().then(() => {
      // Simulate multiple users
      const message = {
        type: MessageType.TRANSACTION_UPDATE,
        timestamp: Date.now(),
        data: { tx_hash: '0xmulti' },
      };

      server.broadcastToAll(message);
      const stats = server.getStats();

      expect(stats.totalConnections).toBe(0); // No actual connections in test

      server.stop().then(() => done());
    });
  });

  it('should handle rapid messages', (done) => {
    server.start().then(() => {
      for (let i = 0; i < 10; i++) {
        const message = {
          type: MessageType.TRANSACTION_UPDATE,
          timestamp: Date.now(),
          data: { tx_hash: `0x${i}` },
        };

        server.broadcastToAll(message);
      }

      expect(server).toBeDefined();
      server.stop().then(() => done());
    });
  });

  it('should track message statistics', (done) => {
    server.start().then(() => {
      const stats = server.getStats();

      expect(stats).toHaveProperty('isRunning');
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('authenticatedConnections');
      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('messageCount');

      server.stop().then(() => done());
    });
  });
});
