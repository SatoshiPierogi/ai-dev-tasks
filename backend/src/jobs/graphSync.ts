/**
 * The Graph Sync Job
 * Background job that periodically fetches and syncs transaction data from The Graph
 * Runs on a configurable schedule and handles deduplication
 */

import { EventEmitter } from 'events';
import { getTheGraphClient, ProtocolType } from '../services/thegraph';
import { UniswapClient } from '../services/thegraph.uniswap';
import { AaveClient } from '../services/thegraph.aave';
import { CurveClient } from '../services/thegraph.curve';
import { BalancerClient } from '../services/thegraph.balancer';
import { TransactionNormalizer, NormalizedTransaction } from '../services/normalizer';
import { getDeduplicator } from '../services/deduplicator';

// ============================================================================
// TYPES
// ============================================================================

export interface SyncJobConfig {
  interval: number; // milliseconds between runs
  agentAddresses: string[];
  protocols: ProtocolType[];
  batchSize: number;
  enabled: boolean;
}

export interface SyncResult {
  protocol: ProtocolType;
  agentAddress: string;
  success: boolean;
  transactionsFound: number;
  transactionsAdded: number;
  duplicatesFound: number;
  error?: string;
  duration: number;
}

export interface SyncJobStats {
  totalRuns: number;
  totalTransactions: number;
  totalDuplicates: number;
  lastRun: number;
  nextRun: number;
  isRunning: boolean;
}

// ============================================================================
// SYNC JOB
// ============================================================================

export class TheGraphSyncJob extends EventEmitter {
  private config: SyncJobConfig;
  private timer: NodeJS.Timer | null = null;
  private isRunning: boolean = false;
  private stats: SyncJobStats;
  private theGraphClient = getTheGraphClient();
  private deduplicator = getDeduplicator();

  constructor(config: Partial<SyncJobConfig> = {}) {
    super();

    this.config = {
      interval: 60000, // 1 minute
      agentAddresses: [],
      protocols: Object.values(ProtocolType),
      batchSize: 100,
      enabled: true,
      ...config,
    };

    this.stats = {
      totalRuns: 0,
      totalTransactions: 0,
      totalDuplicates: 0,
      lastRun: 0,
      nextRun: Date.now() + this.config.interval,
      isRunning: false,
    };
  }

  /**
   * Start the sync job
   */
  start(): void {
    if (!this.config.enabled) {
      return;
    }

    if (this.timer) {
      return; // Already running
    }

    this.emit('start', { timestamp: Date.now() });

    // Run immediately
    this.run().catch((error) => {
      this.emit('error', { error: error.message, timestamp: Date.now() });
    });

    // Schedule recurring runs
    this.timer = setInterval(() => {
      this.run().catch((error) => {
        this.emit('error', { error: error.message, timestamp: Date.now() });
      });
    }, this.config.interval);
  }

  /**
   * Stop the sync job
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.emit('stop', { timestamp: Date.now() });
  }

  /**
   * Execute a single sync run
   */
  async run(): Promise<SyncResult[]> {
    if (this.isRunning) {
      this.emit('warning', { message: 'Sync job already running, skipping this cycle' });
      return [];
    }

    this.isRunning = true;
    this.stats.isRunning = true;
    const startTime = Date.now();
    const results: SyncResult[] = [];

    try {
      // Sync for each protocol and agent address combination
      for (const protocol of this.config.protocols) {
        for (const agentAddress of this.config.agentAddresses) {
          const result = await this.syncProtocolForAgent(protocol, agentAddress);
          results.push(result);
        }
      }

      // Update stats
      this.stats.totalRuns++;
      this.stats.lastRun = Date.now();
      this.stats.nextRun = Date.now() + this.config.interval;

      const totalAdded = results.reduce((sum, r) => sum + r.transactionsAdded, 0);
      this.stats.totalTransactions += totalAdded;
      this.stats.totalDuplicates += results.reduce((sum, r) => sum + r.duplicatesFound, 0);

      const duration = Date.now() - startTime;

      this.emit('syncComplete', {
        results,
        duration,
        totalTransactions: this.stats.totalTransactions,
        timestamp: Date.now(),
      });

      return results;
    } finally {
      this.isRunning = false;
      this.stats.isRunning = false;
    }
  }

  /**
   * Sync a specific protocol for a specific agent
   */
  private async syncProtocolForAgent(
    protocol: ProtocolType,
    agentAddress: string
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      protocol,
      agentAddress,
      success: false,
      transactionsFound: 0,
      transactionsAdded: 0,
      duplicatesFound: 0,
      duration: 0,
    };

    try {
      const transactions = await this.fetchTransactions(protocol, agentAddress);

      result.transactionsFound = transactions.length;

      // Normalize and deduplicate
      const normalized = transactions
        .map((tx) => TransactionNormalizer.normalize(tx))
        .filter((tx): tx is NormalizedTransaction => tx !== null);

      for (const tx of normalized) {
        if (this.deduplicator.getOrAdd(tx)) {
          result.transactionsAdded++;
          this.emit('transactionAdded', { transaction: tx, protocol });
        } else {
          result.duplicatesFound++;
        }
      }

      result.success = true;
      result.duration = Date.now() - startTime;

      this.emit('syncResult', result);
      return result;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.duration = Date.now() - startTime;

      this.emit('syncError', { result, error });
      return result;
    }
  }

  /**
   * Fetch transactions from a protocol for an agent
   */
  private async fetchTransactions(protocol: ProtocolType, agentAddress: string): Promise<any[]> {
    const transactions: any[] = [];

    switch (protocol) {
      case ProtocolType.UNISWAP: {
        const client = new UniswapClient(this.theGraphClient);
        for await (const batch of client.getAllSwaps(agentAddress, this.config.batchSize)) {
          transactions.push(
            ...batch.map((swap) => UniswapClient.buildSwapRecord(swap))
          );
        }
        break;
      }

      case ProtocolType.AAVE: {
        const client = new AaveClient(this.theGraphClient);
        const events = await client.getAllEvents(agentAddress);

        if (events.deposits) {
          transactions.push(
            ...events.deposits.map((d) => AaveClient.buildDepositRecord(d))
          );
        }
        if (events.withdraws) {
          transactions.push(
            ...events.withdraws.map((w) => AaveClient.buildWithdrawRecord(w))
          );
        }
        if (events.borrows) {
          transactions.push(
            ...events.borrows.map((b) => AaveClient.buildBorrowRecord(b))
          );
        }
        if (events.repays) {
          transactions.push(
            ...events.repays.map((r) => AaveClient.buildRepayRecord(r))
          );
        }
        break;
      }

      case ProtocolType.CURVE: {
        const client = new CurveClient(this.theGraphClient);
        const swapsResult = await client.getSwaps(agentAddress);
        transactions.push(
          ...swapsResult.data.exchangeUnderlyings.map((s) => CurveClient.buildSwapRecord(s))
        );

        const addLiqResult = await client.getAddLiquidity(agentAddress);
        transactions.push(
          ...addLiqResult.data.addLiquidities.map((a) => CurveClient.buildAddLiquidityRecord(a))
        );

        const removeLiqResult = await client.getRemoveLiquidity(agentAddress);
        transactions.push(
          ...removeLiqResult.data.removeLiquidities.map((r) =>
            CurveClient.buildRemoveLiquidityRecord(r)
          )
        );
        break;
      }

      case ProtocolType.BALANCER: {
        const client = new BalancerClient(this.theGraphClient);
        const swapsResult = await client.getSwaps(agentAddress);
        transactions.push(
          ...swapsResult.data.swaps.map((s) => BalancerClient.buildSwapRecord(s))
        );

        const joinsResult = await client.getJoins(agentAddress);
        transactions.push(
          ...joinsResult.data.joins.map((j) => BalancerClient.buildJoinRecord(j))
        );

        const exitsResult = await client.getExits(agentAddress);
        transactions.push(
          ...exitsResult.data.exits.map((e) => BalancerClient.buildExitRecord(e))
        );
        break;
      }
    }

    return transactions;
  }

  /**
   * Add agent address to sync
   */
  addAgent(address: string): void {
    if (!this.config.agentAddresses.includes(address)) {
      this.config.agentAddresses.push(address);
    }
  }

  /**
   * Remove agent address from sync
   */
  removeAgent(address: string): void {
    const index = this.config.agentAddresses.indexOf(address);
    if (index > -1) {
      this.config.agentAddresses.splice(index, 1);
    }
  }

  /**
   * Get job statistics
   */
  getStats(): SyncJobStats {
    return { ...this.stats };
  }

  /**
   * Update job configuration
   */
  updateConfig(config: Partial<SyncJobConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get job configuration
   */
  getConfig(): Readonly<SyncJobConfig> {
    return { ...this.config };
  }
}

/**
 * Singleton instance
 */
let instance: TheGraphSyncJob | null = null;

export function getSyncJob(config?: Partial<SyncJobConfig>): TheGraphSyncJob {
  if (!instance) {
    instance = new TheGraphSyncJob(config);
  }
  return instance;
}

export function resetSyncJob(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}
