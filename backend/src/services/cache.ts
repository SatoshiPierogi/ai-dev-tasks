/**
 * Cache Service
 * In-memory caching with TTL, warming, and invalidation strategies
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

export interface CacheEntry<T> {
  id: string;
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  hits: number;
  size: number;
}

export interface CacheConfig {
  maxSize?: number; // Max entries
  defaultTTL?: number; // Default TTL in ms (default 3600000 = 1 hour)
  maxMemory?: number; // Max memory in bytes (optional)
  cleanupInterval?: number; // Cleanup interval in ms (default 60000)
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsed: number;
  avgEntrySize: number;
  oldestEntry?: number;
  newestEntry?: number;
}

// ============================================================================
// CACHE SERVICE
// ============================================================================

export class CacheService<T = any> extends EventEmitter {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private ttlTimers: Map<string, NodeJS.Timeout> = new Map();
  private config: Required<CacheConfig>;
  private stats = {
    hits: 0,
    misses: 0,
  };
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: CacheConfig = {}) {
    super();
    this.config = {
      maxSize: config.maxSize || 10000,
      defaultTTL: config.defaultTTL || 3600000, // 1 hour
      maxMemory: config.maxMemory || 0, // 0 = unlimited
      cleanupInterval: config.cleanupInterval || 60000,
    };

    this.startCleanup();
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.emit('cache_miss', { key, timestamp: Date.now() });
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Record hit
    entry.hits++;
    this.stats.hits++;

    this.emit('cache_hit', { key, hits: entry.hits, timestamp: Date.now() });

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): string {
    // Check size limits
    if (this.cache.size >= this.config.maxSize) {
      // Evict least recently used (simplest: oldest)
      this.evictOldest();
    }

    const id = uuidv4();
    const expiresAt = Date.now() + (ttl || this.config.defaultTTL);
    const size = JSON.stringify(value).length;

    const entry: CacheEntry<T> = {
      id,
      key,
      value,
      createdAt: Date.now(),
      expiresAt,
      hits: 0,
      size,
    };

    // Remove old timer if exists
    if (this.ttlTimers.has(key)) {
      clearTimeout(this.ttlTimers.get(key)!);
    }

    // Add to cache
    this.cache.set(key, entry);

    // Set TTL timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl || this.config.defaultTTL);

    this.ttlTimers.set(key, timer);

    this.emit('cache_set', {
      key,
      size,
      ttl: ttl || this.config.defaultTTL,
      timestamp: Date.now(),
    });

    return id;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const timer = this.ttlTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.ttlTimers.delete(key);
    }

    const deleted = this.cache.delete(key);

    if (deleted) {
      this.emit('cache_delete', { key, timestamp: Date.now() });
    }

    return deleted;
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all entries
   */
  entries(): Array<[string, T]> {
    const result: Array<[string, T]> = [];

    for (const [key, entry] of this.cache) {
      if (Date.now() <= entry.expiresAt) {
        result.push([key, entry.value]);
      }
    }

    return result;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    for (const timer of this.ttlTimers.values()) {
      clearTimeout(timer);
    }

    this.ttlTimers.clear();
    this.cache.clear();

    this.emit('cache_cleared', { timestamp: Date.now() });
  }

  /**
   * Clear by pattern
   */
  clearPattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let cleared = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        if (this.delete(key)) {
          cleared++;
        }
      }
    }

    this.emit('cache_pattern_cleared', { pattern: pattern.toString(), cleared, timestamp: Date.now() });

    return cleared;
  }

  /**
   * Warm cache with initial data
   */
  warm(data: Array<[string, T, number?]>): number {
    let count = 0;

    for (const [key, value, ttl] of data) {
      this.set(key, value, ttl);
      count++;
    }

    this.emit('cache_warmed', { count, timestamp: Date.now() });

    return count;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let totalMemory = 0;
    let oldest = Infinity;
    let newest = 0;

    for (const entry of this.cache.values()) {
      totalMemory += entry.size;
      oldest = Math.min(oldest, entry.createdAt);
      newest = Math.max(newest, entry.createdAt);
    }

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate,
      memoryUsed: totalMemory,
      avgEntrySize: this.cache.size > 0 ? totalMemory / this.cache.size : 0,
      oldestEntry: oldest === Infinity ? undefined : oldest,
      newestEntry: newest > 0 ? newest : undefined,
    };
  }

  /**
   * Evict least recently used (oldest)
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.emit('cache_evicted', { key: oldestKey, timestamp: Date.now() });
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let expired = 0;

      for (const [key, entry] of this.cache) {
        if (now > entry.expiresAt) {
          this.delete(key);
          expired++;
        }
      }

      if (expired > 0) {
        this.emit('cache_cleanup', { expired, timestamp: Date.now() });
      }
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Destroy cache
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// SINGLETON INSTANCES (typed cache services)
// ============================================================================

let agentCacheInstance: CacheService<any> | null = null;
let transactionCacheInstance: CacheService<any> | null = null;

export function getAgentCache(): CacheService<any> {
  if (!agentCacheInstance) {
    agentCacheInstance = new CacheService({
      maxSize: 1000, // Max 1000 agents
      defaultTTL: 3600000, // 1 hour
    });
  }
  return agentCacheInstance;
}

export function getTransactionCache(): CacheService<any> {
  if (!transactionCacheInstance) {
    transactionCacheInstance = new CacheService({
      maxSize: 50000, // Max 50k transactions
      defaultTTL: 1800000, // 30 minutes
    });
  }
  return transactionCacheInstance;
}

export function resetAgentCache(): void {
  if (agentCacheInstance) {
    agentCacheInstance.destroy();
  }
  agentCacheInstance = null;
}

export function resetTransactionCache(): void {
  if (transactionCacheInstance) {
    transactionCacheInstance.destroy();
  }
  transactionCacheInstance = null;
}
