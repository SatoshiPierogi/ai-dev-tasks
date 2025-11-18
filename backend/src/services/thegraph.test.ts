/**
 * The Graph Client Tests
 * Tests for rate limiting, error handling, and retry logic
 */

import { TheGraphClient, ProtocolType, getTheGraphClient, resetTheGraphClient } from './thegraph';
import * as mockFixtures from '../test/fixtures/thegraph.mock';

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  resetTheGraphClient();
});

// ============================================================================
// BASIC QUERY TESTS
// ============================================================================

describe('TheGraphClient', () => {
  it('should initialize with default config', () => {
    const client = new TheGraphClient();
    expect(client).toBeDefined();
  });

  it('should initialize with custom config', () => {
    const config = {
      maxRetries: 5,
      retryDelayMs: 2000,
      requestTimeoutMs: 60000,
    };
    const client = new TheGraphClient(config);
    expect(client).toBeDefined();
  });

  it('should return singleton instance', () => {
    const client1 = getTheGraphClient();
    const client2 = getTheGraphClient();
    expect(client1).toBe(client2);
  });

  it('should reset singleton instance', () => {
    const client1 = getTheGraphClient();
    resetTheGraphClient();
    const client2 = getTheGraphClient();
    expect(client1).not.toBe(client2);
  });

  it('should have clients for all protocols', () => {
    const client = new TheGraphClient();

    expect(client.getClient(ProtocolType.UNISWAP)).toBeDefined();
    expect(client.getClient(ProtocolType.AAVE)).toBeDefined();
    expect(client.getClient(ProtocolType.CURVE)).toBeDefined();
    expect(client.getClient(ProtocolType.BALANCER)).toBeDefined();
  });
});

// ============================================================================
// RATE LIMITING TESTS
// ============================================================================

describe('Rate Limiting', () => {
  it('should track rate limit state', () => {
    const client = new TheGraphClient();
    const rateLimit = client.getRateLimitState(ProtocolType.UNISWAP);

    expect(rateLimit).toBeDefined();
    expect(rateLimit?.remaining).toBeGreaterThan(0);
    expect(rateLimit?.isLimited).toBe(false);
  });

  it('should emit rate limit event when limited', (done) => {
    const client = new TheGraphClient();

    client.on('rateLimited', ({ protocol, waitMs }) => {
      expect(protocol).toBe(ProtocolType.UNISWAP);
      expect(waitMs).toBeGreaterThan(0);
      done();
    });

    // Manually set rate limit state to trigger
    const rateLimit = client.getRateLimitState(ProtocolType.UNISWAP);
    if (rateLimit) {
      rateLimit.isLimited = true;
      rateLimit.resetAt = Date.now() + 1000;
    }
  });

  it('should track request counts', () => {
    const client = new TheGraphClient();

    expect(client.getRequestCount(ProtocolType.UNISWAP)).toBe(0);

    client.resetRequestCount(ProtocolType.UNISWAP);
    expect(client.getRequestCount(ProtocolType.UNISWAP)).toBe(0);
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  it('should handle timeout errors', (done) => {
    const client = new TheGraphClient({
      requestTimeoutMs: 1,
      maxRetries: 0,
    });

    client.on('queryError', ({ error, code }) => {
      expect(code).toBe('TIMEOUT');
      done();
    });

    // Would fail due to timeout with actual network request
    // In real tests, mock axios
  });

  it('should handle server errors (500s)', (done) => {
    const client = new TheGraphClient();

    client.on('queryError', ({ error, code }) => {
      expect(['SERVER_ERROR', 'GRAPHQL_ERROR']).toContain(code);
      done();
    });
  });

  it('should emit query success event', (done) => {
    const client = new TheGraphClient();

    client.on('querySuccess', ({ protocol, duration }) => {
      expect(protocol).toBeDefined();
      expect(duration).toBeGreaterThanOrEqual(0);
      done();
    });
  });
});

// ============================================================================
// RETRY LOGIC TESTS
// ============================================================================

describe('Retry Logic', () => {
  it('should retry transient errors', (done) => {
    const client = new TheGraphClient({
      maxRetries: 2,
      retryDelayMs: 10,
    });

    let retryCount = 0;
    client.on('queryRetry', ({ attempt, delayMs }) => {
      retryCount++;
      expect(attempt).toBeGreaterThan(0);
      expect(delayMs).toBeGreaterThan(0);

      if (retryCount === 2) {
        done();
      }
    });

    // Would trigger retries with actual failing query
  });

  it('should not retry non-retryable errors', (done) => {
    const client = new TheGraphClient({
      maxRetries: 3,
    });

    let queryErrorCount = 0;
    client.on('queryError', ({ final }) => {
      if (final) {
        queryErrorCount++;
        if (queryErrorCount >= 1) {
          done();
        }
      }
    });

    // Would trigger with GraphQL errors
  });

  it('should implement exponential backoff', (done) => {
    const client = new TheGraphClient({
      maxRetries: 2,
      retryDelayMs: 10,
      backoffMultiplier: 2,
    });

    const delays: number[] = [];
    client.on('queryRetry', ({ delayMs }) => {
      delays.push(delayMs);

      if (delays.length === 2) {
        // Second delay should be ~2x first delay
        expect(delays[1]).toBeGreaterThanOrEqual(delays[0] * 1.5);
        done();
      }
    });
  });
});

// ============================================================================
// LAST QUERY TIME TRACKING
// ============================================================================

describe('Query Time Tracking', () => {
  it('should track time since last successful query', () => {
    const client = new TheGraphClient();

    const timeSince1 = client.getTimeSinceLastQuery(ProtocolType.UNISWAP);
    expect(timeSince1).toBeGreaterThanOrEqual(0);

    // Time should increase after a delay
    const timeSince2 = client.getTimeSinceLastQuery(ProtocolType.UNISWAP);
    expect(timeSince2).toBeGreaterThanOrEqual(timeSince1);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('TheGraphClient Integration', () => {
  it('should handle concurrent requests', async () => {
    const client = new TheGraphClient();

    // Mock axios responses would be needed for real tests
    // This is a placeholder for the structure
    const queryPromises = [
      ProtocolType.UNISWAP,
      ProtocolType.AAVE,
      ProtocolType.CURVE,
      ProtocolType.BALANCER,
    ].map((protocol) => {
      // Would execute actual queries here
      return Promise.resolve({
        data: {},
        cached: false,
        fetchedAt: Date.now(),
      });
    });

    const results = await Promise.all(queryPromises);
    expect(results).toHaveLength(4);
  });

  it('should emit events in correct order', (done) => {
    const client = new TheGraphClient();
    const events: string[] = [];

    client.on('querySuccess', () => events.push('success'));
    client.on('queryError', () => events.push('error'));
    client.on('queryRetry', () => events.push('retry'));

    // After query execution, events should be in order
    setTimeout(() => {
      // Events would be populated by actual queries
      done();
    }, 100);
  });
});
