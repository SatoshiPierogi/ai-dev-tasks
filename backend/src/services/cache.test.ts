/**
 * Cache Service Tests
 * Tests for in-memory caching, warming, and invalidation
 */

import { CacheService, getAgentCache, getTransactionCache, resetAgentCache, resetTransactionCache } from './cache';

// ============================================================================
// CACHE SERVICE TESTS
// ============================================================================

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService({
      maxSize: 100,
      defaultTTL: 1000,
      cleanupInterval: 500,
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should initialize cache', () => {
    expect(cache).toBeDefined();
  });

  it('should set and get values', () => {
    cache.set('key1', { data: 'value1' });
    const value = cache.get('key1');

    expect(value).toEqual({ data: 'value1' });
  });

  it('should return null for missing keys', () => {
    const value = cache.get('nonexistent');
    expect(value).toBeNull();
  });

  it('should track cache hits', () => {
    const listener = jest.fn();
    cache.on('cache_hit', listener);

    cache.set('key1', { data: 'value1' });
    cache.get('key1');
    cache.get('key1');

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('should track cache misses', () => {
    const listener = jest.fn();
    cache.on('cache_miss', listener);

    cache.get('nonexistent');
    cache.get('another');

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('should delete entries', () => {
    cache.set('key1', { data: 'value1' });
    expect(cache.has('key1')).toBe(true);

    cache.delete('key1');
    expect(cache.has('key1')).toBe(false);
  });

  it('should expire entries after TTL', (done) => {
    cache.set('key1', { data: 'value1' }, 100);

    expect(cache.get('key1')).not.toBeNull();

    setTimeout(() => {
      expect(cache.get('key1')).toBeNull();
      done();
    }, 150);
  });

  it('should check if key exists', () => {
    cache.set('key1', { data: 'value1' });

    expect(cache.has('key1')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('should get all keys', () => {
    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });
    cache.set('key3', { data: 'value3' });

    const keys = cache.keys();

    expect(keys).toHaveLength(3);
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
    expect(keys).toContain('key3');
  });

  it('should get all entries', () => {
    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });

    const entries = cache.entries();

    expect(entries).toHaveLength(2);
    expect(entries[0][0]).toBe('key1');
    expect(entries[0][1]).toEqual({ data: 'value1' });
  });

  it('should clear all entries', () => {
    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });

    cache.clear();

    expect(cache.keys()).toHaveLength(0);
  });

  it('should clear by pattern', () => {
    cache.set('user:1', { data: 'user1' });
    cache.set('user:2', { data: 'user2' });
    cache.set('agent:1', { data: 'agent1' });

    const cleared = cache.clearPattern('user:.*');

    expect(cleared).toBe(2);
    expect(cache.has('user:1')).toBe(false);
    expect(cache.has('agent:1')).toBe(true);
  });

  it('should warm cache with data', () => {
    const listener = jest.fn();
    cache.on('cache_warmed', listener);

    const data = [
      ['key1', { data: 'value1' }],
      ['key2', { data: 'value2' }],
      ['key3', { data: 'value3' }],
    ] as const;

    const count = cache.warm(data);

    expect(count).toBe(3);
    expect(cache.get('key1')).toEqual({ data: 'value1' });
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ count: 3 }));
  });

  it('should get cache statistics', () => {
    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });

    cache.get('key1');
    cache.get('key1');
    cache.get('nonexistent');

    const stats = cache.getStats();

    expect(stats.totalEntries).toBe(2);
    expect(stats.totalHits).toBe(2);
    expect(stats.totalMisses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.667, 2);
  });

  it('should calculate hit rate correctly', () => {
    cache.set('key1', { data: 'value1' });

    cache.get('key1'); // hit
    cache.get('key1'); // hit
    cache.get('key1'); // hit
    cache.get('nonexistent'); // miss

    const stats = cache.getStats();

    expect(stats.hitRate).toBe(0.75); // 3 hits, 1 miss
  });

  it('should handle custom TTL', (done) => {
    cache.set('key1', { data: 'value1' }, 50); // 50ms TTL
    cache.set('key2', { data: 'value2' }, 200); // 200ms TTL

    expect(cache.get('key1')).not.toBeNull();
    expect(cache.get('key2')).not.toBeNull();

    setTimeout(() => {
      expect(cache.get('key1')).toBeNull(); // Expired
      expect(cache.get('key2')).not.toBeNull(); // Still valid

      done();
    }, 100);
  });

  it('should evict oldest when max size exceeded', () => {
    const listener = jest.fn();
    cache.on('cache_evicted', listener);

    const smallCache = new CacheService({ maxSize: 3, defaultTTL: 10000 });

    smallCache.set('key1', { data: 'value1' });
    smallCache.set('key2', { data: 'value2' });
    smallCache.set('key3', { data: 'value3' });

    // This should trigger eviction of key1
    smallCache.set('key4', { data: 'value4' });

    expect(smallCache.keys()).toHaveLength(3);
    expect(smallCache.has('key1')).toBe(false);

    smallCache.destroy();
  });

  it('should track memory usage', () => {
    cache.set('key1', { data: 'value1', size: 100 });
    cache.set('key2', { data: 'value2', size: 200 });

    const stats = cache.getStats();

    expect(stats.memoryUsed).toBeGreaterThan(0);
    expect(stats.avgEntrySize).toBeGreaterThan(0);
  });

  it('should emit cache_set event', () => {
    const listener = jest.fn();
    cache.on('cache_set', listener);

    cache.set('key1', { data: 'value1' }, 5000);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'key1',
        ttl: 5000,
      })
    );
  });

  it('should emit cache_delete event', () => {
    const listener = jest.fn();
    cache.on('cache_delete', listener);

    cache.set('key1', { data: 'value1' });
    cache.delete('key1');

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ key: 'key1' }));
  });

  it('should emit cache_cleared event', () => {
    const listener = jest.fn();
    cache.on('cache_cleared', listener);

    cache.set('key1', { data: 'value1' });
    cache.clear();

    expect(listener).toHaveBeenCalled();
  });

  it('should perform cleanup of expired entries', (done) => {
    const listener = jest.fn();
    cache.on('cache_cleanup', listener);

    cache.set('key1', { data: 'value1' }, 50);
    cache.set('key2', { data: 'value2' }, 50);
    cache.set('key3', { data: 'value3' }, 5000);

    setTimeout(() => {
      // key1 and key2 should be expired, cleanup should remove them
      expect(listener).toHaveBeenCalled();

      done();
    }, 200);
  });
});

// ============================================================================
// CACHE HIT/MISS SCENARIOS
// ============================================================================

describe('Cache Hit/Miss Scenarios', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService({ maxSize: 100, defaultTTL: 10000 });
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should track multiple hits on same key', () => {
    const listener = jest.fn();
    cache.on('cache_hit', listener);

    cache.set('key1', { data: 'value1' });

    for (let i = 0; i < 10; i++) {
      cache.get('key1');
    }

    expect(listener).toHaveBeenCalledTimes(10);
  });

  it('should handle sequential misses', () => {
    const listener = jest.fn();
    cache.on('cache_miss', listener);

    for (let i = 0; i < 5; i++) {
      cache.get(`nonexistent${i}`);
    }

    expect(listener).toHaveBeenCalledTimes(5);
  });

  it('should handle mixed hits and misses', () => {
    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });

    cache.get('key1'); // hit
    cache.get('key3'); // miss
    cache.get('key2'); // hit
    cache.get('key4'); // miss

    const stats = cache.getStats();

    expect(stats.totalHits).toBe(2);
    expect(stats.totalMisses).toBe(2);
    expect(stats.hitRate).toBe(0.5);
  });
});

// ============================================================================
// SINGLETON TESTS
// ============================================================================

describe('Cache Service Singletons', () => {
  beforeEach(() => {
    resetAgentCache();
    resetTransactionCache();
  });

  afterEach(() => {
    resetAgentCache();
    resetTransactionCache();
  });

  it('should return same agent cache instance', () => {
    const cache1 = getAgentCache();
    const cache2 = getAgentCache();

    expect(cache1).toBe(cache2);
  });

  it('should return same transaction cache instance', () => {
    const cache1 = getTransactionCache();
    const cache2 = getTransactionCache();

    expect(cache1).toBe(cache2);
  });

  it('should reset agent cache', () => {
    const cache1 = getAgentCache();
    cache1.set('key1', { data: 'value1' });

    resetAgentCache();

    const cache2 = getAgentCache();
    expect(cache1).not.toBe(cache2);
    expect(cache2.has('key1')).toBe(false);
  });

  it('should reset transaction cache', () => {
    const cache1 = getTransactionCache();
    cache1.set('key1', { data: 'value1' });

    resetTransactionCache();

    const cache2 = getTransactionCache();
    expect(cache1).not.toBe(cache2);
    expect(cache2.has('key1')).toBe(false);
  });
});

// ============================================================================
// REAL-WORLD SCENARIOS
// ============================================================================

describe('Real-world Cache Scenarios', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService({ maxSize: 1000, defaultTTL: 3600000 });
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should cache agent data efficiently', () => {
    const agents = [];
    for (let i = 1; i <= 10; i++) {
      const agent = {
        id: `agent${i}`,
        address: `0xagent${i}`,
        status: 'active',
        transactionCount: i * 10,
      };

      cache.set(`agent:${i}`, agent);
      agents.push(agent);
    }

    expect(cache.keys()).toHaveLength(10);

    for (let i = 1; i <= 10; i++) {
      const cached = cache.get(`agent:${i}`);
      expect(cached).toBeDefined();
      expect(cached.id).toBe(`agent${i}`);
    }

    const stats = cache.getStats();
    expect(stats.totalEntries).toBe(10);
    expect(stats.totalHits).toBe(10);
  });

  it('should cache transaction data with optimal TTL', () => {
    const transactions = [];
    for (let i = 1; i <= 100; i++) {
      const tx = {
        hash: `0xtx${i}`,
        protocol: 'uniswap',
        status: 'verified',
      };

      // Recent transactions: 30 min TTL
      const ttl = i <= 50 ? 1800000 : 900000;
      cache.set(`tx:${i}`, tx, ttl);
      transactions.push(tx);
    }

    expect(cache.keys()).toHaveLength(100);

    const stats = cache.getStats();
    expect(stats.totalEntries).toBe(100);
  });

  it('should handle cache warming for multiple agents', () => {
    const agentData = [];
    for (let i = 1; i <= 50; i++) {
      agentData.push([
        `agent:${i}`,
        {
          id: `agent${i}`,
          status: 'active',
        },
      ]);
    }

    const warmed = cache.warm(agentData as any);

    expect(warmed).toBe(50);
    expect(cache.keys()).toHaveLength(50);

    const stats = cache.getStats();
    expect(stats.totalEntries).toBe(50);
  });

  it('should handle cache invalidation patterns', () => {
    // Add cache entries for multiple users
    for (let userId = 1; userId <= 5; userId++) {
      for (let agentId = 1; agentId <= 3; agentId++) {
        cache.set(`user:${userId}:agent:${agentId}`, {
          agentId,
          userId,
        });
      }
    }

    expect(cache.keys()).toHaveLength(15);

    // Invalidate all agents for user 2
    const cleared = cache.clearPattern(`user:2:.*`);

    expect(cleared).toBe(3);
    expect(cache.keys()).toHaveLength(12);
  });

  it('should maintain high hit rate with working set', () => {
    // Pre-populate cache
    for (let i = 1; i <= 20; i++) {
      cache.set(`key${i}`, { data: `value${i}` });
    }

    // Access working set frequently
    for (let round = 0; round < 5; round++) {
      for (let i = 1; i <= 20; i++) {
        cache.get(`key${i}`);
      }
    }

    // Add some misses
    for (let i = 0; i < 10; i++) {
      cache.get(`nonexistent${i}`);
    }

    const stats = cache.getStats();
    expect(stats.hitRate).toBeGreaterThan(0.9); // 90%+ hit rate
  });
});
