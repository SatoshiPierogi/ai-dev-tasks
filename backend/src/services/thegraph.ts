/**
 * The Graph Integration Service
 * Manages queries to The Graph subgraphs for multiple protocols
 * Handles rate limiting, error recovery, and data normalization
 */

import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface TheGraphConfig {
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
  rateLimitDelayMs: number;
  requestTimeoutMs: number;
}

export interface RateLimitState {
  remaining: number;
  resetAt: number;
  isLimited: boolean;
}

export interface QueryResult<T> {
  data: T;
  cached: boolean;
  fetchedAt: number;
  indexingLag?: number;
}

export interface TheGraphError {
  message: string;
  code: string;
  statusCode?: number;
  retryable: boolean;
}

export enum ProtocolType {
  UNISWAP = 'uniswap',
  AAVE = 'aave',
  CURVE = 'curve',
  BALANCER = 'balancer',
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: TheGraphConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  backoffMultiplier: 2,
  rateLimitDelayMs: 60000, // 1 minute
  requestTimeoutMs: 30000, // 30 seconds
};

const SUBGRAPH_ENDPOINTS: Record<ProtocolType, string> = {
  [ProtocolType.UNISWAP]:
    process.env.GRAPH_UNISWAP_ENDPOINT ||
    'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
  [ProtocolType.AAVE]:
    process.env.GRAPH_AAVE_ENDPOINT ||
    'https://api.thegraph.com/subgraphs/name/aave/protocol-v3',
  [ProtocolType.CURVE]:
    process.env.GRAPH_CURVE_ENDPOINT ||
    'https://api.thegraph.com/subgraphs/name/curve-community/curve',
  [ProtocolType.BALANCER]:
    process.env.GRAPH_BALANCER_ENDPOINT ||
    'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
};

// ============================================================================
// THE GRAPH CLIENT
// ============================================================================

export class TheGraphClient extends EventEmitter {
  private config: TheGraphConfig;
  private clients: Map<ProtocolType, AxiosInstance>;
  private rateLimitStates: Map<ProtocolType, RateLimitState>;
  private requestQueues: Map<ProtocolType, Array<() => Promise<any>>>;
  private lastSuccessfulQuery: Map<ProtocolType, number>;
  private requestCounter: Map<ProtocolType, number>;

  constructor(config: Partial<TheGraphConfig> = {}) {
    super();

    this.config = { ...DEFAULT_CONFIG, ...config };
    this.clients = new Map();
    this.rateLimitStates = new Map();
    this.requestQueues = new Map();
    this.lastSuccessfulQuery = new Map();
    this.requestCounter = new Map();

    this.initializeClients();
  }

  /**
   * Initialize axios clients for each protocol
   */
  private initializeClients(): void {
    for (const protocol of Object.values(ProtocolType)) {
      const endpoint = SUBGRAPH_ENDPOINTS[protocol];

      const client = axios.create({
        baseURL: endpoint,
        timeout: this.config.requestTimeoutMs,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.clients.set(protocol, client);
      this.rateLimitStates.set(protocol, {
        remaining: 1000,
        resetAt: 0,
        isLimited: false,
      });
      this.requestQueues.set(protocol, []);
      this.lastSuccessfulQuery.set(protocol, 0);
      this.requestCounter.set(protocol, 0);
    }
  }

  /**
   * Execute a GraphQL query against a protocol's subgraph
   */
  async query<T>(
    protocol: ProtocolType,
    query: string,
    variables?: Record<string, any>,
    retryCount: number = 0
  ): Promise<QueryResult<T>> {
    try {
      // Check if rate limited
      const rateLimitState = this.rateLimitStates.get(protocol);
      if (rateLimitState?.isLimited) {
        const waitTime = Math.max(0, rateLimitState.resetAt - Date.now());
        if (waitTime > 0) {
          this.emit('rateLimited', { protocol, waitMs: waitTime });
          await this.delay(waitTime);
        }
      }

      const client = this.clients.get(protocol);
      if (!client) {
        throw new Error(`No client configured for protocol: ${protocol}`);
      }

      const startTime = Date.now();
      const counter = (this.requestCounter.get(protocol) || 0) + 1;
      this.requestCounter.set(protocol, counter);

      const response = await client.post('', {
        query,
        variables: variables || {},
      });

      // Check for GraphQL errors
      if (response.data.errors) {
        const errorMsg = response.data.errors[0]?.message || 'Unknown GraphQL error';
        throw new Error(`GraphQL Error: ${errorMsg}`);
      }

      // Update rate limit state
      this.updateRateLimitState(protocol, response.headers);
      this.lastSuccessfulQuery.set(protocol, Date.now());

      const fetchedAt = Date.now();
      const indexingLag = this.calculateIndexingLag(response.data);

      this.emit('querySuccess', {
        protocol,
        duration: fetchedAt - startTime,
        indexingLag,
      });

      return {
        data: response.data.data as T,
        cached: false,
        fetchedAt,
        indexingLag,
      };
    } catch (error) {
      return this.handleQueryError(protocol, error, query, variables, retryCount);
    }
  }

  /**
   * Handle query errors with retry logic
   */
  private async handleQueryError<T>(
    protocol: ProtocolType,
    error: any,
    query: string,
    variables: Record<string, any> | undefined,
    retryCount: number
  ): Promise<QueryResult<T>> {
    const graphError = this.parseError(error);

    // Check if error is retryable
    if (graphError.retryable && retryCount < this.config.maxRetries) {
      const delay = this.config.retryDelayMs * Math.pow(this.config.backoffMultiplier, retryCount);

      this.emit('queryRetry', {
        protocol,
        attempt: retryCount + 1,
        delayMs: delay,
        error: graphError.message,
      });

      await this.delay(delay);
      return this.query(protocol, query, variables, retryCount + 1);
    }

    // Emit error event
    this.emit('queryError', {
      protocol,
      error: graphError.message,
      code: graphError.code,
      final: true,
    });

    throw graphError;
  }

  /**
   * Parse error and determine if it's retryable
   */
  private parseError(error: any): TheGraphError {
    if (error.response?.status === 429) {
      return {
        message: 'Rate limited by The Graph',
        code: 'RATE_LIMITED',
        statusCode: 429,
        retryable: true,
      };
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        message: 'Request timeout',
        code: 'TIMEOUT',
        retryable: true,
      };
    }

    if (error.response?.status >= 500) {
      return {
        message: `Server error: ${error.response.status}`,
        code: 'SERVER_ERROR',
        statusCode: error.response.status,
        retryable: true,
      };
    }

    if (error.message?.includes('GraphQL Error')) {
      // GraphQL errors are typically not retryable (bad query, not found, etc.)
      return {
        message: error.message,
        code: 'GRAPHQL_ERROR',
        retryable: false,
      };
    }

    return {
      message: error.message || 'Unknown error',
      code: 'UNKNOWN_ERROR',
      retryable: false,
    };
  }

  /**
   * Update rate limit state from response headers
   */
  private updateRateLimitState(
    protocol: ProtocolType,
    headers: Record<string, any>
  ): void {
    const rateLimit = this.rateLimitStates.get(protocol);
    if (!rateLimit) return;

    // Parse rate limit headers if available
    const remaining = parseInt(headers['x-rate-limit-remaining'] || '1000', 10);
    const resetAt = parseInt(headers['x-rate-limit-reset'] || Date.now().toString(), 10);

    rateLimit.remaining = remaining;
    rateLimit.resetAt = resetAt * 1000; // Convert to milliseconds
    rateLimit.isLimited = remaining < 10; // Consider limited if < 10 requests remaining
  }

  /**
   * Calculate indexing lag based on block data
   */
  private calculateIndexingLag(data: any): number | undefined {
    try {
      // Extract block number from response metadata
      const meta = data._meta;
      if (!meta || !meta.block) {
        return undefined;
      }

      const indexedBlockNumber = meta.block.number;
      // In production, fetch current block number from RPC
      // For now, assume current block is approximately indexed
      return 0;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get rate limit state for a protocol
   */
  getRateLimitState(protocol: ProtocolType): RateLimitState | undefined {
    return this.rateLimitStates.get(protocol);
  }

  /**
   * Get time since last successful query
   */
  getTimeSinceLastQuery(protocol: ProtocolType): number {
    const lastQuery = this.lastSuccessfulQuery.get(protocol) || 0;
    return Date.now() - lastQuery;
  }

  /**
   * Get request counter for a protocol
   */
  getRequestCount(protocol: ProtocolType): number {
    return this.requestCounter.get(protocol) || 0;
  }

  /**
   * Reset request counter
   */
  resetRequestCount(protocol: ProtocolType): void {
    this.requestCounter.set(protocol, 0);
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get client for a protocol
   */
  getClient(protocol: ProtocolType): AxiosInstance | undefined {
    return this.clients.get(protocol);
  }
}

/**
 * Singleton instance
 */
let instance: TheGraphClient | null = null;

export function getTheGraphClient(config?: Partial<TheGraphConfig>): TheGraphClient {
  if (!instance) {
    instance = new TheGraphClient(config);
  }
  return instance;
}

export function resetTheGraphClient(): void {
  instance = null;
}
