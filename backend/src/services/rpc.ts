/**
 * RPC Provider Configuration
 * Manages blockchain RPC providers with fallback and rate limiting
 */

import { ethers } from 'ethers';

// ============================================================================
// TYPES
// ============================================================================

export interface RpcProviderConfig {
  name: string;
  url: string;
  priority: number; // Lower number = higher priority
  timeout?: number; // ms
  maxRequests?: number; // per minute
}

export interface ProviderStats {
  name: string;
  url: string;
  isHealthy: boolean;
  lastCheckTime: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
}

export interface RpcRequestOptions {
  timeout?: number;
  allowFallback?: boolean;
  retryCount?: number;
}

// ============================================================================
// RPC PROVIDER MANAGER
// ============================================================================

export class RpcProviderManager {
  private providers: Map<string, ethers.Provider> = new Map();
  private configs: Map<string, RpcProviderConfig> = new Map();
  private stats: Map<string, ProviderStats> = new Map();
  private currentProvider: string | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(configs: RpcProviderConfig[]) {
    // Sort by priority
    const sorted = [...configs].sort((a, b) => a.priority - b.priority);

    for (const config of sorted) {
      this.registerProvider(config);
    }

    // Start health checks
    this.startHealthCheck();
  }

  /**
   * Register an RPC provider
   */
  registerProvider(config: RpcProviderConfig): void {
    try {
      const provider = new ethers.JsonRpcProvider(config.url, undefined, {
        staticNetwork: true,
      });

      this.configs.set(config.name, config);
      this.providers.set(config.name, provider);

      this.stats.set(config.name, {
        name: config.name,
        url: config.url,
        isHealthy: true,
        lastCheckTime: Date.now(),
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
      });

      // Set as current if this is the first provider
      if (!this.currentProvider) {
        this.currentProvider = config.name;
      }
    } catch (error) {
      console.error(`Failed to register RPC provider ${config.name}:`, error);
    }
  }

  /**
   * Get the current active provider
   */
  getProvider(): ethers.Provider {
    if (!this.currentProvider) {
      throw new Error('No RPC providers configured');
    }

    const provider = this.providers.get(this.currentProvider);
    if (!provider) {
      throw new Error(`Provider not found: ${this.currentProvider}`);
    }

    return provider;
  }

  /**
   * Get a provider by name
   */
  getProviderByName(name: string): ethers.Provider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider not found: ${name}`);
    }
    return provider;
  }

  /**
   * Get all available providers sorted by health
   */
  getHealthyProviders(): string[] {
    return Array.from(this.stats.entries())
      .filter(([_, stats]) => stats.isHealthy)
      .sort((a, b) => {
        const configA = this.configs.get(a[0])!;
        const configB = this.configs.get(b[0])!;
        return configA.priority - configB.priority;
      })
      .map(([name]) => name);
  }

  /**
   * Switch to fallback provider
   */
  switchToFallback(): boolean {
    const healthyProviders = this.getHealthyProviders();
    const currentIndex = healthyProviders.indexOf(this.currentProvider || '');

    if (currentIndex === -1 || currentIndex === healthyProviders.length - 1) {
      return false; // No fallback available
    }

    this.currentProvider = healthyProviders[currentIndex + 1];
    console.log(`Switched to fallback provider: ${this.currentProvider}`);
    return true;
  }

  /**
   * Record a successful request
   */
  recordSuccess(providerName: string, responseTime: number): void {
    const stats = this.stats.get(providerName);
    if (stats) {
      stats.successCount++;
      stats.averageResponseTime =
        (stats.averageResponseTime * (stats.successCount - 1) + responseTime) / stats.successCount;
      stats.lastCheckTime = Date.now();
    }
  }

  /**
   * Record a failed request
   */
  recordError(providerName: string, error?: any): void {
    const stats = this.stats.get(providerName);
    if (stats) {
      stats.errorCount++;
      stats.lastCheckTime = Date.now();

      // Mark as unhealthy after 5 consecutive errors
      if (stats.errorCount > 5) {
        stats.isHealthy = false;

        // Try to switch to fallback
        if (this.currentProvider === providerName) {
          this.switchToFallback();
        }
      }
    }
  }

  /**
   * Get provider statistics
   */
  getStats(): ProviderStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Start periodic health checks
   */
  startHealthCheck(): void {
    this.healthCheckInterval = setInterval(
      () => {
        this.checkHealth();
      },
      60000
    ); // Check every minute
  }

  /**
   * Stop health checks
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Check health of all providers
   */
  private async checkHealth(): Promise<void> {
    for (const [name, provider] of this.providers) {
      try {
        const startTime = Date.now();
        await provider.getBlockNumber();
        const responseTime = Date.now() - startTime;

        const stats = this.stats.get(name)!;
        stats.isHealthy = true;
        stats.successCount++;
        stats.averageResponseTime =
          (stats.averageResponseTime * (stats.successCount - 1) + responseTime) / stats.successCount;
        stats.lastCheckTime = Date.now();
      } catch (error) {
        this.recordError(name, error);
      }
    }
  }

  /**
   * Destroy the provider manager
   */
  destroy(): void {
    this.stopHealthCheck();
    this.providers.clear();
    this.configs.clear();
    this.stats.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: RpcProviderManager | null = null;

export function getRpcProviderManager(): RpcProviderManager {
  if (!instance) {
    // Default configuration with Mainnet Alchemy and Infura
    const configs: RpcProviderConfig[] = [
      {
        name: 'alchemy',
        url: process.env.ALCHEMY_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/demo',
        priority: 0,
        timeout: 10000,
        maxRequests: 300,
      },
      {
        name: 'infura',
        url: process.env.INFURA_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_API_KEY',
        priority: 1,
        timeout: 10000,
        maxRequests: 100,
      },
      {
        name: 'ankr',
        url: process.env.ANKR_RPC_URL || 'https://rpc.ankr.com/eth',
        priority: 2,
        timeout: 10000,
        maxRequests: 1000,
      },
    ];

    instance = new RpcProviderManager(configs);
  }

  return instance;
}

export function resetRpcProviderManager(): void {
  if (instance) {
    instance.destroy();
  }
  instance = null;
}
